import { describe, it, expect } from "vitest";
import { buildPriceLadder } from "./price-ladder";

const now = new Date("2026-11-12T00:00:00Z");
const d = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString();

describe("price ladder headline rule", () => {
  it("uses the median of the most recent ≤10 sales when ≥3 sales in 12 months", () => {
    const comps = [50, 41, 85, 99.99, 59].map((p, i) => ({ grade: "9.8", priceUsd: p, soldAt: d(30 + i * 40) }));
    const l = buildPriceLadder({ stored: { "9.8": 120 }, comps, now });
    expect(l.rungs["9.8"].evidence).toBe("market");
    expect(l.rungs["9.8"].priceUsd).toBe(59);
    expect(l.rungs["9.8"].salesUsed).toBe(5);
  });

  it("keeps the stored price and labels thin when only 1–2 sales in 24 months", () => {
    const comps = [{ grade: "9.4", priceUsd: 52.5, soldAt: d(400) }];
    const l = buildPriceLadder({ stored: { "9.4": 40 }, comps, now });
    expect(l.rungs["9.4"]).toMatchObject({ evidence: "thin", priceUsd: 40, label: "thin: 1 sale" });
    expect(l.rungs["9.4"].lastSale?.priceUsd).toBe(52.5);
  });

  it("falls back to the last sale when thin and no stored price", () => {
    const l = buildPriceLadder({ stored: {}, comps: [{ grade: "9.2", priceUsd: 20, soldAt: d(100) }], now });
    expect(l.rungs["9.2"].priceUsd).toBe(20);
  });

  it("labels stored prices with no sales as estimates and leaves empty grades unpriced", () => {
    const l = buildPriceLadder({ stored: { "6.0": 12 }, comps: [], now });
    expect(l.rungs["6.0"].evidence).toBe("estimate");
    expect(l.rungs["4.0"]).toBeUndefined();
  });

  it("does not smooth a non-monotonic ladder (thin sales, not wrong prices)", () => {
    const l = buildPriceLadder({ stored: { "9.4": 60, "9.6": 45 }, comps: [], now });
    expect(l.rungs["9.4"].priceUsd).toBe(60);
    expect(l.rungs["9.6"].priceUsd).toBe(45);
  });

  it("allows raw above low grades but drops raw above 9.8 as a data error", () => {
    const ok = buildPriceLadder({ stored: { RAW: 30, "4.0": 20, "9.8": 100 }, comps: [], now });
    expect(ok.rungs["RAW"].priceUsd).toBe(30);
    const bad = buildPriceLadder({ stored: { RAW: 150, "9.8": 100 }, comps: [], now });
    expect(bad.rungs["RAW"]).toBeUndefined();
    expect(bad.violations[0].grade).toBe("RAW");
  });

  it("never prices 9.9/10.0 from stored estimates or when census shows zero", () => {
    const l = buildPriceLadder({ stored: { "10.0": 5000 }, comps: [], censusByGrade: { "10.0": 0 }, now });
    expect(l.rungs["10.0"]).toBeUndefined();
  });
});
