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
    expect(value.sellingFee).toBe(17.59);
    expect(value.netSaleProceeds).toBe(72.41);
    expect(value.netProfit).toBe(-35.03);
    expect(value.roiPercent).toBe(-32.6);
    expect(value.breakEvenExitPrice).toBe(135.38);
  });

  it("solves return targets from the same fee, tax, shipping, and premium ledger", () => {
    const ledger = calculateSniperFinancials({
      purchasePrice: 100,
      shipping: 15,
      buyerPremium: buyerPremiumForSource("comicconnect"),
      exitPrice: 250,
    });
    expect(calculateTargetExitPrice(ledger.capitalAtRisk, 100)).toBe(338.9);
    expect(calculateMaxPurchasePriceForTargetRoi({
      shipping: 15,
      buyerPremium: buyerPremiumForSource("comicconnect"),
      exitPrice: 250,
      targetRoiPercent: 30,
    })).toBe(115.87);
  });
});
