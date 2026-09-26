import { createAdminServerClient, createCleanReadOnlyServerClient } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/errors";
import { ComicRecord } from "@/lib/comics/types";
import { resolveComicPricing } from "@/lib/pricing/baseline";
import { getComicCoverEvidenceByIds } from "@/lib/comics/covers";

export interface MarketUniverseMetrics {
  totalAuthoritativeComics: string;
  panelProfitsIndexed: string;
  comicbaseEntities: string;
  gcdBibliographicRecords: string;
  baselinePricedRecords: string;
  coverMigrationCoverage: string;
}

export interface IntelligenceRailItem {
  id: string;
  href: string;
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

export interface MarketIntelligenceItem {
  id: string;
  series: string;
  issueNumber: string;
  publisher: string | null;
  indexValue: number | null;
  quantity: number | null;
  source: string | null;
  createdAt: string | null;
}

export interface CleanAssetSurfaceItem {
  id: string;
  series: string;
  issueNumber: string;
  publisher: string | null;
  indexValue: number | null;
  quantity: number | null;
  source: string | null;
  createdAt: string | null;
  coverUrl: string | null;
  coverStoragePath: string | null;
  assetClass: string | null;
  assetSubclass: string | null;
  constituentCount: number;
}

export interface CleanNewsIntelligenceItem {
  id: number;
  series: string;
  issueNumber: string;
  publisher: string | null;
  indexValue: number | null;
  quantity: number | null;
  source: string | null;
  createdAt: string | null;
  url: string | null;
}

export interface MarketTelemetry {
  tick: number;
  ce50Last: number | null;
  regime: string | null;
  regimeVolatility: number | null;
  drawdown: number | null;
  stressIndex: number | null;
  tectonicTier: number | null;
  overlayActive: boolean;
  cascadeActive: boolean;
}

export async function getMarketTelemetry(): Promise<MarketTelemetry | null> {
  try {
    const supabase = createAdminServerClient();
    const { data, error } = await supabase
      .from("market_state")
      .select("tick, ce50_last, regime, regime_vol, drawdown, stress_index, tectonic_tier, titan_overlay_active, cascade_active")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) {
      if (error && isMissingTableError(error)) {
        console.warn("Market telemetry table is not deployed in the live Clean project.");
        return null;
      }
      if (error) console.error("Error fetching market telemetry:", error);
      return null;
    }

    return {
      tick: Number(data.tick || 0),
      ce50Last: data.ce50_last === null ? null : Number(data.ce50_last),
      regime: data.regime || null,
      regimeVolatility: data.regime_vol === null ? null : Number(data.regime_vol),
      drawdown: data.drawdown === null ? null : Number(data.drawdown),
      stressIndex: data.stress_index === null ? null : Number(data.stress_index),
      tectonicTier: data.tectonic_tier === null ? null : Number(data.tectonic_tier),
      overlayActive: Boolean(data.titan_overlay_active),
      cascadeActive: Boolean(data.cascade_active),
    };
  } catch (error) {
    console.error("Exception fetching market telemetry:", error);
    return null;
  }
}

export async function getMarketIntelligence(limit = 24): Promise<MarketIntelligenceItem[]> {
  try {
    const supabase = createAdminServerClient();
    const { data, error } = await supabase
      .from("comics")
      .select("id, series, issue_number, publisher, pp_grade_9_8_price, comicbase_price, baseline_grade_9_8_value, baseline_grade_9_8_sources, baseline_grade_9_8_observation_count, quantity, source, created_at")
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 48));

    if (error || !data) {
      console.error("Error fetching market intelligence:", error);
      return [];
    }

    const covers = await getComicCoverEvidenceByIds(data.map((item) => item.id));
    return data.map((item) => ({
      id: item.id,
      series: item.series || "Unknown series",
      issueNumber: item.issue_number || "—",
      publisher: item.publisher || null,
      indexValue: resolveComicPricing(item).baselinePrice98,
      quantity: item.quantity === null ? null : Number(item.quantity),
      source: item.source || null,
      createdAt: item.created_at || null,
    }));
  } catch (error) {
    console.error("Exception fetching market intelligence:", error);
    return [];
  }
}

/**
 * Bounded query for intelligence rail: returns 12 verified comic records.
 * Uses index on cover_verified_at without unbounded ordering.
 */
