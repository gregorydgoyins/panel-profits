/**
 * lib/signals/comic-signal.ts
 *
 * The one rating for a comic. Every badge on the page reads this; nothing else
 * produces a buy/sell call. Stock-market style 10-stop ladder, or NOT RATED when
 * the evidence is thin.
 *
 * Score = weighted mean of the components that have data (each −1…+1):
 *   value      0.30  raw → CGC slab margin of safety, census-weighted grade outcome (core fees)
 *   momentum   0.25  12-month price change of the rated grade (stored timeline)
 *   trend      0.15  20- vs 50-month moving-average spread
 *   extension  0.15  price vs all-time-high sale (near the high = less upside)
 *   scarcity   0.15  share of CGC census at the rated grade (fewer = scarcer)
 * NOT RATED when the rated grade's price is not market-backed (thin / estimate),
 * or fewer than 3 components have data.
 */
import type { LadderRung } from "@/lib/pricing/price-ladder";

export const SIGNAL_STOPS = [
  "STRONG_BUY",
  "BUY",
  "ACCUMULATE",
  "OUTPERFORM",
  "HOLD",
  "UNDERPERFORM",
  "REDUCE",
  "TRIM",
  "SELL",
  "AGGRESSIVE_SELL",
] as const;
export type SignalStop = (typeof SIGNAL_STOPS)[number];
export type SignalRating = SignalStop | "NOT_RATED";

/** Lower bound of each stop on the −1…+1 score, in ladder order. */
const CUTS: Array<[number, SignalStop]> = [
  [0.6, "STRONG_BUY"],
  [0.4, "BUY"],
  [0.25, "ACCUMULATE"],
  [0.1, "OUTPERFORM"],
  [-0.1, "HOLD"],
  [-0.25, "UNDERPERFORM"],
  [-0.4, "REDUCE"],
  [-0.6, "TRIM"],
  [-0.8, "SELL"],
  [-Infinity, "AGGRESSIVE_SELL"],
];

export interface SignalComponent {
  key: "value" | "momentum" | "trend" | "extension" | "scarcity";
  weight: number;
  score: number; // −1…+1
  detail: string;
}

export interface ComicSignal {
  rating: SignalRating;
  label: string; // "Strong Buy", "Not Rated"
  score: number | null; // −1…+1
  ratedGrade: string | null;
  components: SignalComponent[];
  reason: string;
}

export interface ComicSignalInput {
  /** Grade the rating is about (9.8 when priced, else the highest market-backed grade). */
  rung: LadderRung | null;
  /** Raw → slab margin of safety %, from canonical-underwriting-core. */
  marginOfSafetyPct?: number | null;
  change365dPct?: number | null;
  sma20?: number | null;
  sma50?: number | null;
  athPriceUsd?: number | null;
  censusAtGrade?: number | null;
  censusTotal?: number | null;
}

const clamp = (n: number) => Math.max(-1, Math.min(1, n));

export function signalLabel(r: SignalRating): string {
  return r === "NOT_RATED"
    ? "Not Rated"
    : r.split("_").map((w) => w[0] + w.slice(1).toLowerCase()).join(" ");
}

