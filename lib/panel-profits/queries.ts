import { createAdminServerClient, createCleanReadOnlyServerClient } from "@/lib/supabase/admin";

export async function getPanelTelemetry() {
  const cleanDb = createCleanReadOnlyServerClient();
  const [{ data: state }, { data: indices }, { data: ce50 }, { data: recoveredIndices }] = await Promise.all([
    cleanDb.from("market_state").select("tick, regime, market_regime_4state, stress_index, drawdown, tectonic_tier, titan_overlay_active, cascade_active").eq("id", 1).maybeSingle(),
    cleanDb.from("market_indices").select("index_id,index_name,index_type,base_value,current_value,constituent_count").order("index_name"),
    cleanDb.from("ce50_base").select("raw_value,set_at").eq("id", 1).maybeSingle(),
    cleanDb.from("recovered_index_contracts").select("index_code,display_name,methodology_version,expected_constituent_count,production_status,historical_status,current_value:production_status,notes").order("index_code"),
  ]);
  return { state, indices: indices || [], ce50, recoveredIndices: recoveredIndices || [] };
}

export async function getFirms() {
  const db = createAdminServerClient();
  const { data, error } = await db.from("firm_profiles").select("firm_id,firm_name,philosophy,specialization,risk_style,speed,client_type,active,aum_billions,total_brokers,total_clients").eq("active", true).order("firm_name");
  if (error) {
    console.error("Error fetching firm profiles:", error);
    return [];
  }
  return data || [];
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

export async function getNewsData(limit = 40) {
  const db = createCleanReadOnlyServerClient();
  const [{ data: news }, { data: stories }, { data: rssItems }, { data: broadcasts }] = await Promise.all([
    db.from("market_news").select("*").order("created_at", { ascending: false }).limit(limit),
    db.from("ppib_stories").select("*").order("created_at", { ascending: false }).limit(limit),
    db.from("rss_items").select("*").order("published_at", { ascending: false }).limit(limit),
    db.from("newsroom_broadcasts").select("*").order("created_at", { ascending: false }).limit(limit),
  ]);
  return { news: news || [], stories: stories || [], rssItems: rssItems || [], broadcasts: broadcasts || [] };
}

export async function getDiaryEntries(userId: string) {
  const db = createAdminServerClient();
  const { data, error } = await db.from("player_diary_entries").select("*").eq("user_id", userId).order("occurred_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data || [];
}