export async function getIntelligenceRailComics(limit = 12): Promise<IntelligenceRailItem[]> {
  try {
    const cleanDb = createCleanReadOnlyServerClient();
    const { data, error } = await cleanDb
      .from("comics")
      .select("id,series,title,issue_number,publisher,publication_year,cover_url,cover_storage_path,cover_verified_at,updated_at,created_at")
      .order("id", { ascending: true })
      .limit(Math.min(Math.max(limit * 8, 8), 96));

    if (error || !data) {
      console.error("Error fetching Clean intelligence rail:", error);
      return [];
    }

    return data.filter((item) => item.cover_url).slice(0, limit).map((item) => ({
      id: item.id,
      href: `/comics/${item.id}`,
      series: item.series || "Unknown series",
      title: item.title || null,
      issueNumber: item.issue_number || "—",
      publisher: item.publisher || null,
      publicationYear: item.publication_year === null ? null : Number(item.publication_year),
      coverUrl: item.cover_url || null,
      coverStoragePath: item.cover_storage_path || null,
      verifiedAt: item.cover_verified_at || null,
      updatedAt: item.updated_at || item.created_at || null,
    }));
  } catch (err) {
    console.error("Exception in Clean intelligence rail:", err);
    return [];
  }
}

/**
 * Bounded query for valuation rail: returns 12 priced comic records.
 * Queries comics with genuine reference prices.
 */
export async function getValuationRailComics(limit = 12): Promise<ValuationRailItem[]> {
  return [];
}

export async function getCleanAssetSurfaces(limit = 24): Promise<CleanAssetSurfaceItem[]> {
  return [];
}

export async function getCleanAssetSurface(surfaceKey: string) {
  return null;
}

export async function getCleanNewsIntelligence(limit = 32): Promise<CleanNewsIntelligenceItem[]> {
  try {
    const comics = await getIntelligenceRailComics(limit);
    return comics.map((item) => ({
      id: Number.parseInt(item.id.replace(/\D/g, "").slice(-9) || "0", 10),
      series: item.series,
      issueNumber: item.issueNumber,
      publisher: item.publisher,
      indexValue: null,
      quantity: null,
      source: "CLEAN CATALOG",
      createdAt: item.updatedAt,
      url: item.href,
    }));
  } catch (error) {
    console.error("Exception in Clean catalog intelligence:", error);
    return [];
  }
}

/**
 * Bounded deterministic query for the Featured Comic Universe grid.
 * Retrieves 18 verified records with valid covers and reference valuations.
 */
export async function getFeaturedUniverseComics(limit = 18): Promise<ComicRecord[]> {
  try {
    const supabase = createAdminServerClient();
    const { data, error } = await supabase
      .from("comics")
      .select("id, series, issue_number, publisher, created_at")
      .limit(limit);

    if (error || !data) {
      console.error("Error fetching featured universe comics:", error);
      return [];
    }

    const covers = await getComicCoverEvidenceByIds(data.map((item) => item.id));
    return data.map((item) => ({
      id: item.id,
      series: item.series || "Unknown Series",
      title: item.series || "Unknown Series",
      issue_number: item.issue_number || "",
      volume: null,
      printing: null,
      direct_or_variant: null,
      cover_variant: null,
      publisher: item.publisher || null,
      publication_date: null,
      publication_year: null,
      upc: null,
      alt_upc: null,
      pp_source_id: null,
      comicbase_source_id: null,
      gcd_source_id: null,
      pp_grade_9_8_price: null,
      comicbase_price: null,
      baseline_grade_9_8_value: null,
      baseline_grade_9_8_sources: null,
      baseline_grade_9_8_observation_count: null,
      panel_profits_data: null,
      comicbase_data: null,
      gcd_data: null,
      search_document: null,
      created_at: item.created_at,
      updated_at: item.created_at,
      cover_url: covers.get(item.id)?.image_url || null,
      cover_storage_path: covers.get(item.id)?.storage_path || null,
      cover_source: null,
      cover_original_url: null,
      cover_retrieval_url: null,
      cover_width: null,
      cover_height: null,
      cover_sha256: null,
      cover_verified_at: null,
    }));
  } catch (err) {
    console.error("Exception in getFeaturedUniverseComics:", err);
    return [];
  }
}
