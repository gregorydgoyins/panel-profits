import { createAdminServerClient } from "@/lib/supabase/admin";

export interface ExtractedEntity {
  id: string;
  name: string;
  type: "creator" | "character" | "publisher" | "title" | "concept" | "era";
  description?: string;
  relevanceScore: number;
  matchStart?: number;
  matchEnd?: number;
  wikiUrl?: string;
}

export interface EntityGraphNode {
  id: string;
  label: string;
  type: ExtractedEntity["type"];
  connections: string[]; // Connected Entity IDs
}

// Canonical Comic & Hobby Financial Glossary (Investopedia style for Comic Equities)
export const COMIC_FINANCIAL_GLOSSARY: Record<string, { term: string; definition: string; category: string }> = {
  "atomic-asset": {
    term: "Atomic Asset Unit",
    definition: "The fundamental individual comic book publication issue serving as the granular base building block for portfolio valuation and market capitalization.",
    category: "Valuation"
  },
  "cgc-census-float": {
    term: "Census Float",
    definition: "The total supply of officially graded and slabbed census copies available in public and private hands across specified grade tiers (e.g., 9.8, 9.6).",
    category: "Supply Dynamics"
  },
  "key-issue-premium": {
    term: "Key Issue Premium",
    definition: "The valuation markup assigned to an issue due to historical milestone relevance (first appearances, origin stories, iconic cover art, or character deaths).",
    category: "Asset Quality"
  },
  "creator-lineage-multiplier": {
    term: "Creator Lineage Multiplier",
    definition: "The historical price momentum and demand elasticity associated with iconic writer/artist runs (e.g., Stan Lee, Jack Kirby, Todd McFarlane, Frank Miller).",
    category: "Fundamentals"
  },
  "variant-ratio-dilution": {
    term: "Variant Ratio Dilution",
    definition: "The supply-side impact on primary issue value caused by high-incentive incentive variant covers (1:25, 1:100, 1:500).",
    category: "Market Structure"
  },
  "pedigree-provenance": {
    term: "Pedigree Provenance",
    definition: "Recognized historical original-owner collections (e.g., Mile High, Edgar Church, Pacific Coast) that command premium market liquidity.",
    category: "Provenance"
  },
  "fmv-liquidity-spread": {
    term: "FMV Liquidity Spread",
    definition: "The delta between fair market value (FMV) consensus projections and realized transaction prices in public auction channels.",
    category: "Trading Mechanics"
  }
};

// Known Creator & Character Dictionary for Real-Time Knowledge Graph Parsing
const KNOWN_CREATORS = [
  "Stan Lee", "Jack Kirby", "Steve Ditko", "Todd McFarlane", "Frank Miller",
  "Alan Moore", "Jim Lee", "Rob Liefeld", "Chris Claremont", "Will Eisner",
  "Bob Kane", "Bill Finger", "Jerry Siegel", "Joe Shuster", "Neal Adams",
  "Bernie Wrightson", "John Romita", "John Buscema", "George Pérez", "Dave Gibbons",
  "Grant Morrison", "Garth Ennis", "Brian Michael Bendis", "Geoff Johns", "Jonathan Hickman",
  "Donny Cates", "Chip Zdarsky", "Al Ewing", "James Tynion IV", "Peach Momoko"
];

const KNOWN_CHARACTERS = [
  "Spider-Man", "Batman", "Superman", "Wolverine", "Iron Man",
  "Captain America", "Thor", "Hulk", "Wonder Woman", "Flash",
  "Green Lantern", "Deadpool", "Venom", "Punisher", "Daredevil",
  "Doctor Strange", "Black Panther", "Spawn", "Hellboy", "Magneto",
  "Joker", "Doctor Doom", "Thanos", "Norman Osborn", "Harley Quinn"
];

const KNOWN_PUBLISHERS = [
  "Marvel Comics", "DC Comics", "Image Comics", "Dark Horse Comics",
  "IDW Publishing", "BOOM! Studios", "Dynamite Entertainment", "Valiant Comics",
  "EC Comics", "Archie Comics", "Viz Media", "Kodansha"
];

/**
 * Extracts recognized comic creators, characters, publishers, and financial terms from text.
 */
export function extractComicEntities(text: string): ExtractedEntity[] {
  if (!text) return [];
  const entities: ExtractedEntity[] = [];
  const lowerText = text.toLowerCase();

  // 1. Match Creators
  for (const creator of KNOWN_CREATORS) {
    const idx = lowerText.indexOf(creator.toLowerCase());
    if (idx !== -1) {
      entities.push({
        id: `creator-${creator.toLowerCase().replace(/\s+/g, "-")}`,
        name: creator,
        type: "creator",
        description: `Legendary comic book creator and historical contributor.`,
        relevanceScore: 0.95,
        matchStart: idx,
        matchEnd: idx + creator.length,
        wikiUrl: `/wiki?search=${encodeURIComponent(creator)}`
      });
    }
  }

  // 2. Match Characters
  for (const character of KNOWN_CHARACTERS) {
    const idx = lowerText.indexOf(character.toLowerCase());
    if (idx !== -1) {
      entities.push({
        id: `char-${character.toLowerCase().replace(/\s+/g, "-")}`,
        name: character,
        type: "character",
        description: `Iconic comic book character and key appearance entity.`,
        relevanceScore: 0.9,
        matchStart: idx,
        matchEnd: idx + character.length,
        wikiUrl: `/wiki?search=${encodeURIComponent(character)}`
      });
    }
  }

  // 3. Match Publishers
  for (const pub of KNOWN_PUBLISHERS) {
    const idx = lowerText.indexOf(pub.toLowerCase());
    if (idx !== -1) {
      entities.push({
        id: `pub-${pub.toLowerCase().replace(/\s+/g, "-")}`,
        name: pub,
        type: "publisher",
        description: `Established comic book publisher and IP holder.`,
        relevanceScore: 0.85,
        matchStart: idx,
        matchEnd: idx + pub.length,
        wikiUrl: `/wiki?search=${encodeURIComponent(pub)}`
      });
    }
  }

  // 4. Match Comic Equity Financial Concepts
  for (const [key, termObj] of Object.entries(COMIC_FINANCIAL_GLOSSARY)) {
    const idx = lowerText.indexOf(termObj.term.toLowerCase());
    if (idx !== -1) {
      entities.push({
        id: `finance-${key}`,
        name: termObj.term,
        type: "concept",
        description: termObj.definition,
        relevanceScore: 0.8,
        matchStart: idx,
        matchEnd: idx + termObj.term.length,
        wikiUrl: `/learn#${key}`
      });
    }
  }

  return entities;
}

/**
 * Connects extracted entities into an interactive relationship graph for Prezi-style map rendering.
 */
export function buildEntityGraph(entities: ExtractedEntity[]): EntityGraphNode[] {
  return entities.map((entity, idx) => {
    // Connect creators to characters and publishers in the same text
    const connections = entities
      .filter((e, i) => i !== idx)
      .slice(0, 4)
      .map((e) => e.id);

    return {
      id: entity.id,
      label: entity.name,
      type: entity.type,
      connections
    };
  });
}
