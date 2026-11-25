import { createAdminServerClient, createCleanReadOnlyServerClient } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/errors";
import { createCachedQuery } from "@/lib/cache/wrapper";

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

async function fetchPanelTelemetryRaw(): Promise<{
  state: PanelMarketState | null;
  indices: PanelMarketIndex[];
  ce50: Ce50Reference | null;
  recoveredIndices: RecoveredIndexContract[];
}> {
  const cleanDb = createCleanReadOnlyServerClient();
  const adminDb = createAdminServerClient();

  try {
    const [{ data: recoveredIndices, error: contractErr }, { data: observations, error: obsErr }] = await Promise.all([
      cleanDb
        .from("recovered_index_contracts")
        .select("index_code,display_name,methodology_version,expected_constituent_count,production_status,historical_status,current_value:production_status,notes")
        .order("index_code"),
      cleanDb
        .from("recovered_index_observations")
        .select("index_code,index_value,base_value,constituent_count,observation_date")
        .order("observation_date", { ascending: false })
        .limit(100),
    ]);
    const marketState: any = null;

    if (contractErr && isMissingTableError(contractErr)) {
      console.warn("Recovered index contracts table is not deployed in the live Clean project.");
      return {
        state: null,
        indices: [],
        ce50: null,
        recoveredIndices: [],
      };
    }

    // Process observations into latest index values
    const latestByIndex = new Map<string, { index_value: number; base_value: number; constituent_count: number; date: string }>();
    if (observations && observations.length > 0) {
      for (const obs of observations) {
        if (!latestByIndex.has(obs.index_code)) {
          latestByIndex.set(obs.index_code, {
            index_value: Number(obs.index_value),
            base_value: Number(obs.base_value),
            constituent_count: Number(obs.constituent_count),
            date: obs.observation_date,
          });
        }
      }
    }

    // Index identity (id/name/type) is static system labeling, not market data.
    // Base/current values and constituent counts come ONLY from a matching real
    // observation row; an index with no observation stays unpriced (null) rather
    // than showing a fabricated number.
    const indexConfigs = [
      { id: "CE70", name: "CE70 Constitutional Benchmark", type: "Constitutional Weight" },
      { id: "PPIX100", name: "PPIX-100 Liquidity-Weighted Pulse", type: "Liquidity Pulse" },
      { id: "PPIX_COMPOSITE", name: "PPIX Composite (CE70 + PPIX-100)", type: "Cross-Stream Composite" },
    ];

    const indices: PanelMarketIndex[] = indexConfigs.map((cfg) => {
      const obs = latestByIndex.get(cfg.id);
      return {
        index_id: cfg.id,
        index_name: cfg.name,
        index_type: cfg.type,
        base_value: obs?.base_value ?? null,
        current_value: obs?.index_value ?? null,
        constituent_count: obs?.constituent_count ?? null,
      };
    });

    // Live market telemetry tables are absent in Clean as documented in CLEAN_FEATURE_SOURCE_MAP.md.
    const state: PanelMarketState | null = null;
    const ce50: Ce50Reference | null = null;

    // Enhance contracts with live values if available (exclude retired PPIX60)
    const enrichedContracts = (recoveredIndices || [])
      .filter((contract) => contract.index_code !== "PPIX60")
      .map((contract) => {
      const live = latestByIndex.get(contract.index_code);
      return {
        ...contract,
        current_value: live ? live.index_value.toFixed(2) : contract.production_status,
      };
    });

    return {
      state,
      indices,
      ce50,
      recoveredIndices: enrichedContracts,
    };
  } catch (err) {
    console.error("Error fetching live Clean market telemetry:", err);
    return {
      state: null,
      indices: [],
      ce50: null,
      recoveredIndices: [],
    };
  }
}

export const getPanelTelemetry = createCachedQuery(
  fetchPanelTelemetryRaw,
  "panel-telemetry",
  { ttlSeconds: 60, staleWhileRevalidateSeconds: 300, tags: ["market", "telemetry"] }
);

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
  try {
    const db = createAdminServerClient();
    const { data, error } = await db
      .from("firm_broker_registry")
      .select("source_broker_id,broker_code,human_name,firm_id")
      .order("human_name")
      .limit(limit);

    if (error) {
      console.warn("Failed to get brokers from Clean firm_broker_registry:", error.message);
      return [];
    }
    return (data || []).map((r) => ({
      broker_id: r.source_broker_id,
      broker_code: r.broker_code,
      full_name: r.human_name,
      firm_slug: r.firm_id,
      ladder_level: 1,
      primary_track: "EQUITY",
      specialization: "Generalist",
      is_named_rival: false,
    }));
  } catch (err) {
    console.warn("Unexpected error in getBrokers:", err);
    return [];
  }
}

export type CareerLevel = {
  id: string | number;
  level_number: number;
  name: string;
  description?: string | null;
  required_points: number;
};

export async function getLearningCatalog() {
  try {
    const db = createAdminServerClient();
    const [{ data: courses }, { data: certs }] = await Promise.all([
      db.from("certification_courses").select("course_id,course_name,level").order("course_id").limit(1000),
      db.from("certifications_master").select("cert_id,cert_name,authority,track,difficulty_level").order("cert_id").limit(1000),
    ]);
    return {
      classes: (courses || []).map((c) => ({ id: c.course_id, name: c.course_name, level: c.level })),
      certifications: (certs || []).map((ct) => ({ id: ct.cert_id, name: ct.cert_name, authority: ct.authority, track: ct.track })),
      exams: [] as { id: number; name: string }[],
      levels: [] as CareerLevel[],
    };
  } catch (err) {
    console.warn("Unexpected error in getLearningCatalog:", err);
    return { classes: [], certifications: [], exams: [], levels: [] as CareerLevel[] };
  }
}

export async function getDiaryEntries(userId: string) {
  try {
    const db = createAdminServerClient();
    const { data, error } = await db.from("player_diary_entries").select("*").eq("user_id", userId).order("occurred_at", { ascending: false }).limit(200);
    if (error) {
      console.warn("Failed to get diary entries:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn("Unexpected error in getDiaryEntries:", err);
    return [];
  }
}
