/**
 * Sniper financial ledger.
 *
 * Venue prices and quoted shipping are inputs, never estimates. Defaults are
 * limited to the platform's documented policy constants and are returned as
 * named line items so the UI cannot hide them inside a single price.
 */
export const SNIPER_FINANCIAL_POLICY = {
  estimatedTaxRate: 0.08,
  sellingFeeRate: 0.1325,
  sellingFixedFee: 5,
  outboundShipping: 5,
} as const;

export type BuyerPremiumPolicy = {
  rate: number;
  minimum: number;
};

export type SniperFinancialInputs = {
  purchasePrice: number;
  shipping: number;
  taxRate?: number | null;
  buyerPremium?: BuyerPremiumPolicy | null;
  gradingCost?: number | null;
  exitPrice: number | null;
  sellingFeeRate?: number | null;
  sellingFixedFee?: number | null;
  outboundShipping?: number | null;
};

export type SniperFinancials = {
  purchasePrice: number;
  buyerPremium: number;
  shipping: number;
  tax: number;
  acquisitionCost: number;
  gradingCost: number;
  capitalAtRisk: number;
  exitPrice: number | null;
  sellingFee: number | null;
  outboundShipping: number | null;
  netSaleProceeds: number | null;
  grossSpread: number | null;
  netProfit: number | null;
  roiPercent: number | null;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

export function buyerPremiumForSource(source: string): BuyerPremiumPolicy {
  switch (source.toLowerCase()) {
    case "comicconnect":
      return { rate: 0.15, minimum: 19 };
    default:
      return { rate: 0, minimum: 0 };
  }
}

export function calculateSniperFinancials(input: SniperFinancialInputs): SniperFinancials {
  const purchasePrice = Math.max(0, Number(input.purchasePrice) || 0);
  const shipping = Math.max(0, Number(input.shipping) || 0);
  const premiumPolicy = input.buyerPremium ?? { rate: 0, minimum: 0 };
  const premiumBase = purchasePrice * Math.max(0, premiumPolicy.rate);
  const buyerPremium = premiumBase > 0 ? Math.max(premiumBase, Math.max(0, premiumPolicy.minimum)) : 0;
  // Existing PP planning policy taxes the purchase price only. Keep that
  // basis explicit; venues that provide an actual tax quote can pass rate 0
  // and add the quoted amount in a future field without changing source data.
  const taxRate = input.taxRate == null ? SNIPER_FINANCIAL_POLICY.estimatedTaxRate : Math.max(0, input.taxRate);
  const tax = round2(purchasePrice * taxRate);
  const acquisitionCost = round2(purchasePrice + buyerPremium + shipping + tax);
  const gradingCost = input.gradingCost == null ? 0 : Math.max(0, Number(input.gradingCost) || 0);
  const capitalAtRisk = round2(acquisitionCost + gradingCost);
  const exitPrice = input.exitPrice != null && Number(input.exitPrice) > 0 ? Number(input.exitPrice) : null;
  if (exitPrice == null) {
    return { purchasePrice, buyerPremium: round2(buyerPremium), shipping, tax, acquisitionCost, gradingCost,
      capitalAtRisk, exitPrice: null, sellingFee: null, outboundShipping: null, netSaleProceeds: null,
      grossSpread: null, netProfit: null, roiPercent: null };
  }
  const sellingFeeRate = input.sellingFeeRate == null ? SNIPER_FINANCIAL_POLICY.sellingFeeRate : Math.max(0, input.sellingFeeRate);
  const sellingFixedFee = input.sellingFixedFee == null ? SNIPER_FINANCIAL_POLICY.sellingFixedFee : Math.max(0, input.sellingFixedFee);
  const outboundShipping = input.outboundShipping == null ? SNIPER_FINANCIAL_POLICY.outboundShipping : Math.max(0, input.outboundShipping);
  const sellingFee = round2(exitPrice * sellingFeeRate + sellingFixedFee);
  const netSaleProceeds = round2(exitPrice - sellingFee - outboundShipping);
  const grossSpread = round2(exitPrice - acquisitionCost);
  const netProfit = round2(netSaleProceeds - capitalAtRisk);
  const roiPercent = capitalAtRisk > 0 ? round2((netProfit / capitalAtRisk) * 100) : null;
  return { purchasePrice, buyerPremium: round2(buyerPremium), shipping, tax, acquisitionCost, gradingCost,
    capitalAtRisk, exitPrice, sellingFee, outboundShipping, netSaleProceeds, grossSpread, netProfit, roiPercent };
}
