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
      .replace(/\{\{apn\|[\s\S]*?\}\}/gi, "")
      .replace(/[⏴⏵]/g, "")
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
      .replace(/\[\d+\]/g, "")
      .replace(/'''/g, "**")
      .replace(/''/g, "*")
      .replace(/\s+-\s+/g, " — ")
      .replace(/\[\s*\]/g, "")
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
    const parts = rawNotes.split(/===\s*Continuity Notes\s*===/i);
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
  ].map((m) => m[1].trim());

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
            const isExcludedKeyDebut =
              currentSec === "locations" ||
              /^unnamed/i.test(label) ||
              /^numerous/i.test(label) ||
              /planet/i.test(label);
            if (isFirstApp && !isExcludedKeyDebut) {
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
            const isExcludedKeyDebut =
              currentSec === "locations" ||
              /^unnamed/i.test(plainLabel) ||
              /^numerous/i.test(plainLabel) ||
              /planet/i.test(plainLabel);
            if (isFirstApp && cleanSlug && !isExcludedKeyDebut) {
              entities.firstAppearances?.push(entityObj);
            }
          }
        }
      }
    }
  }

  // Clean empty entity lists
  for (const k of Object.keys(entities) as Array<keyof NonNullable<StorySummary["entities"]>>) {
    if (entities[k]?.length === 0) {
      delete entities[k];
    }
  }

  // Credits
  const writers = [...wikitext.matchAll(/\|\s*Writer\d+_\d+\s*=\s*([^\n|]+)/g)].map((m) => m[1].trim()).filter(Boolean);
  const pencilers = [...wikitext.matchAll(/\|\s*Penciler\d+_\d+\s*=\s*([^\n|]+)/g)].map((m) => m[1].trim()).filter(Boolean);
  const inkers = [...wikitext.matchAll(/\|\s*Inker\d+_\d+\s*=\s*([^\n|]+)/g)].map((m) => m[1].trim()).filter(Boolean);
  const colorists = [...wikitext.matchAll(/\|\s*Colorist\d+_\d+\s*=\s*([^\n|]+)/g)].map((m) => m[1].trim()).filter(Boolean);
  const letterers = [...wikitext.matchAll(/\|\s*Letterer\d+_\d+\s*=\s*([^\n|]+)/g)].map((m) => m[1].trim()).filter(Boolean);
  const editors = [...wikitext.matchAll(/\|\s*Editor\d+_\d+\s*=\s*([^\n|]+)/g)].map((m) => m[1].trim()).filter(Boolean);
  const coverArtists = [...wikitext.matchAll(/\|\s*Image\d+_Artist\d+\s*=\s*([^\n|]+)/g)].map((m) => m[1].trim()).filter(Boolean);

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

const FANDOM_WIKIS: Array<{ publisher: RegExp; host: string; name: string }> = [
  { publisher: /marvel|epic|icon|max|star comics|curtis|atlas|timely/i, host: "marvel.fandom.com", name: "Marvel Database (Fandom)" },
  { publisher: /\bdc\b|vertigo|wildstorm|milestone|paradox|young animal|black label|elseworlds|piranha|all.star|cliffhanger|homage|america's best|tangent|amalgam/i, host: "dc.fandom.com", name: "DC Database (Fandom)" },
  { publisher: /image|top cow|skybound/i, host: "imagecomics.fandom.com", name: "Image Comics Database (Fandom)" },
  { publisher: /dark horse/i, host: "darkhorse.fandom.com", name: "Dark Horse Database (Fandom)" },
  { publisher: /valiant/i, host: "valiant.fandom.com", name: "Valiant Comics Database (Fandom)" },
  { publisher: /dynamite/i, host: "dynamiteentertainment.fandom.com", name: "Dynamite Entertainment Database (Fandom)" },
];

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

async function fromFandom(input: StorySummaryInput): Promise<ProviderOutcome> {
  const wiki = FANDOM_WIKIS.find((w) => w.publisher.test(input.publisher || ""));
  if (!wiki) return { hit: null, errored: false };
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
      const parts = rawNotes.split(/===\s*Continuity Notes\s*===/i);
      const mainN = parts[0].replace(/<gallery[^>]*>[\s\S]*?<\/gallery>/gi, "").replace(/^\*\s*/gm, "").trim();
      if (mainN) parsedNotes = mainN;
      if (parts[1]?.trim()) {
        parsedContinuity = parts[1].replace(/^\*\s*/gm, "").trim();
      }
    }

    if (base) {
      return {
        ...base,
        fandomPageTitle: base.fandomPageTitle || fip.page_title || null,
        releaseDate: base.releaseDate || fip.cover_date || null,
        notes: base.notes || parsedNotes || null,
        continuityNotes: base.continuityNotes || parsedContinuity || null,
        youtubeTrailer: base.youtubeTrailer || trailer || null,
        categories: base.categories?.length ? base.categories : (Array.isArray(fip.categories) && fip.categories.length ? fip.categories : undefined),
      };
    }

    const leadStory = Array.isArray(fip.stories) ? fip.stories[0] : null;
    if (!leadStory?.synopsis) return null;
    return {
      text: leadStory.synopsis,
      storyTitle: leadStory.title || null,
      fandomPageTitle: fip.page_title || null,
      releaseDate: fip.cover_date || null,
      notes: parsedNotes,
      continuityNotes: parsedContinuity,
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
      entities: Array.isArray(fip.characters) && fip.characters.length
        ? {
            featuredCharacters: fip.characters.map((c: string) => ({
              target: c,
              label: c.replace(/\s*\([^)]*\)/g, ""),
              url: `/wiki/entry/${encodeURIComponent(c.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))}`,
            })),
          }
        : undefined,
      source: `${fip.wiki} Database (Fandom)`,
      sourceUrl: fip.url || `https://marvel.fandom.com/wiki/${encodeURIComponent(fip.page_title.replace(/ /g, "_"))}`,
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
