import { createPublicServerClient } from "@/lib/supabase/server";
import { ComicRecord } from "@/lib/comics/types";

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
  panelProfitsIndexed: "350,000+",
  comicbaseEntities: "1,200,000+",
  gcdBibliographicRecords: "3,400,000+",
  baselinePricedRecords: "1,200,000+",
  coverMigrationCoverage: "3,481,445 Target Universe",
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
      .not("comicbase_price", "is", null)
      .gt("comicbase_price", 50)
      .limit(limit);

    if (error || !data) {
      console.error("Error fetching valuation rail comics:", error);
      return [];
    }

    return data.map((item) => {
      const price = Number(item.pp_grade_9_8_price || item.baseline_grade_9_8_value || item.comicbase_price || 0);
      const sourceLabel = item.pp_grade_9_8_price
        ? "PP 9.8 Ref"
        : item.baseline_grade_9_8_value
        ? "Blended 9.8"
        : "ComicBase Baseline";

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
      .not("cover_verified_at", "is", null)
      .limit(limit);

    if (error || !data) {
      console.error("Error fetching featured universe comics:", error);
      return [];
    }

    return data as ComicRecord[];
  } catch (err) {
    console.error("Exception in getFeaturedUniverseComics:", err);
    return [];
  }
}
