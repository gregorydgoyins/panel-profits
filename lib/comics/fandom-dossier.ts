import { createAdminServerClient } from "@/lib/supabase/admin";
import type { GcdStoryDossier, GcdStoryRip } from "@/lib/comics/gcd-story-service";

/**
 * Wiki-first story/credit data for pp-<id> pages.
 * Source tables (loaded from the official Marvel Database / DC Database XML dumps):
 *   public.fandom_pp_match (pp_id -> wiki + page_title, matched on series + issue number + year)
 *   public.fandom_issue    (one row per wiki issue page, data = parsed Comic Template)
 * Nothing here is inferred: every value is the wiki's own field. Text is CC BY-SA, so the
 * dossier carries a source label + page URL that the UI shows as attribution.
 */

export interface FandomSource {
  wiki: "marvel" | "dc";
  pageTitle: string;
  url: string;
  license: "CC BY-SA";
  coverRefUrl: string | null;
}
export type PpDossier = GcdStoryDossier & { source?: FandomSource };

const WIKI_HOST: Record<string, { host: string; label: string }> = {
  marvel: { host: "https://marvel.fandom.com/wiki/", label: "Marvel Database" },
  dc: { host: "https://dc.fandom.com/wiki/", label: "DC Database" },
};

const join = (v?: string[] | null) => (v || []).map((s) => String(s || "").trim()).filter(Boolean).join("; ");
const uniq = (v: string[]) => Array.from(new Set(v.filter(Boolean)));

function charactersOf(story: any): string {
  const out: string[] = [];
  for (const a of story?.appearances || []) {
    if (!/characters|antagonists/i.test(a.section || "")) continue;
    if (/^other characters$/i.test(a.section || "")) continue;
    if (!a.name) continue;
    out.push(a.first_appearance ? `${a.name} (1st appearance)` : a.name);
  }
  return uniq(out).join("; ");
}

export async function getFandomDossier(ppId: string | number | null | undefined): Promise<PpDossier | null> {
  if (!ppId) return null;
  try {
    const supabase = createAdminServerClient();
    const { data: m } = await supabase
      .from("fandom_pp_match")
      .select("wiki,page_title")
      .eq("pp_id", String(ppId))
      .maybeSingle();
    if (!m) return null;
    const { data: i } = await supabase
      .from("fandom_issue")
      .select("data,cover_ref_url")
      .eq("wiki", m.wiki)
      .eq("page_title", m.page_title)
      .maybeSingle();
    const d: any = i?.data;
    if (!d || !Array.isArray(d.stories) || d.stories.length === 0) return null;

    const stories: GcdStoryRip[] = d.stories.map((s: any, idx: number) => ({
      storyId: 0,
      sequence: s.n ?? idx + 1,
      title: s.title || "",
      synopsis: s.synopsis || "",
      characters: charactersOf(s),
      writer: join(s.writers),
      penciler: join(s.pencilers),
      inker: join(s.inkers),
      colorist: join(s.colorists),
      letterer: join(s.letterers),
      editor: join(s.editors),
      genre: "",
      pageCount: null,
    }));
    const lead = stories[0];
    const w = WIKI_HOST[m.wiki] || WIKI_HOST.marvel;
    return {
      gcdIssueId: null,
      leadStoryTitle: lead.title,
      leadSynopsis: lead.synopsis,
      leadCharacters: lead.characters,
      leadWriter: lead.writer,
      leadPenciler: lead.penciler,
      leadInker: lead.inker,
      leadColorist: lead.colorist,
      leadLetterer: lead.letterer,
      leadEditor: lead.editor,
      leadGenre: "",
      allStories: stories,
      writers: uniq(stories.flatMap((s) => s.writer.split("; "))),
      pencilers: uniq(stories.flatMap((s) => s.penciler.split("; "))),
      inkers: uniq(stories.flatMap((s) => s.inker.split("; "))),
      colorists: uniq(stories.flatMap((s) => s.colorist.split("; "))),
      letterers: uniq(stories.flatMap((s) => s.letterer.split("; "))),
      editors: uniq(stories.flatMap((s) => s.editor.split("; "))),
      source: {
        wiki: m.wiki,
        pageTitle: m.page_title,
        url: w.host + encodeURIComponent(String(m.page_title).replace(/ /g, "_")),
        license: "CC BY-SA",
        coverRefUrl: i?.cover_ref_url ?? null,
      },
    };
  } catch (err) {
    console.warn("fandom dossier unavailable:", err);
    return null;
  }
}

/** Wiki first, GCD only fills fields the wiki leaves empty. */
export function mergeDossiers(wiki: PpDossier | null, gcd: GcdStoryDossier | null): PpDossier | null {
  if (!wiki) return gcd;
  if (!gcd) return wiki;
  const pick = (a: string, b: string) => (a && a.trim() ? a : b);
  return {
    ...wiki,
    gcdIssueId: gcd.gcdIssueId ?? wiki.gcdIssueId,
    leadGenre: pick(wiki.leadGenre, gcd.leadGenre),
    leadWriter: pick(wiki.leadWriter, gcd.leadWriter),
    leadPenciler: pick(wiki.leadPenciler, gcd.leadPenciler),
    leadInker: pick(wiki.leadInker, gcd.leadInker),
    leadColorist: pick(wiki.leadColorist, gcd.leadColorist),
    leadLetterer: pick(wiki.leadLetterer, gcd.leadLetterer),
    leadEditor: pick(wiki.leadEditor, gcd.leadEditor),
    leadSynopsis: pick(wiki.leadSynopsis, gcd.leadSynopsis),
    leadCharacters: pick(wiki.leadCharacters, gcd.leadCharacters),
  };
}
