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

export type SniperExitPolicy = {
  sellingFeeRate: number;
  sellingFixedFee: number;
  outboundShipping: number;
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
  breakEvenExitPrice: number | null;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

export function defaultExitPolicy(): SniperExitPolicy {
  return {
    sellingFeeRate: SNIPER_FINANCIAL_POLICY.sellingFeeRate,
    sellingFixedFee: SNIPER_FINANCIAL_POLICY.sellingFixedFee,
    outboundShipping: SNIPER_FINANCIAL_POLICY.outboundShipping,
  };
}

function normalizedExitPolicy(input: Pick<SniperFinancialInputs, "sellingFeeRate" | "sellingFixedFee" | "outboundShipping">): SniperExitPolicy {
  return {
    sellingFeeRate: input.sellingFeeRate == null ? SNIPER_FINANCIAL_POLICY.sellingFeeRate : Math.max(0, input.sellingFeeRate),
    sellingFixedFee: input.sellingFixedFee == null ? SNIPER_FINANCIAL_POLICY.sellingFixedFee : Math.max(0, input.sellingFixedFee),
    outboundShipping: input.outboundShipping == null ? SNIPER_FINANCIAL_POLICY.outboundShipping : Math.max(0, input.outboundShipping),
  };
}

export function calculateTargetExitPrice(capitalAtRisk: number, targetRoiPercent: number, policy: SniperExitPolicy = defaultExitPolicy()): number | null {
  const capital = Number(capitalAtRisk);
  const roi = Number(targetRoiPercent);
  const rate = Math.min(0.999999, Math.max(0, Number(policy.sellingFeeRate) || 0));
  if (!Number.isFinite(capital) || capital < 0 || !Number.isFinite(roi) || roi < -100) return null;
  return round2((capital * (1 + roi / 100) + Math.max(0, policy.sellingFixedFee) + Math.max(0, policy.outboundShipping)) / (1 - rate));
}

export function calculateNetSaleProceeds(exitPrice: number, policy: SniperExitPolicy = defaultExitPolicy()): number | null {
  const exit = Number(exitPrice);
  if (!Number.isFinite(exit) || exit <= 0) return null;
  return round2(exit - exit * Math.max(0, policy.sellingFeeRate) - Math.max(0, policy.sellingFixedFee) - Math.max(0, policy.outboundShipping));
}

/**
 * Solves the acquisition price ceiling for a required return. This accounts
 * for tax and the venue's percentage/minimum buyer premium rather than using
 * a percentage-of-FMV shortcut.
 */
export function calculateMaxPurchasePriceForTargetRoi(input: Omit<SniperFinancialInputs, "purchasePrice" | "exitPrice"> & { exitPrice: number; targetRoiPercent: number }): number | null {
  const exit = Number(input.exitPrice);
  const target = Number(input.targetRoiPercent);
  if (!Number.isFinite(exit) || exit <= 0 || !Number.isFinite(target) || target < -100) return null;
  const policy = normalizedExitPolicy(input);
  const netProceeds = exit * (1 - policy.sellingFeeRate) - policy.sellingFixedFee - policy.outboundShipping;
  const requiredCapital = netProceeds / (1 + target / 100);
  if (!Number.isFinite(requiredCapital)) return null;

  const taxRate = input.taxRate == null ? SNIPER_FINANCIAL_POLICY.estimatedTaxRate : Math.max(0, Number(input.taxRate) || 0);
  const shipping = Math.max(0, Number(input.shipping) || 0);
  const grading = Math.max(0, Number(input.gradingCost) || 0);
  const premium = input.buyerPremium ?? { rate: 0, minimum: 0 };
  const acquisitionCost = (purchase: number) => purchase + Math.max(purchase * Math.max(0, premium.rate), Math.max(0, premium.minimum)) + purchase * taxRate + shipping + grading;
  if (acquisitionCost(0) > requiredCapital) return 0;
  let low = 0;
  let high = Math.max(requiredCapital, exit);
  for (let i = 0; i < 60; i++) {
    const middle = (low + high) / 2;
    if (acquisitionCost(middle) <= requiredCapital) low = middle;
    else high = middle;
  }
  return round2(low);
}

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
      grossSpread: null, netProfit: null, roiPercent: null, breakEvenExitPrice: null };
  }
  const { sellingFeeRate, sellingFixedFee, outboundShipping } = normalizedExitPolicy(input);
  const sellingFee = round2(exitPrice * sellingFeeRate + sellingFixedFee);
  const netSaleProceeds = round2(exitPrice - sellingFee - outboundShipping);
  const grossSpread = round2(exitPrice - acquisitionCost);
  const netProfit = round2(netSaleProceeds - capitalAtRisk);
  const roiPercent = capitalAtRisk > 0 ? round2((netProfit / capitalAtRisk) * 100) : null;
  const breakEvenExitPrice = calculateTargetExitPrice(capitalAtRisk, 0, { sellingFeeRate, sellingFixedFee, outboundShipping });
  return { purchasePrice, buyerPremium: round2(buyerPremium), shipping, tax, acquisitionCost, gradingCost,
    capitalAtRisk, exitPrice, sellingFee, outboundShipping, netSaleProceeds, grossSpread, netProfit, roiPercent, breakEvenExitPrice };
}
