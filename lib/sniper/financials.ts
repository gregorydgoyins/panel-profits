import type { PPGrade, PPPriceRow } from "./pp-grade-benchmarks";

/**
 * Sniper financial ledger.
 *
 * Venue prices and quoted shipping are inputs, never estimates. Defaults are
 * limited to the platform's documented policy constants and are returned as
 * named line items so the UI cannot hide them inside a single price.
 */
export const SNIPER_FINANCIAL_POLICY = {
  estimatedTaxRate: 0.08,
  // Working eBay-style combined selling cost from the supplied analysis.
  // Venue-specific schedules below can override this value.
  sellingFeeRate: 0.15,
  sellingFixedFee: 0,
  outboundShipping: 0,
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

export type CertificationRoute = "CBCS_UNSIGNED" | "CBCS_SIGNED" | "CGC_UNSIGNED" | "CGC_SIGNED";

export type CertificationExpense = {
  route: CertificationRoute;
  baseGrading: number;
  authentication: number;
  invoiceFee: number;
  outboundShipping: number;
  supplies: number;
  returnShippingInsurance: number;
  estimatedTax: number;
  total: number;
  source: string;
};

export type CertificationExpenseOptions = {
  /** The supplied analysis's working schedule is a 1972 vintage fixture. */
  publicationYear?: number;
  estimatedTax?: number;
  overrides?: Partial<Omit<CertificationExpense, "route" | "total" | "source">>;
};

export type SellingChannel = "EBAY" | "AUCTION_HOUSE" | "DIRECT_COLLECTOR" | "LOCAL_DEALER" | "OTHER";

export type SellingChannelPolicy = SniperExitPolicy & { channel: SellingChannel; label: string; assumption: string };

export type GradeScenario = {
  grade: PPGrade | "RAW";
  marketValue: number;
  valueDifferenceFromPrevious: number | null;
  financials: SniperFinancials;
  incrementalNetProfit: number | null;
  breaksEven: boolean | null;
  meetsTargetRoi: boolean | null;
  maximumHammerBidForTargetRoi: number | null;
  maximumAllInCostForTargetRoi: number | null;
};

export type GradeLadder = {
  source: "Panel Profits";
  ppSourceId: string;
  snapshotDate: string;
  scenarios: GradeScenario[];
  minimumProfitableGrade: PPGrade | "RAW" | null;
  minimumTargetGrade: PPGrade | "RAW" | null;
  conservativeGrade: PPGrade | "RAW" | null;
  expectedGrade: PPGrade | "RAW" | null;
  optimisticGrade: PPGrade | "RAW" | null;
  downsideGrade: PPGrade | "RAW" | null;
};

export type RawGradedComparison = {
  raw: SniperFinancials;
  graded: SniperFinancials | null;
  gradingAndPreparationExpenses: number;
  incrementalNetSale: number | null;
  gradingAdvantage: number | null;
};

export type PressingScenario = {
  currentGrade: PPGrade;
  improvedGrade: PPGrade;
  currentValue: number;
  improvedValue: number;
  pressingAndRelatedCosts: number;
  additionalNetResale: number;
  incrementalProfit: number;
  probabilityWeightedValue: number | null;
  probabilityUsed: number | null;
};

export type BatchAllocationMethod = "equal" | "value";

const round2 = (value: number) => Math.round(value * 100) / 100;

const CERTIFICATION_SCHEDULE: Record<CertificationRoute, Omit<CertificationExpense, "route" | "total" | "source" | "estimatedTax"> & { estimatedTax: number }> = {
  CBCS_UNSIGNED: { baseGrading: 45, authentication: 0, invoiceFee: 5, outboundShipping: 15, supplies: 2.5, returnShippingInsurance: 28, estimatedTax: 5.46 },
  CBCS_SIGNED: { baseGrading: 45, authentication: 25, invoiceFee: 5, outboundShipping: 15, supplies: 2.5, returnShippingInsurance: 28, estimatedTax: 7.21 },
  CGC_UNSIGNED: { baseGrading: 45, authentication: 0, invoiceFee: 5, outboundShipping: 14, supplies: 2.5, returnShippingInsurance: 28, estimatedTax: 5.46 },
  CGC_SIGNED: { baseGrading: 45, authentication: 30, invoiceFee: 5, outboundShipping: 14, supplies: 2.5, returnShippingInsurance: 28, estimatedTax: 7.56 },
};

const CERTIFICATION_SOURCE = "Panel Profits working assumption from supplied 1972 vintage-comic analysis";

export function certificationExpenseSchedule(route: CertificationRoute, options: CertificationExpenseOptions = {}): CertificationExpense {
  const schedule = CERTIFICATION_SCHEDULE[route];
  const override = options.overrides ?? {};
  const values = {
    baseGrading: override.baseGrading ?? schedule.baseGrading,
    authentication: override.authentication ?? schedule.authentication,
    invoiceFee: override.invoiceFee ?? schedule.invoiceFee,
    outboundShipping: override.outboundShipping ?? schedule.outboundShipping,
    supplies: override.supplies ?? schedule.supplies,
    returnShippingInsurance: override.returnShippingInsurance ?? schedule.returnShippingInsurance,
    estimatedTax: options.estimatedTax ?? override.estimatedTax ?? schedule.estimatedTax,
  };
  const total = Object.values(values).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  return { route, ...values, total: round2(total), source: `${CERTIFICATION_SOURCE}; publication year ${options.publicationYear ?? 1972}` };
}

export const SELLING_CHANNEL_POLICIES: Record<SellingChannel, SellingChannelPolicy> = {
  EBAY: { channel: "EBAY", label: "eBay", sellingFeeRate: 0.15, sellingFixedFee: 0, outboundShipping: 0, assumption: "15% combined selling-cost working assumption" },
  AUCTION_HOUSE: { channel: "AUCTION_HOUSE", label: "Auction house", sellingFeeRate: 0.15, sellingFixedFee: 0, outboundShipping: 0, assumption: "15% configurable auction-house selling-cost assumption" },
  DIRECT_COLLECTOR: { channel: "DIRECT_COLLECTOR", label: "Direct collector", sellingFeeRate: 0, sellingFixedFee: 0, outboundShipping: 0, assumption: "No platform commission; seller must provide actual payment/shipping costs" },
  LOCAL_DEALER: { channel: "LOCAL_DEALER", label: "Local dealer", sellingFeeRate: 0, sellingFixedFee: 0, outboundShipping: 0, assumption: "Exit value must be supplied; no guaranteed offer is implied" },
  OTHER: { channel: "OTHER", label: "Other", sellingFeeRate: 0.15, sellingFixedFee: 0, outboundShipping: 0, assumption: "15% configurable working assumption" },
};

export type GradeLadderInputs = {
  ppSourceId: string;
  row: PPPriceRow;
  acquisitionPrice: number;
  shipping: number;
  buyerPremium?: BuyerPremiumPolicy | null;
  taxRate?: number | null;
  route?: CertificationRoute;
  certificationExpenses?: Partial<Record<CertificationRoute, number>>;
  preparationCost?: number;
  holdingCost?: number;
  targetRoiPercent?: number;
  sellingChannel?: SellingChannel;
  expectedGrade?: PPGrade | "RAW";
};

function routeCost(inputs: GradeLadderInputs): number {
  if (!inputs.route) return 0;
  return inputs.certificationExpenses?.[inputs.route] ?? certificationExpenseSchedule(inputs.route).total;
}

export function calculateGradeScenario(inputs: Omit<GradeLadderInputs, "row" | "ppSourceId"> & { grade: PPGrade | "RAW"; marketValue: number }): GradeScenario {
  const certificationCost = inputs.grade === "RAW" || !inputs.route ? 0 : inputs.certificationExpenses?.[inputs.route] ?? certificationExpenseSchedule(inputs.route).total;
  const preparationAndHolding = certificationCost + Math.max(0, inputs.preparationCost ?? 0) + Math.max(0, inputs.holdingCost ?? 0);
  const financials = calculateSniperFinancials({
    purchasePrice: inputs.acquisitionPrice,
    shipping: inputs.shipping,
    buyerPremium: inputs.buyerPremium,
    taxRate: inputs.taxRate,
    gradingCost: preparationAndHolding,
    exitPrice: inputs.marketValue,
    ...SELLING_CHANNEL_POLICIES[inputs.sellingChannel ?? "EBAY"],
  });
  const targetRoiPercent = inputs.targetRoiPercent ?? 0;
  const maximumHammerBidForTargetRoi = calculateMaxPurchasePriceForTargetRoi({
    shipping: inputs.shipping,
    taxRate: inputs.taxRate,
    buyerPremium: inputs.buyerPremium,
    gradingCost: preparationAndHolding,
    exitPrice: inputs.marketValue,
    targetRoiPercent,
    ...SELLING_CHANNEL_POLICIES[inputs.sellingChannel ?? "EBAY"],
  });
  const maximumAllInCostForTargetRoi = maximumHammerBidForTargetRoi == null ? null : calculateSniperFinancials({
    purchasePrice: maximumHammerBidForTargetRoi,
    shipping: inputs.shipping,
    taxRate: inputs.taxRate,
    buyerPremium: inputs.buyerPremium,
    gradingCost: preparationAndHolding,
    exitPrice: null,
  }).capitalAtRisk;
  return { grade: inputs.grade, marketValue: round2(inputs.marketValue), valueDifferenceFromPrevious: null, financials, incrementalNetProfit: null, breaksEven: financials.netProfit == null ? null : financials.netProfit >= 0, meetsTargetRoi: financials.roiPercent == null || inputs.targetRoiPercent == null ? null : financials.roiPercent >= inputs.targetRoiPercent, maximumHammerBidForTargetRoi, maximumAllInCostForTargetRoi };
}

export function buildGradeLadder(inputs: GradeLadderInputs): GradeLadder {
  if (inputs.row.pp_id !== inputs.ppSourceId || inputs.row.snapshot_date !== "2026-10-06") {
    return { source: "Panel Profits", ppSourceId: inputs.ppSourceId, snapshotDate: inputs.row.snapshot_date, scenarios: [], minimumProfitableGrade: null, minimumTargetGrade: null, conservativeGrade: null, expectedGrade: inputs.expectedGrade ?? null, optimisticGrade: null, downsideGrade: null };
  }
  const entries: Array<{ grade: PPGrade | "RAW"; key: string }> = [
    { grade: "RAW", key: "pp_price_raw" },
    ...(["2.0", "3.0", "4.0", "5.0", "6.0", "7.0", "8.0", "9.0", "9.2", "9.4", "9.6", "9.8", "10.0"] as PPGrade[]).map((grade) => ({ grade, key: `pp_price_${grade.replace(".", "_")}` })),
  ];
  const scenarios: GradeScenario[] = [];
  for (const entry of entries) {
    const value = Number(inputs.row[entry.key]);
    if (!Number.isFinite(value) || value <= 0) continue;
    const scenario = calculateGradeScenario({ ...inputs, grade: entry.grade, marketValue: value });
    const previous = scenarios[scenarios.length - 1];
    scenario.valueDifferenceFromPrevious = previous ? round2(value - previous.marketValue) : null;
    scenario.incrementalNetProfit = previous && scenario.financials.netProfit != null && previous.financials.netProfit != null
      ? round2(scenario.financials.netProfit - previous.financials.netProfit) : null;
    scenarios.push(scenario);
  }
  const target = inputs.targetRoiPercent ?? 0;
  const firstProfitable = scenarios.find((scenario) => scenario.financials.netProfit != null && scenario.financials.netProfit >= 0)?.grade ?? null;
  const firstTarget = scenarios.find((scenario) => scenario.financials.roiPercent != null && scenario.financials.roiPercent >= target)?.grade ?? null;
  const expectedIndex = entries.findIndex((entry) => entry.grade === (inputs.expectedGrade ?? (inputs.route ? "9.8" : "RAW")));
  const lower = scenarios.filter((scenario) => entries.findIndex((entry) => entry.grade === scenario.grade) < expectedIndex).at(-1)?.grade ?? null;
  const expectedGrade = inputs.expectedGrade ?? null;
  const recordedAtOrBelowExpected = scenarios.filter((scenario) => entries.findIndex((entry) => entry.grade === scenario.grade) <= expectedIndex);
  const downsideGrade = recordedAtOrBelowExpected.at(-2)?.grade ?? lower;
  const optimisticGrade = scenarios.at(-1)?.grade ?? null;
  return { source: "Panel Profits", ppSourceId: inputs.ppSourceId, snapshotDate: inputs.row.snapshot_date, scenarios, minimumProfitableGrade: firstProfitable, minimumTargetGrade: firstTarget, conservativeGrade: lower, expectedGrade, optimisticGrade, downsideGrade };
}

export function compareRawAndGraded(input: {
  rawMarketValue: number;
  gradedMarketValue: number | null;
  acquisitionPrice: number;
  shipping: number;
  buyerPremium?: BuyerPremiumPolicy | null;
  taxRate?: number | null;
  certificationAndPreparationExpenses: number;
  sellingChannel?: SellingChannel;
}): RawGradedComparison {
  const policy = SELLING_CHANNEL_POLICIES[input.sellingChannel ?? "EBAY"];
  const raw = calculateSniperFinancials({ purchasePrice: input.acquisitionPrice, shipping: input.shipping, buyerPremium: input.buyerPremium, taxRate: input.taxRate, gradingCost: 0, exitPrice: input.rawMarketValue, sellingFeeRate: policy.sellingFeeRate, sellingFixedFee: policy.sellingFixedFee, outboundShipping: policy.outboundShipping });
  const graded = input.gradedMarketValue && input.gradedMarketValue > 0
    ? calculateSniperFinancials({ purchasePrice: input.acquisitionPrice, shipping: input.shipping, buyerPremium: input.buyerPremium, taxRate: input.taxRate, gradingCost: input.certificationAndPreparationExpenses, exitPrice: input.gradedMarketValue, sellingFeeRate: policy.sellingFeeRate, sellingFixedFee: policy.sellingFixedFee, outboundShipping: policy.outboundShipping })
    : null;
  const rawNet = raw.netSaleProceeds;
  const gradedNet = graded?.netSaleProceeds ?? null;
  return { raw, graded, gradingAndPreparationExpenses: round2(Math.max(0, input.certificationAndPreparationExpenses)), incrementalNetSale: rawNet != null && gradedNet != null ? round2(gradedNet - rawNet) : null, gradingAdvantage: rawNet != null && gradedNet != null ? round2(gradedNet - input.certificationAndPreparationExpenses - rawNet) : null };
}

export function calculatePressingScenario(input: { currentGrade: PPGrade; improvedGrade: PPGrade; currentValue: number; improvedValue: number; pressingCost: number; relatedCosts?: number; probabilityOfImprovement?: number }): PressingScenario {
  const additionalNetResale = round2(Math.max(0, input.improvedValue - input.currentValue) * (1 - SNIPER_FINANCIAL_POLICY.sellingFeeRate));
  const costs = round2(Math.max(0, input.pressingCost) + Math.max(0, input.relatedCosts ?? 0));
  const incrementalProfit = round2(additionalNetResale - costs);
  const probability = input.probabilityOfImprovement == null ? null : Math.min(1, Math.max(0, input.probabilityOfImprovement));
  return { currentGrade: input.currentGrade, improvedGrade: input.improvedGrade, currentValue: round2(input.currentValue), improvedValue: round2(input.improvedValue), pressingAndRelatedCosts: costs, additionalNetResale, incrementalProfit, probabilityWeightedValue: probability == null ? null : round2(incrementalProfit * probability), probabilityUsed: probability };
}

export function allocateBatchCosts(items: Array<{ id: string; value: number }>, sharedCosts: number, method: BatchAllocationMethod = "equal"): Record<string, number> {
  const total = Math.max(0, Number(sharedCosts) || 0);
  if (!items.length) return {};
  const weights = method === "value" ? items.map((item) => Math.max(0, item.value)) : items.map(() => 1);
  const denominator = weights.reduce((sum, weight) => sum + weight, 0);
  const allocations: Record<string, number> = {};
  let allocated = 0;
  items.forEach((item, index) => {
    const amount = index === items.length - 1 ? round2(total - allocated) : round2(denominator > 0 ? total * weights[index] / denominator : total / items.length);
    allocations[item.id] = amount;
    allocated = round2(allocated + amount);
  });
  return allocations;
}

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
