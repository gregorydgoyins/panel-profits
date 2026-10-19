import { describe, expect, it } from "vitest";
import { buyerPremiumForSource, calculateSniperFinancials } from "@/lib/sniper/financials";

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
  });
});
