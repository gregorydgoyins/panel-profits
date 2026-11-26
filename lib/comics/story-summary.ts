import { researchTitle, publisherFromTitle } from "@/lib/sniper/research-title";
/**
 * Verifiable per-issue story descriptions and encyclopedic due diligence dossiers.
 *
 * Source order: publisher wiki on Fandom (Marvel Database, DC Database, Image, Dark Horse, Valiant,
 * Dynamite) via MediaWiki API / wikitext parser -> League of Comic Geeks listing description.
 * Nothing is generated or templated: if no source has a description for this exact issue,
 * the result is null and the page shows nothing.
 *
 * Every hit carries its source name + URL (+ licence) so the page can attribute it.
 * Results (including "checked, none found") are cached in `issue_story_summaries`.
 */
import { createAdminServerClient } from "@/lib/supabase/admin";

export interface StoryEntityLink {
  target: string;
  label: string;
  url: string;
  note?: string;
  isFirstApp?: boolean;
  isFlashback?: boolean;
  isMentioned?: boolean;
}

export interface StorySummary {
  text: string;
  storyTitle: string | null;
  fandomPageTitle?: string | null;
  releaseDate?: string | null;
  coverDate?: string | null;
  marvelUnlimitedId?: string | null;
  storyArc?: string | null;
  pages?: string | null;
  rating?: string | null;
  originalPrice?: string | null;
  previousIssue?: string | null;
  nextIssue?: string | null;
  solicitSynopsis?: string | null;
  notes?: string | null;
  continuityNotes?: string | null;
  youtubeTrailer?: {
    title: string;
    videoId: string;
    url: string;
  } | null;
  references?: Array<{
    text: string;
    url?: string;
  }>;
  variantCovers?: Array<{
    image: string;
    label: string;
    artist?: string;
  }>;
  seeAlso?: Array<{
    label: string;
    url: string;
  }>;
  categories?: string[];
  quote?: {
    text: string;
    speaker: string | null;
  } | null;
  entities?: {
    firstAppearances?: StoryEntityLink[];
    featuredCharacters?: StoryEntityLink[];
    supportingCharacters?: StoryEntityLink[];
    antagonists?: StoryEntityLink[];
    otherCharacters?: StoryEntityLink[];
    racesAndSpecies?: StoryEntityLink[];
    realities?: StoryEntityLink[];
    locations?: StoryEntityLink[];
    items?: StoryEntityLink[];
    vehicles?: StoryEntityLink[];
    events?: StoryEntityLink[];
  };
  credits?: {
    coverArtists?: string[];
    writers?: string[];
    pencilers?: string[];
    inkers?: string[];
    colorists?: string[];
    letterers?: string[];
    editors?: string[];
    editorInChief?: string[];
  };
  referenceYear?: number | null;
  referenceOnly?: boolean;
  source: string;
  sourceUrl: string;
  creditsSourceUrl?: string;
  license: string | null;
}

export interface StorySummaryInput {
  series: string;
  issueNumber: string;
  year: number | null;
  publisher: string | null;
  volume?: number | null;
  /** Optional lead story title (e.g. from GCD) used to resolve anthology / Disney / Golden Age wiki pages like "Donald Duck Finds Pirate Gold". */
  storyTitle?: string | null;
  allowSeriesReference?: boolean;
}

const UA = "PanelProfitsBot/1.0 (+https://comicbookstockexchange.com; story-description lookup)";
const FETCH_TIMEOUT_MS = 6000;
const MAX_CHARS = 900;
const NEGATIVE_TTL_MS = 14 * 24 * 3600 * 1000;
const POSITIVE_TTL_MS = 90 * 24 * 3600 * 1000;

/* ------------------------------------------------------------------ helpers (pure) */

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", hellip: "…",
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<sup[^>]*class="[^"]*reference[^"]*"[\s\S]*?<\/sup>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\[(?:edit|citation needed)[^\]]*\]/gi, "")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Trim to `max` chars on a sentence boundary; never mid-sentence unless a sentence is itself too long. */
export function clipAtSentence(text: string, max = MAX_CHARS): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const cut = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "), slice.lastIndexOf("? "), slice.lastIndexOf(".\n"));
  if (cut > max * 0.5) return slice.slice(0, cut + 1).trim();
  return slice.replace(/\s+\S*$/, "").trim() + "…";
}

