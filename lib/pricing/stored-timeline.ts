import { createAdminServerClient } from "@/lib/supabase/admin";

export interface StoredTimelinePoint {
  observedAt: string;
  priceUsd: number;
  grade: string;
  source: string;
}

/** PriceCharting monthly guide history for one book, as stored by the nightly job. */
export async function loadStoredTimeline(catalogId: string | null | undefined): Promise<StoredTimelinePoint[]> {
  if (!catalogId) return [];
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
