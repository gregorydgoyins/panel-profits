import { createCleanReadOnlyServerClient } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/errors";
import { createCachedQuery } from "@/lib/cache/wrapper";

export interface EquityContract {
  index_code: string;
  display_name: string;
  methodology_version: string;
  expected_constituent_count: number;
  price_basis: string;
  grade_basis: string | null;
  selection_rule: string;
  weighting_rule: string | null;
  rebalance_rule: string | null;
  calculation_frequency: string | null;
  historical_status: string;
  production_status: string;
  notes: string | null;
  observation_count: number;
}

export interface EquityObservation {
  observation_time: string;
  index_value: number | null;
  previous_value: number | null;
  absolute_change: number | null;
  percent_change: number | null;
  valid_constituent_count: number;
  expected_constituent_count: number;
  calculation_status: string;
  methodology_version: string;
}

export interface EquityConstituent {
  seat_number: number | null;
  historical_identity: string;
  ppcf_id: string | null;
  match_status: string;
  historical_source: string;
  notes: Record<string, unknown> | string | null;
}

async function getObservationCount(db: ReturnType<typeof createCleanReadOnlyServerClient>, indexCode: string) {
  try {
    const { count, error } = await db
      .from("recovered_index_observations")
      .select("id", { count: "exact", head: true })
      .eq("index_code", indexCode);
    if (error) {
      console.warn(`Observation count unavailable for ${indexCode}:`, error.message);
      return 0;
    }
    return count || 0;
  } catch (err) {
    console.warn(`Error counting observations for ${indexCode}:`, err);
    return 0;
  }
}

export const getEquityContracts = createCachedQuery(
  async (): Promise<EquityContract[]> => {
    try {
      const db = createCleanReadOnlyServerClient();
      const { data, error } = await db
        .from("recovered_index_contracts")
        .select("index_code,display_name,methodology_version,expected_constituent_count,price_basis,grade_basis,selection_rule,weighting_rule,rebalance_rule,calculation_frequency,historical_status,production_status,notes")
        .order("index_code");
      if (error) {
        if (isMissingTableError(error)) return [];
        console.warn("Failed to fetch equity contracts:", error.message);
        return [];
      }
      return Promise.all((data || []).map(async (contract) => ({
        ...contract,
        observation_count: await getObservationCount(db, contract.index_code),
      })));
    } catch (err) {
      console.warn("Unexpected error in getEquityContracts:", err);
      return [];
    }
  },
  "equity_contracts",
  {
    ttlSeconds: 300,
    staleWhileRevalidateSeconds: 1800,
    tags: ["equity_contracts"],
  }
);

export async function getEquityDetail(indexCode: string): Promise<{ contract: EquityContract; observations: EquityObservation[]; constituents: EquityConstituent[] } | null> {
  try {
    if (!indexCode) return null;
    const cleanCode = indexCode.trim().toUpperCase().replace(/^\$/, "");
    const db = createCleanReadOnlyServerClient();
    const { data: contract, error: contractError } = await db
      .from("recovered_index_contracts")
      .select("index_code,display_name,methodology_version,expected_constituent_count,price_basis,grade_basis,selection_rule,weighting_rule,rebalance_rule,calculation_frequency,historical_status,production_status,notes")
      .eq("index_code", cleanCode)
      .maybeSingle();
    if (contractError || !contract) return null;
    const [{ data: observations, error: observationsError }, { data: constituents, error: constituentError }] = await Promise.all([
      db
        .from("recovered_index_observations")
        .select("observation_time,index_value,previous_value,absolute_change,percent_change,valid_constituent_count,expected_constituent_count,calculation_status,methodology_version")
        .eq("index_code", cleanCode)
        .order("observation_time", { ascending: false })
        .limit(250),
      db
        .from("recovered_index_constituents")
        .select("seat_number,historical_identity,ppcf_id,match_status,historical_source,notes")
        .eq("index_code", cleanCode)
        .order("seat_number"),
    ]);
    if (observationsError) {
      console.warn(`Observation query warning for ${indexCode}:`, observationsError.message);
    }
    if (constituentError) {
      console.warn(`Constituent query warning for ${indexCode}:`, constituentError.message);
    }
    return {
      contract: { ...contract, observation_count: observations?.length || 0 },
      observations: (observations || []) as EquityObservation[],
      constituents: (constituents || []) as EquityConstituent[],
    };
  } catch (err) {
    console.warn(`Unexpected error in getEquityDetail for ${indexCode}:`, err);
    return null;
  }
}
