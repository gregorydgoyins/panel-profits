import fs from "node:fs";
import path from "node:path";
import { createPublicReadOnlyClient, createAdminServerClient } from "@/lib/supabase/admin";

export interface GcdStoryRip {
  storyId: number;
  sequence: number;
  title: string;
  synopsis: string;
  characters: string;
  writer: string;
  penciler: string;
  inker: string;
  colorist: string;
  letterer: string;
  editor: string;
  genre: string;
  pageCount: number | null;
}

export interface GcdStoryDossier {
  gcdIssueId: number | null;
  leadStoryTitle: string;
  leadSynopsis: string;
  leadCharacters: string;
  leadWriter: string;
  leadPenciler: string;
  leadInker: string;
  leadColorist: string;
  leadLetterer: string;
  leadEditor: string;
  leadGenre: string;
  allStories: GcdStoryRip[];
  writers: string[];
  pencilers: string[];
  inkers: string[];
  colorists: string[];
  letterers: string[];
  editors: string[];
}

const memoryStoryCache = new Map<string, GcdStoryDossier | null>();

let variantMap: Record<string, number> | null = null;
let variantMapChecked = false;

function getVariantBaseId(issueId: number): number | null {
  if (!variantMapChecked) {
    variantMapChecked = true;
    try {
      const candidatePaths = [
        path.join(process.cwd(), "data", "gcd_variant_map.json"),
        path.join(process.cwd(), "panel-profits", "data", "gcd_variant_map.json"),
      ];
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          variantMap = JSON.parse(fs.readFileSync(p, "utf8"));
          break;
        }
      }
    } catch (_) {}
  }
  if (variantMap && variantMap[String(issueId)]) {
    return variantMap[String(issueId)];
  }
  return null;
}

/**
 * Resolves authentic GCD story rips (titles, synopses, characters, creative credits)
 * from Supabase ppcf_gcd_stories & gcd_candidate_snapshots (plus the bundled
 * data/gcd_variant_map.json variant-to-base map). The former local SQLite tiers
 * (host-only GCD dump and data/pp115k.sqlite) were removed.
 */
