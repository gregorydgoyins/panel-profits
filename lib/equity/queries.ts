import { createCleanReadOnlyServerClient } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/errors";

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
  notes: Record<string, unknown> | null;
}

async function getObservationCount(db: ReturnType<typeof createCleanReadOnlyServerClient>, indexCode: string) {
  const { count, error } = await db
    .from("recovered_index_observations")
    .select("id", { count: "exact", head: true })
    .eq("index_code", indexCode);
  if (error) throw error;
  return count || 0;
}

export async function getEquityContracts(): Promise<EquityContract[]> {
  const db = createCleanReadOnlyServerClient();
  const { data, error } = await db
    .from("recovered_index_contracts")
    .select("index_code,display_name,methodology_version,expected_constituent_count,price_basis,grade_basis,selection_rule,weighting_rule,rebalance_rule,calculation_frequency,historical_status,production_status,notes")
    .order("index_code");
  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
  return Promise.all((data || []).map(async (contract) => ({
    ...contract,
    observation_count: await getObservationCount(db, contract.index_code),
  })));
}

export async function getEquityDetail(indexCode: string): Promise<{ contract: EquityContract; observations: EquityObservation[]; constituents: EquityConstituent[] } | null> {
  const db = createCleanReadOnlyServerClient();
  const { data: contract, error: contractError } = await db
    .from("recovered_index_contracts")
    .select("index_code,display_name,methodology_version,expected_constituent_count,price_basis,grade_basis,selection_rule,weighting_rule,rebalance_rule,calculation_frequency,historical_status,production_status,notes")
    .eq("index_code", indexCode)
    .maybeSingle();
  if (contractError || !contract) return null;
  const [{ data: observations, error: observationsError }, { data: constituents, error: constituentError }] = await Promise.all([
    db
    .from("recovered_index_observations")
    .select("observation_time,index_value,previous_value,absolute_change,percent_change,valid_constituent_count,expected_constituent_count,calculation_status,methodology_version")
    .eq("index_code", indexCode)
    .order("observation_time", { ascending: false })
    .limit(250),
    db
      .from("recovered_index_constituents")
      .select("seat_number,historical_identity,ppcf_id,match_status,historical_source,notes")
      .eq("index_code", indexCode)
      .order("seat_number"),
  ]);
  if (observationsError) throw observationsError;
  if (constituentError) throw constituentError;
  return {
    contract: { ...contract, observation_count: observations?.length || 0 },
    observations: (observations || []) as EquityObservation[],
    constituents: (constituents || []) as EquityConstituent[],
  };
}
