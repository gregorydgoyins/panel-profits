import fs from "fs";
import path from "path";
import { getCanonicalBackground } from "./canonical-backgrounds";

export interface LoreEntitySummary {
  slug: string;
  title: string;
  universe: "MARVEL" | "DC" | "STAR_WARS" | "IMAGE" | "DARK_HORSE" | "SPAWN" | "TRANSFORMERS" | string;
  type: "character" | "item" | "location" | "team" | "equity" | "creator";
  reality?: string;
  alignment?: string;
  creators?: string;
  first_appearance?: string;
  summary: string;
  imageUrl?: string | null;
  role?: string;
  alter_ego?: string;
  ticker?: string;
  gadgets_and_weapons?: string[];
  locations_and_hideouts?: string[];
  super_teams?: string[];
  allies?: string[];
  rogues_gallery?: string[];
  landmark_debuts?: Array<{
    title: string;
    significance: string;
    catalogUrl: string;
    era?: string;
    assetTier?: string;
  }>;
}

interface LoreIndexData {
  total_indexed: number;
  universe_breakdown: Record<string, number>;
  universes: Record<string, Array<{ slug: string; title: string; universe: string; reality?: string; alignment?: string; creators?: string; first_appearance?: string; summary: string }>>;
  items: Array<{ slug: string; title: string; universe: string; reality?: string; creators?: string; first_appearance?: string; summary: string }>;
  locations: Array<{ slug: string; title: string; universe: string; reality?: string; creators?: string; first_appearance?: string; summary: string }>;
  teams: Array<{ slug: string; title: string; universe: string; reality?: string; creators?: string; first_appearance?: string; summary: string }>;
}

export const GENERIC_REAL_WORLD_LOCATIONS = new Set([
  "florida",
  "orlando",
  "orlando florida",
  "miami",
  "tampa",
  "california",
  "texas",
  "houston",
  "dallas",
  "austin",
  "america",
  "united states",
  "united states of america",
  "europe",
  "england",
  "great britain",
  "united kingdom",
  "london",
  "new york",
  "new york city",
  "chicago",
  "los angeles",
  "san francisco",
  "seattle",
  "boston",
  "atlanta",
  "washington",
  "washington dc",
  "paris",
  "france",
  "tokyo",
  "japan",
  "germany",
  "berlin",
  "italy",
  "rome",
  "canada",
  "toronto",
  "vancouver",
  "ontario",
  "australia",
  "sydney",
  "melbourne",
  "china",
  "beijing",
  "shanghai",
  "russia",
  "moscow",
  "africa",
  "asia",
  "brazil",
  "mexico",
  "india",
  "ireland",
  "scotland",
  "spain",
  "egypt",
  "greece",
  "state of florida",
  "florida keys",
  "state of california",
  "state of new york",
  "everglades",
  "florida everglades",
  "kentucky",
  "alabama",
  "georgia",
  "ohio",
  "michigan",
  "pennsylvania",
  "virginia",
  "arkansas",
  "central arkansas",
]);

export const LORE_OBSCURE_COLLISION_BLOCKLIST = new Set([
  "the marvel",
  "marvel-vehicle-marvel",
  "marvel universe",
  "the marvel universe",
  "the car",
  "the box",
  "the ship",
  "the gun",
  "the plane",
  "the shield",
  "the suit",
  "the sword",
  "dragons",
  "dragon",
  "dragons street gang",
  "knights",
  "shadows",
  "clowns",
  "demons",
  "angels",
  "monsters",
  "wizards",
  "aliens",
  "robots",
  "mutants",
  "agents",
  "ninjas",
  "gangs",
  "police",
  "army",
  "navy",
  "scratch",
  "risk",
  "rings",
  "elves",
  "orcs",
  "dwarfs",
  "hobbits",
  "been",
  "roger",
  "kung",
  "bunny",
  "hero",
  "films",
  "movie",
  "movies",
  "critic",
  "critics",
  "review",
  "reviews",
  "rating",
  "ratings",
  "score",
  "scores",
  "quote",
  "quotes",
  "fan",
  "fans",
  "viewer",
  "viewers",
  "interview",
  "interviews",
  "trailer",
  "trailers",
  "teaser",
  "teasers",
  "poster",
  "posters",
  "exclusive",
  "breaking",
  "report",
  "reports",
  "reporting",
  "source",
  "sources",
  "update",
  "updates",
  "doctor",
  "dr",
  "dr.",
  "captain",
  "capt",
  "capt.",
  "professor",
  "prof",
  "prof.",
  "agent",
  "lord",
  "master",
  "mister",
  "mr",
  "mr.",
  "baron",
  "general",
  "major",
  "king",
  "queen",
  "count",
  "sir",
  "lady",
]);

export const TOP_TIER_HERO_WHITELIST = new Set([
  "batman",
  "superman",
  "spiderman",
  "spider-man",
  "wolverine",
  "thor",
  "hulk",
  "deadpool",
  "venom",
  "punisher",
  "daredevil",
  "joker",
  "batmobile",
  "apocalypse",
  "jubilee",
  "bucky",
  "spawn",
  "hellboy",
  "thanos",
  "galactus",
  "magneto",
  "cyclops",
  "storm",
  "colossus",
  "nightcrawler",
  "rogue",
  "gambit",
  "hawkeye",
  "carnage",
  "cable",
  "domino",
  "bishop",
  "archangel",
  "blade",
  "taskmaster",
  "sentry",
  "quicksilver",
  "asgard",
  "krypton",
  "atlantis",
  "doom",
  "banner",
  "franklin",
  "rogers",
  "carter",
]);

