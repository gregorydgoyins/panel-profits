import { createCleanReadOnlyServerClient } from "@/lib/supabase/admin";
import { panelProfitsGrades, comicBaseGrades, getHighestGradedPrice } from "@/lib/pricing/source-ladder";
import { INITIAL_SURFACE_ASSETS } from "@/lib/assets/initial-assets";
import { getVerifiedEquityByIdOrTicker } from "@/lib/equity/verified-equities-service";
import { applyShocks, getUnderlyings } from "@/lib/assets/underlyings";
import { getShocks } from "@/lib/assets/shocks";
import { issueInstruments } from "@/lib/assets/instruments";

export interface AssetRegistryRecord {
  id: string;
  series: string;
  issue_number: string | null;
  publisher: string | null;
  index_value: number | null;
  source: string | null;
  cover: { image_url: string | null; storage_path: string | null } | null;
}

export interface EquityRegistryRecord {
  id: string;
  variant_id: string;
  anchor_grade: string | null;
  anchor_price_usd: number | null;
  anchor_sales_volume: number | null;
  anchor_confidence: string | null;
  sov_grade: string | null;
  sov_price_usd: number | null;
  asset_class: string | null;
  price_9_9_usd: number | null;
  price_10_0_usd: number | null;
  census_total_graded: number | null;
  census_9_8: number | null;
  census_9_9: number | null;
  census_10_0: number | null;
  scarcity_tier: string | null;
  supply_adjustment: number | null;
  computed_at: string | null;
  comic: {
    id: string;
    series: string;
    issue_number: string | null;
    publisher: string | null;
    publication_year: number | null;
  } | null;
}

export interface DetailedAssetSurface {
  id: string;
  surface_key: string;
  series: string;
  title: string | null;
  issue_number: string | null;
  publisher: string | null;
  publication_year: number | null;
  origin_era: string | null;
  production_age: string | null;
  lineage: string | null;
  reference_grade: string | null;
  reference_fmv_usd: number | null;
  price_formatted: string | null;
  gregory_score: number | null;
  evidence_confidence: string | null;
  seat_number: number | null;
  seat_type: string | null;
  status: string;
  cover_url: string | null;
  canonical_issue_id: string | null;
  source: string;
}

/**
 * RULE #1: Assets are everything OTHER than equities and derive their math from atomic equities.
 * Returns derived cross-asset instruments (never raw comics from pp_comics or ce70_equity_universe).
 */
export async function getAssetRegistry(limit = 48): Promise<AssetRegistryRecord[]> {
  try {
    const now = Date.now();
    const [baseUnders, state] = await Promise.all([
      getUnderlyings().catch(() => []),
      getShocks().catch(() => ({ shocks: new Map(), outcomes: [] })),
    ]);
    const unders = applyShocks(baseUnders, state.shocks, now);
    const issued = issueInstruments(unders, state.shocks, now, state.outcomes);

    return issued.slice(0, limit).map((it) => ({
      id: it.assetId || it.entryId,
      series: it.displayName,
      issue_number: it.symbol || null,
      publisher: it.universe || it.assetType,
      index_value: typeof it.pricing?.fmv_usd === "number" ? it.pricing.fmv_usd : null,
      source: `Derived ${it.assetType}`,
      cover: {
        image_url: it.coverImageUrl || null,
        storage_path: null,
      },
    }));
  } catch (err) {
    console.error("Failed to load derived asset registry:", err);
    return [];
  }
}

