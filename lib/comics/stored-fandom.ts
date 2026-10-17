import {hasNarrativeText} from './narrative-text';
import { createAdminServerClient } from "@/lib/supabase/admin";
import { comicKey, sourceStoryLinks, type StorySummary, type StorySummaryInput } from "./story-summary";

/** Publisher imports share the same issue format; no network lookup occurs here. */
export const FANDOM_HOSTS: Record<string, string> = {
  marvel: "marvel.fandom.com", dc: "dc.fandom.com", starwars: "starwars.fandom.com",
  darkhorse: "darkhorse.fandom.com", image: "imagecomics.fandom.com",
  tmnt: "turtlepedia.fandom.com", spawn: "spawn.fandom.com", transformers: "tfwiki.net",
};
const clean = (s: string) => s.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2").replace(/\[\[([^\]]+)\]\]/g, "$1").replace(/'{2,5}/g, "").replace(/<ref\b[^>]*>[\s\S]*?<\/ref>|<ref\b[^/]*\/\s*>/gi, "").replace(/={2,}([^=]+)={2,}/g, "$1").trim();
const slug = (s: string) => s.replace(/\s*\([^)]*\)/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function importedStory(row: { wiki: string; page_title: string; data: any }): StorySummary | null {
  const host = FANDOM_HOSTS[row.wiki.toLowerCase().replace(/[_ -]/g, "")];
  if (!host) return null;
  const stories = (row.data?.stories || []).filter((s: any) => typeof s.synopsis === "string" && hasNarrativeText(clean(s.synopsis)));
  if (!stories.length) return null; // Credits and appearance lists are not a plot synopsis.
  const entities: NonNullable<StorySummary["entities"]> = {};
  for (const story of stories) for (const a of story.appearances || []) {
    if (!a.target || !a.name) continue;
    const role = /featured/i.test(a.section) ? "featuredCharacters" : /antagonist/i.test(a.section) ? "antagonists" : /location/i.test(a.section) ? "locations" : "otherCharacters";
    const entity = { target: a.target, label: clean(a.name), url: `/wiki/entry/${slug(a.target)}`, isFirstApp: a.first_appearance === true };
    (entities[role] ||= []).push(entity);
    if (a.first_appearance === true) (entities.firstAppearances ||= []).push(entity);
  }
  const credits = (key: string) => [...new Set<string>(stories.flatMap((s: any) => s[key] || []))];
  return { text: stories.map((s: any) => clean(s.synopsis)).join("\n\n"), storyTitle: stories[0].title || null,
    entities, credits: { writers: credits("writers"), pencilers: credits("pencilers"), colorists: credits("colorists"), letterers: credits("letterers"), editors: credits("editors"), coverArtists: row.data.cover_artists || [] },
    source: `${row.wiki} Fandom import`, sourceUrl: `https://${host}/wiki/${encodeURIComponent(row.page_title.replace(/ /g, "_"))}`,
    license: "CC BY-SA", referenceYear: Number(row.data.cover_year || row.data.pub_year) || null };
}

/** Worker only: resolve imported source, validate internal links, save in the existing summary cache. */
export async function hydrateStoredFandom(input: StorySummaryInput): Promise<StorySummary | null> {
  if (!input.year || !input.series || !input.issueNumber) return null;
  const db = createAdminServerClient();
  const { data, error } = await db.rpc("sniper_stored_fandom", { p_series: input.series, p_issue: input.issueNumber, p_year: input.year });
  if (error) throw new Error(`Imported story lookup failed: ${error.message}`);
  if (data?.length !== 1) return null; // Never pick an arbitrary volume.
  let summary = importedStory(data[0]);
  if (!summary) return null;
  const slugs = [...new Set(Object.values(summary.entities || {}).flatMap(es => es || []).map(e => e.url.slice("/wiki/entry/".length)))];
  const { data: pages, error: linkError } = slugs.length ? await db.from("ppcf_wiki_pages").select("slug").in("slug", slugs) : { data: [], error: null };
  if (linkError) throw new Error("Character crosswalk lookup failed");
  summary = sourceStoryLinks(summary, new Set((pages || []).map(p => p.slug)));
  const { error: saveError } = await db.from("issue_story_summaries").upsert({ comic_key: comicKey(input.series, input.issueNumber, input.year), series: input.series,
    issue_number: input.issueNumber, year: input.year, publisher: input.publisher, summary: JSON.stringify(summary), story_title: summary.storyTitle,
    source: summary.source, source_url: summary.sourceUrl, license: summary.license, checked_at: new Date().toISOString() });
  if (saveError) throw new Error("Imported story persistence failed");
  return summary;
}
