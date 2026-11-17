/**
 * Grade arbitrage: buy raw, grade with CGC Pre-Screen, sell slabbed.
 *
 * Inputs are all measured: the book's CGC census grade mix, completed-sale medians per grade
 * (last 12 months), and the era benchmark (median 9.8 share and 9.8÷9.6 price multiple of every
 * book in the same era with 2,000+ slabs). Fees come from the canonical CGC / eBay schedule.
 *
 * Assumption made explicit: a raw copy bought today grades like the copies already in the census.
 * The census skews toward copies owners chose to submit, so this is the optimistic case.
 */
import { cgcGradingFee, ebayFinalValueFee, insuredShipping, FEE_SCHEDULE } from "./canonical-underwriting-core";

export interface GradePeer {
  assetId: string;
  title: string;
  total: number;
  share98: number;
  mult98_96: number | null;
  isSelf?: boolean;
}

export interface EraBenchmark {
  era: string;
  books: number;
  medianShare98: number;
  p25Share98: number;
  p75Share98: number;
  medianMult98_96: number | null;
}

export interface GradeArbitrageInput {
  histogram: { grade: string; count: number }[];
  /** Completed-sale medians by grade label ("RAW", "9.8", ...). Only sale-derived prices. */
  salePrices: Record<string, number>;
  publicationYear: number | null;
  era: string | null;
  benchmark: EraBenchmark | null;
  peers: GradePeer[];
  /** Books per box sent to CGC, used to spread insured shipping. */
  batchSize?: number;
}

export interface GradeRow {
  grade: string;
  share: number;
  priceUsd: number;
  priced: "sales" | "interpolated" | "capped";
  netSlabUsd: number; // slab price − eBay fee − grading fee − shipping share
  evUsd: number; // share × net slab
  slab: boolean; // above the pre-screen floor
}

export interface GradeArbitrage {
  rawUsd: number;
  rawNetUsd: number; // raw resale after eBay fee
  share98: number;
  eraMedianShare98: number | null;
  scarcityMultiple: number | null; // era median 9.8 share ÷ this book's 9.8 share
  mult98_96: number | null;
  eraMedianMult98_96: number | null;
  peerRankByMult: number | null; // 1 = highest 9.8 premium among shown peers
  rows: GradeRow[];
  expectedSlabUsd: number; // gross, no floor
  noFloor: { netPerCopy: number; worstCase: number };
  floorGrade: string | null;
  withFloor: { netPerCopy: number; worstCase: number; rejectShare: number };
  breakevenGrade: string | null; // lowest grade where slabbing every copy at that grade breaks even
  shareAtOrAboveBreakeven: number; // share of census copies at or above the breakeven grade
  rawPricedLike: string | null; // slab grade whose price is closest to raw
  fees: { gradingNote: string; preScreenRejectUsd: number; sellRate: number };
  verdict: "STRONG" | "POSITIVE" | "MARGINAL" | "NEGATIVE";
}

const num = (g: string) => (g.toUpperCase() === "RAW" ? -1 : Number(g));

