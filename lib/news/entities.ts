import { createAdminServerClient } from "@/lib/supabase/admin";
import { findLoreEntitiesInText, findLoreEntitiesInTextAsync, GENERIC_REAL_WORLD_LOCATIONS, LORE_OBSCURE_COLLISION_BLOCKLIST } from "@/lib/wiki/lore-search";
import { findCbrTermsInText } from "@/lib/lexicon/cbr-lexicon";
import { resolveFuzzyEntitiesForStory } from "./fuzzy-engine";
import adaptationCastData from "./adaptation-cast-registry.json";
import adaptationAssetData from "./adaptation-asset-registry.json";

export interface EntityWikiDef {
  term: string;
  ticker?: string;
  type: "character" | "publisher" | "equity" | "creator" | "market-concept" | "grading" | "lexicon";
  target: "intelligence" | "lexicon";
  wikiPath: string;
  roleDetails?: {
    character: string;
    universe: string;
    landmarkIssue: string;
    comicTicker: string;
  };
  lexiconDetails?: {
    category: string;
    definition: string;
    translation?: string;
    investopediaUrl?: string | null;
  };
}

interface AdaptationRole {
  character: string;
  universe: string;
  landmarkIssue: string;
  comicTicker: string;
}

interface AdaptationActor {
  name: string;
  aliases: string[];
  roles: AdaptationRole[];
  franchises: string[];
  imdbId?: string;
}

interface AdaptationAsset {
  title: string;
  slug: string;
  ticker: string;
  universe: string;
  franchise: string;
  type: string;
  aliases: string[];
  landmarkIssue?: string;
  characters?: string[];
  creators?: string[];
  summary?: string;
}

const ADAPTATION_ACTORS: AdaptationActor[] = adaptationCastData as AdaptationActor[];
const ADAPTATION_ASSETS: AdaptationAsset[] = adaptationAssetData as AdaptationAsset[];

export const ADAPTATION_ASSET_ENTITIES: EntityWikiDef[] = ADAPTATION_ASSETS.flatMap((asset) => {
  const terms = [asset.title, ...(asset.aliases || [])];
  return terms.map((t) => ({
    term: t,
    ticker: asset.ticker,
    type: "equity" as const,
    target: "intelligence" as const,
    wikiPath: `/wiki/entry/${asset.slug}`,
  }));
});

/**
 * Decomposes role character names like "Claire Temple (Night Nurse)" or "The Punisher (Frank Castle)"
 * into cleanly matchable individual names like ["Claire Temple", "Night Nurse"] or ["The Punisher", "Punisher", "Frank Castle"].
 */
export function decomposeCharacterTerms(rawCharacter: string): string[] {
  if (!rawCharacter) return [];
  const clean = rawCharacter.replace(/\s*\/.*$/, "").replace(/\[.*?\]/g, "").trim();
  const terms: string[] = [];

  const parenMatch = clean.match(/^([^(]+)\(([^)]+)\)$/);
  if (parenMatch) {
    const main = parenMatch[1].trim();
    const alias = parenMatch[2].trim();
    if (main) terms.push(main);
    if (alias && alias.toLowerCase() !== main.toLowerCase()) terms.push(alias);
  } else {
    terms.push(clean);
  }

  const expanded: string[] = [];
  for (const t of terms) {
    expanded.push(t);
    if (t.startsWith("The ") && t.length > 5) {
      expanded.push(t.slice(4));
    }
  }

  return [...new Set(expanded)].filter((t) => t.length >= 2);
}

/**
 * Dynamically resolves the most contextually relevant comic role and ticker for an actor
 * who has portrayed multiple roles across different universes (e.g. Rosario Dawson in Marvel vs Star Wars vs Sin City).
 */
