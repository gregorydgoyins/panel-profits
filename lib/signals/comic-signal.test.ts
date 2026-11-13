import { describe, it, expect } from "vitest";
import { computeComicSignal, pickRatedRung, SIGNAL_STOPS } from "./comic-signal";
import type { LadderRung } from "@/lib/pricing/price-ladder";

const rung = (over: Partial<LadderRung> = {}): LadderRung => ({
  grade: "9.8", priceUsd: 100, evidence: "market", sales12m: 6, sales24m: 9, salesUsed: 6,
  lastSale: null, label: "6 recent sales", ...over,
});

describe("comic signal", () => {
  it("has exactly the 10 stops in order", () => {
    expect(SIGNAL_STOPS).toEqual(["STRONG_BUY","BUY","ACCUMULATE","OUTPERFORM","HOLD","UNDERPERFORM","REDUCE","TRIM","SELL","AGGRESSIVE_SELL"]);
  });

  it("is NOT RATED when the rated grade is thin", () => {
    const s = computeComicSignal({ rung: rung({ evidence: "thin", label: "thin: 2 sales" }), marginOfSafetyPct: 40, change365dPct: 20, athPriceUsd: 300 });
    expect(s.rating).toBe("NOT_RATED");
  });

  it("is NOT RATED with fewer than 3 inputs", () => {
    expect(computeComicSignal({ rung: rung(), marginOfSafetyPct: 40 }).rating).toBe("NOT_RATED");
  });

  it("rates strong positives as Strong Buy and strong negatives as Aggressive Sell", () => {
    const up = computeComicSignal({ rung: rung(), marginOfSafetyPct: 60, change365dPct: 60, sma20: 130, sma50: 100, athPriceUsd: 400, censusAtGrade: 5, censusTotal: 500 });
    expect(up.rating).toBe("STRONG_BUY");
    const down = computeComicSignal({ rung: rung(), marginOfSafetyPct: -80, change365dPct: -60, sma20: 70, sma50: 100, athPriceUsd: 100, censusAtGrade: 400, censusTotal: 500 });
    expect(down.rating).toBe("AGGRESSIVE_SELL");
  });

  it("rates mixed evidence as Hold", () => {
    const s = computeComicSignal({ rung: rung(), marginOfSafetyPct: 0, change365dPct: 0, sma20: 100, sma50: 100 });
    expect(s.rating).toBe("HOLD");
  });

  it("prefers a market-backed 9.8, else the highest market-backed grade", () => {
    expect(pickRatedRung({ "9.8": rung({ evidence: "thin" }), "9.6": rung({ grade: "9.6" }), RAW: rung({ grade: "RAW" }) })?.grade).toBe("9.6");
  });
});