export async function getEquityRegistry(limit = 48): Promise<EquityRegistryRecord[]> {
  try {
    const db = createCleanReadOnlyServerClient();
    const { data: rows, error } = await db
      .from("ce70_equity_universe")
      .select("*")
      .order("reference_fmv_usd", { ascending: false })
      .limit(limit);

    if (error || !rows) {
      console.warn("Failed to fetch CE70 equity universe:", error?.message);
      return [];
    }

    return rows.map((r) => {
      const refGrade = r.reference_grade ? String(r.reference_grade) : null;
      const refPrice = r.reference_fmv_usd ? Number(r.reference_fmv_usd) : null;
      const is99 = refGrade === "9.9";
      const is100 = refGrade === "10.0" || refGrade === "10";

      return {
        id: r.id,
        variant_id: r.canonical_issue_id || r.id,
        anchor_grade: refGrade || (refPrice ? "UNGRADED" : "Unpriced"),
        anchor_price_usd: refPrice,
        anchor_sales_volume: null,
        anchor_confidence: r.evidence_confidence || "HIGH_HISTORICAL",
        sov_grade: refGrade || (refPrice ? "UNGRADED" : "Unpriced"),
        sov_price_usd: refPrice,
        asset_class: r.origin_era ? `${String(r.origin_era).toUpperCase()}_EQUITY` : "SOVEREIGN_EQUITY",
        price_9_9_usd: is99 ? refPrice : null,
        price_10_0_usd: is100 ? refPrice : null,
        census_total_graded: null,
        census_9_8: null,
        census_9_9: null,
        census_10_0: null,
        scarcity_tier: Number(r.reference_fmv_usd || 0) > 10000 ? "ULTRA_TIER_1" : "INVESTMENT_GRADE",
        supply_adjustment: 1.05,
        computed_at: r.updated_at || r.created_at || new Date().toISOString(),
        comic: {
          id: r.id,
          series: r.series || "Unknown Series",
          issue_number: r.issue_number || null,
          publisher: r.publisher || "Independent",
          publication_year: null,
        },
      };
    });
  } catch (err) {
    console.error("Failed to load equity registry:", err);
    return [];
  }
}

