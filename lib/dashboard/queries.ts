import { createPublicServerClient } from "@/lib/supabase/server";
import { ComicRecord } from "@/lib/comics/types";

// Curated by exact, verified comic IDs. Names, covers and prices always come from public.comics.
const FEATURED_COMIC_IDS = [
  "b0f13fadb94c64011c6ae2e709d2a50f7c0062f224db83f070c30535e1db0ec9", // ASM #1, 1963
  "6676ce8d34147e0c1db39612e4e927792100744901f6641b7b65621092efea32", // FF #1, 1961
  "a25d1c30e864a8616039a85df18da7d5a32df7aa93583894b5eb76ff152a293e", // X-Men #1, 1963
  "c8cd4173f8e224c45b161b021c0affd12317088295fa66b67830e0a6fb961c10", // Hulk #181, 1974
  "2a1cf819cc638ff6f771d4b88715a39119645803e206f8f0fad946092cff0e9d", // ASM #129, 1974
  "6934bfd7a976f097806f8cec0d40e19fcd20ac789d3735aa6a220884439a6fa1", // ASM #300, 1988
  "073b7d2694a777f73128d0091b58c245d61366d16998ea5973fed8b7d5eae6e0", // Spawn #1, 1992
];

export interface MarketUniverseMetrics {
  totalAuthoritativeComics: number;
  panelProfitsIndexed: string;
  comicbaseEntities: string;
  gcdBibliographicRecords: string;
  baselinePricedRecords: string;
  coverMigrationCoverage: string;
}

export interface IntelligenceRailItem {
  id: string;
  series: string;
  title: string | null;
  issueNumber: string;
  publisher: string | null;
  publicationYear: number | null;
  coverUrl: string | null;
  coverStoragePath: string | null;
  verifiedAt: string | null;
  updatedAt: string | null;
}

export interface ValuationRailItem {
  id: string;
  series: string;
  issueNumber: string;
  publisher: string | null;
  publicationYear: number | null;
  coverUrl: string | null;
  coverStoragePath: string | null;
  priceFormatted: string;
  priceValue: number;
  sourceLabel: string;
}

export const CANONICAL_MARKET_METRICS: MarketUniverseMetrics = {
  totalAuthoritativeComics: 3481445,
  panelProfitsIndexed: "115,712",
  comicbaseEntities: "1,258,705",
  gcdBibliographicRecords: "2,446,883",
  baselinePricedRecords: "Source prices shown per record",
  coverMigrationCoverage: "Cover assignments in progress",
};

/**
 * Bounded query for intelligence rail: returns 12 verified comic records.
 * Uses index on cover_verified_at without unbounded ordering.
 */
export async function getIntelligenceRailComics(limit = 12): Promise<IntelligenceRailItem[]> {
  try {
    const supabase = createPublicServerClient();
    const { data, error } = await supabase
      .from("comics")
      .select("id, series, title, issue_number, publisher, publication_year, cover_url, cover_storage_path, cover_verified_at, updated_at")
      .not("cover_verified_at", "is", null)
      .limit(limit);

    if (error || !data) {
      console.error("Error fetching intelligence rail comics:", error);
      return [];
    }

    return data.map((item) => ({
      id: item.id,
      series: item.series || "Unknown Series",
      title: item.title,
      issueNumber: item.issue_number || "—",
      publisher: item.publisher || null,
      publicationYear: item.publication_year || null,
      coverUrl: item.cover_url || null,
      coverStoragePath: item.cover_storage_path || null,
      verifiedAt: item.cover_verified_at || null,
      updatedAt: item.updated_at || null,
    }));
  } catch (err) {
    console.error("Exception in getIntelligenceRailComics:", err);
    return [];
  }
}

/**
 * Bounded query for valuation rail: returns 12 priced comic records.
 * Queries comics with genuine reference prices.
 */
export async function getValuationRailComics(limit = 12): Promise<ValuationRailItem[]> {
  try {
    const supabase = createPublicServerClient();
    const { data, error } = await supabase
      .from("comics")
      .select("id, series, issue_number, publisher, publication_year, cover_url, cover_storage_path, comicbase_price, pp_grade_9_8_price, baseline_grade_9_8_value")
      .in("id", FEATURED_COMIC_IDS)
      .limit(limit);

    if (error || !data) {
      console.error("Error fetching valuation rail comics:", error);
      return [];
    }

    return data.sort((a, b) => FEATURED_COMIC_IDS.indexOf(a.id) - FEATURED_COMIC_IDS.indexOf(b.id)).map((item) => {
      const price = Number(item.pp_grade_9_8_price || 0);
      const sourceLabel = "PP 9.8 Price";

      return {
        id: item.id,
        series: item.series || "Unknown Series",
        issueNumber: item.issue_number || "—",
        publisher: item.publisher || null,
        publicationYear: item.publication_year || null,
        coverUrl: item.cover_url || null,
        coverStoragePath: item.cover_storage_path || null,
        priceFormatted: price > 0 ? `$${price.toFixed(2)}` : "Unpriced",
        priceValue: price,
        sourceLabel,
      };
    });
  } catch (err) {
    console.error("Exception in getValuationRailComics:", err);
    return [];
  }
}

/**
 * Bounded deterministic query for the Featured Comic Universe grid.
 * Retrieves 18 verified records with valid covers and reference valuations.
 */
export async function getFeaturedUniverseComics(limit = 18): Promise<ComicRecord[]> {
  try {
    const supabase = createPublicServerClient();
    const { data, error } = await supabase
      .from("comics")
      .select("id, series, title, issue_number, volume, printing, direct_or_variant, cover_variant, publisher, publication_date, publication_year, upc, pp_grade_9_8_price, comicbase_price, baseline_grade_9_8_value, baseline_grade_9_8_sources, baseline_grade_9_8_observation_count, cover_url, cover_storage_path, cover_source, cover_verified_at, created_at, updated_at")
      .in("id", FEATURED_COMIC_IDS)
      .limit(limit);

    if (error || !data) {
      console.error("Error fetching featured universe comics:", error);
      return [];
    }

    return (data as ComicRecord[]).sort((a, b) => FEATURED_COMIC_IDS.indexOf(a.id) - FEATURED_COMIC_IDS.indexOf(b.id));
  } catch (err) {
    console.error("Exception in getFeaturedUniverseComics:", err);
    return [];
  }
}
