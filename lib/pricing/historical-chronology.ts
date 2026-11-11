import type { ComicRecord } from "@/lib/comics/types";
import type { HistoryEntry } from "@/components/detail/equity/types";

export interface ChronologyOptions {
  dbObservations?: Array<{ amount: number; observed_at: string | null; grade_label: string | null; source_system?: string }>;
  salesObservations?: Array<{ sale_price: number | string | null; sale_date: string | null; native_grade_text: string | null; venue?: string | null }>;
}

/** Normalises a stored grade label ("CGC 9.8", "9.8", "UNGRADED", "raw") to the chart's grade key; null when it cannot be read. */
export function normalizeGradeLabel(label: string | null | undefined): string | null {
  const t = (label ?? "").trim().toUpperCase().replace(/^CGC\s*/, "").replace("_", ".");
  if (!t) return null;
  if (t === "UNGRADED" || t === "RAW" || t === "0") return "RAW";
  const n = Number(t);
  return Number.isFinite(n) && n > 0 && n <= 10 ? n.toFixed(1) : null;
}

/**
 * Dated price history from stored observations only:
 *   - dated PriceCharting snapshots (pp_price_history)
 *   - dated completed sales (graded_sales_observations)
 *   - the monthly PriceCharting series stored on the book (panel_profits_data.pricecharting.series)
 * Nothing is anchored to "now", defaulted, or filled in. A row with no price, date or readable grade is dropped.
 */
export function buildComicPriceHistory(comic: Partial<ComicRecord>, options: ChronologyOptions = {}): HistoryEntry[] {
  const history: HistoryEntry[] = [];

  for (const obs of options.dbObservations ?? []) {
    if (obs.source_system === "COMICBASE") continue;
    const amt = Number(obs.amount);
    const grade = normalizeGradeLabel(obs.grade_label);
    const t = obs.observed_at ? new Date(obs.observed_at) : null;
    if (amt > 0 && grade && t && !isNaN(t.getTime())) {
      history.push({ grade, priceUsd: amt, observedAt: t.toISOString(), source: "PRICECHARTING_SNAPSHOT" });
    }
  }

  for (const sale of options.salesObservations ?? []) {
    const amt = Number(sale.sale_price);
    const grade = normalizeGradeLabel(sale.native_grade_text);
    const t = sale.sale_date ? new Date(sale.sale_date) : null;
    if (amt > 0 && grade && t && !isNaN(t.getTime())) {
      history.push({ grade, priceUsd: amt, observedAt: t.toISOString(), source: sale.venue ? `SALE_${sale.venue.toUpperCase()}` : "COMPLETED_SALE" });
    }
  }

  const ppData = (comic.panel_profits_data || {}) as Record<string, any>;
  const pcSeries = ppData?.pricecharting?.series as Record<string, Array<{ date: string; price: number }>> | undefined;
  if (pcSeries && typeof pcSeries === "object") {
    for (const [label, pts] of Object.entries(pcSeries)) {
      const grade = normalizeGradeLabel(label);
      if (!grade || !Array.isArray(pts)) continue;
      for (const pt of pts) {
        const amt = Number(pt?.price);
        const t = pt?.date ? new Date(pt.date) : null;
        if (amt > 0 && t && !isNaN(t.getTime())) {
          history.push({ grade, priceUsd: amt, observedAt: t.toISOString(), source: "PRICECHARTING_SERIES" });
        }
      }
    }
  }

  const seen = new Set<string>();
  const out: HistoryEntry[] = [];
  for (const h of history) {
    const key = `${h.grade}|${h.observedAt}|${h.priceUsd}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(h);
    }
  }
  out.sort((a, b) => (a.observedAt < b.observedAt ? -1 : a.observedAt > b.observedAt ? 1 : 0));
  return out;
}
