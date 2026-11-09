import { CORE_CANON_DICTIONARY } from "@/lib/lexicon/core-canon-dictionary";

export interface WikiLookupResult {
  term: string;
  slug: string;
  category: string;
  definition: string;
  translation: string;
  type: "lexicon" | "character" | "creator" | "artifact" | "team" | "location";
  universe?: string;
  role?: string;
  creators?: string;
  firstAppearance?: string;
  comicExample?: string;
  canonicalFormula?: string;
  sourceDb: string;
  url: string;
}

// The former local SQLite wiki dumps (financial_glossary_dump/*.db, marvel_database_dump,
// dc_database_dump, publisher_dumps/starwars) are not part of the repository or the deployed
// runtime, and there is no Supabase equivalent wired here. Those lookups now return null (no data);
// only the in-memory CORE_CANON_DICTIONARY remains as a source.

/**
 * Look up comic market principles & financial definitions from CBR Lexicon (4,654 terms)
 */
export function lookupCbrLexicon(term: string): WikiLookupResult | null {
  const cleanTerm = term.trim();
  const slug = cleanTerm.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  // Check in-memory Core Canon Dictionary first
  const coreEntry = CORE_CANON_DICTIONARY[slug] || CORE_CANON_DICTIONARY[cleanTerm.toLowerCase()];
  if (coreEntry) {
    return {
      term: coreEntry.term,
      slug: coreEntry.slug,
      category: coreEntry.category || "Equities & Market Mechanics",
      definition: coreEntry.investopedia_definition || "Core financial market principle.",
      translation: coreEntry.panel_profits_translation || "Sequential art underwriting application.",
      type: "lexicon",
      comicExample: coreEntry.comic_example || undefined,
      canonicalFormula: coreEntry.canonical_formula || undefined,
      sourceDb: "core_canon_lexicon",
      url: `/wiki/terms/${coreEntry.slug}`,
    };
  }

  return null;
}

/**
 * Look up financial terms from Investopedia (4,642 terms)
 */
export function lookupInvestopedia(_term: string): WikiLookupResult | null {
  // Local SQLite source removed; no Supabase source exists.
  return null;
}

/**
 * Look up character, creator, item, or team in Marvel Database (130,000+ entities)
 */
export function lookupMarvelDatabase(_name: string, _typeHint?: string): WikiLookupResult | null {
  // Local SQLite source removed; no Supabase source exists.
  return null;
}

/**
 * Look up character, creator, item, or team in DC Database (39,000+ entities)
 */
export function lookupDcDatabase(_name: string): WikiLookupResult | null {
  // Local SQLite source removed; no Supabase source exists.
  return null;
}

/**
 * Look up character in Star Wars Database (44,162 characters)
 */
export function lookupStarWarsDatabase(_name: string): WikiLookupResult | null {
  // Local SQLite source removed; no Supabase source exists.
  return null;
}

/**
 * Master multi-universe and financial lexicon lookup engine.
 * Cascades across 1.8M local Fandom pages and 9,000+ financial definitions.
 */
export function lookupUnifiedFandomEntity(
  term: string,
  typeHint?: "character" | "creator" | "lexicon" | "artifact" | "team" | "location",
  universeHint?: string
): WikiLookupResult | null {
  const clean = term.trim();
  if (!clean || clean.length < 2) return null;

  const uniUpper = (universeHint || "").toUpperCase();

  // 1. If financial/market principle or type is lexicon, prioritize CBR Lexicon & Investopedia
  if (
    typeHint === "lexicon" ||
    clean.includes("Floor") ||
    clean.includes("FMV") ||
    clean.includes("Tomato") ||
    clean.includes("Breakeven") ||
    clean.includes("Sunk") ||
    clean.includes("CGC") ||
    clean.includes("CBCS") ||
    clean.includes("Census") ||
    clean.includes("Liquidation") ||
    clean.includes("Spread") ||
    clean.includes("Arbitrage") ||
    clean.includes("CPR") ||
    clean.includes("Direct") ||
    clean.includes("Newsstand")
  ) {
    const cbr = lookupCbrLexicon(clean);
    if (cbr) return cbr;
    const inv = lookupInvestopedia(clean);
    if (inv) return inv;
  }

  // 2. Known DC character routing to prevent Marvel parodies (e.g. Earth-3131 Marville) from stealing DC icons
  const dcPattern = /\b(batman|superman|wonder woman|bruce wayne|clark kent|diana prince|joker|lex luthor|robin|nightwing|catwoman|flash|barry allen|wally west|green lantern|hal jordan|aquaman|cyborg|harley quinn|shazam|captain marvel jr|martian manhunter|zatanna|green arrow|oliver queen|deathstroke|slade wilson|darkseid|black canary|hawkman|hawkgirl|supergirl|batgirl|barbara gordon|damian wayne|tim drake|jason todd|riddler|penguin|two-face|bane|poison ivy|scarecrow|ras al ghul|ra's al ghul|talia al ghul|lobo|constantine|john constantine|swamp thing|sandman|dream of the endless|morpheus|lucifer morningstar)\b/i;
  const isLikelyDc = dcPattern.test(clean);

  // 3. Route by universe hint or DC pattern
  if (uniUpper.includes("DC") || isLikelyDc) {
    const d = lookupDcDatabase(clean);
    if (d) return d;
  }
  if (uniUpper.includes("MARVEL")) {
    const m = lookupMarvelDatabase(clean, typeHint);
    if (m) return m;
  } else if (uniUpper.includes("STAR WARS") || uniUpper.includes("LUCAS")) {
    const sw = lookupStarWarsDatabase(clean);
    if (sw) return sw;
  }

  // 4. If typeHint is creator, check creators first
  if (typeHint === "creator") {
    const mc = lookupMarvelDatabase(clean, "creator");
    if (mc) return mc;
    const dc = lookupDcDatabase(clean);
    if (dc) return dc;
  }

  // 5. General cascade across all local databases
  // Check DC first if likely DC, otherwise Marvel
  if (isLikelyDc) {
    const d = lookupDcDatabase(clean);
    if (d) return d;
    const m = lookupMarvelDatabase(clean, typeHint);
    if (m) return m;
  } else {
    const m = lookupMarvelDatabase(clean, typeHint);
    if (m) return m;
    const d = lookupDcDatabase(clean);
    if (d) return d;
  }

  // Check Star Wars (44k entities)
  const sw = lookupStarWarsDatabase(clean);
  if (sw) return sw;

  // Check CBR Lexicon (4.6k terms)
  const cbr = lookupCbrLexicon(clean);
  if (cbr) return cbr;

  // Check Investopedia (4.6k terms)
  const inv = lookupInvestopedia(clean);
  if (inv) return inv;

  return null;
}
