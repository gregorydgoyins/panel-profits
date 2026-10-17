import {hasNarrativeText} from './narrative-text';
import { createAdminServerClient } from "@/lib/supabase/admin";
import { exactStoredEdition } from "@/lib/sniper/stored-market-evidence";
import { comicKey, type StorySummary, type StorySummaryInput } from "./story-summary";

/** GCD story crosswalk is publisher-independent, including books outside the Marvel/DC imports. */
export async function hydrateStoredGcdStory(input: StorySummaryInput, verifiedPpcfId?:string|null): Promise<StorySummary | null> {
  if (!input.year) return null;
  const db = createAdminServerClient();
  let query=db.from("ppcf_fast_wiki_read_model")
    .select("ppcf_id,gcd_issue_id,publication_date,variant_name")
    .eq("issue_number", input.issueNumber).ilike("publication_date", `%${input.year}%`)
    .limit(20);
  query=verifiedPpcfId?query.eq("ppcf_id",verifiedPpcfId):query.eq("series_name",input.series).or("variant_name.is.null,variant_name.eq.,variant_name.ilike.Cover A -%,variant_name.ilike.Cover A –%");
  const {data:issues,error}=await query;
  if (error) throw new Error("Story issue crosswalk failed");
  const match = exactStoredEdition(issues || [], input.year, null);
  const issue = verifiedPpcfId && issues?.length===1?issues[0]:issues?.find(row => row.ppcf_id === match?.ppcf_id);
  if (!issue?.gcd_issue_id) return null;
  const { data: stories, error: storyError } = await db.from("ppcf_gcd_stories")
    .select("title,synopsis,script,pencils").eq("gcd_issue_id", issue.gcd_issue_id).in("story_type_id",[19,21]).order("sequence_number").limit(100);
  if (storyError) throw new Error("Stored GCD story lookup failed");
  const plots = (stories || []).filter(row => hasNarrativeText(row.synopsis));
  if (!plots.length || stories?.length === 100) return null;
  const names = (field: "script" | "pencils") => [...new Set<string>(plots.flatMap(row => (row[field] || "").split(";").map((name: string) => name.trim()).filter((name: string) => name && name !== "?")))];
  const summary: StorySummary = { text: plots.map(row => row.synopsis.trim()).join("\n\n"), storyTitle: plots[0].title || null,
    credits: { writers: names("script"), pencilers: names("pencils") }, referenceYear: input.year,
    source: "Grand Comics Database (stored story crosswalk)", sourceUrl: `https://www.comics.org/issue/${issue.gcd_issue_id}/`, license: "CC BY-SA 4.0" };
  const { error: saveError } = await db.from("issue_story_summaries").upsert({ comic_key: comicKey(input.series, input.issueNumber, input.year),
    series: input.series, issue_number: input.issueNumber, year: input.year, publisher: input.publisher, summary: JSON.stringify(summary),
    story_title: summary.storyTitle, source: summary.source, source_url: summary.sourceUrl, license: summary.license, checked_at: new Date().toISOString() });
  if (saveError) throw new Error("GCD story persistence failed");
  return summary;
}
