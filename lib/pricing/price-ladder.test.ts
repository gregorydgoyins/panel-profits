import { describe, it, expect } from "vitest";
import { buildPriceLadder, enforceMonotonicLattice, selectCe70QualifyingGrade } from "./price-ladder";

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

  it("uses the 24-month median when <3 sales in 12 months but ≥3 in 24", () => {
    const comps = [85, 50, 41, 99.99, 59].map((p, i) => ({ grade: "9.8", priceUsd: p, soldAt: d(200 + i * 120) }));
    const l = buildPriceLadder({ stored: { "9.8": 117.44 }, comps, now });
    expect(l.rungs["9.8"]).toMatchObject({ evidence: "market", priceUsd: 59, label: "5 sales, last 24 months" });
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

describe("enforceMonotonicLattice", () => {
  it("drops stale unverified 9.4 PriceCharting inversion below verified 9.2 sale (WW #6 regression)", () => {
    const res = enforceMonotonicLattice({
      lattice: { "6.0": 6710, "8.5": 19200, "9.2": 26400, "9.4": 9560.01 },
      saleGrades: new Set(["6.0", "8.5", "9.2"]),
      censusByGrade: { "6.0": 10, "8.5": 5, "9.2": 3, "9.4": 1 },
    });
    expect(res.lattice["9.4"]).toBeUndefined();
    expect(res.lattice["9.2"]).toBe(26400);
    expect(res.dropped.some((d) => d.grade === "9.4")).toBe(true);
  });

  it("drops zero-census phantom 9.2/9.8 guide prices lacking verified sales (WW #1 regression)", () => {
    const res = enforceMonotonicLattice({
      lattice: { "7.0": 63000, "8.0": 120000, "9.2": 140400, "9.8": 388368 },
      saleGrades: new Set(["7.0", "8.0"]),
      censusByGrade: { "7.0": 8, "8.0": 14, "9.2": 0, "9.8": 0 },
    });
    expect(res.lattice["9.2"]).toBeUndefined();
    expect(res.lattice["9.8"]).toBeUndefined();
    expect(res.lattice["8.0"]).toBe(120000);
  });

  it("drops unverified inflated lower guide above a verified higher-grade sale", () => {
    const res = enforceMonotonicLattice({
      lattice: { "4.0": 50000, "4.5": 40800, "7.0": 63000 },
      saleGrades: new Set(["4.5", "7.0"]),
    });
    expect(res.lattice["4.0"]).toBeUndefined();
    expect(res.lattice["4.5"]).toBe(40800);
    expect(res.lattice["7.0"]).toBe(63000);
  });
  it("preserves real verified sales even when vintage thin-market timing causes minor dips", () => {
    const res = enforceMonotonicLattice({
      lattice: { "4.5": 9300, "5.5": 5280, "6.5": 8540, "7.5": 16800, "8.0": 14400, "9.2": 26400, "9.4": 40000 },
      saleGrades: new Set(["4.5", "5.5", "6.5", "7.5", "8.0", "9.2", "9.4"]),
    });
    expect(res.lattice["5.5"]).toBe(5280);
    expect(res.lattice["6.5"]).toBe(8540);
    expect(res.lattice["8.0"]).toBe(14400);
    expect(res.lattice["9.4"]).toBe(40000);
  });
});

describe("selectCe70QualifyingGrade", () => {
  it("picks the highest verified SOLD grade <= $65,000 regardless of numeric grade", () => {
    const pick = selectCe70QualifyingGrade({
      pricedDesc: [
        { grade: "8.0", count: 14 },
        { grade: "7.0", count: 8 },
        { grade: "4.5", count: 15 },
      ],
      lattice: { "8.0": 120000, "7.0": 63000, "4.5": 40800 },
      saleGrades: new Set(["8.0", "7.0", "4.5"]),
    });
    expect(pick).toEqual({ grade: "7.0", priceUsd: 63000 });
  });

  it("skips Double-Cover-only anomaly grades so 9.4 Double Cover stays SOV while 9.2 takes CE70", () => {
    const pick = selectCe70QualifyingGrade({
      pricedDesc: [
        { grade: "9.4", count: 1 },
        { grade: "9.2", count: 3 },
        { grade: "8.5", count: 5 },
      ],
      lattice: { "9.4": 40000, "9.2": 26400, "8.5": 19200 },
      saleGrades: new Set(["9.4", "9.2", "8.5"]),
      excludedGrades: new Set(["9.4"]),
    });
    expect(pick).toEqual({ grade: "9.2", priceUsd: 26400 });
  });

  it("prefers a verified sold grade over an unverified higher guide under $65,000", () => {
    const pick = selectCe70QualifyingGrade({
      pricedDesc: [
        { grade: "7.5", count: 12 },
        { grade: "7.0", count: 8 },
      ],
      lattice: { "7.5": 64000, "7.0": 63000 },
      saleGrades: new Set(["7.0"]),
    });
    expect(pick).toEqual({ grade: "7.0", priceUsd: 63000 });
  });
});
