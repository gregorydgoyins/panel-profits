import { createAdminServerClient } from "@/lib/supabase/admin";

export interface StoredTimelinePoint {
  observedAt: string;
  priceUsd: number;
  grade: string;
  source: string;
}

/** PriceCharting monthly guide history for one book, as stored by the nightly job. */
export async function loadStoredTimeline(
  catalogId: string | null | undefined,
  book?: { series?: string | null; issue?: string | null }
): Promise<StoredTimelinePoint[]> {
  if (!catalogId) return [];
  const stored = await readStored(catalogId);
  if (stored.length) return stored;
  // Compact chart JSON saved by the pricecharting-charts job.
  const chart = await readChartJson(catalogId);
  if (chart.length) return chart;
  // No saved chart: use our own dated API snapshots (built going forward by the nightly sync).
  return readSnapshots(catalogId);
}

async function readChartJson(catalogId: string): Promise<StoredTimelinePoint[]> {
  try {
    const supabase = createAdminServerClient();
    const { data, error } = await supabase.from("pp_chart_json").select("chart").eq("pp_id", catalogId).maybeSingle();
    if (error) throw error;
    const out: StoredTimelinePoint[] = [];
    for (const [grade, pts] of Object.entries((data?.chart ?? {}) as Record<string, Array<[string, number]>>)) {
      for (const p of pts ?? []) {
        if (Array.isArray(p) && Number(p[1]) > 0) out.push({ observedAt: String(p[0]), priceUsd: Number(p[1]), grade, source: "PRICECHARTING_LONGITUDINAL" });
      }
    }
    return out.sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  } catch (e) {
    console.warn("[stored-timeline] chart json read failed:", e);
    return [];
  }
}

async function readStored(catalogId: string): Promise<StoredTimelinePoint[]> {
  try {
    const supabase = createAdminServerClient();
    const { data, error } = await supabase
      .from("monthly_timeline_observations")
      .select("track_grade, observed_date, price_usd")
      .eq("catalog_id", catalogId)
      .order("observed_date", { ascending: true })
      .limit(2000);
    if (error) throw error;
    return (data ?? [])
      .filter((r: any) => Number(r.price_usd) > 0)
      .map((r: any) => ({
        observedAt: String(r.observed_date),
        priceUsd: Number(r.price_usd),
        grade: String(r.track_grade),
        source: "PRICECHARTING_LONGITUDINAL",
      }));
  } catch (e) {
    console.warn("[stored-timeline] read failed:", e);
    return [];
  }
}

const SNAPSHOT_GRADES: Array<[string, string]> = [
  ["pp_price_raw", "RAW"], ["pp_price_2_0", "2.0"], ["pp_price_3_0", "3.0"], ["pp_price_4_0", "4.0"], ["pp_price_5_0", "5.0"],
  ["pp_price_6_0", "6.0"], ["pp_price_7_0", "7.0"], ["pp_price_8_0", "8.0"], ["pp_price_9_0", "9.0"], ["pp_price_9_2", "9.2"],
  ["pp_price_9_4", "9.4"], ["pp_price_9_6", "9.6"], ["pp_price_9_8", "9.8"], ["pp_price_10_0", "10.0"],
];

async function readSnapshots(catalogId: string): Promise<StoredTimelinePoint[]> {
  try {
    const supabase = createAdminServerClient();
    const { data, error } = await supabase
      .from("pp_price_history")
      .select(["snapshot_date", ...SNAPSHOT_GRADES.map(([c]) => c)].join(","))
      .eq("pp_id", catalogId)
      .not("snapshot_date", "is", null)
      .order("snapshot_date", { ascending: true })
      .limit(1000);
    if (error) throw error;
    const out: StoredTimelinePoint[] = [];
    for (const row of (data ?? []) as unknown as Array<Record<string, any>>) {
      for (const [col, grade] of SNAPSHOT_GRADES) {
        const price = Number(row[col]);
        if (price > 0) out.push({ observedAt: String(row.snapshot_date), priceUsd: price, grade, source: "PRICECHARTING_API_SNAPSHOT" });
      }
    }
    return out;
  } catch (e) {
    console.warn("[stored-timeline] snapshot read failed:", e);
    return [];
  }
}