export function computeGradeArbitrage(input: GradeArbitrageInput): GradeArbitrage | null {
  const raw = input.salePrices["RAW"];
  if (!(raw > 0)) return null;
  const year = input.publicationYear ?? 1990;
  const batch = Math.max(1, input.batchSize ?? 10);

  const hist = input.histogram
    .filter((h) => h.count > 0 && Number.isFinite(Number(h.grade)))
    .map((h) => ({ g: Number(h.grade), label: h.grade, n: h.count }));
  const total = hist.reduce((a, h) => a + h.n, 0);
  if (total < 50) return null;

  const priced = Object.entries(input.salePrices)
    .filter(([g, p]) => g !== "RAW" && p > 0 && Number.isFinite(Number(g)))
    .map(([g, p]) => ({ g: Number(g), p }))
    .sort((a, b) => a.g - b.g);
  if (priced.length < 3) return null;

  const priceAt = (g: number): { p: number; how: GradeRow["priced"] } => {
    const exact = priced.find((x) => Math.abs(x.g - g) < 0.01);
    if (exact) return { p: exact.p, how: "sales" };
    if (g > priced[priced.length - 1].g) return { p: priced[priced.length - 1].p, how: "capped" };
    if (g < priced[0].g) return { p: Math.min(priced[0].p, raw), how: "capped" };
    const hiIdx = priced.findIndex((x) => x.g > g);
    const lo = priced[hiIdx - 1], hi = priced[hiIdx];
    const t = (g - lo.g) / (hi.g - lo.g);
    return { p: lo.p + t * (hi.p - lo.p), how: "interpolated" };
  };

  const shipShare = (v: number) => (insuredShipping(v) * 2) / batch;
  const netSlab = (p: number) => p - ebayFinalValueFee(p) - cgcGradingFee(p, year) - shipShare(p);
  const rawNet = raw - ebayFinalValueFee(raw);
  const rejectCost = FEE_SCHEDULE.preScreenRejectFee + shipShare(raw);
  const rejectNet = rawNet - rejectCost;

  const rows: GradeRow[] = hist
    .sort((a, b) => b.g - a.g)
    .map((h) => {
      const { p, how } = priceAt(h.g);
      const share = h.n / total;
      const ns = netSlab(p);
      return { grade: h.label, share, priceUsd: p, priced: how, netSlabUsd: ns, evUsd: share * ns, slab: ns > rejectNet };
    });

  // Pre-screen floor: slab every grade whose net slab beats returning it raw. The floor is the lowest such grade,
  // provided everything above it also clears (prices rise with grade, so this holds in practice).
  let floorGrade: string | null = null;
  for (const r of rows) {
    if (r.slab) floorGrade = r.grade;
    else break;
  }
  const withFloorRows = rows.map((r) => ({ ...r, slab: floorGrade != null && num(r.grade) >= num(floorGrade) }));

  const expectedSlabUsd = rows.reduce((a, r) => a + r.share * r.priceUsd, 0);
  const noFloorNet = rows.reduce((a, r) => a + r.evUsd, 0) - raw;
  const worstNoFloor = Math.min(...rows.map((r) => r.netSlabUsd)) - raw;
  const rejectShare = withFloorRows.filter((r) => !r.slab).reduce((a, r) => a + r.share, 0);
  const floorNet =
    withFloorRows.reduce((a, r) => a + (r.slab ? r.share * r.netSlabUsd : r.share * rejectNet), 0) - raw;
  const worstWithFloor = Math.min(...withFloorRows.map((r) => (r.slab ? r.netSlabUsd : rejectNet))) - raw;

  const ascending = [...rows].sort((a, b) => num(a.grade) - num(b.grade));
  const breakeven = ascending.find((r) => r.netSlabUsd - raw >= 0)?.grade ?? null;
  const rawPricedLike = [...priced].sort((a, b) => Math.abs(a.p - raw) - Math.abs(b.p - raw))[0];

  const n98 = hist.find((h) => Math.abs(h.g - 9.8) < 0.01)?.n ?? 0;
  const share98 = n98 / total;
  const eraMedian = input.benchmark?.medianShare98 ?? null;
  const p98 = input.salePrices["9.8"], p96 = input.salePrices["9.6"];
  const mult = p98 > 0 && p96 > 0 ? p98 / p96 : null;
  const rankedPeers = input.peers.filter((p) => p.mult98_96 != null).sort((a, b) => (b.mult98_96 ?? 0) - (a.mult98_96 ?? 0));
  const selfIdx = rankedPeers.findIndex((p) => p.isSelf);

  const roi = floorNet / raw;
  const verdict: GradeArbitrage["verdict"] =
    floorNet <= 0 ? "NEGATIVE" : roi >= 0.4 ? "STRONG" : roi >= 0.15 ? "POSITIVE" : "MARGINAL";

  return {
    rawUsd: raw,
    rawNetUsd: rawNet,
    share98,
    eraMedianShare98: eraMedian,
    scarcityMultiple: eraMedian != null && share98 > 0 ? eraMedian / share98 : null,
    mult98_96: mult,
    eraMedianMult98_96: input.benchmark?.medianMult98_96 ?? null,
    peerRankByMult: selfIdx >= 0 ? selfIdx + 1 : null,
    rows: withFloorRows,
    expectedSlabUsd,
    noFloor: { netPerCopy: noFloorNet, worstCase: worstNoFloor },
    floorGrade,
    withFloor: { netPerCopy: floorNet, worstCase: worstWithFloor, rejectShare },
    breakevenGrade: breakeven,
    shareAtOrAboveBreakeven: breakeven ? rows.filter((r) => num(r.grade) >= num(breakeven)).reduce((x, r) => x + r.share, 0) : 0,
    rawPricedLike: rawPricedLike ? String(rawPricedLike.g.toFixed(1)) : null,
    fees: {
      gradingNote: `CGC ${year < 1975 ? "Vintage" : "Modern"} tier by graded value ($${FEE_SCHEDULE.cgcGrading.modern}–$${FEE_SCHEDULE.cgcGrading.highValue}, 4% above $1,000), insured shipping shared across ${batch} books`,
      preScreenRejectUsd: rejectCost,
      sellRate: FEE_SCHEDULE.ebay.rate,
    },
    verdict,
  };
}

