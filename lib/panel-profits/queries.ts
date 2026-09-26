import { createAdminServerClient, createCleanReadOnlyServerClient } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/errors";

interface PanelMarketState {
  tick: number | null;
  regime: string | null;
  market_regime_4state: string | null;
  stress_index: number | null;
  drawdown: number | null;
  tectonic_tier: number | null;
}

interface PanelMarketIndex {
  index_id: string;
  index_name: string;
  index_type: string | null;
  base_value: number | null;
  current_value: number | null;
  constituent_count: number | null;
}

interface Ce50Reference {
  raw_value: number;
  set_at: string | null;
}

interface RecoveredIndexContract {
  index_code: string;
  display_name: string;
  methodology_version: string;
  expected_constituent_count: number;
  production_status: string;
  historical_status: string;
  current_value: string;
  notes: string | null;
}

export async function getPanelTelemetry(): Promise<{
  state: PanelMarketState | null;
  indices: PanelMarketIndex[];
  ce50: Ce50Reference | null;
  recoveredIndices: RecoveredIndexContract[];
}> {
  const cleanDb = createCleanReadOnlyServerClient();
  const { data: recoveredIndices, error } = await cleanDb
    .from("recovered_index_contracts")
    .select("index_code,display_name,methodology_version,expected_constituent_count,production_status,historical_status,current_value:production_status,notes")
    .order("index_code");

  if (error) {
    if (isMissingTableError(error)) {
      console.warn("Recovered index contracts table is not deployed in the live Clean project.");
      return {
        state: null,
        indices: [],
        ce50: null,
        recoveredIndices: [],
      };
    }
    console.error("Error fetching Clean recovered index contracts:", error);
  }

  return {
    state: null,
    indices: [],
    ce50: null,
    recoveredIndices: recoveredIndices || [],
  };
}

export async function getFirms() {
  const db = createCleanReadOnlyServerClient();
  const firmSlugs = ["arnveld", "adanko", "cairn", "calmonte", "carantec", "cavendara", "cormorant", "dundeen", "harborside", "holtercroft", "irodori", "khamsin", "lacoste", "nalvera", "okafor", "orontea", "penhaligon", "rhein", "schwarzenberg", "seine", "sestriere", "talua", "valdris", "vantage", "vestmark"];

  const firms = await Promise.all(firmSlugs.map(async (firmId) => {
    const { data: identity, error } = await db.from(`${firmId}_firm_identity`).select("*").maybeSingle();
    if (error || !identity) return null;
    const prefix = `${firmId}_`;
    const [brokers, clients, freeAgents, gods, titans, staff] = await Promise.all([
      db.from(`${firmId}_broker_identity`).select("*", { count: "exact", head: true }),
      db.from(`${firmId}_client_identity`).select("*", { count: "exact", head: true }),
      db.from(`${firmId}_free_agents`).select("*", { count: "exact", head: true }),
      db.from(`${firmId}_firm_gods`).select("*", { count: "exact", head: true }),
      db.from(`${firmId}_firm_titans`).select("*", { count: "exact", head: true }),
      db.from(`${firmId}_staff_roster`).select("*", { count: "exact", head: true }),
    ]);

    return {
      firm_id: firmId,
      firm_name: identity[`${prefix}firm_name`] || identity.firm_name || firmId,
      philosophy: identity[`${prefix}firm_personality_statement`] || identity.institutional_mission || null,
      mythology: identity.mythology || null,
      aum_usd: identity.aum_usd == null ? null : Number(identity.aum_usd),
      total_brokers: brokers.count || 0,
      total_clients: clients.count || 0,
      total_free_agents: freeAgents.count || 0,
      total_gods: gods.count || 0,
      total_titans: titans.count || 0,
      total_staff: staff.count || 0,
      source: "Clean firm-prefixed identity tables",
    };
  }));

  return firms.filter(Boolean).sort((left, right) => left!.firm_name.localeCompare(right!.firm_name));
}

export async function getFirmDossier(firmId: string) {
  const db = createCleanReadOnlyServerClient();
  const prefix = `${firmId}_`;
  const { data: identity, error } = await db.from(`${prefix}firm_identity`).select("*").maybeSingle();
  if (error || !identity) return null;

  const [brokerRows, clientRows, staffRows, godRows, titanRows, coverageRows, certificateRows] = await Promise.all([
    db.from(`${prefix}broker_identity`).select("*").limit(12),
    db.from(`${prefix}client_identity`).select("*").limit(12),
    db.from(`${prefix}staff_roster`).select("*").limit(12),
    db.from(`${prefix}firm_gods`).select("*").limit(12),
    db.from(`${prefix}firm_titans`).select("*").limit(12),
    db.from(`${prefix}client_coverage`).select("*", { count: "exact", head: true }),
    db.from(`${prefix}broker_certifications`).select("*", { count: "exact", head: true }),
  ]);

  const countRows = async (table: string) => (await db.from(table).select("*", { count: "exact", head: true })).count || 0;
  const [brokerCount, clientCount, staffCount, godCount, titanCount, freeAgentCount] = await Promise.all([
    countRows(`${prefix}broker_identity`), countRows(`${prefix}client_identity`), countRows(`${prefix}staff_roster`),
    countRows(`${prefix}firm_gods`), countRows(`${prefix}firm_titans`), countRows(`${prefix}free_agents`),
  ]);

  return {
    firmId,
    identity,
    counts: { brokerCount, clientCount, staffCount, godCount, titanCount, freeAgentCount, coverageCount: coverageRows.count || 0, certificationCount: certificateRows.count || 0 },
    brokers: brokerRows.data || [], clients: clientRows.data || [], staff: staffRows.data || [], gods: godRows.data || [], titans: titanRows.data || [],
  };
}

export async function getBrokers(limit = 80) {
  const db = createAdminServerClient();
  const { data, error } = await db.from("brokers").select("broker_id,broker_code,full_name,firm_slug,ladder_level,primary_track,specialization,is_named_rival").order("full_name").limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getLearningCatalog() {
  const db = createCleanReadOnlyServerClient();
  const [{ data: classes }, { data: certifications }, { data: exams }, { data: levels }] = await Promise.all([
    db.from("learn_classes").select("*").limit(80),
    db.from("learn_certifications").select("*").limit(80),
    db.from("learn_exams").select("*").limit(40),
    db.from("career_pathway_levels").select("*").order("pathway_name").order("level").limit(80),
  ]);
  return { classes: classes || [], certifications: certifications || [], exams: exams || [], levels: levels || [] };
}

export async function getDiaryEntries(userId: string) {
  const db = createAdminServerClient();
  const { data, error } = await db.from("player_diary_entries").select("*").eq("user_id", userId).order("occurred_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data || [];
}
