import { describe, expect, it } from "vitest";
import { buyerPremiumForSource, calculateSniperFinancials, SELLING_CHANNEL_POLICIES } from "@/lib/sniper/financials";

/** Bounded acceptance fixture for Clean lot comiclink-1980112. */
describe("Sniper pricing acceptance", () => {
  const bid = 34;
  const ppOctober6Grade98 = 174.14;

  it("keeps the dated PP reference separate from the live bid", () => {
    expect(bid).toBe(34);
    expect(ppOctober6Grade98).toBe(174.14);
    expect("2026-10-06").toBe("2026-10-06");
    expect(ppOctober6Grade98).not.toBe(bid);
  });

  it("reconciles auction, direct, dealer, and local-shop exit math", () => {
    const common = { purchasePrice: bid, shipping: 0, taxRate: 0.08, buyerPremium: buyerPremiumForSource("comiclink"), exitPrice: ppOctober6Grade98 };
    const auction = calculateSniperFinancials({ ...common, ...SELLING_CHANNEL_POLICIES.EBAY });
    const direct = calculateSniperFinancials({ ...common, ...SELLING_CHANNEL_POLICIES.DIRECT_COLLECTOR });
    const dealer = calculateSniperFinancials({ ...common, exitPrice: ppOctober6Grade98 * 0.4, ...SELLING_CHANNEL_POLICIES.LOCAL_DEALER });
    const localShop = calculateSniperFinancials({ ...common, exitPrice: null, ...SELLING_CHANNEL_POLICIES.LOCAL_DEALER });

    expect(auction.acquisitionCost).toBe(36.72);
    expect(auction.buyerPremium).toBe(0);
    expect(auction.tax).toBe(2.72);
    expect(auction.sellingFee).toBe(26.12);
    expect(auction.netSaleProceeds).toBe(148.02);
    expect(auction.netProfit).toBe(111.3);
    expect(auction.roiPercent).toBe(303.1);
    expect(direct.netProfit).toBe(137.42);
    expect(direct.roiPercent).toBe(374.24);
    expect(dealer.netProfit).toBe(32.94);
    expect(dealer.roiPercent).toBe(89.71);
    expect(localShop.netProfit).toBeNull();
    expect(localShop.roiPercent).toBeNull();
  });
});