export async function resolveGcdStoryDossier(
  gcdSourceId?: string | number | null,
  seriesName?: string | null,
  issueNumber?: string | number | null,
  publicationYear?: number | null
): Promise<GcdStoryDossier | null> {
  const cleanSeries = String(seriesName || "")
    .replace(/\s*\(\d{4}\)/g, "")
    .replace(/\s*#\d+/g, "")
    .trim();
  const cleanIssue = String(issueNumber || "")
    .trim()
    .replace(/^#/, "");

  const cacheKey = `${gcdSourceId || "no-id"}:${cleanSeries}:${cleanIssue}:${publicationYear || "no-year"}`;
  if (memoryStoryCache.has(cacheKey)) {
    return memoryStoryCache.get(cacheKey) || null;
  }

  let issueId: number | null = gcdSourceId ? parseInt(String(gcdSourceId), 10) : null;
  if (isNaN(issueId as number)) issueId = null;

  // If issueId is missing, resolve via Supabase gcd_candidate_snapshots
  if (!issueId && cleanSeries && cleanIssue) {
    try {
      const supabase = createPublicReadOnlyClient();
      const { data: snaps } = await supabase
        .from("gcd_candidate_snapshots")
        .select("gcd_issue_id")
        .ilike("series_name", `%${cleanSeries}%`)
        .eq("issue_number", cleanIssue)
        .limit(1);
      if (snaps && snaps[0]?.gcd_issue_id) {
        issueId = snaps[0].gcd_issue_id;
      }
    } catch (_) {}
  }

  if (!issueId) {
    memoryStoryCache.set(cacheKey, null);
    return null;
  }

  // Fetch stories from Supabase ppcf_gcd_stories
  let rawStories: any[] = [];
  try {
    const supabase = createAdminServerClient();
    const { data } = await supabase
      .from("ppcf_gcd_stories")
      .select("*")
      .eq("gcd_issue_id", issueId)
      .order("sequence_number", { ascending: true });
    rawStories = data || [];
  } catch (_) {}

  // If 0 stories or only cover illustration, resolve variant-to-base issue via static map
  const hasInteriorStories = rawStories.some((s) => s.sequence_number > 0 && (s.title || s.synopsis || s.script));
  if (!hasInteriorStories && issueId) {
    const baseId = getVariantBaseId(issueId);
    if (baseId) {
      try {
        const supabase = createAdminServerClient();
        const { data: baseStories } = await supabase
          .from("ppcf_gcd_stories")
          .select("*")
          .eq("gcd_issue_id", baseId)
          .order("sequence_number", { ascending: true });
        if (baseStories && baseStories.length > 0) {
          rawStories = baseStories;
          issueId = baseId;
        }
      } catch (_) {}
    }
  }

  // If still 0 stories, check snapshots for alternate issue ids of this issue
  if ((!rawStories || rawStories.length === 0) && cleanSeries && cleanIssue) {
    try {
      const supabase = createPublicReadOnlyClient();
      const { data: allSnaps } = await supabase
        .from("gcd_candidate_snapshots")
        .select("gcd_issue_id")
        .ilike("series_name", `%${cleanSeries}%`)
        .eq("issue_number", cleanIssue);

      for (const s of allSnaps || []) {
        if (s.gcd_issue_id === issueId) continue;
        const { data: fbStories } = await supabase
          .from("ppcf_gcd_stories")
          .select("*")
          .eq("gcd_issue_id", s.gcd_issue_id)
          .order("sequence_number", { ascending: true });
        if (fbStories && fbStories.length > 0) {
          rawStories = fbStories;
          issueId = s.gcd_issue_id;
          break;
        }
      }
    } catch (_) {}
  }

  if (!rawStories || rawStories.length === 0) {
    memoryStoryCache.set(cacheKey, null);
    return null;
  }

  // Pick lead story: the story with the longest synopsis, or sequence > 0 with title/synopsis
  let leadStory = null;
  for (const st of rawStories) {
    const syn = st.synopsis || "";
    if (syn && (!leadStory || syn.length > (leadStory.synopsis?.length || 0))) {
      leadStory = st;
    }
  }
  if (!leadStory && rawStories.length > 0) {
    leadStory = rawStories.find((s) => s.title) || rawStories[0];
  }

  const cleanField = (val: any): string => {
    if (!val || typeof val !== "string") return "";
    const trimmed = val.trim();
    if (trimmed === "?" || trimmed === "none" || trimmed === "null" || trimmed === "undefined") return "";
    // Reject Cyrillic, Hangul, or broken mojibake encoding artifacts
    if (/[\u0400-\u04FF\uAC00-\uD7AF\u1100-\u11FF]/.test(trimmed)) return "";
    return trimmed;
  };

  const writers = [...new Set(rawStories.map((s) => cleanField(s.script)).filter(Boolean))];
  const pencilers = [...new Set(rawStories.map((s) => cleanField(s.pencils)).filter(Boolean))];
  const inkers = [...new Set(rawStories.map((s) => cleanField(s.inks)).filter(Boolean))];
  const colorists = [...new Set(rawStories.map((s) => cleanField(s.colors)).filter(Boolean))];
  const letterers = [...new Set(rawStories.map((s) => cleanField(s.letters)).filter(Boolean))];
  const editors = [...new Set(rawStories.map((s) => cleanField(s.editing)).filter(Boolean))];
  const allCharacters = [...new Set(rawStories.map((s) => cleanField(s.characters)).filter(Boolean))].join("; ");

  const storyRips: GcdStoryRip[] = rawStories.map((s) => ({
    storyId: s.gcd_story_id,
    sequence: s.sequence_number,
    title: cleanField(s.title) || (s.sequence_number === 0 ? "Cover Illustration" : `Story Sequence ${s.sequence_number}`),
    synopsis: cleanField(s.synopsis),
    characters: cleanField(s.characters),
    writer: cleanField(s.script),
    penciler: cleanField(s.pencils),
    inker: cleanField(s.inks),
    colorist: cleanField(s.colors),
    letterer: cleanField(s.letters),
    editor: cleanField(s.editing),
    genre: cleanField(s.genre),
    pageCount: s.page_count ? Number(s.page_count) : null,
  }));

  const dossier: GcdStoryDossier = {
    gcdIssueId: issueId,
    leadStoryTitle: cleanField(leadStory?.title),
    leadSynopsis: cleanField(leadStory?.synopsis),
    leadCharacters: cleanField(leadStory?.characters) || allCharacters,
    leadWriter: cleanField(leadStory?.script) || writers[0] || "",
    leadPenciler: cleanField(leadStory?.pencils) || pencilers[0] || "",
    leadInker: cleanField(leadStory?.inks) || inkers[0] || "",
    leadColorist: cleanField(leadStory?.colors) || colorists[0] || "",
    leadLetterer: cleanField(leadStory?.letters) || letterers[0] || "",
    leadEditor: cleanField(leadStory?.editing) || editors[0] || "",
    leadGenre: cleanField(leadStory?.genre) || "Superhero",
    allStories: storyRips,
    writers,
    pencilers,
    inkers,
    colorists,
    letterers,
    editors,
  };

  memoryStoryCache.set(cacheKey, dossier);
  return dossier;
}
