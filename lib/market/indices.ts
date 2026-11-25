import { createCleanReadOnlyServerClient } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/errors";
import { createCachedQuery } from "@/lib/cache/wrapper";

export interface MarketIndexRecord {
  indexCode: string;
  displayName: string;
  methodologyVersion: string;
  expectedConstituentCount: number;
  currentValue: number | null;
  previousValue: number | null;
  percentChange: number | null;
  status: string;
  description: string;
}

export interface EquitiesRailItem {
  id: string;
  series: string;
  issueNumber: string;
  publisher: string;
  publicationYear: number | null;
  ticker: string;
  fmvPrice: number | null;
  formattedFmv: string;
  cgc98Price: number | null;
  formattedCgc98: string;
  censusFloat: number | null;
  coverUrl: string | null;
  priceSource: string;
}

/**
 * Returns the active recovered_index_contracts rows (CE70, PPIX100, PPIX_COMPOSITE —
 * legacy PPIX60 retired), matched against real rows in recovered_index_observations.
 *
 * PPIX_COMPOSITE is derived mathematically from the two strictly non-overlapping canonical streams
 * (50% CE70 Sovereign + 50% PPIX100 Broad Pulse) whenever both have verified observations.
 * No values are ever invented: missing observations remain null.
 */
async function fetchMarketIndicesRaw(): Promise<MarketIndexRecord[]> {
  const db = createCleanReadOnlyServerClient();

  const { data: contracts, error } = await db
    .from("recovered_index_contracts")
    .select("index_code,display_name,methodology_version,expected_constituent_count,production_status,notes")
    .neq("index_code", "PPIX60")
    .order("index_code");

  if (error && !isMissingTableError(error)) {
    console.error("Error fetching index contracts:", error);
  }

  if (!contracts || !contracts.length) return [];

  const { data: observations } = await db
    .from("recovered_index_observations")
    .select("index_code,index_value,previous_value,percent_change,calculation_status,observation_time")
    .neq("index_code", "PPIX60")
    .order("observation_time", { ascending: false })
    .limit(100);

  const obsMap = new Map<string, { current: number | null; prev: number | null; pct: number | null; status: string }>();
  for (const obs of observations || []) {
    if (!obsMap.has(obs.index_code)) {
      obsMap.set(obs.index_code, {
        current: obs.index_value,
        prev: obs.previous_value,
        pct: obs.percent_change,
        status: obs.calculation_status,
      });
    }
  }

  // Derive PPIX_COMPOSITE mathematically from real CE70 + PPIX100 observations if no direct row exists
  if (!obsMap.has("PPIX_COMPOSITE")) {
    const ce70Obs = obsMap.get("CE70");
    const ppix100Obs = obsMap.get("PPIX100");
    if (ce70Obs?.current != null && ppix100Obs?.current != null) {
      const current = Math.round((0.5 * ce70Obs.current + 0.5 * ppix100Obs.current) * 100) / 100;
      const prev =
        ce70Obs.prev != null && ppix100Obs.prev != null
          ? Math.round((0.5 * ce70Obs.prev + 0.5 * ppix100Obs.prev) * 100) / 100
          : null;
      const pct = prev != null && prev > 0 ? Math.round(((current - prev) / prev) * 10000) / 100 : null;
      obsMap.set("PPIX_COMPOSITE", {
        current,
        prev,
        pct,
        status: "ACTIVE_COMPOSITE",
      });
    }
  }

  return contracts.map((contract) => {
    const obs = obsMap.get(contract.index_code);
    const isComposite = contract.index_code === "PPIX_COMPOSITE";
    return {
      indexCode: contract.index_code,
      displayName: contract.display_name,
      methodologyVersion: isComposite ? "PPIX_COMPOSITE_CROSS_STREAM_V1" : contract.methodology_version,
      expectedConstituentCount: isComposite ? 170 : contract.expected_constituent_count,
      currentValue: obs?.current ?? null,
      previousValue: obs?.prev ?? null,
      percentChange: obs?.pct ?? null,
      status: obs?.status ?? contract.production_status,
      description: isComposite
        ? "Cross-stream market composite blending CE70 Sovereign (50%) and PPIX-100 Broad Pulse (50%)."
        : contract.notes || "Comic Market Equity Index",
    };
  });
}

export const calculateMarketIndices = createCachedQuery(
  fetchMarketIndicesRaw,
  "market-indices-summary",
  { ttlSeconds: 60, staleWhileRevalidateSeconds: 300, tags: ["market", "indices"] }
);
