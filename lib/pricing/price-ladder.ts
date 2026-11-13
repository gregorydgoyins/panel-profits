/**
 * lib/pricing/price-ladder.ts
 *
 * The one per-grade price rule for a comic. Pure function: callers pass in what
 * Supabase holds (stored PriceCharting grade prices + clean sales comps) and get
 * back one price per grade with its evidence. Nothing is fetched at render time
 * and nothing is inferred from ratios.
 *
 * Headline rule per grade:
 *   ≥3 clean sales in the last 12 months → median of the most recent ≤10   ("market")
 *   else ≥3 clean sales in the last 24 months → median of the most recent ≤10 ("market", labelled 24 mo)
 *   1–2 clean sales in the last 24 months → stored price if any, else last sale ("thin", label "thin: N sales")
 *   no sales, stored price exists        → stored price                       ("estimate")
 *   nothing                              → unpriced (grade absent)
 *
 * Ladder rules:
 *   • Raw may exceed low grades but never the standard 9.8 price. Raw > 9.8 is a data
 *     error: raw is dropped and reported in `violations` (fix at the source).
 *   • A non-monotonic ladder is NOT corrected. It means thin sales, so prices stay as
 *     recorded and each grade carries its sales count.
 *   • 9.9 / 10.0 are separate books: priced only from their own sales, never from stored
 *     estimates, and never when CGC census shows 0 copies at that grade.
 */

export type LadderGrade = string; // "RAW", "2.0" … "9.8", "9.9", "10.0"

export interface CompSale {
  grade: LadderGrade;
  priceUsd: number;
  soldAt: string; // ISO date
}

export type PriceEvidence = "market" | "thin" | "estimate";

export interface LadderRung {
  grade: LadderGrade;
  priceUsd: number;
  evidence: PriceEvidence;
  /** Clean sales at this grade in the last 12 months. */
  sales12m: number;
  /** Clean sales at this grade in the last 24 months. */
  sales24m: number;
  /** Sales used for the median (market) — empty otherwise. */
  salesUsed: number;
  lastSale: { priceUsd: number; soldAt: string } | null;
  /** e.g. "thin: 2 sales", "estimate: no recorded sales" */
  label: string;
}

export interface PriceLadder {
  rungs: Record<LadderGrade, LadderRung>;
  violations: Array<{ grade: LadderGrade; reason: string }>;
}

export const LADDER_MARKET_MIN_SALES = 3;
export const LADDER_RECENT_N = 10;

const DAY = 86_400_000;
const APEX = new Set(["9.9", "10.0"]);

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return Number((s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2).toFixed(2));
}

export function normalizeLadderGrade(g: string | number | null | undefined): LadderGrade | null {
  if (g == null) return null;
  const s = String(g).trim().toUpperCase();
  if (s === "RAW" || s === "UNGRADED") return "RAW";
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0 || n > 10) return null;
  return n.toFixed(1);
}

export function buildPriceLadder(input: {
  stored: Partial<Record<LadderGrade, number | null | undefined>>;
  comps: CompSale[];
  /** CGC census count per grade ("9.8" → 12). null = no census on file. */
  censusByGrade?: Partial<Record<LadderGrade, number>> | null;
  now?: Date;
}): PriceLadder {
  const now = (input.now ?? new Date()).getTime();
  const byGrade = new Map<LadderGrade, CompSale[]>();
  for (const c of input.comps) {
    const g = normalizeLadderGrade(c.grade);
    if (!g || !(c.priceUsd > 0)) continue;
    const t = Date.parse(c.soldAt);
    if (!Number.isFinite(t)) continue;
    if (!byGrade.has(g)) byGrade.set(g, []);
    byGrade.get(g)!.push({ grade: g, priceUsd: c.priceUsd, soldAt: c.soldAt });
  }
  for (const list of byGrade.values()) list.sort((a, b) => Date.parse(b.soldAt) - Date.parse(a.soldAt));

  const grades = new Set<LadderGrade>(byGrade.keys());
  for (const [g, v] of Object.entries(input.stored)) {
    const ng = normalizeLadderGrade(g);
    if (ng && v != null && Number(v) > 0) grades.add(ng);
  }

  const census = input.censusByGrade ?? null;
  const rungs: Record<LadderGrade, LadderRung> = {};
  const violations: PriceLadder["violations"] = [];

  for (const g of grades) {
    const sales = byGrade.get(g) ?? [];
    const in12 = sales.filter((s) => now - Date.parse(s.soldAt) <= 365 * DAY);
    const in24 = sales.filter((s) => now - Date.parse(s.soldAt) <= 730 * DAY);
    const storedRaw = input.stored[g] ?? (g === "RAW" ? undefined : input.stored[String(Number(g))]);
    const stored = storedRaw != null && Number(storedRaw) > 0 ? Number(storedRaw) : null;
    const last = sales[0] ? { priceUsd: sales[0].priceUsd, soldAt: sales[0].soldAt } : null;
    const apex = APEX.has(g);

    if (apex && census && (census[g] ?? 0) === 0 && sales.length === 0) continue;

    let rung: LadderRung | null = null;
    const window = in12.length >= LADDER_MARKET_MIN_SALES ? in12 : in24.length >= LADDER_MARKET_MIN_SALES ? in24 : null;
    if (window) {
      const used = window.slice(0, LADDER_RECENT_N);
      rung = {
        grade: g, priceUsd: median(used.map((s) => s.priceUsd)), evidence: "market",
        sales12m: in12.length, sales24m: in24.length, salesUsed: used.length, lastSale: last,
        label: window === in12 ? `${used.length} recent sales` : `${used.length} sales, last 24 months`,
      };
    } else if (in24.length >= 1) {
      const price = apex ? in24[0].priceUsd : (stored ?? in24[0].priceUsd);
      rung = {
        grade: g, priceUsd: price, evidence: "thin",
        sales12m: in12.length, sales24m: in24.length, salesUsed: 0, lastSale: last,
        label: `thin: ${in24.length} sale${in24.length === 1 ? "" : "s"}`,
      };
    } else if (stored !== null && !apex) {
      rung = {
        grade: g, priceUsd: stored, evidence: "estimate",
        sales12m: 0, sales24m: 0, salesUsed: 0, lastSale: last,
        label: last ? `estimate: last sale ${last.soldAt.slice(0, 10)}` : "estimate: no recorded sales",
      };
    } else if (apex && last) {
      rung = {
        grade: g, priceUsd: last.priceUsd, evidence: "thin",
        sales12m: 0, sales24m: 0, salesUsed: 0, lastSale: last,
        label: `thin: last sale ${last.soldAt.slice(0, 10)}`,
      };
    }
    if (rung) rungs[g] = rung;
  }

  // Raw can never exceed the standard 9.8 price.
  const raw = rungs["RAW"];
  const top = rungs["9.8"];
  if (raw && top && raw.priceUsd > top.priceUsd) {
    violations.push({ grade: "RAW", reason: `Raw $${raw.priceUsd} exceeds 9.8 $${top.priceUsd} — data error, fix at source` });
    delete rungs["RAW"];
  }

  return { rungs, violations };
}

/** Flat grade → price map for panels that only need numbers. */
export function ladderPrices(ladder: PriceLadder): Record<LadderGrade, number> {
  return Object.fromEntries(Object.values(ladder.rungs).map((r) => [r.grade, r.priceUsd]));
}
