/**
 * Sniper valuation authority: verified Panel Profits -> GoCollect -> ComicBase.
 * Each source is an independently identified book/edition/grade price.
 * Historical transactions are supporting evidence, NEVER a replacement for
 * missing primary authority. No interpolated grades or invented transactions.
 */
import type { SaleObs } from "./candles";
import { seriesKey } from "./candles";


export interface VerifiedValuation {
  fmv: number | undefined;
  comps: Array<{ date: string; price: number; grade: number; venue: string }>;
  provenance: string | undefined;
  salesCount: number;
}
type Guide = { fmv?: number | null; salesCount?: number | null; grader?: string; grade?: number | string; labelType?: string };
// Historical benchmark export is not a verified live PriceCharting feed.
// Its raw values have inconsistent scales and its keys omit volume/edition.
// Disable the export as an FMV authority until each record is reconciled.
const EDITION = /\b(?:variant|newsstand|direct edition|reprint|facsimile|foil|sketch|virgin|incentive|exclusive|signed|signature|restored|conserved|qualified|printing|\d+(?:st|nd|rd|th)\s+print|cover\s+[a-z])\b/i;
const median = (values: number[]): number | undefined => {
  const a = [...values].sort((x,y) => x-y);
  const mid = Math.floor(a.length/2);
  return a.length ? a.length % 2 ? a[mid] : (a[mid-1]+a[mid])/2 : undefined;
};
export function reconcileVerifiedValuation(input: {
  title: string;
  series?: string;
  issue?: string;
  year?: number | null;
  grade: number | null | undefined;
  grader: string | null | undefined;
  labelType?: string | null;
  sales: SaleObs[];
  guide?: Guide | null;
  comicBasePrice?: number | null;
  /** Exact-identity Panel Profits price from an audited source record. */
  panelProfitsPrice?: number | null;
  /** Explicit proof that the PP/ComicBase value matches the exact slab edition. */
  exactEditionVerified?: boolean;
  isMultiBook?: boolean;
}): VerifiedValuation {
  const empty: VerifiedValuation = { fmv: undefined, comps: [], provenance: undefined, salesCount: 0 };
  const { title, grade, grader, labelType, sales, guide } = input;
  if (input.isMultiBook || EDITION.test(title) || grade == null || !Number.isFinite(grade) ||
      grader?.toUpperCase() !== "CGC" || !labelType || !/universal/i.test(labelType)) return empty;

  const seen = new Set<string>();
  const matches = sales.filter(s => {
    if (!s.confirmed || s.grade !== grade || s.grader?.toUpperCase() !== "CGC" ||
        !(s.price > 0) || !Number.isFinite(s.price) || !/^\d{4}-\d{2}-\d{2}/.test(s.date) ||
        /^(?:benchmark:|pricecharting_guide|panel_profits_derived)/i.test(s.source)) return false;
    const id = s.saleId ? `sale:${s.saleId}` : s.url ? `url:${s.url}` : "";
    if (id && seen.has(id)) return false;
    if (id) seen.add(id);
    return true;
  }).sort((a,b) => a.date.localeCompare(b.date));
  const comps = matches.slice(-30).reverse().map(s => ({
    date: s.date.slice(0,10), price: s.price, grade: s.grade as number, venue: s.venue,
  }));
  const pc = input.exactEditionVerified && Number.isFinite(input.panelProfitsPrice) && Number(input.panelProfitsPrice) > 0
    ? Number(input.panelProfitsPrice) : undefined;
  const gc = guide && Number(guide.fmv) > 0 && Number(guide.salesCount) > 0 &&
    (!guide.grader || guide.grader.toUpperCase() === "CGC") &&
    (!guide.labelType || /universal/i.test(guide.labelType)) &&
    (guide.grade == null || Number(guide.grade) === grade) ? Number(guide.fmv) : undefined;
  const cb = input.exactEditionVerified && Number.isFinite(input.comicBasePrice) && Number(input.comicBasePrice) > 0
    ? Number(input.comicBasePrice) : undefined;

  // A local sale is evidence, not an authority. Single sales cannot establish FMV.
  const local = matches.length >= 2 ? median(matches.map(s=>s.price)) : undefined;
  const selected = pc ?? gc ?? cb;
  if (selected == null) return { ...empty, comps, salesCount: matches.length };
  const source = pc != null ? "Panel Profits" : gc != null ? "GoCollect" : "ComicBase";
  const references = [pc != null ? `Panel Profits ${Number(pc).toFixed(2)}` : null,
    gc != null ? `GoCollect $${gc.toFixed(2)}` : null,
    cb != null ? `ComicBase $${cb.toFixed(2)}` : null,
    local != null ? `recorded-sales median $${local.toFixed(2)} (${matches.length} sales)` : null
  ].filter(Boolean).join("; ");
  const divergent = [gc, cb, local].filter((x): x is number => x != null && x !== selected)
    .some(x => Math.abs(x - selected) / selected > 0.25);
  return {
    fmv: selected,
    comps,
    salesCount: matches.length,
    provenance: `${source} CGC Universal ${grade.toFixed(1)} exact-grade reference; ${references}${divergent ? "; WARNING: source prices differ by more than 25%" : ""}`,
  };
}
