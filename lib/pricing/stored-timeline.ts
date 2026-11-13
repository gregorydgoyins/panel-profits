import { createAdminServerClient } from "@/lib/supabase/admin";
import { refreshBook } from "@/lib/jobs/pricecharting-sync";

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
  // Not saved yet: pull this book's PriceCharting API prices + 60-month chart JSON once, save it, return it.
  try {
    const r = await Promise.race([
      refreshBook({ pp_id: catalogId, pp_series: book?.series ?? null, pp_issue: book?.issue ?? null }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 9000)),
    ]);
    if (r && r.points.length) {
      return r.points.map((p) => ({ observedAt: p.observed_date, priceUsd: p.price_usd, grade: p.track_grade, source: "PRICECHARTING_LONGITUDINAL" }));
    }
  } catch (e) {
    console.warn("[stored-timeline] first fetch failed:", (e as Error).message);
  }
  return [];
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
