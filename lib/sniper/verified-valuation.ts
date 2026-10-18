/**
 * Single-source Sniper valuation reconciliation.
 * Realized transactions are distinct from price guides and unsold auction bids.
 * Missing edition identity never authorizes a variant price.
 */
import type { SaleObs } from "./candles";

export interface VerifiedValuation {
  fmv: number | undefined;
  comps: Array<{ date: string; price: number; grade: number; venue: string }>;
  provenance: string | undefined;
  salesCount: number;
}

const SPECIAL_EDITION = /\b(?:variant|newsstand|direct edition|reprint|facsimile|foil|sketch|virgin|incentive|exclusive|signed|signature|restored|conserved|qualified|printing|\d+(?:st|nd|rd|th)\s+print|cover\s+[a-z])\b/i;
const med = (prices: number[]) => {
  const a = [...prices].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length ? (a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2) : undefined;
};

export function reconcileVerifiedValuation(input: {
  title: string;
  grade: number | null | undefined;
  grader: string | null | undefined;
  labelType?: string | null;
  sales: SaleObs[];
  guide?: { fmv?: number | null; salesCount?: number | null; grader?: string; grade?: number | string; labelType?: string } | null;
  isMultiBook?: boolean;
}): VerifiedValuation {
  const empty: VerifiedValuation = { fmv: undefined, comps: [], provenance: undefined, salesCount: 0 };
  const { title, grade, grader, sales, guide, labelType } = input;
  if (input.isMultiBook || SPECIAL_EDITION.test(title) || grade == null || !Number.isFinite(grade) ||
      !grader || grader.toUpperCase() !== "CGC" ||
      (labelType && !/universal/i.test(labelType))) return empty;

  // Preserve distinct sales even when two copies sell at the same price on the same day.
  // Deduplicate only by a transaction identifier or identical documented URL.
  const seen = new Set<string>();
  const matching = sales.filter(s => {
    if (!s.confirmed || s.grade !== grade || s.grader?.toUpperCase() !== "CGC" ||
        !Number.isFinite(s.price) || s.price <= 0 ||
        !/^\d{4}-\d{2}-\d{2}/.test(s.date) ||
        /^(?:benchmark:|pricecharting_guide|panel_profits_derived)/i.test(s.source)) return false;
    const identity = s.saleId ? `sale:${s.saleId}` : s.url ? `url:${s.url}` : "";
    if (identity && seen.has(identity)) return false;
    if (identity) seen.add(identity);
    return true;
  }).sort((a,b) => a.date.localeCompare(b.date));

  const recentCutoff = new Date(Date.now() - 90 * 86400000).toISOString().slice(0,10);
  const recent = matching.filter(s => s.date.slice(0,10) >= recentCutoff);
  const median = med((recent.length ? recent : matching).map(s => s.price));
  const comps = matching.slice(-30).reverse().map(s => ({
    date: s.date.slice(0,10), price: s.price, grade: s.grade as number, venue: s.venue
  }));
  if (median != null) return {
    fmv: median, comps, salesCount: matching.length,
    provenance: `Confirmed CGC Universal grade ${grade.toFixed(1)} sales (${matching.length} recorded transactions)`,
  };

  // GoCollect's verified grade/label price can be an FMV reference, but never
  // manufacture individual transaction rows from its aggregate sales count.
  if (guide && Number(guide.fmv) > 0 && Number(guide.salesCount) > 0 &&
      (!guide.grader || guide.grader.toUpperCase() === "CGC") &&
      (guide.grade == null || Number(guide.grade) === grade) &&
      (!guide.labelType || /universal/i.test(guide.labelType))) {
    return {
      fmv: Number(guide.fmv), comps: [], salesCount: Number(guide.salesCount),
      provenance: `GoCollect CGC Universal grade ${grade.toFixed(1)} aggregate (${guide.salesCount} sales; individual transactions unavailable)`,
    };
  }
  return empty;
}