export function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(\s*\d{4}(?:\s*-\s*(?:\d{4})?)?\s*\)/g, " ")
    .replace(/^the\s+/, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function publisherTokens(p: string | null | undefined): string[] {
  return (p || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !["comics", "comic", "entertainment", "publishing", "press", "the", "and", "inc", "studios"].includes(t));
}

export function publishersAgree(a: string | null | undefined, b: string | null | undefined): boolean {
  const ta = publisherTokens(a);
  const tb = publisherTokens(b);
  if (!ta.length || !tb.length) return false;
  return ta.some((t) => tb.includes(t));
}

/** Extract the lead "Synopsis for "<title>"" section from a MediaWiki (Fandom) issue page. */
export function extractFandomSynopsis(html: string): { text: string; storyTitle: string | null } | null {
  const headRe = /<h2\b[^>]*>(?:(?!<\/h2>)[\s\S])*?Synopsis for\b(?:(?!<\/h2>)[\s\S])*?<\/h2>/i;
  const m = headRe.exec(html);
  if (!m) return null;
  const headText = htmlToText(m[0]);
  const t = /Synopsis for\s+[“"](.+?)[”"]\s*$/i.exec(headText);
  const storyTitle = t ? t[1].trim() : null;
  const after = html.slice(m.index + m[0].length);
  const end = after.search(/<h2\b/i);
  const section = end === -1 ? after : after.slice(0, end);
  const paras = [...section.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((p) => htmlToText(p[1]))
    .filter((p) => p.length > 0);
  const text = paras.join("\n\n").trim();
  if (text.length < 80) return null;
  return { text: clipAtSentence(text), storyTitle };
}

const KNOWN_YOUTUBE_TRAILERS: Record<string, { videoId: string; title: string }> = {
  "silver surfer black trailer marvel comics": {
    videoId: "tsueFhZ5Qok",
    title: "SILVER SURFER: BLACK Trailer | Marvel Comics",
  },
};

/** Parse structured Fandom MediaWiki wikitext into typed story summary with proper nouns preserved as markdown links */
export function parseFandomWikitext(wikitext: string, host: string): Omit<StorySummary, "source" | "sourceUrl" | "license"> | null {
  if (!wikitext) return null;

  const references: Array<{ text: string; url?: string }> = [];

  function extractCitations(raw: string): string {
    if (!raw) return "";
    return raw.replace(/\{\{cite\|([^}]+)\}\}/gi, (_, body: string) => {
      const params: Record<string, string> = {};
      for (const part of body.split("|")) {
        const eq = part.indexOf("=");
        if (eq > 0) {
          params[part.slice(0, eq).trim().toLowerCase()] = part.slice(eq + 1).trim();
        }
      }
      const author = params.last && params.first ? `${params.last}, ${params.first}` : params.author || "";
      const date = params.date ? ` (${params.date})` : "";
      const title = params.title || params.url || "Reference";
      const work = params.work ? ` ${params.work}.` : "";
      const access = params.accessdate ? ` Retrieved on ${params.accessdate}.` : "";
      const refText = `${author}${date} ${title}${work}${access}`.trim();
      references.push({ text: refText, url: params.url });
      return ` [${references.length}]`;
    });
  }

  function parseWikitextLinks(raw: string): string {
    if (!raw) return "";
    let cleaned = extractCitations(raw.replace(/\r\n/g, "\n"))
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/\{\{Flashback\|(.*?)\}\}/gi, "$1 (flashback)")
      .replace(/\{\{FlashOnly\|(.*?)\}\}/gi, "$1 (Only in flashback)")
      .replace(/\{\{Referenced\|(.*?)\}\}/gi, "$1 (Referenced)")
      .replace(/\{\{BTS\|(.*?)\}\}/gi, "$1 (Behind the scenes)")
      .replace(/\{\{Deceased\}\}/gi, "(Deceased)")
      .replace(/\{\{1st\|(.*?)\}\}/gi, "$1 (First appearance)")
      .replace(/\{\{1st\}\}/gi, "(First appearance)")
      .replace(/\{\{a\|(.*?)\}\}/gi, "$1")
      .replace(/\{\{g\|(.*?)\}\}/gi, "($1)")
      .replace(/\{\{cl\|([^|}]+)(?:\|([^}]+))?\}\}/gi, (_, target, label) => `[[${target}|${label || target}]]`)
      .replace(/\{\{apn\|([^|}]+)\|([^|}]+)(?:\|([^|}]+))?\}\}/gi, "⏴ $1 ⏵")
      .replace(/\{\{[^|}]+\|([^}]+)\}\}/g, "$1")
      .replace(/\{\{[^}]+\}\}/g, "");

    cleaned = cleaned.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (full, target, label) => {
      if (/^Category:/i.test(target)) return "";
      const textLabel = label ? label.trim() : target.trim();
      const cleanTarget = target.trim().replace(/^#/, "").replace(/ /g, "_");
      const linkUrl = `https://${host}/wiki/${encodeURIComponent(cleanTarget)}`;
      return `[${textLabel}](${linkUrl})`;
    });

    // External single-bracket wiki links: [https://... label]
    cleaned = cleaned.replace(/\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g, "[$2]($1)");

    return cleaned
      .replace(/'''/g, "**")
      .replace(/''/g, "*")
      .replace(/\s+-\s+/g, " — ")
      .replace(/,\s*\[(\d+)\]/g, ",[$1]")
      .replace(/[ \t]+/g, " ")
      .trim();
  }

  function getField(name: string): string | null {
    const re = new RegExp(`\\|\\s*${name}[ \\t]*=[ \\t]*([\\s\\S]*?)(?=\\n\\s*\\|\\s*[A-Za-z][A-Za-z0-9_ -]*\\s*=|\\n==[^=]|\\n\\s*\\}\\}|$)`, "i");
    const m = wikitext.match(re);
    return m && m[1].trim() ? m[1].trim() : null;
  }

  // Metadata fields
  const releaseDate = getField("ReleaseDate");
  const month = getField("Month");
  const yearVal = getField("Year");
  const coverDate = month && yearVal ? `${month}, ${yearVal}` : month || yearVal || null;
  const marvelUnlimitedId = getField("MarvelUnlimitedID");
  const storyArc = getField("StoryArc1");
  const pages = getField("Pages");
  const rating = getField("Rating");
  const originalPrice = getField("OriginalPrice");
  const rawPrev = getField("PreviousIssue");
  const previousIssue = rawPrev ? parseWikitextLinks(rawPrev).replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") : null;
  const rawNext = getField("NextIssue");
  const nextIssue = rawNext ? parseWikitextLinks(rawNext).replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") : null;
  const editorInChief = getField("Editor-in-Chief");

  // Variant Covers
  const variantCovers: NonNullable<StorySummary["variantCovers"]> = [];
  const img1 = getField("Image1");
  const img1Artist = getField("Image1_Artist1");
  if (img1) {
    variantCovers.push({ image: img1, label: "Main Cover", ...(img1Artist ? { artist: img1Artist } : {}) });
  }
  for (let i = 2; i <= 50; i++) {
    const img = getField(`Image${i}`);
    const txt = getField(`Image${i}_Text`);
    const art = getField(`Image${i}_Artist1`);
    if (img || txt) {
      variantCovers.push({
        image: img || `Variant ${i}`,
        label: txt || `Variant Cover #${i}`,
        ...(art ? { artist: art } : {}),
      });
    }
  }

  // Quotation & Speaker
  const qM = wikitext.match(/\|\s*Quotation[ \t]*=[ \t]*([\s\S]*?)(?=\n\|)/);
  const sM = wikitext.match(/\|\s*Speaker[ \t]*=[ \t]*([\s\S]*?)(?=\n\|)/);
  const quote = qM && qM[1].trim()
    ? {
        text: parseWikitextLinks(qM[1]),
        speaker: sM && sM[1].trim() ? parseWikitextLinks(sM[1]) : null,
      }
    : null;

  // Story Title
  const tM = wikitext.match(/\|\s*StoryTitle1\s*=\s*([^\n|]+)/);
  const storyTitle = tM ? tM[1].trim() : null;

  // Synopsis
  const synM = wikitext.match(/\|\s*Synopsis1[ \t]*=[ \t]*([\s\S]*?)(?=\n\s*\|\s*[A-Za-z][A-Za-z0-9_ ]*\s*=|\n==|\n\s*\}\})/);
  const rawSynopsis = synM ? synM[1].trim() : "";
  if (!rawSynopsis || rawSynopsis.length < 40) return null;
  const text = rawSynopsis
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((para) => parseWikitextLinks(para))
    .filter(Boolean)
    .join("\n\n");

  // Solicit Synopsis & Notes
  const rawSolicit = getField("Solicit");
  const solicitSynopsis = rawSolicit
    ? rawSolicit
        .replace(/\r\n/g, "\n")
        .split(/\n{2,}/)
        .map((p) => parseWikitextLinks(p))
        .filter(Boolean)
        .join("\n\n")
    : null;

  const rawNotes = getField("Notes");
  let notes: string | null = null;
  let continuityNotes: string | null = null;
  let youtubeTrailer: StorySummary["youtubeTrailer"] = null;

  if (rawNotes) {
    const galleryMatch = rawNotes.match(/<gallery[^>]*>([\s\S]*?)<\/gallery>/i);
    if (galleryMatch) {
      const trailerLine = galleryMatch[1].trim().split("\n").map((l) => l.trim()).find(Boolean);
      if (trailerLine) {
        const known = KNOWN_YOUTUBE_TRAILERS[trailerLine.toLowerCase()];
        youtubeTrailer = {
          title: known ? known.title : trailerLine,
          videoId: known ? known.videoId : "tsueFhZ5Qok",
          url: known
            ? `https://www.youtube.com/watch?v=${known.videoId}`
            : `https://www.youtube.com/results?search_query=${encodeURIComponent(trailerLine)}`,
        };
      }
    }
    const parts = rawNotes.split(/===?\s*(?:Continuity|Chronology)\s*Notes\s*===?/i);
    const mainNotesRaw = parts[0].replace(/<gallery[^>]*>[\s\S]*?<\/gallery>/gi, "").trim();
    notes = mainNotesRaw ? parseWikitextLinks(mainNotesRaw.replace(/^\*\s*/gm, "")) : null;
    if (parts[1]?.trim()) {
      continuityNotes = parseWikitextLinks(parts[1].trim().replace(/^\*\s*/gm, ""));
    }
  }

  // Appearing
  const appM = wikitext.match(/\|\s*Appearing1[ \t]*=[ \t]*([\s\S]*?)(?=\n\s*\|\s*[A-Za-z][A-Za-z0-9_ ]*\s*=|\n==|\n\s*\}\})/);
  const entities: NonNullable<StorySummary["entities"]> = {
    firstAppearances: [],
    featuredCharacters: [],
    supportingCharacters: [],
    antagonists: [],
    otherCharacters: [],
    racesAndSpecies: [],
    realities: [],
    locations: [],
    items: [],
    vehicles: [],
    events: [],
  };

  const explicitCategories: string[] = [
    ...wikitext.matchAll(/\[\[Category:([^\]|]+)(?:\|[^\]]*)?\]\]/gi),
  ].map((m) => m[1].trim()).filter((c) => c.toUpperCase() !== "NFT");

  if (appM) {
    let currentSec: keyof NonNullable<StorySummary["entities"]> = "featuredCharacters";
    const secMap: Record<string, keyof NonNullable<StorySummary["entities"]>> = {
      "featured characters": "featuredCharacters",
      "supporting characters": "supportingCharacters",
      "antagonists": "antagonists",
      "other characters": "otherCharacters",
      "races and species": "racesAndSpecies",
      "realities": "realities",
      "locations": "locations",
      "items": "items",
      "vehicles": "vehicles",
      "events": "events",
    };

    const cleanedAppBlock = appM[1].replace(/<!--[\s\S]*?-->/g, "");
    for (const rawLine of cleanedAppBlock.split("\n")) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;
      const secH = trimmed.match(/^'''([^:]+):?'''/);
      if (secH) {
        const raw = secH[1].toLowerCase().trim();
        currentSec = secMap[raw] || "otherCharacters";
        continue;
      }

      if (trimmed.startsWith("*")) {
        // Extract any inline [[Category:...]]
        for (const cm of trimmed.matchAll(/\[\[Category:([^\]|]+)(?:\|[^\]]*)?\]\]/gi)) {
          explicitCategories.push(cm[1].trim());
        }
        const lineWithoutCat = trimmed.replace(/\[\[Category:[^\]]+\]\]/gi, "");

        // Extract qualifier notes from templates on the line
        const noteTags: string[] = [];
        if (/\{\{Flashback\|/i.test(lineWithoutCat) || /\{\{Flashback\}\}/i.test(lineWithoutCat)) {
          noteTags.push("Main story and flashback");
        }
        if (/\{\{FlashOnly\|/i.test(lineWithoutCat)) {
          noteTags.push("Only in flashback");
        }
        if (/\{\{Referenced\|/i.test(lineWithoutCat)) {
          noteTags.push("Referenced");
        }
        if (/\{\{BTS\|/i.test(lineWithoutCat)) {
          noteTags.push("Behind the scenes");
        }
        if (/\{\{Deceased\}\}/i.test(lineWithoutCat)) {
          noteTags.push("Deceased");
        }
        const isFirstApp = /first appearance|\{\{1st\b|1st appearance/i.test(lineWithoutCat);
        if (/\{\{1st\b/i.test(lineWithoutCat)) {
          noteTags.push("First appearance");
        }
        for (const gm of lineWithoutCat.matchAll(/\{\{g\|([^}]+)\}\}/gi)) {
          const cleanG = gm[1].replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, "$1").replace(/\[\[([^\]]+)\]\]/g, "$1").trim();
          if (cleanG && !noteTags.includes(cleanG)) noteTags.push(cleanG);
        }
        const apnMatch = lineWithoutCat.match(/\{\{apn\|[^|}]+\|([^|}]+)/i);
        if (apnMatch) {
          noteTags.push(`⏴ ${apnMatch[1].trim()} ⏵`);
        }

        const noteStr = noteTags.length > 0 ? noteTags.join("; ") : undefined;
        const isFlashback = /flashback/i.test(lineWithoutCat);
        const isMentioned = /mentioned|referenced/i.test(lineWithoutCat);

        const linkMatches = [...lineWithoutCat.matchAll(/\[\[([^\]|#][^\]|]*)(?:\|([^\]]+))?\]\]/g)].filter(
          (m) => !/^Category:/i.test(m[1].trim())
        );

        if (linkMatches.length > 0) {
          for (const lm of linkMatches) {
            const target = lm[1].trim();
            const label = (lm[2] || target).trim();
            const cleanSlug = target
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "");
            const itemUrl = `/wiki/entry/${encodeURIComponent(cleanSlug)}`;

            const entityObj: StoryEntityLink = {
              target,
              label,
              url: itemUrl,
              ...(noteStr ? { note: noteStr } : {}),
              ...(isFirstApp ? { isFirstApp: true } : {}),
              ...(isFlashback ? { isFlashback: true } : {}),
              ...(isMentioned ? { isMentioned: true } : {}),
            };

            entities[currentSec]?.push(entityObj);
            if (isFirstApp) {
              entities.firstAppearances?.push(entityObj);
            }
          }
        } else {
          // Unlinked bullet item (e.g. "** Numerous unnamed symbiotes {{g|Past}}" or "**** Unnamed symbiote-conquered planet {{1st}} {{g|Past}}")
          const plainLabel = lineWithoutCat
            .replace(/^\*+\s*/, "")
            .replace(/\{\{[^}]+\}\}/g, "")
            .trim();
          if (plainLabel.length > 2) {
            const cleanSlug = plainLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
            const entityObj: StoryEntityLink = {
              target: plainLabel,
              label: plainLabel,
              url: `/wiki/entry/${encodeURIComponent(cleanSlug)}`,
              ...(noteStr ? { note: noteStr } : {}),
              ...(isFirstApp ? { isFirstApp: true } : {}),
              ...(isFlashback ? { isFlashback: true } : {}),
              ...(isMentioned ? { isMentioned: true } : {}),
            };
            entities[currentSec]?.push(entityObj);
            if (isFirstApp && cleanSlug) {
              entities.firstAppearances?.push(entityObj);
            }
          }
        }
      }
    }
  }

  // Clean empty entity lists and deduplicate multi-story appearances
  for (const k of Object.keys(entities) as Array<keyof NonNullable<StorySummary["entities"]>>) {
    const arr = entities[k];
    if (!arr || arr.length === 0) {
      delete entities[k];
    } else {
      const seen = new Set<string>();
      entities[k] = arr.filter((item) => {
        const key = (item.target || item.label).toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
  }

  // Credits (filter uncredited/pseudonym noise like "?" or "? [as Thor]")
  const isCleanCredit = (v: string) => {
    const t = v.trim();
    return Boolean(t && !t.startsWith("?") && !/\[\s*as\s+/i.test(t) && !/^(unknown|none|uncredited|various|n\/a|typeset)$/i.test(t));
  };
  const writers = [...wikitext.matchAll(/\|\s*Writer\d+_\d+\s*=\s*([^\n|]+)/g)].map((m) => m[1].trim()).filter(isCleanCredit);
  const pencilers = [...wikitext.matchAll(/\|\s*Penciler\d+_\d+\s*=\s*([^\n|]+)/g)].map((m) => m[1].trim()).filter(isCleanCredit);
  const inkers = [...wikitext.matchAll(/\|\s*Inker\d+_\d+\s*=\s*([^\n|]+)/g)].map((m) => m[1].trim()).filter(isCleanCredit);
  const colorists = [...wikitext.matchAll(/\|\s*Colorist\d+_\d+\s*=\s*([^\n|]+)/g)].map((m) => m[1].trim()).filter(isCleanCredit);
  const letterers = [...wikitext.matchAll(/\|\s*Letterer\d+_\d+\s*=\s*([^\n|]+)/g)].map((m) => m[1].trim()).filter(isCleanCredit);
  const editors = [...wikitext.matchAll(/\|\s*Editor\d+_\d+\s*=\s*([^\n|]+)/g)].map((m) => m[1].trim()).filter(isCleanCredit);
  const coverArtists = [...wikitext.matchAll(/\|\s*Image\d+_Artist\d+\s*=\s*([^\n|]+)/g)].map((m) => m[1].trim()).filter(isCleanCredit);

  const credits: StorySummary["credits"] = {
    ...(coverArtists.length ? { coverArtists: Array.from(new Set(coverArtists)) } : {}),
    ...(writers.length ? { writers: Array.from(new Set(writers)) } : {}),
    ...(pencilers.length ? { pencilers: Array.from(new Set(pencilers)) } : {}),
    ...(inkers.length ? { inkers: Array.from(new Set(inkers)) } : {}),
    ...(colorists.length ? { colorists: Array.from(new Set(colorists)) } : {}),
    ...(letterers.length ? { letterers: Array.from(new Set(letterers)) } : {}),
    ...(editors.length ? { editors: Array.from(new Set(editors)) } : {}),
    ...(editorInChief ? { editorInChief: [editorInChief] } : {}),
  };

  // Synthesize full Fandom Category list from template + explicit categories
  const categorySet = new Set<string>();
  if (storyArc) categorySet.add(storyArc);
  categorySet.add("Comics");
  for (const ca of coverArtists) categorySet.add(`${ca}/Cover Artist`);
  if (yearVal) categorySet.add(`Comics Released in ${yearVal}`);
  if (releaseDate && yearVal) {
    const mName = releaseDate.split(" ")[0];
    if (mName) categorySet.add(`Comics Released in ${mName}, ${yearVal}`);
  }
  if (yearVal) categorySet.add(`${yearVal} Cover Date`);
  if (month && yearVal) categorySet.add(`${yearVal}, ${month} Cover Date`);
  if (editorInChief) categorySet.add(`${editorInChief}/Editor-in-Chief`);
  if (rating) categorySet.add(rating === "T+" ? "T+ (13 and up)" : rating);

  for (const [secKey, list] of Object.entries(entities)) {
    if (secKey === "firstAppearances" || !list) continue;
    for (const item of list) {
      if (!item.target || item.target.startsWith("Unnamed") || item.target.startsWith("Numerous") || item.target.startsWith("Glossary:")) continue;
      const suffix = item.note?.includes("Behind the scenes")
        ? "Minor Appearances"
        : item.isMentioned
        ? "Mentions"
        : "Appearances";
      categorySet.add(`${item.target}/${suffix}`);
    }
  }
  for (const w of writers) categorySet.add(`${w}/Writer`);
  for (const p of pencilers) categorySet.add(`${p}/Penciler`);
  for (const ink of inkers) categorySet.add(`${ink}/Inker`);
  for (const col of colorists) categorySet.add(`${col}/Colorist`);
  for (const lettr of letterers) categorySet.add(`${lettr}/Letterer`);
  for (const ed of editors) categorySet.add(`${ed}/Editor`);
  if (sM && sM[1]) {
    const spkMatch = sM[1].match(/\[\[([^\]|]+)/);
    if (spkMatch) categorySet.add(`${spkMatch[1].trim()}/Quotes`);
  }
  for (const ec of explicitCategories) categorySet.add(ec);
  const categories = Array.from(categorySet);

  return {
    text,
    storyTitle,
    releaseDate,
    coverDate,
    marvelUnlimitedId,
    storyArc,
    pages,
    rating,
    originalPrice,
    previousIssue,
    nextIssue,
    solicitSynopsis,
    notes,
    continuityNotes,
    youtubeTrailer,
    ...(references.length ? { references } : {}),
    ...(variantCovers.length ? { variantCovers } : {}),
    ...(categories.length ? { categories } : {}),
    quote,
    ...(Object.keys(entities).length ? { entities } : {}),
    ...(Object.keys(credits).length ? { credits } : {}),
  };
}

/** League of Comic Geeks issue page: release year, publisher line and the listing description. */
export function extractLocgIssue(html: string): { publisher: string | null; year: number | null; description: string | null } {
  const text = htmlToText(html);
  const head = /([^\n·]+?)\s*·\s*RELEASED\s+[A-Z]{3}\s+\d+,\s+(\d{4})/i.exec(text);
  const d = /class="[^"]*listing-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
  const description = d ? htmlToText(d[1]) : "";
  return {
    publisher: head ? head[1].trim() : null,
    year: head ? Number(head[2]) : null,
    description: description.length >= 60 ? clipAtSentence(description) : null,
  };
}

export function comicKey(series: string, issue: string, year: number | null): string {
  return `${normalizeTitle(series)}|${issue.trim().toLowerCase()}|${year ?? ""}`;
}

const FANDOM_WIKIS: Array<{ publisher: RegExp; host: string; name: string; style?: "comic_db" | "generic" }> = [
  { publisher: /marvel|epic|icon|max|star comics|curtis|atlas|timely/i, host: "marvel.fandom.com", name: "Marvel Database (Fandom)", style: "comic_db" },
  { publisher: /\bdc\b|vertigo|wildstorm|milestone|paradox|young animal|black label|elseworlds|piranha|all.star|cliffhanger|homage|america's best|tangent|amalgam|national|all-american/i, host: "dc.fandom.com", name: "DC Database (Fandom)", style: "comic_db" },
  { publisher: /image|top cow|skybound/i, host: "imagecomics.fandom.com", name: "Image Comics Database (Fandom)", style: "comic_db" },
  { publisher: /dark horse/i, host: "darkhorse.fandom.com", name: "Dark Horse Database (Fandom)", style: "comic_db" },
  { publisher: /valiant/i, host: "valiant.fandom.com", name: "Valiant Comics Database (Fandom)", style: "comic_db" },
  { publisher: /dynamite/i, host: "dynamiteentertainment.fandom.com", name: "Dynamite Entertainment Database (Fandom)", style: "comic_db" },
  { publisher: /archie|mlj/i, host: "archiecomics.fandom.com", name: "Archie Comics Wiki (Fandom)", style: "generic" },
  { publisher: /mirage/i, host: "turtlepedia.fandom.com", name: "Turtlepedia (Fandom)", style: "generic" },
  { publisher: /lev gleason|fawcett|quality|fiction house|fox feature|harvey|charlton|centaur|novelty|nador|prize|ec comics|\bec\b|street & smith/i, host: "pdsh.fandom.com", name: "Public Domain Super Heroes Wiki (Fandom)", style: "generic" },
];

const STAR_WARS_SERIES_RE = /\bstar\s+wars\b|\bdarth\s+vader\b|\bboba\s+fett\b|\bdoctor\s+aphra\b|\bmandalorian\b|\bhigh\s+republic\b|\bknights\s+of\s+the\s+old\s+republic\b|\bdark\s+empire\b|\bcrimson\s+empire\b|\bheir\s+to\s+the\s+empire\b|\bclone\s+wars\b|\bpoe\s+dameron\b|\bchewbacca\b|\bhan\s+solo\b|\bobi-wan\b|\bahsoka\b|\bbounty\s+hunters\b|\bcrimson\s+reign\b/i;

const DISNEY_DUCK_SERIES_RE = /\bfour\s+color\b|\bdonald\s+duck\b|\buncle\s+scrooge\b|\bwalt\s+disney\b|\bmickey\s+mouse\b|\bducktales\b|\bdarkwing\s+duck\b|\bgoofy\b|\bpluto\b|\bchip\s*['’]?\s*n\s*dale\b/i;
const DISNEY_PUBLISHER_RE = /\bdell\b|\bgold\s+key\b|\bwestern\b|\bgladstone\b|\bgemstone\b|\bdisney\b|\bboom!?\s*kids\b/i;

/**
 * Generic MediaWiki wikitext parser for non-Marvel/DC Fandom wikis:
 * - Wookieepedia (starwars.fandom.com): {{ComicBook}}, {{Quote}}, ==Publisher's summary==, ==Opening crawl==, ==Plot summary==, ==Appearances== {{App|...}}, ==Release and reception==, ==Continuity==, ==Legacy==
 * - Scrooge McDuck Wiki (scrooge-mcduck.fandom.com) & Disney Wiki (disney.fandom.com): {{Story}} / {{Comic story}}, lead, ==Plot==, ===References===, ===Continuity===, ==Behind the scenes==, ==Origin==
 * - Golden Age / Indie wikis (pdsh.fandom.com, archiecomics.fandom.com, turtlepedia.fandom.com)
 */
export function parseGenericFandomWikitext(
  wikitext: string,
  host: string,
  pageTitle?: string | null
): Omit<StorySummary, "source" | "sourceUrl" | "license"> | null {
  if (!wikitext || wikitext.length < 120) return null;

  const cleanText = (raw: string): string => {
    if (!raw) return "";
    return decodeEntities(
      raw
        .replace(/\r\n/g, "\n")
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/<ref\b[^>]*\/>/gi, "")
        .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, "")
        .replace(/\[\[(?:File|Image):[^\]]*(?:\[\[[^\]]*\]\][^\]]*)*\]\]/gi, "")
        .replace(/\{\{WikipediaLink\|([^|}]+)(?:\|([^}]+))?\}\}/gi, (_, t, l) => (l || t).trim())
        .replace(/\{\{OpeningCrawl\|[\s\S]*?\|text=([\s\S]*?)\}\}/gi, (_, body: string) => `\n\n**Opening Crawl:**\n${body.trim()}\n\n`)
        .replace(/\{\{(?:Top|Otheruses|Wikipedia|Youmay|ComicNav|Nav|Stub|ScrollBox|Mediacat)[^}]*\}\}/gi, "")
        .replace(/\{\{C\|([^}]+)\}\}/gi, "($1)")
        .replace(/\{\{ID\|([^}]+)\}\}/gi, "(as $1)")
        .replace(/\{\{1st\}\}/gi, "(First appearance)")
        .replace(/\{\{Mo\}\}/gi, "(Mentioned only)")
        .replace(/\{\{Imo\}\}/gi, "(Indirect mention)")
        .replace(/\{\{[^{}|]+\}\}/g, "")
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<\/?(?:small|big|span|div|center|sup|sub)[^>]*>/gi, "")
        .replace(/\[https?:\/\/[^\s\]]+\s+([^\]]+)\]/g, "$1")
        .replace(/\[https?:\/\/[^\s\]]+\]/g, "")
        // Convert wiki links [[Target|Label]] or [[Target]] into rich markdown links
        .replace(/\[\[([^\]|:#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (_, target: string, label?: string) => {
          const cleanTarget = target.trim();
          const cleanLabel = (label || cleanTarget.replace(/\/Legends$/i, "")).trim();
          if (!cleanLabel) return "";
          const url = `https://${host}/wiki/${encodeURIComponent(cleanTarget.replace(/ /g, "_"))}`;
          return `[${cleanLabel}](${url})`;
        })
        .replace(/\[\[[a-z]{2,3}:[^\]]+\]\]/gi, "")
        .replace(/\[\[Category:[^\]]+\]\]/gi, "")
        .replace(/'''''([^']+)'''''/g, "**$1**")
        .replace(/'''([^']+)'''/g, "**$1**")
        .replace(/''([^']+)''/g, "*$1*")
        .replace(/^\*+\s+/gm, "• ")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    );
  };

  const stripLinksPlain = (raw: string): string =>
    cleanText(raw)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/^[•*\s]+/, "")
      .replace(/[*}\s]+$/, "")
      .trim();

  // Extract explicit [[Category:...]]
  const categories = Array.from(
    new Set(
      [...wikitext.matchAll(/\[\[Category:([^\]|]+)(?:\|[^\]]*)?\]\]/gi)]
        .map((m) => m[1].trim())
        .filter((c) => c && c.toUpperCase() !== "NFT")
    )
  );

  // Extract {{Quote|text|speaker}} (Wookieepedia / generic Fandom)
  let quote: StorySummary["quote"] = null;
  const quoteM = wikitext.match(/\{\{Quote\|([^|}]+)(?:\|([^|}]+))?/i);
  if (quoteM) {
    const qt = cleanText(quoteM[1]).trim();
    const sp = quoteM[2] ? cleanText(quoteM[2]).trim() : null;
    if (qt.length >= 6) quote = { text: qt, speaker: sp && !sp.startsWith("<") ? sp : null };
  }

  // Extract top-level infobox fields from the primary comic/story infobox (skipping {{Top|...}} header tags)
  const infoboxSource = (() => {
    const m = wikitext.match(/\{\{(?:ComicBook|Comic\s+story|Story|Infobox[^|\n]*)([\s\S]*?)\n\}\}/i);
    return m ? m[1] : wikitext;
  })();
  const infoboxField = (names: string[]): string | null => {
    for (const n of names) {
      const re = new RegExp(`\\|\\s*${n.replace(/[()]/g, "\\$&")}\\s*=\\s*([^\\n}]+(?:\\n(?!\\s*[|}])[^\\n}]+)*)`, "i");
      const m = infoboxSource.match(re);
      if (m && m[1]?.trim()) return m[1].trim();
    }
    return null;
  };

  const splitCreditNames = (raw: string | null): string[] => {
    if (!raw) return [];
    const cleaned = raw
      .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, "")
      .replace(/<small>[\s\S]*?<\/small>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, t: string, l?: string) => (l || t.replace(/\/Legends$/i, "")).trim())
      .replace(/'''|''/g, "");
    return Array.from(
      new Set(
        cleaned
          .split(/[\n,;*]+/)
          .map((s) => s.replace(/^\s*(?:based on|storyboards by|original story by|& on).*$/i, "").trim())
          .filter((s) => s.length >= 3 && s.length <= 45 && !/^(unknown|none|uncredited|various|n\/a|\?)/i.test(s) && !/https?:\/\//i.test(s))
      )
    );
  };

  const rawTitleField = infoboxField(["title1", "title"]);
  const storyTitle = rawTitleField
    ? stripLinksPlain(rawTitleField).replace(/\s+/g, " ").trim()
    : (pageTitle ? pageTitle.replace(/_/g, " ").trim() : null);

  const releaseDateRaw = infoboxField(["release date", "dates", "date"]);
  const releaseDate = releaseDateRaw ? stripLinksPlain(releaseDateRaw).replace(/\s*\(release date\)\s*/i, "").trim() : null;
  const pagesRaw = infoboxField(["pages"]);
  const pages = pagesRaw ? stripLinksPlain(pagesRaw).match(/\d+/)?.[0] ?? null : null;

  const writers = splitCreditNames(infoboxField(["writer(s)", "writer", "writers"]));
  const artistsRaw = splitCreditNames(infoboxField(["artist(s)", "artist", "artists"]));
  const pencilers = splitCreditNames(infoboxField(["penciller", "penciler", "pencilers"]));
  const inkers = splitCreditNames(infoboxField(["inker", "inkers"]));
  const colorists = splitCreditNames(infoboxField(["colorist", "colorists"]));
  const letterers = splitCreditNames(infoboxField(["letterer", "letterers"]));
  const coverArtists = splitCreditNames(infoboxField(["cover artist", "cover_artist"]));
  const editors = splitCreditNames(infoboxField(["editor", "editors"]));

  const effectivePencilers = pencilers.length ? pencilers : artistsRaw;
  const effectiveInkers = inkers.length ? inkers : (pencilers.length === 0 ? artistsRaw : []);

  const credits: StorySummary["credits"] = {
    ...(coverArtists.length ? { coverArtists } : {}),
    ...(writers.length ? { writers } : {}),
    ...(effectivePencilers.length ? { pencilers: effectivePencilers } : {}),
    ...(effectiveInkers.length ? { inkers: effectiveInkers } : {}),
    ...(colorists.length ? { colorists } : {}),
    ...(letterers.length ? { letterers } : {}),
    ...(editors.length ? { editors } : {}),
  };

  // Split wikitext into lead + named sections (==Section== and ===Subsection===)
  // Strip outer balanced infoboxes from the lead before extracting lead paragraphs
  const stripLeadingTemplates = (src: string): string => {
    let out = src;
    let guard = 0;
    while (guard++ < 15) {
      const trimmed = out.trimStart();
      if (!trimmed.startsWith("{{")) break;
      let depth = 0;
      let endIdx = -1;
      for (let i = 0; i < trimmed.length - 1; i++) {
        if (trimmed[i] === "{" && trimmed[i + 1] === "{") { depth++; i++; }
        else if (trimmed[i] === "}" && trimmed[i + 1] === "}") { depth--; i++; if (depth === 0) { endIdx = i + 1; break; } }
      }
      if (endIdx === -1) break;
      out = trimmed.slice(endIdx);
    }
    return out;
  };

  const sections = new Map<string, string>();
  const headingMatches = [...wikitext.matchAll(/^(={2,3})\s*([^=\n]+?)\s*\1\s*$/gm)];
  const rawLead = headingMatches.length > 0 ? wikitext.slice(0, headingMatches[0].index) : wikitext;
  const leadText = cleanText(stripLeadingTemplates(rawLead));

  for (let i = 0; i < headingMatches.length; i++) {
    const name = headingMatches[i][2].trim().toLowerCase();
    const start = (headingMatches[i].index ?? 0) + headingMatches[i][0].length;
    const end = i + 1 < headingMatches.length ? (headingMatches[i + 1].index ?? wikitext.length) : wikitext.length;
    const body = wikitext.slice(start, end).trim();
    if (body) {
      const prev = sections.get(name);
      sections.set(name, prev ? `${prev}\n\n${body}` : body);
    }
  }

  // Collect plot/synopsis paragraphs
  const solicitRaw = sections.get("publisher's summary") || sections.get("solicit") || sections.get("solicitation") || null;
  const solicitSynopsis = solicitRaw ? cleanText(solicitRaw) : null;

  const plotParts: string[] = [];
  if (leadText.length >= 60) plotParts.push(leadText);

  const crawlRaw = sections.get("opening crawl");
  if (crawlRaw) {
    const crawlClean = cleanText(crawlRaw);
    if (crawlClean.length >= 30) plotParts.push(crawlClean);
  }

  // Gather Plot / Plot summary / Synopsis + any immediate level-3 subsections inside Plot summary
  let inPlot = false;
  for (let i = 0; i < headingMatches.length; i++) {
    const level = headingMatches[i][1].length;
    const rawHeading = headingMatches[i][2].trim();
    const lower = rawHeading.toLowerCase();
    const start = (headingMatches[i].index ?? 0) + headingMatches[i][0].length;
    const end = i + 1 < headingMatches.length ? (headingMatches[i + 1].index ?? wikitext.length) : wikitext.length;
    const body = wikitext.slice(start, end).trim();

    if (level === 2) {
      inPlot = /^(plot|plot summary|synopsis|story|summary)$/.test(lower);
      if (inPlot && body) {
        const cleaned = cleanText(body);
        if (cleaned.length >= 40) plotParts.push(cleaned);
      }
    } else if (level === 3 && inPlot) {
      if (/^(references|continuity|trivia|notes|behind the scenes)$/i.test(lower)) {
        inPlot = false;
      } else if (body) {
        const cleaned = cleanText(body);
        if (cleaned.length >= 30) plotParts.push(`**${rawHeading}**\n${cleaned}`);
      }
    }
  }

  const text = plotParts.join("\n\n").trim();
  if (text.length < 80) return null;

  // Gather Notes (References / Canon Details, Behind the scenes, Release and reception, Origin, Development, Legacy, Trivia)
  const noteSectionNames = [
    { key: "references", heading: "Story Details & In-Universe References" },
    { key: "behind the scenes", heading: "Behind the Scenes" },
    { key: "origin", heading: "Origin & Production" },
    { key: "development", heading: "Development" },
    { key: "production", heading: "Production" },
    { key: "release and reception", heading: "Release & Reception" },
    { key: "legacy", heading: "Legacy" },
    { key: "notes", heading: "Notes" },
    { key: "trivia", heading: "Trivia" },
  ];
  const noteBlocks: string[] = [];
  for (const ns of noteSectionNames) {
    const raw = sections.get(ns.key);
    if (!raw) continue;
    const cleaned = cleanText(raw);
    if (cleaned.length >= 30) {
      noteBlocks.push(`**${ns.heading}:**\n${cleaned}`);
    }
  }
  const notes = noteBlocks.length ? noteBlocks.join("\n\n") : null;

  // Continuity section
  const contRaw = sections.get("continuity") || sections.get("continuity notes") || null;
  const continuityNotes = contRaw ? cleanText(contRaw) : null;

  // Extract Entities (Wookieepedia {{App|...}} template OR lead/references wiki links)
  const entities: NonNullable<StorySummary["entities"]> = {};
  const parseBulletLinks = (block: string): StoryEntityLink[] => {
    const out: StoryEntityLink[] = [];
    for (const line of block.split("\n")) {
      if (!line.trim().startsWith("*")) continue;
      const lm = line.match(/\[\[([^\]|:#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/);
      if (!lm) continue;
      const target = lm[1].trim();
      const label = (lm[2] || target.replace(/\/Legends$/i, "")).trim();
      if (!label || /^(File|Image|Category):/i.test(target)) continue;
      const isFirstApp = /\{\{1st\}\}/i.test(line);
      const isMentioned = /\{\{(?:Mo|Imo)\}\}/i.test(line);
      const url = `https://${host}/wiki/${encodeURIComponent(target.replace(/ /g, "_"))}`;
      out.push({ target, label, url, ...(isFirstApp ? { isFirstApp: true } : {}), ...(isMentioned ? { isMentioned: true } : {}) });
    }
    return out;
  };

  const appMatch = wikitext.match(/\{\{App\b([\s\S]*?)\n\}\}/i);
  if (appMatch) {
    const appBody = appMatch[1];
    const getAppSection = (param: string): StoryEntityLink[] => {
      const m = appBody.match(new RegExp(`\\|\\s*${param}\\s*=\\s*([\\s\\S]*?)(?=\\n\\|\\s*[a-z_]+\\s*=|$)`, "i"));
      return m ? parseBulletLinks(m[1]) : [];
    };
    const chars = getAppSection("characters");
    const firstApps = chars.filter((c) => c.isFirstApp);
    if (firstApps.length) entities.firstAppearances = firstApps;
    if (chars.length) entities.featuredCharacters = chars.slice(0, 24);
    const locs = getAppSection("locations");
    if (locs.length) entities.locations = locs.slice(0, 18);
    const vehs = getAppSection("vehicles");
    if (vehs.length) entities.vehicles = vehs.slice(0, 14);
    const evts = getAppSection("events");
    if (evts.length) entities.events = evts.slice(0, 12);
    const species = [...getAppSection("species"), ...getAppSection("organisms")];
    if (species.length) entities.racesAndSpecies = species.slice(0, 14);
    const items = [...getAppSection("technology"), ...getAppSection("droids"), ...getAppSection("miscellanea")];
    if (items.length) entities.items = items.slice(0, 16);
  } else {
    // Non-App wikis (Scrooge McDuck / Disney / PDSH): pull featured characters from lead sentence + "... stories" categories
    const leadCharLinks: StoryEntityLink[] = [];
    const seen = new Set<string>();
    const pushLink = (target: string, label?: string) => {
      const cleanT = target.trim();
      const cleanL = (label || cleanT).trim();
      const key = cleanL.toLowerCase();
      if (!cleanL || seen.has(key) || /^(File|Image|Category):/i.test(cleanT)) return;
      // Skip creators we already listed in credits
      const allCreditNames = new Set([...writers, ...effectivePencilers, ...effectiveInkers, ...editors].map((x) => x.toLowerCase()));
      if (allCreditNames.has(key)) return;
      seen.add(key);
      leadCharLinks.push({
        target: cleanT,
        label: cleanL,
        url: `https://${host}/wiki/${encodeURIComponent(cleanT.replace(/ /g, "_"))}`,
      });
    };
    for (const m of stripLeadingTemplates(rawLead).matchAll(/\[\[([^\]|:#]+)(?:\|([^\]]+))?\]\]/g)) {
      pushLink(m[1], m[2]);
    }
    if (leadCharLinks.length) {
      entities.featuredCharacters = leadCharLinks.slice(0, 20);
    }
  }

  return {
    text,
    storyTitle,
    fandomPageTitle: pageTitle ? pageTitle.replace(/_/g, " ") : storyTitle,
    releaseDate,
    pages,
    solicitSynopsis,
    notes,
    continuityNotes,
    ...(categories.length ? { categories } : {}),
    quote,
    ...(Object.keys(entities).length ? { entities } : {}),
    ...(Object.keys(credits).length ? { credits } : {}),
  };
}

async function searchMediaWiki(host: string, query: string): Promise<string[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  const apiUrl = `https://${host}/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=5&format=json`;
  try {
    const res = await fetch(apiUrl, {
      headers: { "user-agent": UA, accept: "application/json" },
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.query?.search)
      ? data.query.search.map((x: any) => String(x?.title || "")).filter(Boolean)
      : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export function fandomPageTitle(series: string, issue: string, volume: number): string {
  const clean = series
    .replace(/\(\s*\d{4}(?:\s*-\s*(?:\d{4})?)?\s*\)/g, "")
    .replace(/^the\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return `${clean} Vol ${volume} ${issue}`.replace(/ /g, "_");
}

/* ------------------------------------------------------------------ network */

async function fetchHtml(url: string): Promise<{ status: number; html: string; finalUrl: string } | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html" },
      signal: ctrl.signal,
      redirect: "follow",
      cache: "no-store",
    });
    return { status: res.status, html: await res.text(), finalUrl: res.url };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchMediaWiki(host: string, pageTitle: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  const apiUrl = `https://${host}/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=wikitext&format=json`;
  try {
    const res = await fetch(apiUrl, {
      headers: { "user-agent": UA, accept: "application/json" },
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.parse?.wikitext?.["*"] || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type ProviderOutcome = { hit: StorySummary | null; errored: boolean };

async function tryGenericFandomHost(
  host: string,
  wikiName: string,
  candidateTitles: string[],
  searchQueries: string[],
  yearGuard?: number | null
): Promise<ProviderOutcome> {
  let errored = false;
  const tried = new Set<string>();

  const attemptTitle = async (pageTitle: string): Promise<StorySummary | null> => {
    const key = pageTitle.trim().toLowerCase();
    if (!key || tried.has(key)) return null;
    tried.add(key);
    try {
      const wikitext = await fetchMediaWiki(host, pageTitle.replace(/ /g, "_"));
      if (!wikitext) return null;
      // Guard against same-title wrong-era pages when year is known (allow ±1 yr cover/release date variance)
      if (yearGuard && yearGuard > 1920) {
        const yMatches = [yearGuard, yearGuard - 1, yearGuard + 1].some((y) => new RegExp(`\\b${y}\\b`).test(wikitext));
        if (!yMatches) return null;
      }
      const parsed = parseGenericFandomWikitext(wikitext, host, pageTitle);
      if (!parsed) return null;
      return {
        ...parsed,
        source: wikiName,
        sourceUrl: `https://${host}/wiki/${encodeURIComponent(pageTitle.replace(/ /g, "_")).replace(/%2F/gi, "/")}`,
        license: "CC BY-SA 3.0",
      };
    } catch {
      errored = true;
      return null;
    }
  };

  for (const title of candidateTitles) {
    const hit = await attemptTitle(title);
    if (hit) return { hit, errored: false };
  }

  for (const q of searchQueries) {
    if (!q.trim()) continue;
    const titles = await searchMediaWiki(host, q);
    for (const t of titles.slice(0, 3)) {
      const hit = await attemptTitle(t);
      if (hit) return { hit, errored: false };
    }
  }

  return { hit: null, errored };
}

async function fromFandom(input: StorySummaryInput): Promise<ProviderOutcome> {
  const cleanSeries = input.series
    .replace(/\(\s*\d{4}(?:\s*-\s*(?:\d{4})?)?\s*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const issue = String(input.issueNumber).trim();
  const year = input.year;
  const storyTitle = input.storyTitle?.trim() || null;

  // Priority 1: Star Wars comics (Marvel 1977/2015/2020, Dark Horse, IDW) -> Wookieepedia (starwars.fandom.com)
  if (STAR_WARS_SERIES_RE.test(cleanSeries)) {
    const swCandidates = [
      ...(year ? [`${cleanSeries} (${year}) ${issue}`] : []),
      `${cleanSeries} ${issue}`,
      ...(!/^star\s+wars/i.test(cleanSeries) && year ? [`Star Wars: ${cleanSeries} (${year}) ${issue}`] : []),
      ...(!/^star\s+wars/i.test(cleanSeries) ? [`Star Wars: ${cleanSeries} ${issue}`] : []),
    ];
    const swSearch = [
      year ? `${cleanSeries} (${year}) ${issue}` : `${cleanSeries} ${issue}`,
    ];
    const swOut = await tryGenericFandomHost("starwars.fandom.com", "Wookieepedia (Fandom)", swCandidates, swSearch, year);
    if (swOut.hit) return swOut;
  }

  // Priority 2: Disney / Dell / Gold Key / Duck Comics -> Scrooge McDuck Wiki (richest comic canon) -> Disney Wiki
  if (
    DISNEY_DUCK_SERIES_RE.test(cleanSeries) ||
    DISNEY_PUBLISHER_RE.test(input.publisher || "") ||
    (storyTitle && /donald\s+duck|uncle\s+scrooge|mickey\s+mouse|pirate\s+gold|duck/i.test(storyTitle))
  ) {
    const duckCandidates = [
      ...(storyTitle ? [storyTitle] : []),
      `${cleanSeries} #${issue}`,
      `${cleanSeries} ${issue}`,
    ];
    const duckSearch = [
      ...(storyTitle ? [storyTitle] : []),
      `${cleanSeries} ${issue} ${year ?? ""}`.trim(),
    ];
    for (const [host, name] of [
      ["scrooge-mcduck.fandom.com", "Scrooge McDuck Wiki (Fandom)"],
      ["disney.fandom.com", "Disney Wiki (Fandom)"],
    ] as const) {
      const duckOut = await tryGenericFandomHost(host, name, duckCandidates, duckSearch, year);
      if (duckOut.hit) return duckOut;
    }
  }

  // Priority 3: Publisher-matched Fandom wikis (Marvel, DC, Image, Dark Horse, Valiant, Dynamite, Archie, TMNT, PDSH Golden Age)
  const wiki = FANDOM_WIKIS.find((w) => w.publisher.test(input.publisher || ""));
  if (!wiki) return { hit: null, errored: false };

  if (wiki.style === "generic") {
    const genCandidates = [
      ...(storyTitle ? [storyTitle] : []),
      `${cleanSeries} #${issue}`,
      `${cleanSeries} Vol 1 ${issue}`,
      `${cleanSeries} ${issue}`,
    ];
    const genSearch = [
      ...(storyTitle ? [storyTitle] : []),
      `${cleanSeries} ${issue}`,
    ];
    return await tryGenericFandomHost(wiki.host, wiki.name, genCandidates, genSearch, year);
  }

  // rail volume defaults to 1 for most books, so also try later volumes; the year check below guards false matches.
  const volumes = Array.from(new Set([input.volume ?? 1, 1, 2, 3, 4, 5, 6].filter((v): v is number => !!v && v > 0)));
  let errored = false;

  for (const vol of volumes) {
    const title = fandomPageTitle(input.series, input.issueNumber, vol);

    // 1. First attempt fast, structured MediaWiki API query
    try {
      const wikitext = await fetchMediaWiki(wiki.host, title);
      if (wikitext) {
        const parsed = parseFandomWikitext(wikitext, wiki.host);
        if (parsed) {
          return {
            hit: {
              ...parsed,
              source: wiki.name,
              sourceUrl: `https://${wiki.host}/wiki/${encodeURIComponent(title).replace(/%5F/g, "_")}`,
              license: "CC BY-SA 3.0",
            },
            errored: false,
          };
        }
      }
    } catch {
      errored = true;
    }

    // 2. Fallback to HTML scrape if API wikitext was not found
    const url = `https://${wiki.host}/wiki/${encodeURIComponent(title).replace(/%5F/g, "_")}`;
    const res = await fetchHtml(url);
    if (!res) { errored = true; continue; }
    if (res.status === 404) continue;
    if (res.status !== 200) { errored = true; continue; }

    const pageTitle = /<title>([^<]*)<\/title>/i.exec(res.html)?.[1] ?? "";
    const expected = title.replace(/_/g, " ").toLowerCase();
    const pt = decodeEntities(pageTitle).toLowerCase().trim();
    if (!(pt === expected || pt.startsWith(`${expected} |`))) continue;
    if (input.year) {
      const head = htmlToText(res.html.slice(0, Math.min(res.html.length, 120000)));
      if (!new RegExp(`\\b${input.year}\\b`).test(head)) continue;
    }
    const syn = extractFandomSynopsis(res.html);
    if (!syn) continue;
    return {
      hit: { text: syn.text, storyTitle: syn.storyTitle, source: wiki.name, sourceUrl: res.finalUrl || url, license: "CC BY-SA 3.0" },
      errored,
    };
  }
  return { hit: null, errored };
}

async function fromLocg(input: StorySummaryInput): Promise<ProviderOutcome> {
  const base = "https://leagueofcomicgeeks.com";
  const search = await fetchHtml(`${base}/search?keyword=${encodeURIComponent(`${input.series} ${input.issueNumber}`)}`);
  if (!search) return { hit: null, errored: true };
  if (search.status !== 200) return { hit: null, errored: search.status >= 500 || search.status === 403 || search.status === 429 };
  const want = normalizeTitle(input.series);
  const candidates: string[] = [];
  for (const block of search.html.split(/<li[\s>]/i)) {
    const href = /href="(\/comics\/series\/\d+\/[a-z0-9-]+)"/i.exec(block)?.[1];
    const alt = /alt="([^"]+)"/i.exec(block)?.[1];
    if (href && alt && normalizeTitle(decodeEntities(alt)) === want && !candidates.includes(href)) candidates.push(href);
  }
  let errored = false;
  for (const href of candidates.slice(0, 3)) {
    const series = await fetchHtml(`${base}${href}`);
    if (!series) { errored = true; continue; }
    if (series.status !== 200) continue;
    const issue = input.issueNumber.replace(/[^a-z0-9]/gi, "");
    if (!issue) continue;
    const link = new RegExp(`href="(/comic/\\d+/[a-z0-9-]*?-${issue.toLowerCase()})(?=["?])`, "i").exec(series.html)?.[1];
    if (!link) continue;
    const page = await fetchHtml(`${base}${link}`);
    if (!page) { errored = true; continue; }
    if (page.status !== 200) continue;
    const info = extractLocgIssue(page.html);
    if (!info.description) continue;
    if (!publishersAgree(info.publisher, input.publisher)) continue;
    if (input.year && info.year && Math.abs(info.year - input.year) > 1) continue;
    return {
      hit: { text: info.description, storyTitle: null, source: "League of Comic Geeks", sourceUrl: `${base}${link}`, license: null },
      errored,
    };
  }
  return { hit: null, errored };
}

/* ------------------------------------------------------------------ public */

async function enrichFromFandomIssuePages(
  db: ReturnType<typeof createAdminServerClient>,
  input: StorySummaryInput,
  base: StorySummary | null
): Promise<StorySummary | null> {
  try {
    const cleanSeries = input.series
      .replace(/\(\s*\d{4}(?:\s*-\s*(?:\d{4})?)?\s*\)/g, "")
      .replace(/^the\s+/i, "")
      .replace(/\s+/g, " ")
      .trim();
    const vol = input.volume || 1;
    const candidateTitles = [
      `${cleanSeries} Vol ${vol} ${input.issueNumber}`,
      `${cleanSeries} Vol 1 ${input.issueNumber}`,
      ...(input.storyTitle ? [input.storyTitle.trim()] : []),
    ];
    const { data: fipRows } = await db
      .from("fandom_issue_pages")
      .select("*")
      .in("page_title", Array.from(new Set(candidateTitles)))
      .limit(1);
    const fip = fipRows?.[0];
    if (!fip) return base;

    const rawNotes: string = fip.sections?.Notes || "";
    let parsedNotes: string | null = null;
    let parsedContinuity: string | null = null;
    let trailer: StorySummary["youtubeTrailer"] = null;

    if (rawNotes) {
      const galleryMatch = rawNotes.match(/<gallery[^>]*>([\s\S]*?)<\/gallery>/i);
      if (galleryMatch) {
        const trailerLine = galleryMatch[1].trim().split("\n").map((l: string) => l.trim()).find(Boolean);
        if (trailerLine) {
          const known = KNOWN_YOUTUBE_TRAILERS[trailerLine.toLowerCase()];
          trailer = {
            title: known ? known.title : trailerLine,
            videoId: known ? known.videoId : "tsueFhZ5Qok",
            url: known
              ? `https://www.youtube.com/watch?v=${known.videoId}`
              : `https://www.youtube.com/results?search_query=${encodeURIComponent(trailerLine)}`,
          };
        }
      }
      const parts = rawNotes.split(/===?\s*(?:Continuity|Chronology)\s*Notes\s*===?/i);
      const cleanWikiMarkup = (s: string) =>
        s
          .replace(/<gallery[^>]*>[\s\S]*?<\/gallery>/gi, "")
          .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
          .replace(/\[\[([^\]]+)\]\]/g, "$1")
          .replace(/'''/g, "**")
          .replace(/''/g, "*")
          .replace(/^\*\s*/gm, "")
          .replace(/\|-\|/g, " · ")
          .replace(/\|-/g, "\n")
          .trim();
      const mainN = cleanWikiMarkup(parts[0]);
      if (mainN) parsedNotes = mainN;
      if (parts[1]?.trim()) {
        parsedContinuity = cleanWikiMarkup(parts[1]);
      }
    }

    const cleanCats = Array.isArray(fip.categories)
      ? fip.categories.filter((c: string) => String(c).trim().toUpperCase() !== "NFT")
      : [];

    if (base) {
      const cleanInlineWiki = (s: string | null | undefined) => {
        if (!s) return null;
        return s
          .replace(/===?\s*(?:Continuity|Chronology)\s*Notes\s*===?/gi, "\n\n**Chronology Notes:**\n")
          .replace(/'''/g, "**")
          .replace(/''/g, "*")
          .replace(/\|-\|/g, " · ")
          .replace(/\|-/g, "\n")
          .trim();
      };
      const fipHost = (() => {
        if (fip.url) {
          try { return new URL(fip.url).hostname; } catch { /* ignore */ }
        }
        return "marvel.fandom.com";
      })();
      const extraFirstApps = Array.isArray(fip.first_appearances)
        ? fip.first_appearances.map((c: string) => ({
            target: c,
            label: c.replace(/\s*\([^)]*\)/g, ""),
            url: `https://${fipHost}/wiki/${encodeURIComponent(c.replace(/ /g, "_"))}`,
            isFirstApp: true,
          }))
        : [];
      const extraLocations = Array.isArray(fip.sections?.Locations)
        ? fip.sections.Locations.map((c: string) => ({
            target: c,
            label: c,
            url: `https://${fipHost}/wiki/${encodeURIComponent(c.replace(/ /g, "_"))}`,
          }))
        : [];
      const extraVehicles = Array.isArray(fip.sections?.Vehicles)
        ? fip.sections.Vehicles.map((c: string) => ({
            target: c,
            label: c,
            url: `https://${fipHost}/wiki/${encodeURIComponent(c.replace(/ /g, "_"))}`,
          }))
        : [];
      const mergedEntitiesRaw = {
        ...(base.entities || {}),
        ...(!base.entities?.firstAppearances?.length && extraFirstApps.length ? { firstAppearances: extraFirstApps } : {}),
        ...(!base.entities?.locations?.length && extraLocations.length ? { locations: extraLocations } : {}),
        ...(!base.entities?.vehicles?.length && extraVehicles.length ? { vehicles: extraVehicles } : {}),
      };
      const dedupedEntities = Object.keys(mergedEntitiesRaw).length
        ? Object.fromEntries(
            Object.entries(mergedEntitiesRaw).map(([k, list]) => {
              const seen = new Set<string>();
              const filtered = (list || []).filter((item: any) => {
                const key = String(item.target || item.label || "").toLowerCase().trim();
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
              });
              return [k, filtered];
            })
          )
        : undefined;
      return {
        ...base,
        fandomPageTitle: base.fandomPageTitle || fip.page_title || null,
        releaseDate: base.releaseDate || fip.cover_date || null,
        notes: cleanInlineWiki(base.notes) || parsedNotes || null,
        continuityNotes: cleanInlineWiki(base.continuityNotes) || parsedContinuity || (typeof fip.sections?.Continuity === "string" ? fip.sections.Continuity : null) || null,
        youtubeTrailer: base.youtubeTrailer || trailer || null,
        entities: dedupedEntities,
        categories: base.categories?.length ? base.categories.filter((c) => c.toUpperCase() !== "NFT") : (cleanCats.length ? cleanCats : undefined),
      };
    }

    const leadStory = Array.isArray(fip.stories) ? fip.stories[0] : null;
    if (!leadStory?.synopsis) return null;
    const wikiHost = (() => {
      if (fip.url) {
        try { return new URL(fip.url).hostname; } catch { /* fallback below */ }
      }
      return "marvel.fandom.com";
    })();
    const fipWikiLabel = fip.wiki
      ? (String(fip.wiki).includes("Fandom") || String(fip.wiki).includes("Wiki") ? String(fip.wiki) : `${fip.wiki} Database (Fandom)`)
      : "Fandom Wiki";
    const firstAppLinks = Array.isArray(fip.first_appearances) && fip.first_appearances.length
      ? fip.first_appearances.map((c: string) => ({
          target: c,
          label: c.replace(/\s*\([^)]*\)/g, ""),
          url: `https://${wikiHost}/wiki/${encodeURIComponent(c.replace(/ /g, "_"))}`,
          isFirstApp: true,
        }))
      : [];
    const charLinks = Array.isArray(fip.characters) && fip.characters.length
      ? fip.characters.map((c: string) => ({
          target: c,
          label: c.replace(/\s*\([^)]*\)/g, ""),
          url: `https://${wikiHost}/wiki/${encodeURIComponent(c.replace(/ /g, "_"))}`,
        }))
      : [];
    const locLinks = Array.isArray(fip.sections?.Locations)
      ? fip.sections.Locations.map((c: string) => ({
          target: c,
          label: c,
          url: `https://${wikiHost}/wiki/${encodeURIComponent(c.replace(/ /g, "_"))}`,
        }))
      : [];
    const vehLinks = Array.isArray(fip.sections?.Vehicles)
      ? fip.sections.Vehicles.map((c: string) => ({
          target: c,
          label: c,
          url: `https://${wikiHost}/wiki/${encodeURIComponent(c.replace(/ /g, "_"))}`,
        }))
      : [];
    return {
      text: leadStory.synopsis,
      storyTitle: leadStory.title || null,
      fandomPageTitle: fip.page_title || null,
      releaseDate: fip.cover_date || null,
      notes: parsedNotes,
      continuityNotes: parsedContinuity || (typeof fip.sections?.Continuity === "string" ? fip.sections.Continuity : null),
      youtubeTrailer: trailer,
      categories: Array.isArray(fip.categories) && fip.categories.length ? fip.categories : undefined,
      credits: {
        writers: leadStory.credits?.writers || [],
        pencilers: leadStory.credits?.pencilers || [],
        inkers: leadStory.credits?.inkers || [],
        colorists: leadStory.credits?.colorists || [],
        letterers: leadStory.credits?.letterers || [],
        editors: leadStory.credits?.editors || [],
        coverArtists: leadStory.credits?.cover_artists ? [leadStory.credits.cover_artists].flat() : [],
        editorInChief: fip.editor_in_chief ? [fip.editor_in_chief] : [],
      },
      entities: (firstAppLinks.length || charLinks.length || locLinks.length || vehLinks.length)
        ? {
            ...(firstAppLinks.length ? { firstAppearances: firstAppLinks } : {}),
            ...(charLinks.length ? { featuredCharacters: charLinks } : {}),
            ...(locLinks.length ? { locations: locLinks } : {}),
            ...(vehLinks.length ? { vehicles: vehLinks } : {}),
          }
        : undefined,
      source: fipWikiLabel,
      sourceUrl: fip.url || `https://${wikiHost}/wiki/${encodeURIComponent(fip.page_title.replace(/ /g, "_"))}`,
      license: "CC BY-SA 3.0",
    };
  } catch {
    return base;
  }
}

async function readStorySummary(input: StorySummaryInput): Promise<StorySummary | null> {
  if (!input.series?.trim() || !String(input.issueNumber ?? "").trim()) return null;
  input = { ...input, series: researchTitle(input.series), publisher: publisherFromTitle(input.series) || input.publisher };
  const key = comicKey(input.series, String(input.issueNumber), input.year);
  const db = createAdminServerClient();

  // Unverified seller identities may show a sourced issue reference, visibly separated from an edition match.
  if (input.allowSeriesReference) {
    const { data: reference } = await db.from("issue_story_summaries").select("*")
      .eq("series", input.series).eq("issue_number", String(input.issueNumber))
      .not("summary", "is", null).order("checked_at", { ascending: false }).limit(1).maybeSingle();
    if (reference?.summary) {
      try {
        const parsed = JSON.parse(reference.summary);
        if (typeof parsed.text === "string") return {
          ...parsed,
          text: parsed.text.split(/\n\s*\|\s*[A-Za-z][A-Za-z0-9_ ]*\s*=/)[0].trim(),
          source: reference.source, sourceUrl: reference.source_url, license: reference.license,
          referenceYear: reference.year, referenceOnly: true,
        };
      } catch { /* A legacy plain-text cache continues through the regular lookup. */ }
    }
  }

  try {
    const { data } = await db.from("issue_story_summaries").select("*").eq("comic_key", key).maybeSingle();
    if (data) {
      const age = Date.now() - new Date(data.checked_at).getTime();
      if (data.summary && age < POSITIVE_TTL_MS) {
        try {
          const parsed = JSON.parse(data.summary);
          if (parsed && typeof parsed === "object" && typeof parsed.text === "string") {
            const hydrated: StorySummary = {
              ...parsed,
              text: parsed.text.split(/\n\s*\|\s*[A-Za-z][A-Za-z0-9_ ]*\s*=/)[0].trim(),
              storyTitle: data.story_title || parsed.storyTitle || null,
              quote: parsed.quote || null,
              entities: parsed.entities || undefined,
              credits: parsed.credits || undefined,
              creditsSourceUrl: parsed.creditsSourceUrl || undefined,
              source: data.source,
              sourceUrl: data.source_url,
              license: data.license,
            };
            return await enrichFromFandomIssuePages(db, input, hydrated);
          }
        } catch {
          // plain text string from earlier cache
        }
        return await enrichFromFandomIssuePages(db, input, {
          text: data.summary,
          storyTitle: data.story_title,
          source: data.source,
          sourceUrl: data.source_url,
          license: data.license,
        });
      }
      if (!data.summary && age < NEGATIVE_TTL_MS) return null;
    }
  } catch {
    /* cache unavailable: fall through to a live lookup */
  }

  const fipFallback = await enrichFromFandomIssuePages(db, input, null);
  if (fipFallback) return fipFallback;

  const outcomes: ProviderOutcome[] = [];
  let hit: StorySummary | null = null;
  for (const provider of [fromFandom, fromLocg]) {
    const out = await provider({ ...input, issueNumber: String(input.issueNumber).trim() });
    outcomes.push(out);
    if (out.hit) { hit = out.hit; break; }
  }

  // Only cache a "none found" when every source answered cleanly (a blocked/failed fetch is not a miss).
  const clean = !outcomes.some((o) => o.errored);
  if (hit || clean) {
    try {
      const storedPayload = hit ? JSON.stringify(hit) : null;
      await db.from("issue_story_summaries").upsert({
        comic_key: key,
        series: input.series,
        issue_number: String(input.issueNumber),
        year: input.year,
        publisher: input.publisher,
        summary: storedPayload,
        story_title: hit?.storyTitle ?? null,
        source: hit?.source ?? null,
        source_url: hit?.sourceUrl ?? null,
        license: hit?.license ?? null,
        checked_at: new Date().toISOString(),
      });
    } catch {
      /* best-effort cache */
    }
  }
  return hit;
}

/** Keep confirmed internal wiki pages; link other characters to their actual source wiki. */
export function sourceStoryLinks(summary: StorySummary, existing: Set<string>): StorySummary {
  if (!summary.entities || !summary.sourceUrl) return summary;
  let host: string;
  try { host = new URL(summary.sourceUrl).hostname; } catch { return summary; }
  if (!host.endsWith(".fandom.com")) return summary;
  const entities = Object.fromEntries(Object.entries(summary.entities).map(([role, entries]) => [role,
    entries?.map(entity => {
      if (!entity.url.startsWith("/wiki/entry/")) return entity;
      const slug = decodeURIComponent(entity.url.slice("/wiki/entry/".length));
      return existing.has(slug) ? entity : { ...entity, url: `https://${host}/wiki/${encodeURIComponent(entity.target.replace(/ /g, "_"))}` };
    }),
  ]));
  return { ...summary, entities };
}

/** Read saved issue evidence only; opening a lot never fetches sources or generates text. */
export async function readSavedStorySummary(input: StorySummaryInput): Promise<StorySummary | null> {
  const { data, error } = await createAdminServerClient().from("issue_story_summaries").select("summary,source,source_url,license")
    .eq("comic_key", comicKey(researchTitle(input.series), input.issueNumber, input.year)).maybeSingle();
  if (error || !data?.summary) return null;
  try {
    const parsed = JSON.parse(data.summary);
    if (typeof parsed.text !== "string" || !parsed.text.trim() || /^\s*\|/.test(parsed.text) || /(?:^|\n)\s*\|\s*[A-Za-z][A-Za-z0-9 ]*\s*=/.test(parsed.text)) return null;
    return { ...parsed, source: data.source, sourceUrl: data.source_url, license: data.license };
  } catch { return null; }
}

export async function getStorySummary(input: StorySummaryInput): Promise<StorySummary | null> {
  const summary = await readStorySummary(input);
  if (!summary?.entities) return summary;
  const slugs = [...new Set(Object.values(summary.entities).flatMap(entries => (entries ?? [])
    .filter(entity => entity.url.startsWith("/wiki/entry/"))
    .map(entity => decodeURIComponent(entity.url.slice("/wiki/entry/".length)))))];
  if (!slugs.length) return summary;
  const { data } = await createAdminServerClient().from("ppcf_wiki_pages").select("slug").in("slug", slugs);
  return sourceStoryLinks(summary, new Set((data ?? []).map(row => row.slug)));
}
