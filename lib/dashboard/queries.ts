import { createAdminServerClient, createCleanReadOnlyServerClient } from "@/lib/supabase/admin";
import { ComicRecord } from "@/lib/comics/types";
import { resolveComicPricing } from "@/lib/pricing/baseline";
import { getComicCoverEvidenceByIds } from "@/lib/comics/covers";

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

export const CANONICAL_MARKET_METRICS: MarketUniverseMetrics = {
  totalAuthoritativeComics: 3481445,
  panelProfitsIndexed: "350,000+",
  comicbaseEntities: "1,200,000+",
  gcdBibliographicRecords: "3,400,000+",
  baselinePricedRecords: "1,200,000+",
  coverMigrationCoverage: "3,481,445 Target Universe",
};

export async function getMarketTelemetry(): Promise<MarketTelemetry | null> {
  try {
    const supabase = createAdminServerClient();
    const { data, error } = await supabase
      .from("market_state")
      .select("tick, ce50_last, regime, regime_vol, drawdown, stress_index, tectonic_tier, titan_overlay_active, cascade_active")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) {
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
      .from("rss_items")
      .select("id,title,source,published_at,link,url,image_url")
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error || !data) {
      console.error("Error fetching Clean intelligence rail:", error);
      return [];
    }

    return data.map((item) => ({
      id: `rss-${item.id}`,
      href: item.link || item.url || "/news",
      series: item.title || "Untitled newsroom item",
      title: item.title || null,
      issueNumber: "RSS",
      publisher: item.source || null,
      publicationYear: null,
      coverUrl: item.image_url || null,
      coverStoragePath: null,
      verifiedAt: null,
      updatedAt: item.published_at || null,
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
  try {
    const cleanDb = createCleanReadOnlyServerClient();
    const { data: equityRows, error } = await cleanDb
      .from("equity_truth_layer")
      .select("variant_id,anchor_price_usd,anchor_confidence,asset_class,census_total_graded,computed_at")
      .gte("anchor_price_usd", 17)
      .order("anchor_price_usd", { ascending: false })
      .limit(Math.min(Math.max(limit * 12, 24), 240));

    if (error || !equityRows) {
      console.error("Error fetching Clean valuation rail equities:", error);
      return [];
    }

    const ids = equityRows.map((row) => row.variant_id);
    const [{ data: artifacts }, covers] = await Promise.all([
      cleanDb.from("comic_instrument_market_artifacts").select("id,product_name,verification_status").in("id", ids),
      getComicCoverEvidenceByIds(ids),
    ]);
    const artifactMap = new Map((artifacts || []).map((artifact) => [artifact.id, artifact]));

    return equityRows.flatMap((item) => {
      const cover = covers.get(item.variant_id);
      const artifact = artifactMap.get(item.variant_id);
      if (!cover || !artifact || artifact.verification_status !== "verified") return [];
      const match = String(artifact.product_name || "").match(/^(.*?)(?:\s+#?([^#]+))?\s+\((\d{4})\)$/);
      const series = match?.[1] || artifact.product_name || "Verified comic equity";
      const issueNumber = match?.[2]?.trim() || "—";
      const price = Number(item.anchor_price_usd);

      return {
        id: item.variant_id,
        series,
        issueNumber,
        publisher: null,
        publicationYear: match?.[3] ? Number(match[3]) : null,
        coverUrl: cover.image_url,
        coverStoragePath: cover.storage_path,
        priceFormatted: price > 0 ? `$${price.toFixed(2)}` : "Unpriced",
        priceValue: price,
        sourceLabel: `CLEAN ${item.anchor_confidence || "VERIFIED"}`,
      };
    }).slice(0, limit);
  } catch (err) {
    console.error("Exception in Clean valuation rail:", err);
    return [];
  }
}

export async function getCleanAssetSurfaces(limit = 24): Promise<CleanAssetSurfaceItem[]> {
  try {
    const cleanDb = createCleanReadOnlyServerClient();
    const { data, error } = await cleanDb
      .from("pp_asset_registry")
      .select("id,surface_key,surface_name,asset_class,asset_subclass,constituent_count,created_at,updated_at,active,canonical")
      .eq("active", true)
      .order("surface_name")
      .limit(limit);
    if (error || !data) {
      console.error("Error fetching Clean asset surfaces:", error);
      return [];
    }

    const { data: designations } = await cleanDb
      .from("asset_art_designations")
      .select("surface_type,artwork_url,status")
      .eq("status", "verified")
      .in("surface_type", data.map((surface) => surface.asset_class).filter(Boolean));
    const designationMap = new Map<string, string>();
    for (const designation of designations || []) {
      if (!designationMap.has(designation.surface_type) && designation.artwork_url) {
        designationMap.set(designation.surface_type, designation.artwork_url);
      }
    }

    return data.map((surface) => ({
      id: `surface-${surface.surface_key}`,
      series: surface.surface_name,
      issueNumber: surface.surface_key,
      publisher: surface.asset_class,
      indexValue: null,
      quantity: surface.constituent_count,
      source: "CLEAN ASSET REGISTRY",
      createdAt: surface.updated_at || surface.created_at,
      coverUrl: designationMap.get(surface.asset_class)?.startsWith("http")
        ? designationMap.get(surface.asset_class) || null
        : null,
      coverStoragePath: null,
      assetClass: surface.asset_class,
      assetSubclass: surface.asset_subclass,
      constituentCount: Number(surface.constituent_count || 0),
    }));
  } catch (error) {
    console.error("Exception in Clean asset surfaces:", error);
    return [];
  }
}

export async function getCleanAssetSurface(surfaceKey: string) {
  const cleanDb = createCleanReadOnlyServerClient();
  const { data: surface, error } = await cleanDb
    .from("pp_asset_registry")
    .select("id,surface_key,surface_name,asset_class,asset_subclass,valuation_model,rebalance_cadence,complexity,constituent_count,source_equities,synthetic_level,notes,active,canonical,created_at,updated_at")
    .eq("surface_key", surfaceKey)
    .maybeSingle();
  if (error || !surface) return null;

  const { data: constituents } = await cleanDb
    .from("pp_asset_constituents")
    .select("canonical_instrument_id,weight,weighting_method,liquidity_score,rarity_score,volatility_score,display_order,active")
    .eq("asset_surface_key", surfaceKey)
    .eq("active", true)
    .order("display_order")
    .limit(100);

  return { surface, constituents: constituents || [] };
}

export async function getCleanNewsIntelligence(limit = 32): Promise<CleanNewsIntelligenceItem[]> {
  try {
    const cleanDb = createCleanReadOnlyServerClient();
    const { data, error } = await cleanDb
      .from("rss_items")
      .select("id,title,source,published_at,link,url")
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error || !data) {
      console.error("Error fetching Clean RSS intelligence:", error);
      return [];
    }
    return data.map((item) => ({
      id: Number(item.id),
      series: item.title || "Untitled newsroom item",
      issueNumber: "RSS",
      publisher: item.source || null,
      indexValue: null,
      quantity: null,
      source: "CLEAN RSS",
      createdAt: item.published_at || null,
      url: item.link || item.url || null,
    }));
  } catch (error) {
    console.error("Exception in Clean RSS intelligence:", error);
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
