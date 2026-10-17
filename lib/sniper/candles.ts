/**
 * Candles and volume built only from recorded sales. Nothing here invents a point:
 * a candle exists only for a period that contains at least one real sale, and its volume is the number of sales in it.
 */

export interface SaleObs {
  /** YYYY-MM-DD or a full ISO timestamp */
  date: string;
  price: number;
  grade: number | null;
  venue: string;
  /** Grading company only when explicitly identified in the underlying transaction. */
  grader?: string;
  /** where the record came from, e.g. ebay_last_bid, ebay_insights, graded_sales_observations, benchmark */
  source: string;
  /** true when the venue itself reported the sale; false for a final bid we watched */
  confirmed: boolean;
  url?: string;
}

export type Bucket = "day" | "week" | "month" | "quarter" | "year";

export interface Candle {
  time: string; // first day of the period, YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number; // sales in the period
  dollars: number; // total dollars traded in the period
}

const day = (d: string) => d.slice(0, 10);

/** The same sale reported by two sources (same day, price and grade) counts once; a confirmed record wins. */
export function dedupeSales(sales: SaleObs[]): SaleObs[] {
  const seen = new Map<string, SaleObs>();
  for (const s of sales) {
    if (!(s.price > 0) || !/^\d{4}-\d{2}-\d{2}/.test(s.date)) continue;
    const key = `${day(s.date)}|${Math.round(s.price * 100)}|${s.grade ?? "x"}`;
    const prev = seen.get(key);
    if (!prev || (!prev.confirmed && s.confirmed)) seen.set(key, s);
  }
  return Array.from(seen.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/** Start date of the period a date falls in. Weeks start Monday. */
export function bucketStart(date: string, bucket: Bucket): string {
  const d = new Date(`${day(date)}T00:00:00Z`);
  if (bucket === "day") return day(date);
  if (bucket === "week") {
    const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
    d.setUTCDate(d.getUTCDate() - dow);
    return d.toISOString().slice(0, 10);
  }
  if (bucket === "month") return `${day(date).slice(0, 7)}-01`;
  if (bucket === "quarter") {
    const m = d.getUTCMonth();
    const qm = String(Math.floor(m / 3) * 3 + 1).padStart(2, "0");
    return `${d.getUTCFullYear()}-${qm}-01`;
  }
  return `${d.getUTCFullYear()}-01-01`;
}

export function buildCandles(sales: SaleObs[], bucket: Bucket): Candle[] {
  const clean = dedupeSales(sales);
  const groups = new Map<string, SaleObs[]>();
  for (const s of clean) {
    const k = bucketStart(s.date, bucket);
    const g = groups.get(k);
    if (g) g.push(s);
    else groups.set(k, [s]);
  }
  return Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([time, g]) => {
      const prices = g.map((x) => x.price);
      return {
        time,
        open: g[0].price,
        high: Math.max(...prices),
        low: Math.min(...prices),
        close: g[g.length - 1].price,
        volume: g.length,
        dollars: Math.round(prices.reduce((a, b) => a + b, 0) * 100) / 100,
      };
    });
}

/** The finest period that still puts about 1.5 sales in a candle on average, capped at 150 candles. */
export function pickBucket(sales: SaleObs[]): Bucket {
  const clean = dedupeSales(sales);
  const order: Bucket[] = ["day", "week", "month", "quarter", "year"];
  for (const b of order) {
    const candles = buildCandles(clean, b).length;
    if (candles <= 150 && clean.length / Math.max(candles, 1) >= 1.5) return b;
  }
  return "year";
}

/** Grades present in a set of sales, most traded first. */
export function gradesTraded(sales: SaleObs[]): Array<{ grade: number; count: number }> {
  const m = new Map<number, number>();
  for (const s of dedupeSales(sales)) if (s.grade != null) m.set(s.grade, (m.get(s.grade) ?? 0) + 1);
  return Array.from(m.entries())
    .map(([grade, count]) => ({ grade, count }))
    .sort((a, b) => b.count - a.count || b.grade - a.grade);
}

export interface SaleStats {
  n: number;
  last: { price: number; date: string } | null;
  low: number | null;
  high: number | null;
  median: number | null;
  /** median of the sales in the 90 days before `asOf`, null when there are none */
  median90d: number | null;
}

export function saleStats(sales: SaleObs[], asOf: Date = new Date()): SaleStats {
  const clean = dedupeSales(sales);
  if (clean.length === 0) return { n: 0, last: null, low: null, high: null, median: null, median90d: null };
  const med = (xs: number[]) => {
    const a = [...xs].sort((p, q) => p - q);
    const m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  };
  const cutoff = new Date(asOf.getTime() - 90 * 86400000).toISOString().slice(0, 10);
  const recent = clean.filter((s) => day(s.date) >= cutoff).map((s) => s.price);
  const last = clean[clean.length - 1];
  const prices = clean.map((s) => s.price);
  return {
    n: clean.length,
    last: { price: last.price, date: day(last.date) },
    low: Math.min(...prices),
    high: Math.max(...prices),
    median: med(prices),
    median90d: recent.length ? med(recent) : null,
  };
}

/** Normalised key shared by the sales table and the candle endpoint. */
export function seriesKey(series: string, issue: string | number): string {
  let s = String(series || "")
    .toLowerCase()
    .replace(/\s*[(\[].*?[)\]]/g, "")
    .replace(/\b(?:vol(?:\.|ume)?|v)\s*\d+\b/g, "")
    .replace(/^the\s+/, "")
    .replace(/,\s*(?:the|a|an)$/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (s === "x men giant size") s = "giant size x men";
  const i = String(issue ?? "").replace(/^#/, "").trim().toLowerCase();
  return `${s}|${i}`;
}