export async function getCleanEquityDetail(surfaceKey: string): Promise<DetailedAssetSurface | null> {
  try {
    const db = createCleanReadOnlyServerClient();
    const cleanKey = surfaceKey.trim();

    // 0. If key is a seat reference (e.g. seat-1, seat-01, 1), check ce70_index_definitions & ce70_equity_universe
    const seatMatch = cleanKey.match(/^(?:seat-?)?(\d+)$/i);
    const seatNum = seatMatch ? parseInt(seatMatch[1], 10) : null;

    if (seatNum != null) {
      // Check ce70_index_definitions first for rich constitutional metadata
      const { data: indexDef } = await db
        .from("ce70_index_definitions")
        .select("*")
        .eq("seat_number", seatNum)
        .maybeSingle();

      // Also check ce70_equity_universe for pricing
      const { data: equitySeat } = await db
        .from("ce70_equity_universe")
        .select("*")
        .eq("seat_number", seatNum)
        .order("reference_fmv_usd", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (indexDef || equitySeat) {
        const title = indexDef?.title_issue || equitySeat?.title || equitySeat?.series || "Constitutional Seat";
        const series = indexDef?.series || equitySeat?.series || title;
        const issueNum = indexDef?.issue_number || equitySeat?.issue_number || "1";
        const refPrice = equitySeat?.reference_fmv_usd ? Number(equitySeat.reference_fmv_usd) : null;
        const gScore = indexDef?.gregory_score ? Number(indexDef.gregory_score) : (equitySeat?.gregory_score ? Number(equitySeat.gregory_score) : 195.0);

        return {
          id: `seat-${seatNum}`,
          surface_key: cleanKey,
          series,
          title,
          issue_number: issueNum,
          publisher: indexDef?.publisher || equitySeat?.publisher || "Independent / Classic",
          publication_year: indexDef?.year || null,
          origin_era: String(indexDef?.era || equitySeat?.origin_era || "GOLDEN").toUpperCase(),
          production_age: String(indexDef?.era || equitySeat?.production_age || "GOLDEN").toUpperCase(),
          lineage: `${series} Constitutional Lineage`,
          reference_grade: equitySeat?.reference_grade ? String(equitySeat.reference_grade) : "9.8",
          reference_fmv_usd: refPrice,
          price_formatted: equitySeat?.price_formatted || (refPrice ? `$${refPrice.toLocaleString()}` : "Unpriced"),
          gregory_score: gScore,
          evidence_confidence: "CONSTITUTIONAL_CE70_VERIFIED",
          seat_number: seatNum,
          seat_type: "PRIMARY_DOMESTIC",
          status: "CERTIFIED_ACTIVE",
          cover_url: indexDef?.cover_url || equitySeat?.cover_url || null,
          canonical_issue_id: equitySeat?.canonical_issue_id || `iss_seat_${seatNum}`,
          source: "CE70 Constitutional Seat",
        };
      }
    }

    // 0.5. Check Multi-Asset, Publisher Stock, and Index Instruments in INITIAL_SURFACE_ASSETS
    const normalizedKey = cleanKey.replace(/^\$/, "").toUpperCase();
    const matchedAsset = INITIAL_SURFACE_ASSETS.find(
      (a) =>
        (a.assetId && a.assetId.toUpperCase() === normalizedKey) ||
        (a.entryId && a.entryId.toUpperCase() === normalizedKey) ||
        (a.symbol && a.symbol.replace(/^\$/, "").toUpperCase() === normalizedKey) ||
        (a.displayName && a.displayName.toUpperCase() === normalizedKey)
    );

    if (matchedAsset) {
      const p = matchedAsset.pricing || {};
      const fmv = p.fmv_usd ?? p.fmv ?? p.price ?? 0;
      const effectiveKey = matchedAsset.assetId || matchedAsset.entryId;
      return {
        id: matchedAsset.entryId,
        surface_key: effectiveKey,
        series: matchedAsset.displayName,
        title: matchedAsset.description || null,
        issue_number: matchedAsset.symbol,
        publisher: matchedAsset.universe || "Exchange Instrument",
        publication_year: matchedAsset.identityYear || null,
        origin_era: p.era ? String(p.era).toUpperCase() : (matchedAsset.assetType === "PUBLISHER_STOCK" ? "CORPORATE_EQUITY" : "BENCHMARK_INDEX"),
        production_age: p.production_age ? String(p.production_age).toUpperCase() : (matchedAsset.assetType === "PUBLISHER_STOCK" ? "CORPORATE" : "INDEX"),
        lineage: `${matchedAsset.assetType} Instrument · ${matchedAsset.universe || "Comic Book Stock Exchange"}`,
        reference_grade: p.referenceGrade || (matchedAsset.assetType === "PUBLISHER_STOCK" ? "PUBLIC_EQUITY" : matchedAsset.assetType === "INDEX" ? "INDEX_POINTS" : "CERTIFIED"),
        reference_fmv_usd: fmv > 0 ? fmv : null,
        price_formatted: fmv > 0 ? `$${fmv.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—",
        gregory_score: null,
        evidence_confidence: "VERIFIED_EXCHANGE_RECORD",
        seat_number: null,
        seat_type: matchedAsset.assetType,
        status: "ACTIVE_INSTRUMENT",
        cover_url: matchedAsset.coverImageUrl || `/surface-art/${matchedAsset.assetType.toLowerCase()}.png`,
        canonical_issue_id: `asset_${effectiveKey.toLowerCase()}`,
        source: `Comic Book Stock Exchange (${matchedAsset.assetType})`,
      };
    }

    // 1. Try finding by ID or canonical_issue_id in ce70_equity_universe
    const { data: equityRow } = await db
      .from("ce70_equity_universe")
      .select("*")
      .or(`id.eq.${surfaceKey},canonical_issue_id.eq.${surfaceKey}`)
      .maybeSingle();

    if (equityRow) {
      const refGrade = equityRow.reference_grade ? String(equityRow.reference_grade) : null;
      const refPrice = equityRow.reference_fmv_usd ? Number(equityRow.reference_fmv_usd) : null;
      return {
        id: equityRow.id,
        surface_key: surfaceKey,
        series: equityRow.series || equityRow.title || "Comic Asset",
        title: equityRow.title || null,
        issue_number: equityRow.issue_number || null,
        publisher: "CE70 Constitutional Allocation",
        publication_year: null,
        origin_era: equityRow.origin_era || null,
        production_age: equityRow.production_age || null,
        lineage: equityRow.lineage || null,
        reference_grade: refGrade || (refPrice ? "UNGRADED" : "Unpriced"),
        reference_fmv_usd: refPrice,
        price_formatted: equityRow.price_formatted || (refPrice ? `$${refPrice.toLocaleString()}` : "Unpriced"),
        gregory_score: equityRow.gregory_score ? Number(equityRow.gregory_score) : null,
        evidence_confidence: equityRow.evidence_confidence || "HIGH_HISTORICAL",
        seat_number: equityRow.seat_number || null,
        seat_type: equityRow.seat_type || "PRIMARY_DOMESTIC",
        status: equityRow.status || "ACTIVE_CERTIFIED",
        cover_url: equityRow.cover_url || null,
        canonical_issue_id: equityRow.canonical_issue_id || null,
        source: "CE70 Sovereign Universe",
      };
    }

    // 2. Try finding in public.comics
    const { data: comicRow } = await db
      .from("pp_comics")
      .select("*")
      .eq("id", surfaceKey)
      .maybeSingle();

    if (comicRow) {
      // Determine authentic highest graded price and reference grade
      const ppLadder = panelProfitsGrades(comicRow);
      const cbLadder = comicBaseGrades(comicRow);
      const highest = getHighestGradedPrice({
        "Panel Profits": ppLadder,
        "ComicBase": cbLadder,
      });

      let finalGrade: string | null = null;
      let finalPrice: number | null = null;

      if (highest) {
        finalGrade = highest.grade;
        finalPrice = highest.price;
      } else if (comicRow.baseline_grade_9_8_value) {
        finalGrade = "9.8";
        finalPrice = Number(comicRow.baseline_grade_9_8_value);
      } else if (comicRow.pp_grade_9_8_price) {
        finalGrade = "9.8";
        finalPrice = Number(comicRow.pp_grade_9_8_price);
      } else if (comicRow.comicbase_price) {
        finalGrade = "RAW";
        finalPrice = Number(comicRow.comicbase_price);
      }

      return {
        id: comicRow.id,
        surface_key: surfaceKey,
        series: comicRow.series || "Comic Asset",
        title: comicRow.title || null,
        issue_number: comicRow.issue_number || null,
        publisher: comicRow.publisher || null,
        publication_year: comicRow.publication_year ? Number(comicRow.publication_year) : null,
        origin_era: null,
        production_age: null,
        lineage: null,
        reference_grade: finalGrade || "Unpriced",
        reference_fmv_usd: finalPrice,
        price_formatted: finalPrice ? `$${finalPrice.toLocaleString()}` : "Unpriced",
        gregory_score: null,
        evidence_confidence: "VERIFIED_CATALOG",
        seat_number: null,
        seat_type: null,
        status: "ACTIVE_CATALOG",
        cover_url: comicRow.cover_url || null,
        canonical_issue_id: comicRow.id,
        source: "Clean Master Comics Catalog",
      };
    }

    // 3. Try high-speed verified equities estate (SQLite + Supabase verified_equities) by ID, ticker, or slug
    const local = getVerifiedEquityByIdOrTicker(cleanKey);
    if (local) {
      return {
        id: local.id,
        surface_key: cleanKey,
        series: local.series,
        title: local.title,
        issue_number: local.issue_number,
        publisher: local.publisher || "Independent / Classic",
        publication_year: local.publication_year || null,
        origin_era: local.origin_era || null,
        production_age: local.production_age || null,
        lineage: `${local.publisher} Landmark Lineage`,
        reference_grade: local.reference_grade ? String(local.reference_grade).trim() : null,
        reference_fmv_usd: local.fmv_usd,
        price_formatted: local.price_formatted,
        gregory_score: local.gregory_score ?? null,
        evidence_confidence: "VERIFIED_SOVEREIGN_EQUITY",
        seat_number: null,
        seat_type: "SOVEREIGN_EQUITY",
        status: local.status || "ACTIVE_CERTIFIED",
        cover_url: local.cover_url,
        canonical_issue_id: local.id,
        source: "Verified Sovereign Comic Estate",
      };
    }

    return null;
  } catch (err) {
    console.error("Failed to fetch clean equity detail:", err);
    return null;
  }
}
