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
      // When a verified sale cleared within the last 12 months and diverges sharply (>35%) from a stale
      // stored estimate (e.g., vintage 3.0 clearing at $5,000 vs an outdated 2019 $1,920 guide), trust the verified sale.
      const recent12Sale = in12[0]?.priceUsd ?? null;
      const storedIsStaleDivergent =
        recent12Sale != null &&
        stored != null &&
        Math.abs(recent12Sale - stored) / Math.max(stored, 1) > 0.35;
      const price = apex
        ? in24[0].priceUsd
        : storedIsStaleDivergent
        ? recent12Sale!
        : (stored ?? in24[0].priceUsd);
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
    } else if (last) {
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

/**
 * Enforces strict grade-ladder monotonicity and CGC census existence on a merged
 * display lattice (after PriceCharting API & completed-sale overrides merge).
 *
 * Rules:
 *  1. High grades (≥ 9.0) with 0 CGC Universal census copies and no verified sales
 *     are dropped (prevents phantom 9.2/9.6/9.8 guide prices).
 *  2. Higher numeric grades can NEVER display a lower price than a lower numeric grade:
 *     - Unverified guide/API higher grade below a lower grade → drop the higher grade.
 *     - Unverified guide/API lower grade above a verified higher-grade sale → drop the lower grade.
 *     - Same-evidence inversion (e.g. stale/double-cover 9.4 below recent 9.2) → drop the higher grade.
 *  3. RAW can never exceed the highest valid graded price.
 */
export function enforceMonotonicLattice(input: {
  lattice: Record<string, number | undefined>;
  saleGrades?: ReadonlySet<string>;
  censusByGrade?: Partial<Record<string, number>> | null;
}): {
  lattice: Record<string, number | undefined>;
  dropped: Array<{ grade: string; reason: string }>;
} {
  const saleGrades = input.saleGrades ?? new Set<string>();
  const census = input.censusByGrade ?? null;
  const dropped: Array<{ grade: string; reason: string }> = [];
  const next: Record<string, number | undefined> = {};

  for (const [g, v] of Object.entries(input.lattice)) {
    if (v != null && Number.isFinite(Number(v)) && Number(v) > 0) {
      next[g] = Number(v);
    }
  }

  // 1. Strip zero-census phantom high grades (≥ 9.0) that lack verified sales
  if (census) {
    for (const g of Object.keys(next)) {
      if (!/^\d+(\.\d+)?$/.test(g)) continue;
      const num = parseFloat(g);
      if (num >= 9.0 && (census[g] ?? 0) === 0 && !saleGrades.has(g)) {
        dropped.push({ grade: g, reason: `Zero CGC Universal copies at ${g} and no verified sales` });
        delete next[g];
      }
    }
  }

  // 2. Enforce strict non-decreasing prices from lowest numeric grade to highest
  const numericAsc = Object.keys(next)
    .filter((g) => /^\d+(\.\d+)?$/.test(g))
    .sort((a, b) => parseFloat(a) - parseFloat(b));

  // Pass A: If an unverified lower grade sits above a verified higher-grade sale, drop the inflated lower guide
  for (let i = 0; i < numericAsc.length; i++) {
    const low = numericAsc[i];
    const lowPrice = next[low];
    if (lowPrice == null || saleGrades.has(low)) continue;
    const higherVerifiedBelow = numericAsc
      .slice(i + 1)
      .find((hi) => saleGrades.has(hi) && next[hi] != null && (next[hi] as number) < lowPrice);
    if (higherVerifiedBelow) {
      dropped.push({
        grade: low,
        reason: `Unverified guide ${low} ($${lowPrice}) exceeds verified ${higherVerifiedBelow} sale ($${next[higherVerifiedBelow]})`,
      });
      delete next[low];
    }
  }

  // Pass B: Walk ascending; any UNVERIFIED higher grade priced strictly below a surviving
  // lower grade is a stale/inverted guide error and is dropped. Real verified completed sales
  // are never erased (thin vintage markets can legitimately show e.g. a 2025 4.5 above a 2022 5.0).
  let maxLowerGrade: string | null = null;
  let maxLowerPrice = 0;
  for (const g of numericAsc) {
    const price = next[g];
    if (price == null) continue;
    if (maxLowerGrade != null && price < maxLowerPrice && !saleGrades.has(g)) {
      dropped.push({
        grade: g,
        reason: `Inverted unverified grade ${g} ($${price}) sits below ${maxLowerGrade} ($${maxLowerPrice}) — quarantined`,
      });
      delete next[g];
      continue;
    }
    if (price > maxLowerPrice) {
      maxLowerGrade = g;
      maxLowerPrice = price;
    }
  }

  // 3. RAW can never exceed the highest surviving graded price
  const rawPrice = next["RAW"];
  if (rawPrice != null && maxLowerPrice > 0 && rawPrice > maxLowerPrice) {
    dropped.push({
      grade: "RAW",
      reason: `RAW ($${rawPrice}) exceeds apex graded price ($${maxLowerPrice}) — quarantined`,
    });
    delete next["RAW"];
  }

  return { lattice: next, dropped };
}

/**
 * CE70 Constitutional Qualifying Grade Selector:
 * Always selects the highest standard verified SOLD grade <= capUsd ($65,000) — regardless of
 * numeric grade (no arbitrary 9.0+ floor for Golden/Platinum Age grails). Excludes structural
 * anomaly-only grades (e.g. Double Cover-only 9.4) when selecting the standard CE70 benchmark.
 * Falls back to the highest populated priced grade <= capUsd only if no completed sales exist under the cap.
 */
export function selectCe70QualifyingGrade(input: {
  pricedDesc: Array<{ grade: string; count: number }>;
  lattice: Record<string, number | undefined>;
  saleGrades: ReadonlySet<string>;
  excludedGrades?: ReadonlySet<string>;
  capUsd?: number;
}): { grade: string; priceUsd: number } | null {
  const cap = input.capUsd ?? 65_000;
  const excluded = input.excludedGrades ?? new Set<string>();
  const eligible = (r: { grade: string }) =>
    !excluded.has(r.grade) && input.lattice[r.grade] != null && Number(input.lattice[r.grade]) <= cap;
  const soldHit = input.pricedDesc.find((r) => input.saleGrades.has(r.grade) && eligible(r));
  const hit = soldHit ?? input.pricedDesc.find(eligible);
  if (!hit || input.lattice[hit.grade] == null) return null;
  return { grade: hit.grade, priceUsd: Number(input.lattice[hit.grade]) };
}
