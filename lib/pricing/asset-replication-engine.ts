/**
 * lib/pricing/asset-replication-engine.ts
 *
 * Institutional Asset Replication Framework for Comic Equities.
 *
 * Adapts traditional equities formulas (ROI, CAGR, NPV, Benjamin Graham Margin of Safety)
 * into a strict, friction-aware 3-Phase Alternative Asset Model:
 *
 * [Phase 1: Capitalized Cost Basis Layer]
 *   Raw Acquisition Price + Sales Tax + Inbound Insured Shipping + Pressing Fee + Grading Fee
 *
 * [Phase 2: Holding & Friction Drag Layer]
 *   Days Untransacted / Holding Horizon + Vault Storage + Opportunity Cost of Capital (r)
 *
 * [Phase 3: Realized Liquidation Layer]
 *   Gross Resale FMV - Marketplace Commission (eBay 13.25%, Heritage 10-20%) - Payment Processing - Outbound Insured Shipping
 */

export interface CapitalizedCostBasisInput {
  rawPurchasePrice: number;
  inboundShipping: number;
  salesTaxPct?: number; // e.g. 7.5 for 7.5%
  pressingFee?: number; // default $15-$25
  gradingFee?: number; // default CGC modern/vintage tier $25-$55
  gradingShippingAndInsurance?: number; // round-trip to CGC/CBCS
}

export interface LiquidationFrictionInput {
  grossRealizedPrice: number;
  venueCommissionPct?: number; // eBay 13.25%, Heritage/ComicLink 10-20%
  paymentProcessingPct?: number; // 2.9% + $0.30 or 0% managed
  outboundInsuredShipping?: number;
}

export interface HoldingHorizonInput {
  holdingPeriodDays: number;
  annualCostOfCapitalPct?: number; // Benchmark hurdle rate / Treasury rate, default 7.5%
  vaultStoragePerYear?: number; // default $0 or nominal
}

export interface AssetReplicationReport {
  // Phase 1
  capitalizedCostBasis: number;
  costBreakdown: {
    rawPrice: number;
    taxes: number;
    inboundShipping: number;
    pressing: number;
    grading: number;
    certificationLogistics: number;
  };

  // Phase 2
  holdingPeriodDays: number;
  holdingPeriodYears: number;
  carryingCostDrag: number;

  // Phase 3
  grossLiquidationPrice: number;
  netRealizedProceeds: number;
  totalMarketFrictionDrag: number;
  effectiveFrictionPct: number;

  // Core Financial Performance Metrics
  netProfitUsd: number;
  roiPct: number; // Return on Capitalized Investment
  annualizedCagrPct: number; // Compound Annual Growth Rate (Geometric)
  npvUsd: number; // Net Present Value discounted at cost of capital
  marginOfSafetyPct: number; // Benjamin Graham discount relative to intrinsic FMV
  breakevenGrossSaleUsd: number; // Minimum gross auction hammer needed to break even after friction
  isProfitable: boolean;
}

/**
 * Calculates total capitalized cost basis (Phase 1).
 */
export function calculateCapitalizedCostBasis(input: CapitalizedCostBasisInput): {
  totalBasis: number;
  breakdown: AssetReplicationReport["costBreakdown"];
} {
  const raw = Math.max(0, input.rawPurchasePrice);
  const tax = raw * ((input.salesTaxPct ?? 0) / 100);
  const shippingIn = Math.max(0, input.inboundShipping);
  const press = Math.max(0, input.pressingFee ?? 0);
  const grade = Math.max(0, input.gradingFee ?? 0);
  const certShipping = Math.max(0, input.gradingShippingAndInsurance ?? 0);

  const totalBasis = Number((raw + tax + shippingIn + press + grade + certShipping).toFixed(2));

  return {
    totalBasis,
    breakdown: {
      rawPrice: Number(raw.toFixed(2)),
      taxes: Number(tax.toFixed(2)),
      inboundShipping: Number(shippingIn.toFixed(2)),
      pressing: Number(press.toFixed(2)),
      grading: Number(grade.toFixed(2)),
      certificationLogistics: Number(certShipping.toFixed(2)),
    },
  };
}

/**
 * Calculates net realized proceeds after marketplace commissions and friction (Phase 3).
 */
export function calculateNetLiquidationProceeds(input: LiquidationFrictionInput): {
  netProceeds: number;
  frictionTotal: number;
  effectiveFrictionPct: number;
} {
  const gross = Math.max(0, input.grossRealizedPrice);
  const commission = gross * ((input.venueCommissionPct ?? 13.25) / 100);
  const processing = gross * ((input.paymentProcessingPct ?? 0) / 100);
  const outboundShip = Math.max(0, input.outboundInsuredShipping ?? 0);

  const frictionTotal = Number((commission + processing + outboundShip).toFixed(2));
  const netProceeds = Number(Math.max(0, gross - frictionTotal).toFixed(2));
  const effectiveFrictionPct = gross > 0 ? Number(((frictionTotal / gross) * 100).toFixed(2)) : 0;

  return {
    netProceeds,
    frictionTotal,
    effectiveFrictionPct,
  };
}

