import { describe, expect, it } from "vitest";
import {
  buyerPremiumForSource,
  calculateMaxPurchasePriceForTargetRoi,
  calculateSniperFinancials,
  calculateTargetExitPrice,
} from "@/lib/sniper/financials";

describe("Sniper financial ledger", () => {
  it("applies the documented auction-house premium minimum", () => {
    expect(buyerPremiumForSource("comicconnect")).toEqual({ rate: 0.15, minimum: 19 });
    expect(calculateSniperFinancials({ purchasePrice: 100, shipping: 15, buyerPremium: buyerPremiumForSource("comicconnect"), exitPrice: 250 })).toMatchObject({
      buyerPremium: 19, tax: 8, acquisitionCost: 142,
    });
  });

  it("keeps grading separate from the venue acquisition ledger and computes net ROI", () => {
    const value = calculateSniperFinancials({ purchasePrice: 18, shipping: 8, gradingCost: 80, exitPrice: 95 });
    expect(value.acquisitionCost).toBe(27.44);
    expect(value.capitalAtRisk).toBe(107.44);
    expect(value.sellingFee).toBe(14.25);
    expect(value.netSaleProceeds).toBe(80.75);
    expect(value.netProfit).toBe(-26.69);
    expect(value.roiPercent).toBe(-24.84);
    expect(value.breakEvenExitPrice).toBe(126.4);
  });

  it("solves return targets from the same fee, tax, shipping, and premium ledger", () => {
    const ledger = calculateSniperFinancials({
      purchasePrice: 100,
      shipping: 15,
      buyerPremium: buyerPremiumForSource("comicconnect"),
      exitPrice: 250,
    });
    expect(calculateTargetExitPrice(ledger.capitalAtRisk, 100)).toBe(334.12);
    expect(calculateMaxPurchasePriceForTargetRoi({
      shipping: 15,
      buyerPremium: buyerPremiumForSource("comicconnect"),
      exitPrice: 250,
      targetRoiPercent: 30,
    })).toBe(119.87);
  });
});
