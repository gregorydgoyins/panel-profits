import { describe, it, expect } from "vitest";
import { monthlyCandles, rsi14, salesPerDay, dailyLastPoints, priceChangeByDays } from "@/lib/comics/chart-model";
import { buildDisplayCandles } from "@/components/detail/equity/TradingChartPanel";

const t = (d: string) => Date.parse(`${d}T12:00:00Z`);

describe("chart-model", () => {
  it("builds candles only from observed prices", () => {
    const c = monthlyCandles([[t("2026-01-05"), 100], [t("2026-01-20"), 140], [t("2026-01-25"), 90], [t("2026-03-02"), 120]]);
    expect(c.length).toBe(2);
    expect(c[0].slice(1)).toEqual([100, 140, 90, 90]);
    expect(c[1].slice(1)).toEqual([120, 120, 120, 120]);
  });
  it("buildDisplayCandles produces authentic OHLC with zero phantom wicks and no multi-year gap bridging", () => {
    const pts: [number, number][] = [
      [t("2010-08-01"), 4780],
      [t("2025-01-01"), 10500],
      [t("2025-02-01"), 10300],
      [t("2025-03-01"), 10600],
    ];
    const sales = [{ grade: "6.0", priceUsd: 11000, date: "2025-02-15" }];
    const candles = buildDisplayCandles(pts, sales, "6.0");
    expect(candles.length).toBe(4);
    // 2010 isolated comp: exact flat doji, no phantom wick padding
    expect(candles[0].slice(1)).toEqual([4780, 4780, 4780, 4780]);
    // 2025-01 after 15-year gap: opens at 10500 (does NOT bridge from 4780!)
    expect(candles[1].slice(1)).toEqual([10500, 10500, 10500, 10500]);
    // 2025-02 contiguous: opens at 10500, closes at 10300, high reaches real 11000 sale, low is 10300
    expect(candles[2].slice(1)).toEqual([10500, 11000, 10300, 10300]);
    // 2025-03 contiguous: opens at 10300, closes at 10600, zero synthetic wick beyond [10300, 10600]
    expect(candles[3].slice(1)).toEqual([10300, 10600, 10300, 10600]);
  });
  it("priceChangeByDays never reuses a 5-year-old sale as a 30d delta", () => {
    const sparse: [number, number][] = [[t("2005-05-01"), 9488], [t("2010-08-01"), 4780]];
    expect(priceChangeByDays(sparse, 30)).toBeNull();
    expect(priceChangeByDays(sparse, 365)).toBeNull();
    const monthly: [number, number][] = [[t("2026-01-01"), 1000], [t("2026-02-01"), 1100]];
    expect(priceChangeByDays(monthly, 30)).toBeCloseTo(10, 4);
  });
  it("RSI is null until 15 prices exist", () => {
    expect(rsi14([1, 2, 3]).every((v) => v === null)).toBe(true);
    const r = rsi14(Array.from({ length: 20 }, (_, i) => 100 + i));
    expect(r[13]).toBeNull();
    expect(r[14]).toBe(100);
  });
  it("counts sales per day for one grade", () => {
    const p = salesPerDay([{ grade: "9.8", date: "2026-01-01" }, { grade: "9.8", date: "2026-01-01T10:00" }, { grade: "9.6", date: "2026-01-01" }], "9.8");
    expect(p).toEqual([[Date.parse("2026-01-01T00:00:00Z"), 2]]);
  });
  it("keeps last observation per day", () => {
    expect(dailyLastPoints([[t("2026-01-01"), 5], [t("2026-01-01") + 1000, 6]]).length).toBe(1);
  });
});