const usd = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
const pct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`;

/** The three thesis paragraphs (Trading tab) written from the numbers. Markdown-light: **bold** only. */
export function gradeArbitrageThesis(a: GradeArbitrage, title: string, era: string | null) {
  const eraLabel = era ? `${era}-era` : "same-era";
  const scarcity =
    a.eraMedianShare98 != null
      ? `Only **${pct(a.share98)}** of ${title}'s CGC slabs are 9.8, against a **${pct(a.eraMedianShare98)}** median for ${eraLabel} books with 2,000+ slabs` +
        (a.scarcityMultiple != null && a.scarcityMultiple > 1
          ? ` — a 9.8 here is **${a.scarcityMultiple.toFixed(1)}× scarcer** than its era predicts.`
          : a.scarcityMultiple != null
          ? ` — 9.8s here are as common as, or more common than, the era norm.`
          : ".")
      : `**${pct(a.share98)}** of ${title}'s CGC slabs are 9.8. No ${eraLabel} benchmark yet.`;
  const premium =
    a.mult98_96 != null
      ? ` Buyers pay **${a.mult98_96.toFixed(2)}×** the 9.6 price for a 9.8` +
        (a.eraMedianMult98_96 != null ? ` (era median ${a.eraMedianMult98_96.toFixed(2)}×)` : "") +
        (a.peerRankByMult === 1 ? ", the **highest 9.8 premium among its most-graded peers**." : ".") +
        ` The scarcity is real and the market already prices it.`
      : "";

  const economics =
    `A raw copy sells for **${usd(a.rawUsd)}** — about what a CGC ${a.rawPricedLike ?? "low-grade"} slab brings. ` +
    `Graded at the census mix, the expected slab is worth **${usd(a.expectedSlabUsd)}**. After CGC fees, insured shipping and eBay's ${pct(a.fees.sellRate, 2)}, ` +
    `slabbing every copy nets **${usd(a.noFloor.netPerCopy)} per copy** with a worst case of **${usd(a.noFloor.worstCase)}**. ` +
    (a.breakevenGrade ? `Breakeven grade: **${a.breakevenGrade}**.` : `No single grade breaks even.`);

  const strategy =
    a.floorGrade
      ? `Use CGC Pre-Screen with the minimum grade set to **${a.floorGrade}**. Copies below it come back raw for about ${usd(a.fees.preScreenRejectUsd)} and resell at raw. ` +
        `That rejects about **${pct(a.withFloor.rejectShare, 0)}** of copies, keeps every grade worth slabbing, and moves the result to **${usd(a.withFloor.netPerCopy)} per copy** ` +
        `with the worst case capped at **${usd(a.withFloor.worstCase)}**. ` +
        `The risk is selection: the census skews to copies owners chose to submit, so pick copies you can inspect.`
      : `No grade nets more slabbed than returned raw after fees, so grading this book doesn't pay at current prices.`;

  return {
    capitalHurdle: { title: "9.8 Scarcity vs. Its Era", body: scarcity + premium },
    salesConviction: { title: "Raw-to-Slab Economics", body: economics },
    culturalCatalyst: { title: `Pre-Screen Strategy${a.floorGrade ? ` (floor ${a.floorGrade})` : ""}`, body: strategy },
  };
}