let cachedIndex: LoreIndexData | null = null;
let cachedSlugMap: Map<string, LoreEntitySummary> | null = null;
let cachedTitleMap: Map<string, LoreEntitySummary> | null = null;
export const KNOWN_HERO_TICKERS: Record<string, string> = {
  "spider-man": "$SPDR",
  "spiderman": "$SPDR",
  "batman": "$BAT",
  "superman": "$SUPR",
  "wolverine": "$WOLV",
  "hulk": "$HULK",
  "thor": "$THOR",
  "iron man": "$IRON",
  "captain america": "$CAP",
  "deadpool": "$DP",
  "daredevil": "$DD",
  "punisher": "$PUN",
  "the punisher": "$PUN",
  "wonder woman": "$WW",
  "the flash": "$FLSH",
  "flash": "$FLSH",
  "green lantern": "$GL",
  "aquaman": "$AQM",
  "magneto": "$MGN",
  "doctor strange": "$STRG",
  "stephen strange": "$STRG",
  "doctor who": "$DWHO",
  "the doctor": "$DWHO",
  "doctor fate": "$FATE",
  "doctor manhattan": "$WTCH",
  "doctor octopus": "$DOC",
  "doc ock": "$DOC",
  "black panther": "$BP",
  "black widow": "$BW",
  "hawkeye": "$HAWK",
  "venom": "$VENOM",
  "carnage": "$CARNAGE",
  "spawn": "$SPWN",
  "hellboy": "$HELLBOY",
  "thanos": "$THANOS",
  "galactus": "$GALACTUS",
  "silver surfer": "$SURFER",
  "cyclops": "$CYC",
  "storm": "$STORM",
  "jean grey": "$PHOENIX",
  "rogue": "$ROGUE",
  "gambit": "$GAMBIT",
  "nightcrawler": "$NIGHT",
  "beast": "$BEAST",
  "professor x": "$PROFX",
  "charles xavier": "$PROFX",
  "mister fantastic": "$FF4",
  "reed richards": "$FF4",
  "invisible woman": "$FF4",
  "sue storm": "$FF4",
  "human torch": "$FF4",
  "johnny storm": "$FF4",
  "the thing": "$FF4",
  "ben grimm": "$FF4",
  "star trek": "$TREK",
  "captain kirk": "$TREK",
  "captain picard": "$TREK",
  "the mandalorian": "$MANDO",
  "mandalorian": "$MANDO",
  "grogu": "$MANDO",
  "captain marvel": "$CMARV",
  "captain carter": "$CARTER",
  "avengers": "$AVNG",
  "x-men": "$XMEN",
  "fantastic four": "$FF",
  "justice league": "$JL",
  "doctor doom": "$DOOM",
  "doom": "$DOOM",
  "bruce banner": "$HULK",
  "banner": "$HULK",
  "steve rogers": "$CAP",
  "peggy carter": "$CARTER",
  "agent carter": "$CARTER",
  "franklin richards": "$FF:FRANKLIN",
  "franklin": "$FF:FRANKLIN",
  "marvel cinematic universe": "$MCU",
  "mcu": "$MCU",
};

export function deriveEntityTicker(title: string, universe: string): string {
  const clean = title.trim().toLowerCase();
  if (KNOWN_HERO_TICKERS[clean]) return KNOWN_HERO_TICKERS[clean];

  const uni = (universe || "MARVEL").toUpperCase();
  const uniPrefix = uni === "MARVEL" ? "MRVL" : uni === "DC" ? "DC" : uni === "STAR_WARS" ? "SW" : uni === "IMAGE" ? "IMG" : uni === "DARK_HORSE" ? "DH" : uni === "SPAWN" ? "SPWN" : uni;

  const cleanTitle = title.replace(/[^a-zA-Z0-9\s]/g, "").trim();
  const words = cleanTitle.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    const single = words[0].toUpperCase();
    return `$${uniPrefix}:${single.slice(0, 8)}`;
  }
  const acronym = words.map((w) => w[0].toUpperCase()).join("");
  return `$${uniPrefix}:${acronym}`;
}

