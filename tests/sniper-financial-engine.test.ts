import { describe, expect, it } from "vitest";
import {
  allocateBatchCosts,
  buildGradeLadder,
  calculatePressingScenario,
  calculateSniperFinancials,
  certificationExpenseSchedule,
  compareRawAndGraded,
  SELLING_CHANNEL_POLICIES,
} from "@/lib/sniper/financials";

describe("Sniper complete financial engine", () => {
  it("reproduces the four supplied certification-route fixture expenses", () => {
    expect(certificationExpenseSchedule("CBCS_UNSIGNED").total).toBe(100.96);
    expect(certificationExpenseSchedule("CBCS_SIGNED").total).toBe(127.71);
    expect(certificationExpenseSchedule("CGC_UNSIGNED").total).toBe(99.96);
    expect(certificationExpenseSchedule("CGC_SIGNED").total).toBe(132.06);
  });

  it("keeps the supplied $150 arithmetic fixture separate from comic valuations", () => {
    const fixture = (route: "CBCS_UNSIGNED" | "CBCS_SIGNED" | "CGC_UNSIGNED" | "CGC_SIGNED", resale: number) =>
      calculateSniperFinancials({ purchasePrice: 150, shipping: 0, taxRate: 0, gradingCost: certificationExpenseSchedule(route).total, exitPrice: resale, ...SELLING_CHANNEL_POLICIES.EBAY });
    expect(fixture("CBCS_UNSIGNED", 225).netProfit).toBe(-59.71);
    expect(fixture("CBCS_SIGNED", 280).netProfit).toBe(-39.71);
    expect(fixture("CGC_UNSIGNED", 265).netProfit).toBe(-24.71);
    expect(fixture("CGC_SIGNED", 360).netProfit).toBe(23.94);
  });

  it("builds an exact October 6 raw and grade ladder without filling missing grades", () => {
    const row = {
      pp_id: "123",
      snapshot_date: "2026-10-06",
      pp_price_raw: 500,
      pp_price_2_0: 100,
      pp_price_9_8: 600,
      pp_price_10_0: 900,
    } as any;
    const ladder = buildGradeLadder({
      ppSourceId: "123",
      row,
      acquisitionPrice: 240,
      shipping: 0,
      taxRate: 0,
      route: "CGC_UNSIGNED",
      expectedGrade: "9.8",
      targetRoiPercent: 20,
    });
    expect(ladder.scenarios.map((scenario) => scenario.grade)).toEqual(["RAW", "2.0", "9.8", "10.0"]);
    expect(ladder.scenarios.find((scenario) => scenario.grade === "9.8")?.marketValue).toBe(600);
    expect(ladder.scenarios.find((scenario) => scenario.grade === "9.8")?.financials.gradingCost).toBe(99.96);
    expect(ladder.scenarios.some((scenario) => scenario.grade === "9.6")).toBe(false);
  });

  it("calculates raw-versus-graded advantage, pressing outcomes, and reconciled batch allocation", () => {
    const comparison = compareRawAndGraded({ rawMarketValue: 500, gradedMarketValue: 700, acquisitionPrice: 240, shipping: 0, taxRate: 0, certificationAndPreparationExpenses: 100 });
    expect(comparison.raw.netSaleProceeds).toBe(425);
    expect(comparison.graded?.netSaleProceeds).toBe(595);
    expect(comparison.gradingAdvantage).toBe(70);

    const pressing = calculatePressingScenario({ currentGrade: "9.6", improvedGrade: "9.8", currentValue: 300, improvedValue: 600, pressingCost: 30, relatedCosts: 20 });
    expect(pressing.additionalNetResale).toBe(255);
    expect(pressing.incrementalProfit).toBe(205);
    expect(pressing.probabilityWeightedValue).toBeNull();

    const allocations = allocateBatchCosts([{ id: "a", value: 100 }, { id: "b", value: 300 }], 40, "value");
    expect(allocations).toEqual({ a: 10, b: 30 });
    expect(Object.values(allocations).reduce((sum, value) => sum + value, 0)).toBe(40);
  });
});
