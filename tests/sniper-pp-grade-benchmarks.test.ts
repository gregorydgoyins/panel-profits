import { describe, expect, it } from "vitest";
import { resolvePPGradeBenchmark } from "../lib/sniper/pp-grade-benchmarks";

describe("PP grade benchmark translator", () => {
  const direct = { pp_id: "2421145", snapshot_date: "2026-10-06", pp_price_raw: "7.50", pp_price_9_8: "105.00", pp_price_10_0: "137.00" };
  it("reads the exact PP edition and grade without calculation", () => {
    expect(resolvePPGradeBenchmark(direct, "2421145", "9.8")).toEqual({
      ppSourceId: "2421145", snapshotDate: "2026-10-06", grade: "9.8", price: 105, source: "Panel Profits",
    });
    expect(resolvePPGradeBenchmark(direct, "2421145", "RAW")?.price).toBe(7.5);
  });
  it("rejects cross-edition prices and missing grade data", () => {
    expect(resolvePPGradeBenchmark(direct, "3684274", "9.8")).toBeUndefined();
    expect(resolvePPGradeBenchmark(direct, "2421145", "9.6")).toBeUndefined();
  });
  it("rejects missing, invalid or zero prices", () => {
    expect(resolvePPGradeBenchmark({ ...direct, pp_price_9_8: 0 }, "2421145", "9.8")).toBeUndefined();
    expect(resolvePPGradeBenchmark({ ...direct, snapshot_date: "unknown" }, "2421145", "9.8")).toBeUndefined();
  });
});