/**
 * Full 3-Phase Asset Replication Model.
 * Computes ROI, CAGR, NPV, Benjamin Graham Margin of Safety, and Breakeven Gross Hammer Price.
 */
export function replicateComicAssetTransaction(
  basisInput: CapitalizedCostBasisInput,
  liquidationInput: LiquidationFrictionInput,
  holdingInput: HoldingHorizonInput,
  intrinsicFmvTarget?: number
): AssetReplicationReport {
  const { totalBasis, breakdown } = calculateCapitalizedCostBasis(basisInput);
  const { netProceeds, frictionTotal, effectiveFrictionPct } = calculateNetLiquidationProceeds(liquidationInput);

  const holdingDays = Math.max(1, holdingInput.holdingPeriodDays);
  const holdingYears = holdingDays / 365.25;
  const costOfCapitalRate = (holdingInput.annualCostOfCapitalPct ?? 7.5) / 100;
  const vaultCosts = (holdingInput.vaultStoragePerYear ?? 0) * holdingYears;

  // Carrying cost drag (Opportunity cost of capital + physical vault/storage)
  const carryingCostDrag = Number((totalBasis * (Math.pow(1 + costOfCapitalRate, holdingYears) - 1) + vaultCosts).toFixed(2));

  // 1. Net Profit
  const netProfitUsd = Number((netProceeds - totalBasis).toFixed(2));

  // 2. Return on Investment (ROI %)
  const roiPct = totalBasis > 0 ? Number(((netProfitUsd / totalBasis) * 100).toFixed(2)) : 0;

  // 3. Compound Annual Growth Rate (CAGR %)
  // CAGR = (Ending Net / Initial Basis) ^ (1 / n) - 1
  let annualizedCagrPct = 0;
  if (totalBasis > 0 && netProceeds > 0) {
    if (holdingYears > 0.05) { // At least ~18 days to prevent extreme annualized skew
      annualizedCagrPct = Number(((Math.pow(netProceeds / totalBasis, 1 / holdingYears) - 1) * 100).toFixed(2));
    } else {
      annualizedCagrPct = roiPct;
    }
  }

  // 4. Net Present Value (NPV)
  // NPV = [Net Realized Proceeds / (1 + r)^n] - Total Capitalized Cost Basis
  const discountFactor = Math.pow(1 + costOfCapitalRate, holdingYears);
  const discountedProceeds = netProceeds / discountFactor;
  const npvUsd = Number((discountedProceeds - totalBasis - vaultCosts).toFixed(2));

  // 5. Benjamin Graham Margin of Safety
  // Standard Graham definition: Margin of Safety = 1 - (Capitalized Cost Basis / Target Value)
  // Evaluated against target gross value (intrinsicFmvTarget ?? liquidationInput.grossRealizedPrice)
  const targetBench = intrinsicFmvTarget && intrinsicFmvTarget > 0 ? intrinsicFmvTarget : liquidationInput.grossRealizedPrice;
  const marginOfSafetyPct =
    targetBench > 0
      ? Number(((1 - totalBasis / targetBench) * 100).toFixed(2))
      : 0;

  // 6. Breakeven Gross Sale Price
  // Solves: Gross - (Gross * CommissionPct) - OutboundShipping = TotalBasis
  const venueRate = (liquidationInput.venueCommissionPct ?? 13.25) / 100;
  const processRate = (liquidationInput.paymentProcessingPct ?? 0) / 100;
  const outboundShip = liquidationInput.outboundInsuredShipping ?? 0;
  const denominator = 1 - (venueRate + processRate);
  const breakevenGrossSaleUsd =
    denominator > 0
      ? Number(((totalBasis + outboundShip) / denominator).toFixed(2))
      : totalBasis;

  return {
    capitalizedCostBasis: totalBasis,
    costBreakdown: breakdown,
    holdingPeriodDays: holdingDays,
    holdingPeriodYears: Number(holdingYears.toFixed(3)),
    carryingCostDrag,
    grossLiquidationPrice: liquidationInput.grossRealizedPrice,
    netRealizedProceeds: netProceeds,
    totalMarketFrictionDrag: frictionTotal,
    effectiveFrictionPct,
    netProfitUsd,
    roiPct,
    annualizedCagrPct,
    npvUsd,
    marginOfSafetyPct,
    breakevenGrossSaleUsd,
    isProfitable: netProfitUsd > 0,
  };
}