export function resolveActorRoleForContext(
  actor: AdaptationActor,
  contextText: string
): AdaptationRole {
  if (!actor.roles || actor.roles.length === 0) {
    return {
      character: "Character",
      universe: "MARVEL",
      landmarkIssue: "",
      comicTicker: "$EQUITY",
    };
  }
  if (actor.roles.length === 1) {
    return actor.roles[0];
  }

  const lowerText = contextText.toLowerCase();

  let bestRole = actor.roles[0];
  let highestScore = -1;

  for (const role of actor.roles) {
    let score = 0;
    const terms = decomposeCharacterTerms(role.character);

    // 1. Direct character / alter ego mentions in context (+15 points per match)
    for (const term of terms) {
      const termLower = term.toLowerCase();
      const escaped = termLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`\\b${escaped}\\b`, "i").test(lowerText)) {
        score += 15;
      }
    }

    // 2. Landmark issue mention (+10 points)
    if (role.landmarkIssue) {
      const issueLower = role.landmarkIssue.toLowerCase();
      const seriesPart = issueLower.replace(/#\d+.*$/, "").trim();
      if (seriesPart.length >= 4 && lowerText.includes(seriesPart)) {
        score += 10;
      }
    }

    // 3. Universe and related franchise cues (+5 points)
    const uni = role.universe.toUpperCase();
    if (uni === "MARVEL") {
      if (/\b(marvel|mcu|avengers|spider-man|spiderman|spider-m|daredevil|defenders|thor|hulk|iron man|captain america|disney)\b/i.test(lowerText)) {
        score += 5;
      }
    } else if (uni === "DC") {
      if (/\b(dc|dcu|dceu|batman|superman|gotham|warner|wbd)\b/i.test(lowerText)) {
        score += 5;
      }
    } else if (uni === "STAR_WARS") {
      if (/\b(star wars|jedi|sith|lucasfilm|mandalorian|ahsoka|clone wars)\b/i.test(lowerText)) {
        score += 5;
      }
    } else if (uni === "DARK_HORSE") {
      if (/\b(dark horse|sin city|hellboy)\b/i.test(lowerText)) {
        score += 5;
      }
    } else if (uni === "IMAGE") {
      if (/\b(image comics|the boys|spawn|invincible)\b/i.test(lowerText)) {
        score += 5;
      }
    }

    // 4. Franchise list cues (+3 points)
    for (const fr of actor.franchises || []) {
      const frLower = fr.toLowerCase();
      if (lowerText.includes(frLower)) {
        if (
          (uni === "MARVEL" && frLower.includes("marvel")) ||
          (uni === "DC" && frLower.includes("dc")) ||
          (uni === "STAR_WARS" && frLower.includes("star wars"))
        ) {
          score += 3;
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestRole = role;
    }
  }

  return bestRole;
}

export const ADAPTATION_ACTOR_ENTITIES: EntityWikiDef[] = ADAPTATION_ACTORS.flatMap((actor) => {
  const primaryRole = actor.roles[0];
  const main: EntityWikiDef = {
    term: actor.name,
    ticker: primaryRole?.comicTicker,
    type: "creator",
    target: "intelligence",
    wikiPath: `/wiki?q=${encodeURIComponent(actor.name)}`,
    roleDetails: primaryRole,
  };
  const aliasDefs: EntityWikiDef[] = actor.aliases.map((alias) => ({
    term: alias,
    ticker: primaryRole?.comicTicker,
    type: "creator",
    target: "intelligence",
    wikiPath: `/wiki?q=${encodeURIComponent(actor.name)}`,
    roleDetails: primaryRole,
  }));
  return [main, ...aliasDefs];
});

export const ADAPTATION_ROLE_CHARACTER_ENTITIES: EntityWikiDef[] = ADAPTATION_ACTORS.flatMap((actor) => {
  const defs: EntityWikiDef[] = [];
  for (const role of actor.roles) {
    const decomposed = decomposeCharacterTerms(role.character);
    for (const term of decomposed) {
      if (GENERIC_REAL_WORLD_LOCATIONS.has(term.toLowerCase())) continue;
      const slug = term.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      defs.push({
        term,
        ticker: role.comicTicker,
        type: "character",
        target: "intelligence",
        wikiPath: `/wiki/entry/${slug}`,
        roleDetails: role,
      });
    }
  }
  return defs;
});

/**
 * Dynamic Canonical Grounded Entity Registry
 * Grounded across:
 * - 113,499+ Creators (writers, inkers, pencillers, editors, cover artists)
 * - 17,698+ Publishers & Imprints
 * - 232,820+ Comic Titles & Series
 * - Superhero & Lore Characters
 * - PP Financial Instruments (Derivatives, Crypto, Bonds, Funds, Baskets, Indices)
 * - Grading & Secondary Market Concepts
 * - Analyst Personas
 */
export const KNOWN_NEWS_ENTITIES_MAP: EntityWikiDef[] = [
  // --- ANALYST PERSONAS ---

  // --- PANEL PROFITS FUNDS, BASKETS & INDICES ---
  { term: "CE70 Sovereign Comic Equity Index", ticker: "$CE70", type: "equity", target: "lexicon", wikiPath: "/equity/CE70" },
  { term: "CE70", ticker: "$CE70", type: "equity", target: "lexicon", wikiPath: "/equity/CE70" },
  { term: "$CE70", ticker: "$CE70", type: "equity", target: "lexicon", wikiPath: "/equity/CE70" },
  { term: "Panel Profits Pulse Index 100", ticker: "$PPIX100", type: "equity", target: "lexicon", wikiPath: "/equity/PPIX100" },
  { term: "PPIX-100", ticker: "$PPIX100", type: "equity", target: "lexicon", wikiPath: "/equity/PPIX100" },
  { term: "$PPIX100", ticker: "$PPIX100", type: "equity", target: "lexicon", wikiPath: "/equity/PPIX100" },
  { term: "PPIX Composite", ticker: "$PPIX", type: "equity", target: "lexicon", wikiPath: "/equities" },
  { term: "$PPIX", ticker: "$PPIX", type: "equity", target: "lexicon", wikiPath: "/equities" },
  { term: "Sovereign Comic Basket", ticker: "$BASKET", type: "equity", target: "lexicon", wikiPath: "/equities" },
  { term: "$BASKET", ticker: "$BASKET", type: "equity", target: "lexicon", wikiPath: "/equities" },
  { term: "Golden Age Basket", ticker: "$GOLD", type: "equity", target: "lexicon", wikiPath: "/equities" },
  { term: "$GOLD", ticker: "$GOLD", type: "equity", target: "lexicon", wikiPath: "/equities" },
  { term: "Silver Age ETF", ticker: "$SLVR", type: "equity", target: "lexicon", wikiPath: "/equities" },
  { term: "$SLVR", ticker: "$SLVR", type: "equity", target: "lexicon", wikiPath: "/equities" },
  { term: "Modern High-Grade Fund", ticker: "$MODF", type: "equity", target: "lexicon", wikiPath: "/equities" },
  { term: "$MODF", ticker: "$MODF", type: "equity", target: "lexicon", wikiPath: "/equities" },
  { term: "Bronze Age Liquidity Pool", ticker: "$BRNZ", type: "equity", target: "lexicon", wikiPath: "/equities" },
  { term: "$BRNZ", ticker: "$BRNZ", type: "equity", target: "lexicon", wikiPath: "/equities" },

  // --- CORPORATE & TICKER BEDROCK ---
  { term: "$DIS", ticker: "$DIS", type: "equity", target: "intelligence", wikiPath: "/news?q=Disney" },
  { term: "$WBD", ticker: "$WBD", type: "equity", target: "intelligence", wikiPath: "/news?q=Warner+Bros" },
  { term: "$SONY", ticker: "$SONY", type: "equity", target: "intelligence", wikiPath: "/news?q=Sony" },
  { term: "$PARA", ticker: "$PARA", type: "equity", target: "intelligence", wikiPath: "/news?q=Paramount" },
  { term: "$CMCSA", ticker: "$CMCSA", type: "equity", target: "intelligence", wikiPath: "/news?q=Universal" },
  { term: "$LGF", ticker: "$LGF", type: "equity", target: "intelligence", wikiPath: "/news?q=Lionsgate" },

  // --- SOVEREIGN CHARACTER & KEY ISSUE TICKERS ---
  { term: "$SPDR", ticker: "$SPDR", type: "character", target: "intelligence", wikiPath: "/wiki/entry/spider-man" },
  { term: "$DOOM", ticker: "$DOOM", type: "character", target: "intelligence", wikiPath: "/wiki/entry/doctor-doom" },
  { term: "$BAT", ticker: "$BAT", type: "character", target: "intelligence", wikiPath: "/wiki/entry/batman" },
  { term: "$SUPR", ticker: "$SUPR", type: "character", target: "intelligence", wikiPath: "/wiki/entry/superman" },
  { term: "$WOLV", ticker: "$WOLV", type: "character", target: "intelligence", wikiPath: "/wiki/entry/wolverine" },
  { term: "$XMEN", ticker: "$XMEN", type: "character", target: "intelligence", wikiPath: "/wiki/entry/x-men" },
  { term: "$FF4", ticker: "$FF4", type: "character", target: "intelligence", wikiPath: "/wiki/entry/fantastic-four" },
  { term: "$THUN", ticker: "$THUN", type: "character", target: "intelligence", wikiPath: "/wiki/entry/thunderbolts" },
  { term: "$PNSH", ticker: "$PNSH", type: "character", target: "intelligence", wikiPath: "/wiki/entry/punisher" },
  { term: "$IRON", ticker: "$IRON", type: "character", target: "intelligence", wikiPath: "/wiki/entry/iron-man" },
  { term: "$CAP", ticker: "$CAP", type: "character", target: "intelligence", wikiPath: "/wiki/entry/captain-america" },
  { term: "$NURSE", ticker: "$NURSE", type: "character", target: "intelligence", wikiPath: "/wiki/entry/claire-temple" },
  { term: "$DOOM:LATV", ticker: "$DOOM:LATV", type: "character", target: "intelligence", wikiPath: "/wiki/entry/latverian-witches" },
  { term: "$DOOM:CYNTHIA", ticker: "$DOOM:CYNTHIA", type: "character", target: "intelligence", wikiPath: "/wiki/entry/cynthia-von-doom" },
  { term: "$AF15", ticker: "$AF15", type: "equity", target: "intelligence", wikiPath: "/comics?q=Amazing+Fantasy+%2315" },
  { term: "$HULK181", ticker: "$HULK181", type: "equity", target: "intelligence", wikiPath: "/comics?q=Incredible+Hulk+%23181" },
  { term: "$FF1", ticker: "$FF1", type: "equity", target: "intelligence", wikiPath: "/comics?q=Fantastic+Four+%231" },
  { term: "$TEC27", ticker: "$TEC27", type: "equity", target: "intelligence", wikiPath: "/comics?q=Detective+Comics+%2327" },
  { term: "$ACT1", ticker: "$ACT1", type: "equity", target: "intelligence", wikiPath: "/comics?q=Action+Comics+%231" },

  // --- PUBLISHERS & STUDIOS (Grounded in ppcf_gcd_publishers & Hollywood Studios) ---
  { term: "Sony Pictures Entertainment", ticker: "$SONY", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Sony+Pictures" },
  { term: "Sony Pictures", ticker: "$SONY", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Sony+Pictures" },
  { term: "Sony", ticker: "$SONY", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Sony" },
  { term: "Warner Bros. Discovery", ticker: "$WBD", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Warner+Bros" },
  { term: "Warner Bros. Pictures", ticker: "$WBD", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Warner+Bros" },
  { term: "Warner Bros.", ticker: "$WBD", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Warner+Bros" },
  { term: "Warner Bros", ticker: "$WBD", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Warner+Bros" },
  { term: "WBD", ticker: "$WBD", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Warner+Bros" },
  { term: "Universal Pictures", ticker: "$CMCSA", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Universal+Pictures" },
  { term: "Universal", ticker: "$CMCSA", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Universal" },
  { term: "Comcast", ticker: "$CMCSA", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Comcast" },
  { term: "Paramount Pictures", ticker: "$PARA", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Paramount" },
  { term: "Paramount", ticker: "$PARA", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Paramount" },
  { term: "Skydance Media", ticker: "$PARA", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Skydance" },
  { term: "Skydance", ticker: "$PARA", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Skydance" },
  { term: "Walt Disney Studios", ticker: "$DIS", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Disney" },
  { term: "Walt Disney", ticker: "$DIS", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Disney" },
  { term: "Disney", ticker: "$DIS", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Disney" },
  { term: "Lucasfilm", ticker: "$DIS", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Lucasfilm" },
  { term: "20th Century Studios", ticker: "$DIS", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=20th+Century+Studios" },
  { term: "20th Century Fox", ticker: "$DIS", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=20th+Century+Fox" },
  { term: "Lionsgate Studios", ticker: "$LGF", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Lionsgate" },
  { term: "Lionsgate", ticker: "$LGF", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Lionsgate" },

  // --- MEGA-FRANCHISES & CINEMATIC UNIVERSES ---
  { term: "Marvel Cinematic Universe", ticker: "$MCU", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Marvel" },
  { term: "DC Extended Universe", ticker: "$DCEU", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=DC" },
  { term: "Sony's Spider-Man Universe", ticker: "$SPDR", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Sony+Spider-Man+Universe" },
  { term: "Sony Spider-Man Universe", ticker: "$SPDR", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Sony+Spider-Man+Universe" },

  // --- COMIC PUBLISHERS ---
  { term: "Marvel", ticker: "$MRVL", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Marvel" },
  { term: "DC Comics", ticker: "$DC", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=DC" },
  { term: "DC Studios", ticker: "$DC", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=DC" },
  { term: "DC Universe", ticker: "$DC", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=DC" },
  { term: "Image Comics", ticker: "$IMGC", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Image+Comics" },
  { term: "Dark Horse", ticker: "$DH", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Dark+Horse" },
  { term: "IDW Publishing", ticker: "$IDW", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=IDW" },
  { term: "IDW", ticker: "$IDW", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=IDW" },
  { term: "Boom! Studios", ticker: "$BOOM", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Boom+Studios" },
  { term: "Dynamite Entertainment", ticker: "$DYN", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Dynamite" },
  { term: "Kodansha", ticker: "$KOD", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Kodansha" },
  { term: "Shueisha", ticker: "$SHUE", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Shueisha" },
  { term: "Viz Media", ticker: "$VIZ", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Viz+Media" },
  { term: "Ablaze", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Ablaze" },
  { term: "Ahoy Comics", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Ahoy+Comics" },
  { term: "Titan Comics", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Titan+Comics" },

  // --- CINEMATIC ADAPTATION & STORYLINE EQUITIES (First-Class Tradeable Assets) ---
  ...ADAPTATION_ASSET_ENTITIES,

  // --- KEY MOVIE TITLES & FIRST-CLASS STORYLINE EQUITIES ---
  { term: "Avengers: Endgame", ticker: "$AVNG:ENDGAME", type: "equity", target: "intelligence", wikiPath: "/wiki/entry/avengers-endgame" },
  { term: "Avengers: Doomsday", ticker: "$AVNG:DOOMSDAY", type: "equity", target: "intelligence", wikiPath: "/wiki/entry/avengers-doomsday" },
  { term: "Avengers: Secret Wars", ticker: "$AVNG:SECRETWARS", type: "equity", target: "intelligence", wikiPath: "/wiki/entry/avengers-secret-wars" },
  { term: "Spider-Man: Brand New Day", ticker: "$SPDR:BND", type: "equity", target: "intelligence", wikiPath: "/wiki/entry/spider-man-brand-new-day" },
  { term: "Spider-Man: Beyond the Spider-Verse", ticker: "$SPDR:BTSV", type: "equity", target: "intelligence", wikiPath: "/wiki/entry/spider-man-beyond-the-spider-verse" },
  { term: "The Batman Part II", ticker: "$BAT:PART2", type: "equity", target: "intelligence", wikiPath: "/wiki/entry/the-batman-part-ii" },
  { term: "Superman: Legacy", ticker: "$SUPR:LEGACY", type: "equity", target: "intelligence", wikiPath: "/wiki/entry/superman-legacy" },
  { term: "Deadpool & Wolverine", ticker: "$DP:WOLV", type: "equity", target: "intelligence", wikiPath: "/wiki/entry/deadpool-wolverine" },
  { term: "Captain America: Brave New World", ticker: "$CAP:BNW", type: "equity", target: "intelligence", wikiPath: "/wiki/entry/captain-america-brave-new-world" },
  { term: "Thunderbolts*", ticker: "$TBOLTS:2025", type: "equity", target: "intelligence", wikiPath: "/wiki/entry/thunderbolts" },
  { term: "Fantastic Four: First Steps", ticker: "$FF:STEPS", type: "equity", target: "intelligence", wikiPath: "/wiki/entry/fantastic-four-first-steps" },
  { term: "Joker: Folie à Deux", ticker: "$JKR:FOLIE", type: "equity", target: "intelligence", wikiPath: "/wiki/entry/joker-folie-a-deux" },
  { term: "Spider-Man: No Way Home", ticker: "$SPDR:NWH", type: "equity", target: "intelligence", wikiPath: "/wiki/entry/spider-man-no-way-home" },
  { term: "Spider-Man: Across the Spider-Verse", ticker: "$SPDR:ATSV", type: "equity", target: "intelligence", wikiPath: "/wiki/entry/spider-man-across-the-spider-verse" },
  { term: "The Dark Knight", ticker: "$BAT:TDK", type: "equity", target: "intelligence", wikiPath: "/wiki/entry/the-dark-knight" },
  { term: "Avengers: Infinity War", ticker: "$AVNG:INFWAR", type: "equity", target: "intelligence", wikiPath: "/wiki/entry/avengers-infinity-war" },

  // --- CHARACTERS & LORE (Direct Dossier Routes) ---
  { term: "Spider-M", ticker: "$SPDR", type: "character", target: "intelligence", wikiPath: "/wiki/entry/spider-man" },
  { term: "Claire Temple", ticker: "$NURSE", type: "character", target: "intelligence", wikiPath: "/wiki/entry/claire-temple" },
  { term: "Night Nurse", ticker: "$NURSE", type: "character", target: "intelligence", wikiPath: "/wiki/entry/night-nurse" },
  { term: "Spider-Man", ticker: "$SPDR", type: "character", target: "intelligence", wikiPath: "/wiki/entry/spider-man" },
  { term: "Wolverine", ticker: "$WOLV", type: "character", target: "intelligence", wikiPath: "/wiki/entry/wolverine" },
  { term: "Iron Man", ticker: "$IRON", type: "character", target: "intelligence", wikiPath: "/wiki/entry/iron-man" },
  { term: "Captain America", ticker: "$CAP", type: "character", target: "intelligence", wikiPath: "/wiki/entry/captain-america" },
  { term: "Steve Rogers", ticker: "$CAP", type: "character", target: "intelligence", wikiPath: "/wiki/entry/steve-rogers" },
  { term: "Peggy Carter", ticker: "$CARTER", type: "character", target: "intelligence", wikiPath: "/wiki/entry/peggy-carter" },
  { term: "Agent Carter", ticker: "$CARTER", type: "character", target: "intelligence", wikiPath: "/wiki/entry/peggy-carter" },
  { term: "Captain Carter", ticker: "$CARTER", type: "character", target: "intelligence", wikiPath: "/wiki/entry/peggy-carter" },
  { term: "Franklin Richards", ticker: "$FF:FRANKLIN", type: "character", target: "intelligence", wikiPath: "/wiki/entry/franklin-richards" },
  { term: "Franklin", ticker: "$FF:FRANKLIN", type: "character", target: "intelligence", wikiPath: "/wiki/entry/franklin-richards" },
  { term: "Thor", ticker: "$THOR", type: "character", target: "intelligence", wikiPath: "/wiki/entry/thor" },
  { term: "Hulk", ticker: "$HULK", type: "character", target: "intelligence", wikiPath: "/wiki/entry/hulk" },
  { term: "Bruce Banner", ticker: "$HULK", type: "character", target: "intelligence", wikiPath: "/wiki/entry/bruce-banner" },
  { term: "Banner", ticker: "$HULK", type: "character", target: "intelligence", wikiPath: "/wiki/entry/bruce-banner" },
  { term: "Deadpool", ticker: "$DP", type: "character", target: "intelligence", wikiPath: "/wiki/entry/deadpool" },
  { term: "Venom", ticker: "$VNM", type: "character", target: "intelligence", wikiPath: "/wiki/entry/venom" },
  { term: "Daredevil", ticker: "$DD", type: "character", target: "intelligence", wikiPath: "/wiki/entry/daredevil" },
  { term: "Punisher", ticker: "$PNSH", type: "character", target: "intelligence", wikiPath: "/wiki/entry/punisher" },
  { term: "Doctor Doom", ticker: "$DOOM", type: "character", target: "intelligence", wikiPath: "/wiki/entry/doctor-doom" },
  { term: "Victor von Doom", ticker: "$DOOM", type: "character", target: "intelligence", wikiPath: "/wiki/entry/doctor-doom" },
  { term: "Victor Von Doom", ticker: "$DOOM", type: "character", target: "intelligence", wikiPath: "/wiki/entry/doctor-doom" },
  { term: "Dr. Doom", ticker: "$DOOM", type: "character", target: "intelligence", wikiPath: "/wiki/entry/doctor-doom" },
  { term: "Doom", ticker: "$DOOM", type: "character", target: "intelligence", wikiPath: "/wiki/entry/doctor-doom" },
  { term: "Doctor Strange", ticker: "$STRG", type: "character", target: "intelligence", wikiPath: "/wiki/entry/doctor-strange" },
  { term: "Stephen Strange", ticker: "$STRG", type: "character", target: "intelligence", wikiPath: "/wiki/entry/stephen-strange" },
  { term: "Doctor Who", ticker: "$DWHO", type: "character", target: "intelligence", wikiPath: "/wiki/entry/the-doctor-earth-5556" },
  { term: "The Doctor", ticker: "$DWHO", type: "character", target: "intelligence", wikiPath: "/wiki/entry/the-doctor-earth-5556" },
  { term: "Doctor Fate", ticker: "$FATE", type: "character", target: "intelligence", wikiPath: "/wiki/entry/doctor-fate" },
  { term: "Doctor Manhattan", ticker: "$WTCH", type: "character", target: "intelligence", wikiPath: "/wiki/entry/doctor-manhattan" },
  { term: "Doctor Octopus", ticker: "$DOC", type: "character", target: "intelligence", wikiPath: "/wiki/entry/doctor-octopus" },
  { term: "Doc Ock", ticker: "$DOC", type: "character", target: "intelligence", wikiPath: "/wiki/entry/doctor-octopus" },
  { term: "Doctor Voodoo", ticker: "$VOODOO", type: "character", target: "intelligence", wikiPath: "/wiki/entry/brother-voodoo" },
  { term: "Captain Marvel", ticker: "$CMARV", type: "character", target: "intelligence", wikiPath: "/wiki/entry/captain-marvel" },
  { term: "Captain Britain", ticker: "$CBRIT", type: "character", target: "intelligence", wikiPath: "/wiki/entry/captain-britain" },
  { term: "Captain Kirk", ticker: "$TREK", type: "character", target: "intelligence", wikiPath: "/wiki/entry/james-t-kirk" },
  { term: "Captain Picard", ticker: "$TREK", type: "character", target: "intelligence", wikiPath: "/wiki/entry/jean-luc-picard" },
  { term: "Star Trek", ticker: "$TREK", type: "equity", target: "intelligence", wikiPath: "/wiki/entry/star-trek" },
  { term: "The Mandalorian", ticker: "$MANDO", type: "character", target: "intelligence", wikiPath: "/wiki/entry/the-mandalorian" },
  { term: "Mandalorian", ticker: "$MANDO", type: "character", target: "intelligence", wikiPath: "/wiki/entry/the-mandalorian" },
  { term: "Din Djarin", ticker: "$MANDO", type: "character", target: "intelligence", wikiPath: "/wiki/entry/the-mandalorian" },
  { term: "Grogu", ticker: "$MANDO", type: "character", target: "intelligence", wikiPath: "/wiki/entry/grogu" },
  { term: "Mister Fantastic", ticker: "$FF4", type: "character", target: "intelligence", wikiPath: "/wiki/entry/mister-fantastic" },
  { term: "Reed Richards", ticker: "$FF4", type: "character", target: "intelligence", wikiPath: "/wiki/entry/mister-fantastic" },
  { term: "Sue Storm", ticker: "$FF4", type: "character", target: "intelligence", wikiPath: "/wiki/entry/invisible-woman" },
  { term: "Invisible Woman", ticker: "$FF4", type: "character", target: "intelligence", wikiPath: "/wiki/entry/invisible-woman" },
  { term: "Human Torch", ticker: "$FF4", type: "character", target: "intelligence", wikiPath: "/wiki/entry/human-torch" },
  { term: "Johnny Storm", ticker: "$FF4", type: "character", target: "intelligence", wikiPath: "/wiki/entry/human-torch" },
  { term: "The Thing", ticker: "$FF4", type: "character", target: "intelligence", wikiPath: "/wiki/entry/the-thing" },
  { term: "Ben Grimm", ticker: "$FF4", type: "character", target: "intelligence", wikiPath: "/wiki/entry/the-thing" },
  { term: "Charles Xavier", ticker: "$PROFX", type: "character", target: "intelligence", wikiPath: "/wiki/entry/professor-x" },
  { term: "Latverian Witches", ticker: "$DOOM:LATV", type: "character", target: "intelligence", wikiPath: "/wiki/entry/latverian-witches" },
  { term: "Latverian Witch", ticker: "$DOOM:LATV", type: "character", target: "intelligence", wikiPath: "/wiki/entry/latverian-witches" },
  { term: "Cynthia von Doom", ticker: "$DOOM:CYNTHIA", type: "character", target: "intelligence", wikiPath: "/wiki/entry/cynthia-von-doom" },
  { term: "Cynthia Von Doom", ticker: "$DOOM:CYNTHIA", type: "character", target: "intelligence", wikiPath: "/wiki/entry/cynthia-von-doom" },
  { term: "Latveria", ticker: "$DOOM:LATV", type: "character", target: "intelligence", wikiPath: "/wiki/entry/latveria" },
  { term: "Castle Doom", ticker: "$DOOM:CASTLE", type: "character", target: "intelligence", wikiPath: "/wiki/entry/castle-doom" },
  { term: "the Marvel universe", ticker: "$MCU", type: "equity", target: "intelligence", wikiPath: "/wiki/entry/marvel-cinematic-universe" },
  { term: "the Marvel Universe", ticker: "$MCU", type: "equity", target: "intelligence", wikiPath: "/wiki/entry/marvel-cinematic-universe" },
  { term: "Marvel universe", ticker: "$MCU", type: "equity", target: "intelligence", wikiPath: "/wiki/entry/marvel-cinematic-universe" },
  { term: "Marvel Universe", ticker: "$MCU", type: "equity", target: "intelligence", wikiPath: "/wiki/entry/marvel-cinematic-universe" },
  { term: "Silver Surfer", ticker: "$SLVR", type: "character", target: "intelligence", wikiPath: "/wiki/entry/silver-surfer" },
  { term: "Galactus", ticker: "$GLCT", type: "character", target: "intelligence", wikiPath: "/wiki/entry/galactus" },
  { term: "Thanos", ticker: "$THNS", type: "character", target: "intelligence", wikiPath: "/wiki/entry/thanos" },
  { term: "Moon Knight", ticker: "$MNKT", type: "character", target: "intelligence", wikiPath: "/wiki/entry/moon-knight" },
  { term: "Ghost Rider", ticker: "$GSTR", type: "character", target: "intelligence", wikiPath: "/wiki/entry/ghost-rider" },
  { term: "Blade", ticker: "$BLD", type: "character", target: "intelligence", wikiPath: "/wiki/entry/blade" },
  { term: "Jubilee", ticker: "$JUBL", type: "character", target: "intelligence", wikiPath: "/wiki/entry/jubilee" },
  { term: "Apocalypse", ticker: "$APOC", type: "character", target: "intelligence", wikiPath: "/wiki/entry/apocalypse" },
  { term: "Winter Soldier", ticker: "$WINT", type: "character", target: "intelligence", wikiPath: "/wiki/entry/winter-soldier" },
  { term: "Bucky", type: "character", target: "intelligence", wikiPath: "/wiki/entry/winter-soldier" },
  { term: "Taskmaster", ticker: "$TASK", type: "character", target: "intelligence", wikiPath: "/wiki/entry/taskmaster" },
  { term: "Kang the Conqueror", ticker: "$KANG", type: "character", target: "intelligence", wikiPath: "/wiki/entry/kang-the-conqueror" },
  { term: "Mister Sinister", ticker: "$SNST", type: "character", target: "intelligence", wikiPath: "/wiki/entry/mister-sinister" },
  { term: "Doctor Octopus", ticker: "$DOC", type: "character", target: "intelligence", wikiPath: "/wiki/entry/doctor-octopus" },
  { term: "Green Goblin", ticker: "$GBLN", type: "character", target: "intelligence", wikiPath: "/wiki/entry/green-goblin" },
  { term: "Carnage", ticker: "$CRNG", type: "character", target: "intelligence", wikiPath: "/wiki/entry/carnage" },
  { term: "Kraven the Hunter", ticker: "$KRVN", type: "character", target: "intelligence", wikiPath: "/wiki/entry/kraven-the-hunter" },
  { term: "Cable", ticker: "$CABL", type: "character", target: "intelligence", wikiPath: "/wiki/entry/cable" },
  { term: "Domino", ticker: "$DOMN", type: "character", target: "intelligence", wikiPath: "/wiki/entry/domino" },
  { term: "Bishop", ticker: "$BSHP", type: "character", target: "intelligence", wikiPath: "/wiki/entry/bishop" },
  { term: "Archangel", ticker: "$ARCH", type: "character", target: "intelligence", wikiPath: "/wiki/entry/archangel" },
  { term: "She-Hulk", ticker: "$SHLK", type: "character", target: "intelligence", wikiPath: "/wiki/entry/she-hulk" },
  { term: "Black Panther", ticker: "$PNTR", type: "character", target: "intelligence", wikiPath: "/wiki/entry/black-panther" },
  { term: "Sentry", ticker: "$SNTR", type: "character", target: "intelligence", wikiPath: "/wiki/entry/sentry" },
  { term: "Magneto", ticker: "$MGNT", type: "character", target: "intelligence", wikiPath: "/wiki/entry/magneto" },
  { term: "Professor X", ticker: "$PROFX", type: "character", target: "intelligence", wikiPath: "/wiki/entry/professor-x" },
  { term: "Cyclops", ticker: "$CYCL", type: "character", target: "intelligence", wikiPath: "/wiki/entry/cyclops" },
  { term: "Storm", ticker: "$STRM", type: "character", target: "intelligence", wikiPath: "/wiki/entry/storm" },
  { term: "Colossus", ticker: "$COLS", type: "character", target: "intelligence", wikiPath: "/wiki/entry/colossus" },
  { term: "Nightcrawler", ticker: "$NCWL", type: "character", target: "intelligence", wikiPath: "/wiki/entry/nightcrawler" },
  { term: "Rogue", ticker: "$ROG", type: "character", target: "intelligence", wikiPath: "/wiki/entry/rogue" },
  { term: "Gambit", ticker: "$GMBT", type: "character", target: "intelligence", wikiPath: "/wiki/entry/gambit" },
  { term: "Scarlet Witch", ticker: "$SCWT", type: "character", target: "intelligence", wikiPath: "/wiki/entry/scarlet-witch" },
  { term: "Quicksilver", ticker: "$QSVR", type: "character", target: "intelligence", wikiPath: "/wiki/entry/quicksilver" },
  { term: "Hawkeye", ticker: "$HAWK", type: "character", target: "intelligence", wikiPath: "/wiki/entry/hawkeye" },
  { term: "Black Widow", ticker: "$WIDW", type: "character", target: "intelligence", wikiPath: "/wiki/entry/black-widow" },
  { term: "Falcon", ticker: "$FLCN", type: "character", target: "intelligence", wikiPath: "/wiki/entry/falcon" },
  { term: "Luke Cage", ticker: "$CAGE", type: "character", target: "intelligence", wikiPath: "/wiki/entry/luke-cage" },
  { term: "Iron Fist", ticker: "$FIST", type: "character", target: "intelligence", wikiPath: "/wiki/entry/iron-fist" },
  { term: "Shang-Chi", ticker: "$SHNG", type: "character", target: "intelligence", wikiPath: "/wiki/entry/shang-chi" },
  { term: "X-Men", ticker: "$XMEN", type: "character", target: "intelligence", wikiPath: "/wiki/entry/x-men" },
  { term: "Avengers", ticker: "$AVNG", type: "character", target: "intelligence", wikiPath: "/wiki/entry/avengers" },
  { term: "Fantastic Four", ticker: "$FF", type: "character", target: "intelligence", wikiPath: "/wiki/entry/fantastic-four" },
  { term: "Sinister Six", type: "character", target: "intelligence", wikiPath: "/wiki/entry/sinister-six" },
  { term: "Brotherhood of Evil Mutants", type: "character", target: "intelligence", wikiPath: "/wiki/entry/brotherhood-of-evil-mutants" },
  { term: "Alpha Flight", type: "character", target: "intelligence", wikiPath: "/wiki/entry/alpha-flight" },
  { term: "New Mutants", type: "character", target: "intelligence", wikiPath: "/wiki/entry/new-mutants" },
  { term: "Thunderbolts", type: "character", target: "intelligence", wikiPath: "/wiki/entry/thunderbolts" },
  { term: "Guardians of the Galaxy", ticker: "$GOTG", type: "character", target: "intelligence", wikiPath: "/wiki/entry/guardians-of-the-galaxy" },
  { term: "Illuminati", type: "character", target: "intelligence", wikiPath: "/wiki/entry/illuminati" },
  { term: "Dora Milaje", type: "character", target: "intelligence", wikiPath: "/wiki/entry/dora-milaje" },
  { term: "Batman", ticker: "$BAT", type: "character", target: "intelligence", wikiPath: "/wiki/entry/batman" },
  { term: "Superman", ticker: "$SUPR", type: "character", target: "intelligence", wikiPath: "/wiki/entry/superman" },
  { term: "Joker", ticker: "$JKR", type: "character", target: "intelligence", wikiPath: "/wiki/entry/joker" },
  { term: "Wonder Woman", ticker: "$WW", type: "character", target: "intelligence", wikiPath: "/wiki/entry/wonder-woman" },
  { term: "The Flash", ticker: "$FLSH", type: "character", target: "intelligence", wikiPath: "/wiki/entry/flash" },
  { term: "Flash", ticker: "$FLSH", type: "character", target: "intelligence", wikiPath: "/wiki/entry/flash" },
  { term: "Green Lantern", ticker: "$GL", type: "character", target: "intelligence", wikiPath: "/wiki/entry/green-lantern" },
  { term: "Aquaman", ticker: "$AQUA", type: "character", target: "intelligence", wikiPath: "/wiki/entry/aquaman" },
  { term: "Robin", ticker: "$RBN", type: "character", target: "intelligence", wikiPath: "/wiki/entry/robin" },
  { term: "Nightwing", ticker: "$NGHT", type: "character", target: "intelligence", wikiPath: "/wiki/entry/nightwing" },
  { term: "Batgirl", ticker: "$BTG", type: "character", target: "intelligence", wikiPath: "/wiki/entry/batgirl" },
  { term: "Catwoman", ticker: "$CATW", type: "character", target: "intelligence", wikiPath: "/wiki/entry/catwoman" },
  { term: "Harley Quinn", ticker: "$HRLY", type: "character", target: "intelligence", wikiPath: "/wiki/entry/harley-quinn" },
  { term: "Supergirl", ticker: "$SPRG", type: "character", target: "intelligence", wikiPath: "/wiki/entry/supergirl" },
  { term: "Green Arrow", ticker: "$GRAW", type: "character", target: "intelligence", wikiPath: "/wiki/entry/green-arrow" },
  { term: "Deathstroke", ticker: "$DTHS", type: "character", target: "intelligence", wikiPath: "/wiki/entry/deathstroke" },
  { term: "Cyborg", ticker: "$CYBG", type: "character", target: "intelligence", wikiPath: "/wiki/entry/cyborg" },
  { term: "Starfire", ticker: "$STRF", type: "character", target: "intelligence", wikiPath: "/wiki/entry/starfire" },
  { term: "Raven", ticker: "$RAVN", type: "character", target: "intelligence", wikiPath: "/wiki/entry/raven" },
  { term: "Justice League", ticker: "$JL", type: "character", target: "intelligence", wikiPath: "/wiki/entry/justice-league" },
  { term: "Justice Society", ticker: "$JSA", type: "character", target: "intelligence", wikiPath: "/wiki/entry/justice-society" },
  { term: "Teen Titans", ticker: "$TT", type: "character", target: "intelligence", wikiPath: "/wiki/entry/teen-titans" },
  { term: "Suicide Squad", ticker: "$SS", type: "character", target: "intelligence", wikiPath: "/wiki/entry/suicide-squad" },
  { term: "Watchmen", ticker: "$WTCH", type: "character", target: "intelligence", wikiPath: "/wiki/entry/watchmen" },
  { term: "Spawn", ticker: "$SPWN", type: "character", target: "intelligence", wikiPath: "/wiki/entry/spawn" },
  { term: "Hellboy", ticker: "$HELL", type: "character", target: "intelligence", wikiPath: "/wiki/entry/hellboy" },
  { term: "Invincible", ticker: "$INVN", type: "character", target: "intelligence", wikiPath: "/wiki/entry/invincible" },
  { term: "Savage Dragon", ticker: "$SDRG", type: "character", target: "intelligence", wikiPath: "/wiki/entry/savage-dragon" },
  { term: "Star Wars", ticker: "$SW", type: "character", target: "intelligence", wikiPath: "/wiki/entry/star-wars" },

  // --- HOLLYWOOD TALENT, DIRECTORS & KEY CREATORS ---
  { term: "Russo Brothers", type: "creator", target: "intelligence", wikiPath: "/news?q=Russo+Brothers" },
  { term: "Anthony Russo", type: "creator", target: "intelligence", wikiPath: "/news?q=Anthony+Russo" },
  { term: "Joe Russo", type: "creator", target: "intelligence", wikiPath: "/news?q=Joe+Russo" },
  { term: "Robert Pattinson", type: "creator", target: "intelligence", wikiPath: "/news?q=Robert+Pattinson" },
  { term: "James Gunn", type: "creator", target: "intelligence", wikiPath: "/news?q=James+Gunn" },
  { term: "Matt Reeves", type: "creator", target: "intelligence", wikiPath: "/news?q=Matt+Reeves" },
  { term: "Zack Snyder", type: "creator", target: "intelligence", wikiPath: "/news?q=Zack+Snyder" },
  { term: "Christopher Nolan", type: "creator", target: "intelligence", wikiPath: "/news?q=Christopher+Nolan" },
  { term: "Kevin Feige", type: "creator", target: "intelligence", wikiPath: "/news?q=Kevin+Feige" },
  { term: "Robert Downey Jr.", type: "creator", target: "intelligence", wikiPath: "/news?q=Robert+Downey+Jr" },
  { term: "Ryan Coogler", type: "creator", target: "intelligence", wikiPath: "/news?q=Ryan+Coogler" },
  { term: "Sam Raimi", type: "creator", target: "intelligence", wikiPath: "/news?q=Sam+Raimi" },
  { term: "Jon Favreau", type: "creator", target: "intelligence", wikiPath: "/news?q=Jon+Favreau" },
  { term: "David Corenswet", type: "creator", target: "intelligence", wikiPath: "/news?q=David+Corenswet" },
  { term: "Hugh Jackman", type: "creator", target: "intelligence", wikiPath: "/news?q=Hugh+Jackman" },
  { term: "Ryan Reynolds", type: "creator", target: "intelligence", wikiPath: "/news?q=Ryan+Reynolds" },
  { term: "Tom Holland", type: "creator", target: "intelligence", wikiPath: "/news?q=Tom+Holland" },
  { term: "Colin Farrell", type: "creator", target: "intelligence", wikiPath: "/news?q=Colin+Farrell" },
  { term: "Barry Keoghan", type: "creator", target: "intelligence", wikiPath: "/news?q=Barry+Keoghan" },
  { term: "Zoe Kravitz", type: "creator", target: "intelligence", wikiPath: "/news?q=Zoe+Kravitz" },
  { term: "Florence Pugh", type: "creator", target: "intelligence", wikiPath: "/news?q=Florence+Pugh" },
  { term: "Simu Liu", type: "creator", target: "intelligence", wikiPath: "/news?q=Simu+Liu" },
  { term: "Channing Tatum", type: "creator", target: "intelligence", wikiPath: "/news?q=Channing+Tatum" },
  { term: "Ian McKellen", type: "creator", target: "intelligence", wikiPath: "/news?q=Ian+McKellen" },
  { term: "James Marsden", type: "creator", target: "intelligence", wikiPath: "/news?q=James+Marsden" },
  { term: "Bruce Wayne", ticker: "$BAT", type: "character", target: "intelligence", wikiPath: "/wiki/entry/batman" },
  { term: "Clark Kent", ticker: "$SUPR", type: "character", target: "intelligence", wikiPath: "/wiki/entry/superman" },
  { term: "Peter Parker", ticker: "$SPDR", type: "character", target: "intelligence", wikiPath: "/wiki/entry/spider-man" },
  { term: "Miles Morales", ticker: "$SPDR", type: "character", target: "intelligence", wikiPath: "/wiki/entry/spider-man" },
  { term: "Tony Stark", ticker: "$IRON", type: "character", target: "intelligence", wikiPath: "/wiki/entry/iron-man" },
  { term: "DCU", ticker: "$DCU", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=DCU" },
  { term: "DCEU", ticker: "$DCEU", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=DCEU" },
  { term: "MCU", ticker: "$MCU", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=MCU" },
  { term: "DC Studios", ticker: "$DC", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=DC+Studios" },
  { term: "Marvel Studios", ticker: "$MRVL", type: "publisher", target: "intelligence", wikiPath: "/intelligence?q=Marvel+Studios" },

  // --- CREATORS (Grounded in ppcf_gcd_creators) ---
  { term: "Greg Pak", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Greg+Pak" },
  { term: "Mark Buckingham", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Mark+Buckingham" },
  { term: "Phil Noto", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Phil+Noto" },
  { term: "Stan Lee", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Stan+Lee" },
  { term: "Jack Kirby", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Jack+Kirby" },
  { term: "Steve Ditko", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Steve+Ditko" },
  { term: "Todd McFarlane", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Todd+McFarlane" },
  { term: "Jim Lee", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Jim+Lee" },
  { term: "Frank Miller", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Frank+Miller" },
  { term: "Alan Moore", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Alan+Moore" },
  { term: "Grant Morrison", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Grant+Morrison" },
  { term: "Brian Michael Bendis", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Brian+Michael+Bendis" },
  { term: "Jonathan Hickman", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Jonathan+Hickman" },
  { term: "Chip Zdarsky", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Chip+Zdarsky" },
  { term: "Donny Cates", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Donny+Cates" },
  { term: "Hiro Mashima", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Hiro+Mashima" },
  { term: "Geoff Johns", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Geoff+Johns" },
  { term: "Neil Gaiman", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Neil+Gaiman" },
  { term: "Chris Bachalo", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Chris+Bachalo" },
  { term: "Alex Ross", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Alex+Ross" },
  { term: "Peach Momoko", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Peach+Momoko" },
  { term: "Carmine Infantino", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Carmine+Infantino" },
  { term: "Robert Kanigher", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Robert+Kanigher" },
  { term: "Gardner Fox", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Gardner+Fox" },
  { term: "Bob Kane", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Bob+Kane" },
  { term: "Bill Finger", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Bill+Finger" },
  { term: "Jerry Siegel", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Jerry+Siegel" },
  { term: "Joe Shuster", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Joe+Shuster" },
  { term: "George Pérez", type: "creator", target: "intelligence", wikiPath: "/wiki?q=George+Perez" },
  { term: "Paul Dini", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Paul+Dini" },
  { term: "Bruce Timm", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Bruce+Timm" },
  { term: "Robert Kirkman", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Robert+Kirkman" },
  { term: "Mike Mignola", type: "creator", target: "intelligence", wikiPath: "/wiki?q=Mike+Mignola" },
  // --- ADAPTATION ACTORS & HOLLYWOOD ADAPTATION TALENT ---
  ...ADAPTATION_ACTOR_ENTITIES,
  // --- ADAPTATION CHARACTER ROLES (Decomposed & Canonical) ---
  ...ADAPTATION_ROLE_CHARACTER_ENTITIES,
];

// In-memory cache for dynamic text lookups. Entries are derived in part from
// live Supabase queries (recovered_index_contracts, and transitively the
// ppcf_wiki_pages-backed lore index), so a stale entry served forever from a
// long-lived warm instance would silently paper over corrected DB data the
// same way the wiki corpus cache in lib/wiki/lore-search.ts could. A short
// TTL keeps this cheap per-request while letting it recover on its own.
const ENTITY_CACHE_TTL_MS = 15 * 60 * 1000;
const entityCache = new Map<string, { data: EntityWikiDef[]; loadedAt: number }>();
let cachedIndexContracts: { index_code: string; display_name: string }[] | null = null;
let cachedIndexContractsLoadedAt = 0;
const INDEX_CONTRACTS_CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Matches financial & market-concept terminology against the real 4,653-term CBR market
 * lexicon (lib/lexicon/cbr_market_lexicon.json, via lib/lexicon/cbr-lexicon.ts), replacing
 * what used to be a ~47-entry hardcoded list here. Matching is O(words * 12) via
 * findCbrTermsInText's n-gram index, not a per-term regex scan, so this stays cheap per
 * news story regardless of the lexicon's size.
 */
function matchCbrLexiconEntities(text: string): EntityWikiDef[] {
  try {
    return findCbrTermsInText(text, 12).map(({ entry, matchedText }) => ({
      term: matchedText,
      type: "market-concept" as const,
      target: "lexicon" as const,
      wikiPath: `/lexicon/${entry.slug}`,
      lexiconDetails: {
        category: entry.category,
        definition: entry.investopedia_definition,
        translation: entry.panel_profits_translation,
        investopediaUrl: entry.investopedia_url || `https://www.investopedia.com/search?q=${encodeURIComponent(entry.term)}`,
      },
    }));
  } catch {
    return [];
  }
}

/**
 * Dynamically resolves entities mentioned in text by combining:
 * 1. Pre-indexed canonical finance, creator, publisher, and lore entities with contextual role disambiguation.
 * 2. On-demand dynamic database lookup in `ppcf_gcd_creators`, `ppcf_gcd_publishers`, `ppcf_gcd_series`, `recovered_index_contracts`.
 */
export async function getDynamicEntitiesForText(text: string): Promise<EntityWikiDef[]> {
  if (!text || text.trim().length === 0) return [];
  const textHash = text.slice(0, 120);
  const cached = entityCache.get(textHash);
  if (cached && Date.now() - cached.loadedAt <= ENTITY_CACHE_TTL_MS) return cached.data;

  const actorMap = new Map<string, AdaptationActor>();
  for (const a of ADAPTATION_ACTORS) {
    actorMap.set(a.name.toLowerCase(), a);
    for (const al of a.aliases || []) {
      actorMap.set(al.toLowerCase(), a);
    }
  }

  const matchedEntities: EntityWikiDef[] = [];
  const seenTerms = new Set<string>();
  const lowerText = text.toLowerCase();

  // Match against canonical known registry
  for (const entity of KNOWN_NEWS_ENTITIES_MAP) {
    const termLower = entity.term.toLowerCase();
    if (GENERIC_REAL_WORLD_LOCATIONS.has(termLower)) continue;
    const escaped = entity.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const startsWithWord = /^\w/.test(entity.term);
    const endsWithWord = /\w$/.test(entity.term);
    const prefix = startsWithWord ? "\\b" : "(?<=^|\\s|[^\\w])";
    const suffix = endsWithWord ? "\\b" : "(?=$|\\s|[^\\w])";
    const isSingleWordCapitalized = /^[A-Z][a-z0-9]*$/.test(entity.term);
    const flags = isSingleWordCapitalized ? "" : "i";
    const regex = new RegExp(`${prefix}${escaped}${suffix}`, flags);
    if (regex.test(isSingleWordCapitalized ? text : lowerText)) {
      seenTerms.add(termLower);
      const clone: EntityWikiDef = { ...entity };

      // Dynamic Context-Aware Role Resolution for Multi-Universe Actors
      if (actorMap.has(termLower)) {
        const actor = actorMap.get(termLower)!;
        const resolvedRole = resolveActorRoleForContext(actor, text);
        clone.roleDetails = resolvedRole;
        if (resolvedRole.comicTicker) {
          clone.ticker = resolvedRole.comicTicker;
        }
      }

      matchedEntities.push(clone);
    }
  }

  // Match multi-universe lore entities (characters, items, locations, teams).
  // Async DB-backed variant: supplements the capped local JSON index with
  // the full ~219k-entity corpus (Marvel, DC, Star Wars, Image, Dark Horse,
  // Spawn, Transformers) ingested into public.ppcf_wiki_pages. Safe to use
  // here because this function is already async and already performs its
  // own Supabase queries below.
  try {
    const loreMatches = await findLoreEntitiesInTextAsync(text, 20);
    for (const lore of loreMatches) {
      const loreTitleLower = lore.title.toLowerCase();
      if (GENERIC_REAL_WORLD_LOCATIONS.has(loreTitleLower)) continue;
      if (LORE_OBSCURE_COLLISION_BLOCKLIST.has(loreTitleLower)) continue;

      if (!seenTerms.has(loreTitleLower)) {
        seenTerms.add(loreTitleLower);
        matchedEntities.push({
          term: lore.title,
          type: lore.type === "character" ? "character" : "lexicon",
          target: "intelligence",
          wikiPath: `/wiki/entry/${lore.slug}`,
        });
      }
    }
  } catch {
    // Graceful fallback if lore index unavailable
  }

  // Match financial & market-concept terms against the real 4,653-term CBR lexicon
  for (const cbrMatch of matchCbrLexiconEntities(text)) {
    const termLower = cbrMatch.term.toLowerCase();
    if (GENERIC_REAL_WORLD_LOCATIONS.has(termLower)) continue;
    if (seenTerms.has(termLower)) continue;
    seenTerms.add(termLower);
    matchedEntities.push(cbrMatch);
  }

  // Dynamic Supabase Database Query for unrecognized terms (cached in memory)
  try {
    let indexContracts = cachedIndexContracts;
    if (!indexContracts || Date.now() - cachedIndexContractsLoadedAt > INDEX_CONTRACTS_CACHE_TTL_MS) {
      const db = createAdminServerClient();
      const { data } = await db
        .from("recovered_index_contracts")
        .select("index_code, display_name");
      if (data) {
        cachedIndexContracts = data;
        cachedIndexContractsLoadedAt = Date.now();
        indexContracts = data;
      }
    }

    if (indexContracts) {
      for (const contract of indexContracts) {
        if (
          contract.display_name &&
          lowerText.includes(contract.display_name.toLowerCase()) &&
          !seenTerms.has(contract.display_name.toLowerCase())
        ) {
          seenTerms.add(contract.display_name.toLowerCase());
          matchedEntities.push({
            term: contract.display_name,
            ticker: `$${contract.index_code}`,
            type: "equity",
            target: "lexicon",
            wikiPath: `/indices?q=${encodeURIComponent(contract.index_code)}`,
          });
        }
      }
    }
  } catch {
    // Database query fallback
  }

  // Cross-link character roles for matched adaptation actors
  for (const match of [...matchedEntities]) {
    if (match.roleDetails) {
      const decomposed = decomposeCharacterTerms(match.roleDetails.character);
      for (const charTerm of decomposed) {
        const charLower = charTerm.toLowerCase();
        if (GENERIC_REAL_WORLD_LOCATIONS.has(charLower)) continue;
        if (seenTerms.has(charLower)) continue;

        seenTerms.add(charLower);
        const slug = charTerm.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        matchedEntities.push({
          term: charTerm,
          ticker: match.roleDetails.comicTicker,
          type: "character",
          target: "intelligence",
          wikiPath: `/wiki/entry/${slug}`,
          roleDetails: match.roleDetails,
        });
      }
    }
  }

  const filtered = matchedEntities.filter(
    (e) => !GENERIC_REAL_WORLD_LOCATIONS.has(e.term.toLowerCase())
  );
  const defuzzified = resolveFuzzyEntitiesForStory(text, filtered);
  entityCache.set(textHash, { data: defuzzified, loadedAt: Date.now() });
  return defuzzified;
}

/**
 * Synchronous matching against canonical registered entities for page components and unit tests.
 */
export function findNewsEntities(headline: string, summary: string | null): EntityWikiDef[] {
  const text = `${headline} ${summary || ""}`;
  return extractEntitiesFromContext(text);
}

/**
 * Extracts entities matching text words.
 */
export function extractEntitiesFromContext(text: string): EntityWikiDef[] {
  if (!text) return [];

  const actorMap = new Map<string, AdaptationActor>();
  for (const a of ADAPTATION_ACTORS) {
    actorMap.set(a.name.toLowerCase(), a);
    for (const al of a.aliases || []) {
      actorMap.set(al.toLowerCase(), a);
    }
  }

  const baseMatches: EntityWikiDef[] = [];
  const seenTerms = new Set<string>();

  for (const def of KNOWN_NEWS_ENTITIES_MAP) {
    const termLower = def.term.toLowerCase();
    if (GENERIC_REAL_WORLD_LOCATIONS.has(termLower)) continue;
    const escaped = def.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const startsWithWord = /^\w/.test(def.term);
    const endsWithWord = /\w$/.test(def.term);
    const prefix = startsWithWord ? "\\b" : "(?<=^|\\s|[^\\w])";
    const suffix = endsWithWord ? "\\b" : "(?=$|\\s|[^\\w])";
    const isSingleWordCapitalized = /^[A-Z][a-z0-9]*$/.test(def.term);
    const flags = isSingleWordCapitalized ? "" : "i";
    const regex = new RegExp(`${prefix}${escaped}${suffix}`, flags);
    if (regex.test(text)) {
      seenTerms.add(termLower);
      const clone: EntityWikiDef = { ...def };

      // Dynamic Context-Aware Role Resolution for Multi-Universe Actors
      if (actorMap.has(termLower)) {
        const actor = actorMap.get(termLower)!;
        const resolvedRole = resolveActorRoleForContext(actor, text);
        clone.roleDetails = resolvedRole;
        if (resolvedRole.comicTicker) {
          clone.ticker = resolvedRole.comicTicker;
        }
      }

      baseMatches.push(clone);
    }
  }

  try {
    const loreMatches = findLoreEntitiesInText(text, 20);
    for (const lore of loreMatches) {
      const loreTitleLower = lore.title.toLowerCase();
      if (GENERIC_REAL_WORLD_LOCATIONS.has(loreTitleLower)) continue;
      if (LORE_OBSCURE_COLLISION_BLOCKLIST.has(loreTitleLower)) continue;

      if (!seenTerms.has(loreTitleLower)) {
        seenTerms.add(loreTitleLower);
        baseMatches.push({
          term: lore.title,
          ticker: lore.ticker,
          type: lore.type === "character" ? "character" : lore.type === "equity" ? "equity" : "lexicon",
          target: "intelligence",
          wikiPath: `/wiki/entry/${lore.slug}`,
        });
      }
    }
  } catch {
    // Safe fallback
  }

  // Match financial & market-concept terms against the real 4,653-term CBR lexicon
  for (const cbrMatch of matchCbrLexiconEntities(text)) {
    const termLower = cbrMatch.term.toLowerCase();
    if (GENERIC_REAL_WORLD_LOCATIONS.has(termLower)) continue;
    if (seenTerms.has(termLower)) continue;
    seenTerms.add(termLower);
    baseMatches.push(cbrMatch);
  }

  // Cross-link character roles for matched adaptation actors
  for (const match of [...baseMatches]) {
    if (match.roleDetails) {
      const decomposed = decomposeCharacterTerms(match.roleDetails.character);
      for (const charTerm of decomposed) {
        const charLower = charTerm.toLowerCase();
        if (GENERIC_REAL_WORLD_LOCATIONS.has(charLower)) continue;
        if (seenTerms.has(charLower)) continue;

        seenTerms.add(charLower);
        const slug = charTerm.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        baseMatches.push({
          term: charTerm,
          ticker: match.roleDetails.comicTicker,
          type: "character",
          target: "intelligence",
          wikiPath: `/wiki/entry/${slug}`,
          roleDetails: match.roleDetails,
        });
      }
    }
  }

  const filtered = baseMatches.filter((def) => !GENERIC_REAL_WORLD_LOCATIONS.has(def.term.toLowerCase()));
  return resolveFuzzyEntitiesForStory(text, filtered);
}