export function computeComicSignal(input: ComicSignalInput): ComicSignal {
  const rung = input.rung;
  const notRated = (reason: string, components: SignalComponent[] = []): ComicSignal => ({
    rating: "NOT_RATED", label: "Not Rated", score: null, ratedGrade: rung?.grade ?? null, components, reason,
  });
  if (!rung) return notRated("No priced grade.");
  if (rung.evidence !== "market") return notRated(`CGC ${rung.grade}: ${rung.label}. Not enough sales to rate.`);

  const c: SignalComponent[] = [];
  const price = rung.priceUsd;

  if (input.marginOfSafetyPct != null && Number.isFinite(input.marginOfSafetyPct)) {
    c.push({ key: "value", weight: 0.3, score: clamp(input.marginOfSafetyPct / 50),
      detail: `Raw→slab margin of safety, census-weighted ${input.marginOfSafetyPct.toFixed(1)}%` });
  }
  if (input.change365dPct != null && Number.isFinite(input.change365dPct)) {
    c.push({ key: "momentum", weight: 0.25, score: clamp(input.change365dPct / 50),
      detail: `12-month change ${input.change365dPct >= 0 ? "+" : ""}${input.change365dPct.toFixed(1)}%` });
  }
  if (input.sma20 != null && input.sma50 != null && input.sma50 > 0) {
    const spread = ((input.sma20 - input.sma50) / input.sma50) * 100;
    c.push({ key: "trend", weight: 0.15, score: clamp(spread / 20),
      detail: `20/50-month average spread ${spread >= 0 ? "+" : ""}${spread.toFixed(1)}%` });
  }
  if (input.athPriceUsd != null && input.athPriceUsd > 0) {
    const ratio = price / input.athPriceUsd;
    c.push({ key: "extension", weight: 0.15, score: clamp((0.75 - ratio) / 0.5),
      detail: `${(ratio * 100).toFixed(0)}% of all-time-high sale` });
  }
  if (input.censusAtGrade != null && input.censusTotal != null && input.censusTotal > 0) {
    const share = input.censusAtGrade / input.censusTotal;
    c.push({ key: "scarcity", weight: 0.15, score: clamp((0.3 - share) / 0.3),
      detail: `${(share * 100).toFixed(1)}% of CGC census at ${rung.grade}` });
  }

  if (c.length < 3) return notRated(`Only ${c.length} of 5 rating inputs have data.`, c);

  const wSum = c.reduce((s, x) => s + x.weight, 0);
  const score = Number((c.reduce((s, x) => s + x.weight * x.score, 0) / wSum).toFixed(3));
  const rating = CUTS.find(([cut]) => score >= cut)![1];
  const top = [...c].sort((a, b) => Math.abs(b.weight * b.score) - Math.abs(a.weight * a.score)).slice(0, 2);
  return {
    rating,
    label: signalLabel(rating),
    score,
    ratedGrade: rung.grade,
    components: c,
    reason: `CGC ${rung.grade} at $${price.toLocaleString()} (${rung.label}). ${top.map((t) => t.detail).join("; ")}.`,
  };
}

/** The grade to rate: 9.8 when market-backed, else the highest market-backed grade, else 9.8/highest priced. */
export function pickRatedRung(rungs: Record<string, LadderRung>): LadderRung | null {
  const all = Object.values(rungs).filter((r) => r.grade !== "RAW" && r.grade !== "9.9" && r.grade !== "10.0");
  if (rungs["9.8"]?.evidence === "market") return rungs["9.8"];
  const market = all.filter((r) => r.evidence === "market").sort((a, b) => Number(b.grade) - Number(a.grade));
  if (market.length) return market[0];
  return rungs["9.8"] ?? all.sort((a, b) => Number(b.grade) - Number(a.grade))[0] ?? null;
}

/** Tailwind badge classes by stop, so every badge looks the same. */
export function signalBadgeClass(r: SignalRating): string {
  switch (r) {
    case "STRONG_BUY": return "bg-emerald-500/20 text-emerald-300 border-emerald-400";
    case "BUY": return "bg-emerald-500/15 text-emerald-300 border-emerald-500/60";
    case "ACCUMULATE": return "bg-cyan-500/15 text-cyan-300 border-cyan-500/60";
    case "OUTPERFORM": return "bg-sky-500/15 text-sky-300 border-sky-500/60";
    case "HOLD": return "bg-slate-700/40 text-slate-200 border-slate-500";
    case "UNDERPERFORM": return "bg-amber-500/10 text-amber-300 border-amber-500/50";
    case "REDUCE": return "bg-amber-500/20 text-amber-300 border-amber-400";
    case "TRIM": return "bg-orange-500/20 text-orange-300 border-orange-400";
    case "SELL": return "bg-rose-500/20 text-rose-300 border-rose-400";
    case "AGGRESSIVE_SELL": return "bg-rose-600/30 text-rose-200 border-rose-500";
    default: return "bg-slate-800 text-slate-400 border-slate-700";
  }
}