function loadLoreIndex(): LoreIndexData {
  if (cachedIndex) return cachedIndex;
  if (typeof window !== "undefined") {
    return {
      total_indexed: 0,
      universe_breakdown: {},
      universes: {},
      items: [],
      locations: [],
      teams: [],
    };
  }
  try {
    const indexPath = path.join(process.cwd(), "lib/wiki/multi_universe_character_index.json");
    if (fs.existsSync(indexPath)) {
      const raw = fs.readFileSync(indexPath, "utf-8");
      cachedIndex = JSON.parse(raw);
    } else {
      cachedIndex = {
        total_indexed: 0,
        universe_breakdown: {},
        universes: {},
        items: [],
        locations: [],
        teams: [],
      };
    }
  } catch {
    cachedIndex = {
      total_indexed: 0,
      universe_breakdown: {},
      universes: {},
      items: [],
      locations: [],
      teams: [],
    };
  }

  // Populate slug and title lookup maps
  cachedSlugMap = new Map();
  cachedTitleMap = new Map();
  if (cachedIndex) {
    // The bundled JSON index (lib/wiki/multi_universe_character_index.json)
    // was captured by an early ingestion pass whose MediaWiki infobox parser
    // sometimes failed on a page, leaving the raw unparsed wikitext line (e.g.
    // "| Title = Warlock", "* Some Alias") stored as the character's title
    // instead of the parsed value -- about 3.3k of the ~32.7k titled entries in
    // this file are affected. These entries have no usable title, so they are
    // dropped from the in-memory index entirely rather than surfaced in search
    // results; the live public.ppcf_wiki_pages DB (queried directly by the
    // featured-section and async DB-backed search paths) holds correctly
    // re-ingested versions of the same characters.
    const isRawWikitextTitle = (title: string | undefined | null): boolean => {
      if (!title) return true;
      const t = title.trim();
      return t.startsWith("|") || t.startsWith("*");
    };

    const registerTitle = (title: string, summary: LoreEntitySummary) => {
      const clean = title.trim().toLowerCase();
      if (summary.type === "location" && GENERIC_REAL_WORLD_LOCATIONS.has(clean)) {
        return;
      }
      if (LORE_OBSCURE_COLLISION_BLOCKLIST.has(clean)) {
        return;
      }
      if (clean.length >= 3 && !cachedTitleMap!.has(clean)) {
        cachedTitleMap!.set(clean, summary);
      }
      const normalized = clean.replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim();
      if (LORE_OBSCURE_COLLISION_BLOCKLIST.has(normalized)) {
        return;
      }
      if (normalized.length >= 3 && !cachedTitleMap!.has(normalized)) {
        if (!(summary.type === "location" && GENERIC_REAL_WORLD_LOCATIONS.has(normalized))) {
          cachedTitleMap!.set(normalized, summary);
        }
      }
    };

    for (const [uni, chars] of Object.entries(cachedIndex.universes || {})) {
      for (const ch of chars) {
        if (isRawWikitextTitle(ch.title)) continue;
        const derivedTicker = deriveEntityTicker(ch.title, ch.universe || uni);
        const debuts = [];
        if (ch.first_appearance && typeof ch.first_appearance === "string") {
          const faClean = ch.first_appearance.replace(/\bVol\s*\d+\b/gi, "").replace(/\s+/g, " ").trim();
          debuts.push({
            title: faClean,
            significance: `1st Canonical Appearance of ${ch.title}`,
            catalogUrl: `/comics?q=${encodeURIComponent(faClean)}`,
            era: faClean.includes("196") ? "SILVER" : faClean.includes("197") ? "BRONZE" : faClean.includes("198") ? "COPPER" : "MODERN",
            assetTier: "KEY_EQUITY",
          });
        }
        const itemSummary: LoreEntitySummary = {
          slug: ch.slug,
          title: ch.title,
          universe: ch.universe || uni.toUpperCase(),
          type: "character",
          reality: ch.reality,
          alignment: ch.alignment,
          creators: ch.creators,
          first_appearance: ch.first_appearance,
          summary: ch.summary,
          ticker: derivedTicker,
          landmark_debuts: debuts,
        };
        cachedSlugMap.set(ch.slug, itemSummary);
        registerTitle(ch.title, itemSummary);
      }
    }

    for (const it of cachedIndex.items || []) {
      if (isRawWikitextTitle(it.title)) continue;
      const itemSummary: LoreEntitySummary = {
        slug: it.slug,
        title: it.title,
        universe: it.universe,
        type: "item",
        reality: it.reality,
        creators: it.creators,
        first_appearance: it.first_appearance,
        summary: it.summary,
        ticker: deriveEntityTicker(it.title, it.universe),
      };
      cachedSlugMap.set(it.slug, itemSummary);
      registerTitle(it.title, itemSummary);
    }

    for (const loc of cachedIndex.locations || []) {
      if (isRawWikitextTitle(loc.title)) continue;
      const itemSummary: LoreEntitySummary = {
        slug: loc.slug,
        title: loc.title,
        universe: loc.universe,
        type: "location",
        reality: loc.reality,
        creators: loc.creators,
        first_appearance: loc.first_appearance,
        summary: loc.summary,
        ticker: deriveEntityTicker(loc.title, loc.universe),
      };
      cachedSlugMap.set(loc.slug, itemSummary);
      registerTitle(loc.title, itemSummary);
    }

    for (const tm of cachedIndex.teams || []) {
      if (isRawWikitextTitle(tm.title)) continue;
      const itemSummary: LoreEntitySummary = {
        slug: tm.slug,
        title: tm.title,
        universe: tm.universe,
        type: "team",
        reality: tm.reality,
        creators: tm.creators,
        first_appearance: tm.first_appearance,
        summary: tm.summary,
        ticker: deriveEntityTicker(tm.title, tm.universe),
      };
      cachedSlugMap.set(tm.slug, itemSummary);
      registerTitle(tm.title, itemSummary);
    }

    // Register adaptation cast & talent registry
    try {
      const castPath = path.join(process.cwd(), "lib/news/adaptation-cast-registry.json");
      if (fs.existsSync(castPath)) {
        const castRaw = fs.readFileSync(castPath, "utf-8");
        const castList = JSON.parse(castRaw);
        for (const actor of castList) {
          const slug = `actor-${actor.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
          const primaryRole = actor.roles[0];
          const actorSummary: LoreEntitySummary = {
            slug,
            title: actor.name,
            universe: primaryRole?.universe || "MARVEL",
            type: "character",
            alter_ego: actor.roles.map((r: any) => r.character).join(" / "),
            creators: `Film & TV Portrayals: ${actor.franchises.join(", ")}`,
            first_appearance: primaryRole?.landmarkIssue || "Comic Debut Issue",
            ticker: primaryRole?.comicTicker || "$EQUITY",
            summary: `Prominent adaptation actor portraying ${actor.roles.map((r: any) => `${r.character} (${r.universe})`).join(", ")}. Direct secondary market catalyst for ${actor.roles.map((r: any) => r.landmarkIssue).join(", ")}.`,
            landmark_debuts: actor.roles.map((r: any) => ({
              title: r.landmarkIssue,
              significance: `Portrayed ${r.character}`,
              catalogUrl: `/comics?q=${encodeURIComponent(r.landmarkIssue)}`,
              assetTier: "BLUE_CHIP_KEY",
            })),
          };
          cachedSlugMap.set(slug, actorSummary);
          registerTitle(actor.name, actorSummary);
          for (const alias of actor.aliases || []) {
            registerTitle(alias, actorSummary);
          }
        }
      }
    } catch {
      // Safe fallback
    }

    // Register adaptation asset registry (cinematic & storyline equities)
    try {
      const assetPath = path.join(process.cwd(), "lib/news/adaptation-asset-registry.json");
      if (fs.existsSync(assetPath)) {
        const assetRaw = fs.readFileSync(assetPath, "utf-8");
        const assetList = JSON.parse(assetRaw);
        for (const asset of assetList) {
          const assetSummary: LoreEntitySummary = {
            slug: asset.slug,
            title: asset.title,
            universe: asset.universe,
            type: "equity",
            creators: (asset.creators || []).join(", "),
            first_appearance: asset.landmarkIssue || "Key Issue",
            ticker: asset.ticker,
            summary: asset.summary || `Canonical ${asset.franchise} equity asset.`,
            landmark_debuts: (asset.landmarkIssues || []).map((li: any) => ({
              title: li.title,
              significance: li.significance,
              catalogUrl: li.catalogUrl,
              era: li.era,
              assetTier: li.assetTier,
            })),
            super_teams: asset.characters || [],
          };
          cachedSlugMap.set(asset.slug, assetSummary);
          registerTitle(asset.title, assetSummary);
          for (const alias of asset.aliases || []) {
            registerTitle(alias, assetSummary);
          }
        }
      }
    } catch {
      // Safe fallback
    }
  }

  return cachedIndex || {
    total_indexed: 0,
    universe_breakdown: {},
    universes: {},
    items: [],
    locations: [],
    teams: [],
  };
}

/**
 * Searches multi-universe lore index for characters, items, locations, and teams.
 */
export function searchLoreEntities(query: string, limit = 18): LoreEntitySummary[] {
  const index = loadLoreIndex();
  if (!query || !query.trim()) {
    return [];
  }

  const q = query.toLowerCase().trim();
  const results: LoreEntitySummary[] = [];

  // Helper matcher
  const matchEntry = (item: { title: string; summary?: string; creators?: string; first_appearance?: string }, type: LoreEntitySummary["type"], universe: string, slug: string, reality?: string, alignment?: string) => {
    const titleMatch = item.title.toLowerCase().includes(q);
    const faMatch = item.first_appearance?.toLowerCase().includes(q);
    const creatorMatch = item.creators?.toLowerCase().includes(q);

    if (titleMatch || faMatch || creatorMatch) {
      results.push({
        slug,
        title: item.title,
        universe,
        type,
        reality,
        alignment,
        creators: item.creators,
        first_appearance: item.first_appearance,
        summary: item.summary || "",
      });
    }
  };

  // 1. Search items & weapons first if relevant
  for (const it of index.items || []) {
    if (results.length >= limit) break;
    matchEntry(it, "item", it.universe, it.slug, it.reality);
  }

  // 2. Search locations & cities
  for (const loc of index.locations || []) {
    if (results.length >= limit) break;
    matchEntry(loc, "location", loc.universe, loc.slug, loc.reality);
  }

  // 3. Search teams
  for (const tm of index.teams || []) {
    if (results.length >= limit) break;
    matchEntry(tm, "team", tm.universe, tm.slug, tm.reality);
  }

  // 4. Search characters across universes
  for (const [uni, chars] of Object.entries(index.universes || {})) {
    for (const ch of chars) {
      if (results.length >= limit) break;
      matchEntry(ch, "character", ch.universe || uni.toUpperCase(), ch.slug, ch.reality, ch.alignment);
    }
    if (results.length >= limit) break;
  }

  return results.slice(0, limit);
}

// NOTE: A hand-authored CANONICAL_PREMIER_ENTITIES table (13 well-known
// Marvel characters with curated summaries, tickers and landmark-debut
// blurbs written directly into this file) used to live here as the only
// way to resolve these slugs synchronously, since the local JSON sample
// below has messy/unclean titles for these characters. It has been
// removed per the zero-hardcoded-data standing rule -- getLoreEntityBySlug
// now resolves purely from the local JSON sample (may be null for these
// slugs), and getLoreEntityBySlugAsync additionally resolves them from the
// real, live-queried public.ppcf_wiki_pages corpus (see loadWikiCorpusFromDb
// below). Prefer the async path wherever the caller can await it.

const SLUG_ALIASES: Record<string, string> = {
  batman: "bruce-wayne-earth-two",
  "bruce-wayne": "bruce-wayne-earth-two",
  "dark-knight": "bruce-wayne-earth-two",
  superman: "kal-l-earth-two",
  "clark-kent": "kal-l-earth-two",
  "spider-man": "spider-man",
  spiderman: "spider-man",
  "spider-m": "spider-man",
  "peter-parker": "spider-man",
  deadpool: "wade-wilson-earth-616",
  joker: "joker-earth-two",
  wolverine: "james-howlett-earth-811",
  "doctor-doom": "doctor-doom",
  doom: "doctor-doom",
  "dr-doom": "doctor-doom",
  "victor-von-doom": "doctor-doom",
  "doctor-who": "the-doctor-earth-5556",
  "the-doctor": "the-doctor-earth-5556",
  "doctor-strange": "doctor-strange",
  "stephen-strange": "doctor-strange",
  "doctor-octopus": "doctor-octopus",
  "doc-ock": "doctor-octopus",
  "doctor-fate": "doctor-fate",
  "doctor-manhattan": "doctor-manhattan",
  "star-trek": "star-trek",
  "captain-kirk": "james-t-kirk",
  "captain-picard": "jean-luc-picard",
  "mandalorian": "the-mandalorian",
  "the-mandalorian": "the-mandalorian",
  grogu: "grogu",
  "bruce-banner": "bruce-banner",
  banner: "bruce-banner",
  hulk: "bruce-banner",
  "the-hulk": "bruce-banner",
  "incredible-hulk": "bruce-banner",
  "steve-rogers": "steve-rogers",
  "captain-america": "steve-rogers",
  cap: "steve-rogers",
  "peggy-carter": "peggy-carter",
  "agent-carter": "peggy-carter",
  "captain-carter": "peggy-carter",
  "franklin-richards": "franklin-richards",
  franklin: "franklin-richards",
  thor: "thor",
  "thor-odinson": "thor",
  avengers: "avengers",
  "the-avengers": "avengers",
  "marvel-cinematic-universe": "marvel-cinematic-universe",
  mcu: "marvel-cinematic-universe",
  "marvel-universe": "marvel-cinematic-universe",
  "the-marvel-universe": "marvel-cinematic-universe",
  "marvel-vehicle-marvel": "marvel-cinematic-universe",
  "claire-temple": "claire-temple",
  "night-nurse": "night-nurse",
  "iron-man": "iron-man",
  "tony-stark": "iron-man",
};

/**
 * Retrieves a single lore entity by its slug.
 */
export function getLoreEntityBySlug(slug: string): LoreEntitySummary | null {
  loadLoreIndex();
  if (!slug) return null;
  const cleanSlug = slug.toLowerCase().trim();

  // 1. Direct slug map match (local JSON sample)
  if (cachedSlugMap && cachedSlugMap.has(cleanSlug)) {
    return cachedSlugMap.get(cleanSlug)!;
  }

  // 2. Direct alias match
  const alias = SLUG_ALIASES[cleanSlug];
  if (alias && cachedSlugMap && cachedSlugMap.has(alias)) {
    return cachedSlugMap.get(alias)!;
  }

  // 3. Match by title from cachedTitleMap (e.g. "batman", "iron man")
  const titlePhrase = cleanSlug.replace(/-/g, " ");
  if (cachedTitleMap && cachedTitleMap.has(titlePhrase)) {
    return cachedTitleMap.get(titlePhrase)!;
  }

  // 4. Fallback to verified canonical backgrounds (single source of truth for major character entries)
  const canonical = getCanonicalBackground(cleanSlug) || (alias ? getCanonicalBackground(alias) : null);
  if (canonical) {
    return {
      slug: canonical.slug,
      title: canonical.term,
      universe: canonical.universe,
      type: "character",
      creators: canonical.creators,
      first_appearance: canonical.landmarkIssue,
      summary: canonical.description,
      ticker: canonical.ticker,
      landmark_debuts: [
        {
          title: canonical.landmarkIssue,
          significance: `${canonical.era} definitive first appearance and market benchmark`,
          catalogUrl: `/comics?q=${encodeURIComponent(canonical.landmarkIssue)}`,
          era: canonical.era,
        },
      ],
    };
  }

  return null;
}

/**
 * Fallback used only when the live public.ppcf_wiki_pages query in
 * getFeaturedLoreEntities can't be reached (offline/test environments,
 * or a real outage) -- pulls "top of file" entries from the local JSON
 * sample instead of a hardcoded name list. This is the same
 * degrade-to-local-sample behavior already used elsewhere in this file
 * (see loadWikiCorpusFromDb's doc comment) when the DB is unavailable.
 */
function getFeaturedLoreEntitiesFromLocalSample(): LoreEntitySummary[] {
  const index = loadLoreIndex();
  const featured: LoreEntitySummary[] = [];

  const marvelChars = index.universes?.marvel?.slice(0, 4) || [];
  for (const ch of marvelChars) {
    featured.push({ ...ch, type: "character" });
  }

  const dcChars = index.universes?.dc?.slice(0, 4) || [];
  for (const ch of dcChars) {
    featured.push({ ...ch, type: "character" });
  }

  for (const it of (index.items || []).slice(0, 4)) {
    featured.push({ ...it, type: "item" });
  }

  for (const loc of (index.locations || []).slice(0, 4)) {
    featured.push({ ...loc, type: "location" });
  }

  return featured;
}

/**
 * Picks up to `totalCap` entities of the given type from the live
 * multi-universe DB index, capping how many come from any single
 * universe (`perUniverseCap`) so the result isn't dominated by whichever
 * universe happens to sort first, and requiring a real signal of
 * completeness -- a populated summary, creators and first_appearance --
 * rather than thin/fallback rows.
 */
function pickQualityFeatured(
  entities: LoreEntitySummary[],
  type: LoreEntitySummary["type"],
  perUniverseCap: number,
  totalCap: number
): LoreEntitySummary[] {
  const picked: LoreEntitySummary[] = [];
  const perUniverseCount = new Map<string, number>();
  for (const entity of entities) {
    if (picked.length >= totalCap) break;
    if (entity.type !== type) continue;
    if (!entity.summary || entity.summary.trim().length < 40) continue;
    if (!entity.creators || !entity.first_appearance) continue;
    const count = perUniverseCount.get(entity.universe) || 0;
    if (count >= perUniverseCap) continue;
    picked.push(entity);
    perUniverseCount.set(entity.universe, count + 1);
  }
  return picked;
}

/**
 * Returns featured entities for the wiki overview, queried live from the
 * real, multi-universe public.ppcf_wiki_pages corpus (via the same
 * WikiDbIndex loaded by loadWikiCorpusFromDb for text-entity matching)
 * rather than any hardcoded/curated name list. Falls back to the local
 * JSON sample only when the live corpus can't be reached at all --
 * never to fabricated content.
 */
export async function getFeaturedLoreEntities(): Promise<LoreEntitySummary[]> {
  try {
    const { createAdminServerClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminServerClient();
    const { data } = await supabase
      .from("ppcf_wiki_pages")
      .select("slug, display_title, universe, page_type, summary, creators, first_appearance, reality")
      .neq("universe", WIKI_DB_EXCLUDED_UNIVERSE)
      .in("page_type", ["CHARACTER", "ITEM", "LOCATION"])
      .limit(20);

    if (data && data.length > 0) {
      return data.map((row) => {
        const universe = (row.universe || "MARVEL").toUpperCase();
        const type = WIKI_DB_PAGE_TYPE_TO_LORE_TYPE[row.page_type as string] || "character";
        return {
          slug: row.slug,
          title: row.display_title,
          universe,
          type,
          reality: row.reality || undefined,
          creators: row.creators || undefined,
          first_appearance: row.first_appearance || undefined,
          summary: row.summary || "",
          ticker: deriveEntityTicker(row.display_title, universe),
        };
      });
    }
  } catch {
    // DB unreachable, fallback to local sample
  }

  return getFeaturedLoreEntitiesFromLocalSample();
}

const LORE_STOP_WORDS = new Set([
  "the", "and", "for", "with", "this", "that", "from", "into", "over", "under", "about",
  "comic", "comics", "book", "books", "issue", "issues", "first", "last", "cover", "year",
  "price", "prices", "sale", "sales", "auction", "record", "market", "grade", "graded",
  "hero", "heroes", "villain", "villains", "team", "world", "earth", "time", "death", "life",
  "city", "state", "star", "dark", "light", "high", "gold", "silver", "bronze", "modern",
  "cgc", "cbcs", "pgx", "mint", "near", "fine", "good", "very", "rare", "scarce", "panel",
  "collector", "collectors", "collection", "collections", "creator", "creators", "reader",
  "readers", "writer", "writers", "artist", "artists", "studio", "studios", "character",
  "characters", "equity", "valuation", "slab", "slabs", "inventory", "spread", "spreads"
]);

interface CandidatePhrase {
  phrase: string;
  isSingleWord: boolean;
}

/**
 * Shared n-gram tokenizer used by both the synchronous (local JSON index) and
 * asynchronous (Supabase-backed) lore matchers, so the two paths apply the
 * exact same capitalization / stopword / blocklist filtering and only differ
 * in which title map they look each candidate phrase up against.
 */
function* generateCandidatePhrases(text: string): Generator<CandidatePhrase> {
  const rawWords = text
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (rawWords.length === 0) return;

  // Check 4-grams down to 1-grams to prioritize longest matches
  for (let n = 4; n >= 1; n--) {
    for (let i = 0; i <= rawWords.length - n; i++) {
      const slice = rawWords.slice(i, i + n);
      const phrase = slice.join(" ").toLowerCase();

      if (n === 1) {
        if (phrase.length < 4 || LORE_STOP_WORDS.has(phrase)) continue;
        // Require proper capitalization in the original text (e.g. "Batman", not "been")
        if (slice[0][0] !== slice[0][0].toUpperCase()) continue;
      } else {
        // Multi-word entities must start with a capital letter and end with a capital letter or digit
        if (slice[0][0] !== slice[0][0].toUpperCase() || !/^[A-Z0-9]/.test(slice[n - 1])) {
          continue;
        }
      }

      if (GENERIC_REAL_WORLD_LOCATIONS.has(phrase)) continue;
      if (LORE_OBSCURE_COLLISION_BLOCKLIST.has(phrase)) continue;

      yield { phrase, isSingleWord: n === 1 };
    }
  }
}

/**
 * Rapidly extracts lore entities mentioned inside unstructured text
 * using n-gram exact tokenization against the local (capped) JSON index.
 * Synchronous by design -- used by page components and unit tests that
 * cannot await a database round trip. Coverage here is limited to
 * whatever made it into lib/wiki/multi_universe_character_index.json (a
 * fixed, per-universe-capped sample -- see that file's header comment);
 * for full coverage against the real ~219k-entity ingested corpus across
 * all 7 universes, use findLoreEntitiesInTextAsync instead.
 */
export function findLoreEntitiesInText(text: string, limit = 6): LoreEntitySummary[] {
  if (!text || !text.trim()) return [];
  loadLoreIndex();
  if (!cachedTitleMap) return [];

  const matched: LoreEntitySummary[] = [];
  const seenSlugs = new Set<string>();

  for (const { phrase, isSingleWord } of generateCandidatePhrases(text)) {
    if (matched.length >= limit) break;
    // 1-grams stay gated behind the curated whitelist -- a single common
    // word (e.g. "Storm", "Doom") is too collision-prone against ordinary
    // news vocabulary to trust on presence-in-index alone.
    if (isSingleWord && !TOP_TIER_HERO_WHITELIST.has(phrase)) continue;

    const entity = cachedTitleMap.get(phrase);
    if (entity && !seenSlugs.has(entity.slug)) {
      if (entity.type === "location" && GENERIC_REAL_WORLD_LOCATIONS.has(entity.title.toLowerCase())) {
        continue;
      }
      seenSlugs.add(entity.slug);
      matched.push(entity);
    }
  }

  return matched;
}

// ---------------------------------------------------------------------------
// Supabase-backed multi-universe wiki index (real, ingested
// public.ppcf_wiki_pages rows -- see scripts/ingest_marvel_wiki.cjs,
// ingest_dc_wiki.cjs, ingest_starwars_wiki.cjs, and ingest_indie_wiki.cjs,
// which together cover all 7 non-financial universes: MARVEL, DC,
// STAR_WARS, and the Image/Dark Horse/Spawn/Transformers indie set).
// Loaded once per process via a small number of paginated bulk queries
// (excluding the unrelated FINANCIAL market-lexicon mirror universe, which
// lives in the same table but is out of scope here -- see
// lib/lexicon/cbr_market_lexicon.json), then matched entirely in memory --
// the same architecture as the local JSON index, so a news article's
// entity extraction never issues one query per candidate n-gram or
// table-scans per word.
//
// The query below deliberately does NOT filter on specific universe
// string values (e.g. .eq("universe", "MARVEL")). The indie universes'
// stored strings have been inconsistent across ingestion passes (e.g.
// "IMAGE" vs "IMAGECOMICS", "DARK_HORSE" vs "DARKHORSE") -- excluding the
// one known non-lore universe (FINANCIAL) and taking everything else is
// robust to that drift, where enumerating exact values is not. Whatever
// the live "universe" column actually contains for each row is used
// as-is on the returned LoreEntitySummary.
// ---------------------------------------------------------------------------

const WIKI_DB_PAGE_TYPE_TO_LORE_TYPE: Record<string, LoreEntitySummary["type"]> = {
  CHARACTER: "character",
  CREATOR: "character",
  TEAM: "team",
  ITEM: "item",
  VEHICLE: "item",
  LOCATION: "location",
};

const WIKI_DB_EXCLUDED_UNIVERSE = "FINANCIAL";

const asyncSlugCache = new Map<string, { data: LoreEntitySummary | null; loadedAt: number }>();
const textLoreCache = new Map<string, { data: LoreEntitySummary[]; loadedAt: number }>();
const ASYNC_LORE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour in-memory memoization

/**
 * Same as findLoreEntitiesInText, but supplements the local (capped) JSON
 * matches with fast targeted lookups against public.ppcf_wiki_pages.
 * Instead of downloading the full 219k-row table, this extracts the candidate
 * phrases from the text and executes a single targeted query against the
 * database with in-memory memoization.
 */
export async function findLoreEntitiesInTextAsync(text: string, limit = 6): Promise<LoreEntitySummary[]> {
  const matched = findLoreEntitiesInText(text, limit);
  if (!text || !text.trim() || matched.length >= limit) return matched;

  const cacheKey = `${limit}:${text.slice(0, 160)}`;
  const cached = textLoreCache.get(cacheKey);
  if (cached && Date.now() - cached.loadedAt <= ASYNC_LORE_CACHE_TTL_MS) {
    return cached.data;
  }

  const seenSlugs = new Set(matched.map((m) => m.slug));
  const candidatePhrases: string[] = [];

  for (const { phrase, isSingleWord } of generateCandidatePhrases(text)) {
    if (matched.length + candidatePhrases.length >= limit * 2) break;
    if (isSingleWord && !TOP_TIER_HERO_WHITELIST.has(phrase)) continue;
    candidatePhrases.push(phrase);
  }

  if (candidatePhrases.length === 0) {
    textLoreCache.set(cacheKey, { data: matched, loadedAt: Date.now() });
    return matched;
  }

  try {
    const { createAdminServerClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminServerClient();
    const titleCandidates = Array.from(new Set(
      candidatePhrases.flatMap((p) => {
        const words = p.split(" ");
        const titleCase = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        return [p, titleCase];
      })
    ));

    const { data } = await supabase
      .from("ppcf_wiki_pages")
      .select("slug, display_title, universe, page_type, summary, creators, first_appearance, reality")
      .neq("universe", WIKI_DB_EXCLUDED_UNIVERSE)
      .in("display_title", titleCandidates)
      .limit(limit - matched.length);

    if (data) {
      for (const row of data) {
        if (matched.length >= limit) break;
        if (!seenSlugs.has(row.slug)) {
          seenSlugs.add(row.slug);
          const universe = (row.universe || "MARVEL").toUpperCase();
          const type = WIKI_DB_PAGE_TYPE_TO_LORE_TYPE[row.page_type as string] || "character";
          matched.push({
            slug: row.slug,
            title: row.display_title,
            universe,
            type,
            reality: row.reality || undefined,
            creators: row.creators || undefined,
            first_appearance: row.first_appearance || undefined,
            summary: row.summary || "",
            ticker: deriveEntityTicker(row.display_title, universe),
          });
        }
      }
    }
  } catch {
    // DB unreachable, return whatever local matches were found
  }

  textLoreCache.set(cacheKey, { data: matched, loadedAt: Date.now() });
  return matched;
}

/**
 * Same as getLoreEntityBySlug, but falls back to the full ingested
 * multi-universe corpus in public.ppcf_wiki_pages (all 7 non-financial
 * universes) when the slug isn't in the local JSON index. Executes a
 * single targeted indexed query with in-memory memoization.
 */
export async function getLoreEntityBySlugAsync(slug: string): Promise<LoreEntitySummary | null> {
  const local = getLoreEntityBySlug(slug);
  if (local) return local;
  if (!slug) return null;
  const cleanSlug = slug.toLowerCase().trim();
  const alias = SLUG_ALIASES[cleanSlug];
  if (alias && alias !== cleanSlug) {
    const aliasedLocal = getLoreEntityBySlug(alias);
    if (aliasedLocal) return aliasedLocal;
  }

  const cached = asyncSlugCache.get(cleanSlug);
  if (cached && Date.now() - cached.loadedAt <= ASYNC_LORE_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const { createAdminServerClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminServerClient();
    const targetSlug = alias || cleanSlug;
    const queryTerm = cleanSlug.replace(/-/g, " ");

    const { data: rows } = await supabase
      .from("ppcf_wiki_pages")
      .select("slug, display_title, universe, page_type, summary, creators, first_appearance, reality")
      .or(`slug.eq.${targetSlug},slug.eq.${targetSlug}-earth-616,slug.ilike.${targetSlug}-%,display_title.ilike.${queryTerm}`)
      .limit(5);

    const data = rows && rows.length > 0
      ? rows.find((r) => r.slug === targetSlug) ||
        rows.find((r) => r.slug === `${targetSlug}-earth-616`) ||
        rows.find((r) => r.reality === "Earth-616") ||
        rows[0]
      : null;

    if (data) {
      const universe = (data.universe || "MARVEL").toUpperCase();
      const type = WIKI_DB_PAGE_TYPE_TO_LORE_TYPE[data.page_type as string] || "character";
      const result: LoreEntitySummary = {
        slug: data.slug,
        title: data.display_title,
        universe,
        type,
        reality: data.reality || undefined,
        creators: data.creators || undefined,
        first_appearance: data.first_appearance || undefined,
        summary: data.summary || "",
        ticker: deriveEntityTicker(data.display_title, universe),
      };
      asyncSlugCache.set(cleanSlug, { data: result, loadedAt: Date.now() });
      return result;
    }

    // Fallback to public.fandom_issue_pages (132,882 issue dossiers) when a wiki slug names an issue
    const { data: issueRow } = await supabase
      .from("fandom_issue_pages")
      .select("page_title, wiki, cover_date, stories, characters")
      .ilike("page_title", queryTerm)
      .limit(1)
      .maybeSingle();

    if (issueRow) {
      const leadStory = Array.isArray(issueRow.stories) ? issueRow.stories[0] : null;
      const writers = leadStory?.credits?.writers || [];
      const pencilers = leadStory?.credits?.pencilers || [];
      const creatorsStr = [...writers, ...pencilers].filter(Boolean).join(", ") || undefined;
      const issueSummary =
        leadStory?.synopsis ||
        `${issueRow.page_title} is a canonical comic book issue documented in the ${issueRow.wiki || "Marvel"} Database.`;
      const issueResult: LoreEntitySummary = {
        slug: cleanSlug,
        title: issueRow.page_title,
        universe: (issueRow.wiki || "MARVEL").toUpperCase(),
        type: "item",
        reality: "Earth-616",
        creators: creatorsStr,
        first_appearance: issueRow.cover_date || undefined,
        summary: issueSummary,
      };
      asyncSlugCache.set(cleanSlug, { data: issueResult, loadedAt: Date.now() });
      return issueResult;
    }
  } catch {
    // DB unreachable
  }

  asyncSlugCache.set(cleanSlug, { data: null, loadedAt: Date.now() });
  return null;
}
