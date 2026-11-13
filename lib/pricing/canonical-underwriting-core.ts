/**
 * CANONICAL SOVEREIGN UNDERWRITING & COST ENGINE
 * 
 * Strict, dynamic actuarial and line-item financial calculation core.
 * Replaces disconnected and competing formulas across the platform.
 * 
 * Line Items Covered:
 * 1. Era & Year Determination (Modern >= 1975 vs Vintage < 1975)
 * 2. CGC Tier Determination by Final Exit FMV:
 *    - Modern (FMV <= $400): $30
 *    - Vintage (FMV <= $400): $45
 *    - High Value ($401 - $1,000): $105
 *    - Unlimited (> $1,000): 4% FMV (min $135)
 * 3. Cleaning & Pressing Tier:
 *    - NONE: $0
 *    - DIY_SELF (Garage / DIY kit): $0 cash fee, +risk profile
 *    - INDEPENDENT_PRO (Third-party presser): user custom fee (default $15-$20)
 *    - CGC_CCS: Official CGC Pressing ($12 Modern, $30 Vintage, $70 High Value, 4% Unlimited min $100)
 * 4. Signatures & Provenance:
 *    - NONE: $0
 *    - CGC_WITNESSED_SS (Yellow Label): Modern $53, Vintage $70, High Value $140, Unlimited 5% (min $175)
 *    - JSA_AUTHENTICATED (Pre-existing/Unwitnessed signatures): Standard Tier + $30 per signature
 *    - CBCS_VERIFIED (Historical comparison reference)
 * 5. Pre-Screen Filter:
 *    - User sets target cutoff grade (any grade from 0.5 to 9.8)
 *    - If achieved grade < cutoff: $9.00 reject fee charged, book returned raw
 *    - If achieved grade >= cutoff: Full grading tier fee applies
 * 6. Reholder Operation:
 *    - Existing certified slab refreshed: $35.00 standard ($90.00 high value)
 * 7. Freight & Handling:
 *    - CGC Invoice Handling: $5.00
 *    - Inbound Insured Shipping: $25.00 baseline
 *    - Return Insured Shipping & Transit Insurance tiered to exit value
 * 8. Realized Secondary Settlement:
 *    - Standard 13.25% venue clearing fee
 *    - $25.00 insured courier delivery to buyer
 */

export type ComicEraCategory = "Modern" | "Vintage";

export type PressingProvider = 
  | "NONE"
  | "DIY_SELF"
  | "INDEPENDENT_PRO"
  | "CGC_CCS";

export type SignatureAuthMode =
  | "NONE"
  | "CGC_WITNESSED_SS"
  | "JSA_AUTHENTICATED"
  | "CBCS_VERIFIED_HISTORICAL";

export type SubmissionOperation =
  | "STANDARD_GRADING"
  | "PRE_SCREEN"
  | "REHOLDER";

export interface UnderwritingInput {
  pubYear: number;
  rawAcquisitionCost: number;
  postGradeTargetFmv: number;
  achievedGrade: string; // e.g. "9.8", "9.6", "8.0", "RAW"
  operation?: SubmissionOperation;
  preScreenCutoffGrade?: string; // e.g. "9.8", "9.6", "8.0"
  /** Modern Bulk PreScreen (25-book minimum): $5 per reject instead of $9. */
  preScreenBulk?: boolean;
  pressingProvider?: PressingProvider;
  customIndependentPressingFee?: number;
  signatureMode?: SignatureAuthMode;
  signatureCount?: number;
  inboundCourierFreight?: number;
}

export interface LineItemCostBreakdown {
  rawAcquisition: number;
  pressingFee: number;
  pressingDescription: string;
  gradingBaseFee: number;
  gradingTierDescription: string;
  isPreScreenRejected: boolean;
  signatureFee: number;
  signatureDescription: string;
  invoiceHandlingFee: number;
  inboundFreight: number;
  returnShippingAndInsurance: number;
  totalCapitalizedBasis: number;
}

export type CanonicalVerdict =
  | "AGGRESSIVE_BUY"
  | "BUY"
  | "ACCUMULATE"
  | "HOLD"
  | "TRIM_PROFITS"
  | "AGGRESSIVE_SELL"
  | "SUBMIT_RAW_TO_SLAB"
  | "BUY_ESTABLISHED_SLAB"
  | "HOLD_MARKET_EQUILIBRIUM"
  | "REHOLDER_CANDIDATE";

export type EquityGuidance = 
  | "AGGRESSIVE_BUY"
  | "BUY"
  | "ACCUMULATE"
  | "HOLD"
  | "TRIM_PROFITS"
  | "AGGRESSIVE_SELL";

export interface UnderwritingOutput {
  lineItems: LineItemCostBreakdown;
  postGradeFmv: number;
  sellingVenueFee: number; // 13.25%
  outboundDeliveryFee: number; // $25
  netRealizedProceeds: number;
  netDollarProfit: number;
  /** Lowest sale price that returns the full capitalized basis after selling costs. */
  breakevenSalePrice: number;
  /** (expected sale price − breakeven) / expected sale price. */
  marginOfSafetyPct: number;
  /** net profit / capitalized basis. */
  roiPct: number;
  canonicalVerdict: CanonicalVerdict;
  equityGuidance: EquityGuidance;
  guidanceBadgeClass: string;
  verdictReason: string;
  actionSummary: string;
}

// Numerical ranking of canonical grades for threshold comparisons
export const GRADE_RANKS: Record<string, number> = {
  "0.5": 5,
  "1.0": 10,
  "1.5": 15,
  "1.8": 18,
  "2.0": 20,
  "2.5": 25,
  "3.0": 30,
  "3.5": 35,
  "4.0": 40,
  "4.5": 45,
  "5.0": 50,
  "5.5": 55,
  "6.0": 60,
  "6.5": 65,
  "7.0": 70,
  "7.5": 75,
  "8.0": 80,
  "8.5": 85,
  "9.0": 90,
  "9.2": 92,
  "9.4": 94,
  "9.6": 96,
  "9.8": 98,
  "9.9": 99,
  "10.0": 100,
  "RAW": 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// ONE FEE SCHEDULE. Every desk on the page calls these primitives; no other file
// may carry its own grading, pressing, shipping or commission numbers.
// Sources (verified 2026-11-12):
//   CGC grading:  https://www.cgccomics.com/submit/services-fees/cgc-grading/
//   CGC pressing: https://www.cgccomics.com/submit/services-fees/ccs
//   CGC PreScreen: https://www.cgccomics.com/services  ($9 per reject; Modern Bulk PreScreen $5, 25-book min)
//   eBay FVF (Comic Books & Memorabilia): https://www.ebay.com/help/selling-fees/selling/selling-fees?id=4822
// ─────────────────────────────────────────────────────────────────────────────
export const FEE_SCHEDULE = {
  cgcGrading: { modern: 30, vintage: 45, highValue: 105, unlimitedPct: 0.04, unlimitedMin: 135, tierCap: 400, highValueCap: 1000 },
  cgcSignature: { modern: 53, vintage: 70, highValue: 140, unlimitedPct: 0.05, unlimitedMin: 175 },
  cgcPressing: { modern: 12, vintage: 30, highValue: 70, unlimitedPct: 0.04, unlimitedMin: 100 },
  // CGC 2026 price update: ReHolder $35, High Value ReHolder $90
  reholder: { standard: 35, highValue: 90, standardCap: 1000 },
  preScreenRejectFee: 9,
  preScreenBulkRejectFee: 5,
  invoiceHandling: 5,
  ebay: { rate: 0.1325, tierCap: 7500, overRate: 0.0235, perOrderSmall: 0.3, perOrderLarge: 0.4, perOrderBreak: 10 },
} as const;

export function cgcGradingFee(fmv: number, pubYear: number): number {
  const g = FEE_SCHEDULE.cgcGrading;
  if (fmv <= g.tierCap) return pubYear < 1975 ? g.vintage : g.modern;
  if (fmv <= g.highValueCap) return g.highValue;
  return round2(Math.max(g.unlimitedMin, fmv * g.unlimitedPct));
}

export function cgcPressingFee(fmv: number, pubYear: number): number {
  const p = FEE_SCHEDULE.cgcPressing;
  if (fmv <= FEE_SCHEDULE.cgcGrading.tierCap) return pubYear < 1975 ? p.vintage : p.modern;
  if (fmv <= FEE_SCHEDULE.cgcGrading.highValueCap) return p.highValue;
  return round2(Math.max(p.unlimitedMin, fmv * p.unlimitedPct));
}

/** Insured courier + transit insurance, tiered to declared value. Used for return AND outbound legs. */
export function insuredShipping(fmv: number): number {
  if (fmv > 25000) return 250;
  if (fmv > 10000) return 165;
  if (fmv > 5000) return 100;
  if (fmv > 1000) return 55;
  return 25;
}

/** eBay final value fee, Comic Books & Memorabilia: 13.25% to $7,500, 2.35% above, plus per-order fee. */
export function ebayFinalValueFee(salePrice: number): number {
  const e = FEE_SCHEDULE.ebay;
  if (salePrice <= 0) return 0;
  const tiered = Math.min(salePrice, e.tierCap) * e.rate + Math.max(0, salePrice - e.tierCap) * e.overRate;
  const perOrder = salePrice <= e.perOrderBreak ? e.perOrderSmall : e.perOrderLarge;
  return round2(tiered + perOrder);
}

/** Selling fee at `salePrice`: eBay tiered schedule by default, or a flat venue rate (percent) when given. */
export function venueSellingFee(salePrice: number, venueRatePct?: number | null): number {
  if (venueRatePct == null) return ebayFinalValueFee(salePrice);
  return round2(Math.max(0, salePrice) * (venueRatePct / 100));
}

/** Cash in hand after selling a slab at `salePrice`: minus venue fee and insured outbound shipping. */
export function netSaleProceeds(salePrice: number, venueRatePct?: number | null): number {
  return round2(salePrice - venueSellingFee(salePrice, venueRatePct) - insuredShipping(salePrice));
}

/** Lowest sale price whose net proceeds cover `basis`. Monotonic, solved by bisection. */
export function breakevenSalePrice(basis: number, venueRatePct?: number | null): number {
  if (basis <= 0) return 0;
  if (venueRatePct != null && venueRatePct >= 100) return Infinity;
  let lo = 0, hi = Math.max(100, basis * 2);
  while (netSaleProceeds(hi, venueRatePct) < basis) hi *= 2;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (netSaleProceeds(mid, venueRatePct) >= basis) hi = mid; else lo = mid;
  }
  return round2(hi);
}

export interface GradingSubmissionCost {
  grading: number;
  pressing: number;
  invoice: number;
  inbound: number;
  returnShipping: number;
  total: number;
}

/**
 * Cost to send one raw book to CGC and get it back slabbed at `targetFmv`.
 * Grading tier is set by the slab's value; return shipping is insured at slab value.
 */
export function gradingSubmissionCost(
  targetFmv: number,
  pubYear: number,
  opts: { includePressing?: boolean; inboundFreight?: number } = {}
): GradingSubmissionCost {
  const grading = cgcGradingFee(targetFmv, pubYear);
  const pressing = opts.includePressing ? cgcPressingFee(targetFmv, pubYear) : 0;
  const invoice = FEE_SCHEDULE.invoiceHandling;
  const inbound = opts.inboundFreight ?? 25;
  const returnShipping = insuredShipping(targetFmv);
  return { grading, pressing, invoice, inbound, returnShipping, total: round2(grading + pressing + invoice + inbound + returnShipping) };
}

/** Margin of safety: how far the expected sale price sits above breakeven, as a share of that price. */
export function marginOfSafetyPct(expectedSalePrice: number, breakeven: number): number {
  if (expectedSalePrice <= 0) return 0;
  return round2(((expectedSalePrice - breakeven) / expectedSalePrice) * 100);
}

function round2(n: number): number {
  return Number(n.toFixed(2));
}

export function calculateCanonicalUnderwriting(input: UnderwritingInput): UnderwritingOutput {
  const {
    pubYear,
    rawAcquisitionCost,
    postGradeTargetFmv,
    achievedGrade,
    operation = "STANDARD_GRADING",
    preScreenCutoffGrade,
    preScreenBulk = false,
    pressingProvider = "NONE",
    customIndependentPressingFee,
    signatureMode = "NONE",
    signatureCount = 0,
    inboundCourierFreight = 25.0,
  } = input;

  const isVintage = pubYear < 1975;
  const fmv = Math.max(0, postGradeTargetFmv);

  // 1. REHOLDER SHORT-CIRCUIT
  if (operation === "REHOLDER") {
    const isHighValueReholder = fmv > 1000;
    const reholderFee = isHighValueReholder ? 90.0 : 35.0;
    const invoiceFee = 5.0;
    const inbound = inboundCourierFreight;
    const returnShipping = insuredShipping(fmv);
    const totalBasis = Number((rawAcquisitionCost + reholderFee + invoiceFee + inbound + returnShipping).toFixed(2));

    const venueFee = ebayFinalValueFee(fmv);
    const outboundBuyerDelivery = insuredShipping(fmv);
    const netProceeds = Number((fmv - venueFee - outboundBuyerDelivery).toFixed(2));
    const netProfit = Number((netProceeds - totalBasis).toFixed(2));
    const roi = totalBasis > 0 ? Number(((netProfit / totalBasis) * 100).toFixed(2)) : 0;
    const breakeven = breakevenSalePrice(totalBasis);
    const mosPct = marginOfSafetyPct(fmv, breakeven);

    return {
      lineItems: {
        rawAcquisition: rawAcquisitionCost,
        pressingFee: 0,
        pressingDescription: "N/A (Reholder Encapsulation Refresh)",
        gradingBaseFee: reholderFee,
        gradingTierDescription: isHighValueReholder ? "CGC High Value Reholder ($90.00)" : "CGC Standard Reholder ($35.00)",
        isPreScreenRejected: false,
        signatureFee: 0,
        signatureDescription: "Preserved original certification",
        invoiceHandlingFee: invoiceFee,
        inboundFreight: inbound,
        returnShippingAndInsurance: returnShipping,
        totalCapitalizedBasis: totalBasis,
      },
      postGradeFmv: fmv,
      sellingVenueFee: venueFee,
      outboundDeliveryFee: outboundBuyerDelivery,
      netRealizedProceeds: netProceeds,
      netDollarProfit: netProfit,
      breakevenSalePrice: breakeven,
      marginOfSafetyPct: mosPct,
      roiPct: roi,
      canonicalVerdict: "REHOLDER_CANDIDATE",
      equityGuidance: "ACCUMULATE",
      guidanceBadgeClass: "bg-blue-500/20 text-blue-300 border-blue-400/50",
      verdictReason: `Original slab refreshed via official CGC Reholder at $${reholderFee.toFixed(2)}. Case restored with certified grade intact.`,
      actionSummary: "Execute case reholder refresh to capture slab preservation premium.",
    };
  }

  // 2. PRE-SCREEN LOGIC
  let isPreScreenRejected = false;
  if (operation === "PRE_SCREEN" && preScreenCutoffGrade) {
    const targetRank = GRADE_RANKS[preScreenCutoffGrade] ?? 98;
    const achievedRank = GRADE_RANKS[achievedGrade] ?? 0;
    if (achievedRank < targetRank) {
      isPreScreenRejected = true;
    }
  }

  // 3. CLEANING & PRESSING
  let pressingFee = 0.0;
  let pressingDescription = "None (Skipped to preserve paper/foil)";
  if (pressingProvider === "DIY_SELF") {
    pressingFee = 0.0;
    pressingDescription = "DIY / Garage Press ($0 out of pocket; operator skill risk)";
  } else if (pressingProvider === "INDEPENDENT_PRO") {
    pressingFee = customIndependentPressingFee ?? 18.0;
    pressingDescription = `Independent Master Presser ($${pressingFee.toFixed(2)})`;
  } else if (pressingProvider === "CGC_CCS") {
    pressingFee = cgcPressingFee(fmv, pubYear);
    pressingDescription = fmv <= 400
      ? (isVintage ? "CGC Pressing Vintage ($30.00)" : "CGC Pressing Modern ($12.00)")
      : fmv <= 1000
        ? "CGC Pressing High Value ($70.00)"
        : `CGC Pressing Unlimited (4% FMV, $100 min: $${pressingFee.toFixed(2)})`;
  }

  // 4. GRADING TIER DETERMINATION
  let gradingBaseFee = 0.0;
  let gradingTierDescription = "";

  if (isPreScreenRejected) {
    gradingBaseFee = preScreenBulk ? FEE_SCHEDULE.preScreenBulkRejectFee : FEE_SCHEDULE.preScreenRejectFee;
    gradingTierDescription = `PreScreen rejected (< ${preScreenCutoffGrade}) · $${gradingBaseFee.toFixed(2)} reject fee, returned raw`;
  } else if (signatureMode === "CGC_WITNESSED_SS") {
    // CGC Witnessed Signature Series Schedule
    if (fmv <= 400) {
      gradingBaseFee = isVintage ? 70.0 : 53.0;
      gradingTierDescription = isVintage ? "CGC Witnessed SS Vintage ($70.00)" : "CGC Witnessed SS Modern ($53.00)";
    } else if (fmv <= 1000) {
      gradingBaseFee = 140.0;
      gradingTierDescription = "CGC Witnessed SS High Value ($140.00)";
    } else {
      gradingBaseFee = Number(Math.max(175.0, fmv * 0.05).toFixed(2));
      gradingTierDescription = `CGC Witnessed SS Unlimited (5% FMV: $${gradingBaseFee.toFixed(2)})`;
    }
  } else {
    // Standard Universal CGC Tiers
    gradingBaseFee = cgcGradingFee(fmv, pubYear);
    gradingTierDescription = fmv <= 400
      ? (isVintage ? "CGC Vintage ($45.00)" : "CGC Modern ($30.00)")
      : fmv <= 1000
        ? "CGC High Value ($105.00)"
        : `CGC Unlimited Value (4% of final FMV, $135 min: $${gradingBaseFee.toFixed(2)})`;
  }

  // 5. SIGNATURE & JSA AUTHENTICATION
  let signatureFee = 0.0;
  let signatureDescription = "Unsigned / None";
  if (signatureMode === "JSA_AUTHENTICATED") {
    const count = Math.max(1, signatureCount);
    signatureFee = count * 30.0;
    signatureDescription = `CGC x JSA Pre-Existing Autograph Auth (${count} sigs @ $30/ea: $${signatureFee.toFixed(2)})`;
  } else if (signatureMode === "CGC_WITNESSED_SS") {
    signatureFee = 0.0; // Bundled inside the Signature Series grading tier base fee
    signatureDescription = `Witnessed In-Person Yellow Label (${signatureCount || 1} sigs)`;
  } else if (signatureMode === "CBCS_VERIFIED_HISTORICAL") {
    signatureFee = 0.0;
    signatureDescription = "CBCS Verified Signature (Historical Non-CGC Standard)";
  }

  // 6. FREIGHT, INVOICING & VALUE-TIERED TRANSIT INSURANCE
  const invoiceHandlingFee = 5.0;
  const inboundFreight = inboundCourierFreight;

  // Return freight & transit insurance scaled to exit slab value
  // A rejected PreScreen book comes back raw, insured at its raw value.
  const returnShippingAndInsurance = insuredShipping(isPreScreenRejected ? rawAcquisitionCost : fmv);

  const totalCapitalizedBasis = Number(
    (
      rawAcquisitionCost +
      pressingFee +
      gradingBaseFee +
      signatureFee +
      invoiceHandlingFee +
      inboundFreight +
      returnShippingAndInsurance
    ).toFixed(2)
  );

  // 7. REALIZED EXIT SETTLEMENT
  // A rejected book is sold raw at its acquisition value; a graded book at its post-grade FMV.
  const exitPrice = isPreScreenRejected ? rawAcquisitionCost : fmv;
  const sellingVenueFee = ebayFinalValueFee(exitPrice);
  const outboundDeliveryFee = insuredShipping(exitPrice);
  const netRealizedProceeds = Number((exitPrice - sellingVenueFee - outboundDeliveryFee).toFixed(2));
  const netDollarProfit = Number((netRealizedProceeds - totalCapitalizedBasis).toFixed(2));
  const roiPct = totalCapitalizedBasis > 0
    ? Number(((netDollarProfit / totalCapitalizedBasis) * 100).toFixed(2))
    : 0;
  const breakevenSale = breakevenSalePrice(totalCapitalizedBasis);
  const mosPct = marginOfSafetyPct(exitPrice, breakevenSale);

  // 8. SOVEREIGN CANONICAL VERDICT & FINANCIAL GUIDANCE (STOCK & OPTIONS STANDARD)
  let canonicalVerdict: CanonicalVerdict = "HOLD_MARKET_EQUILIBRIUM";
  let equityGuidance: EquityGuidance = "HOLD";
  let guidanceBadgeClass = "bg-slate-800 text-slate-300 border-slate-700";
  let verdictReason = "";
  let actionSummary = "";

  if (isPreScreenRejected) {
    canonicalVerdict = "HOLD_MARKET_EQUILIBRIUM";
    equityGuidance = "HOLD";
    guidanceBadgeClass = "bg-amber-500/20 text-amber-300 border-amber-400/50";
    verdictReason = `Failed pre-screen hurdle (< ${preScreenCutoffGrade}). $9.00 reject fee incurred; book returned raw to avoid full encapsulation loss.`;
    actionSummary = "Hold unslabbed. Pre-screen reject safeguards capital basis against negative grading spread.";
  } else if (roiPct >= 50.0 && netDollarProfit >= 50.0) {
    // Exceptional margin of safety > 50%
    canonicalVerdict = "SUBMIT_RAW_TO_SLAB";
    equityGuidance = "AGGRESSIVE_BUY";
    guidanceBadgeClass = "bg-emerald-500/25 text-emerald-300 border-emerald-400 ring-1 ring-emerald-400/40 font-black";
    verdictReason = `Apex capital expansion (+${roiPct}% margin, +$${netDollarProfit.toFixed(2)} net realized surplus). Manufacturing spread provides deep asymmetrical cushion.`;
    actionSummary = "Aggressive Buy / Immediate Encasement. Strong upside asymmetry over capitalized basis.";
  } else if (netDollarProfit >= 25.0 && roiPct >= 20.0) {
    // Standard positive submission margin 20% to 50%
    canonicalVerdict = "SUBMIT_RAW_TO_SLAB";
    equityGuidance = "BUY";
    guidanceBadgeClass = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold";
    verdictReason = `Landed capitalized basis of $${totalCapitalizedBasis.toFixed(2)} yields +$${netDollarProfit.toFixed(2)} (+${roiPct}%) net profit after 13.25% commission and outbound shipping.`;
    actionSummary = "Buy Raw & Submit. Favorable risk/reward profile clearing secondary liquidation hurdle.";
  } else if (netDollarProfit >= 0 && roiPct < 20.0) {
    // Low positive margin 0% to 20%
    canonicalVerdict = "HOLD_MARKET_EQUILIBRIUM";
    equityGuidance = "ACCUMULATE";
    guidanceBadgeClass = "bg-cyan-500/20 text-cyan-300 border-cyan-400/40 font-semibold";
    verdictReason = `Moderate positive spread (+${roiPct}% margin, +$${netDollarProfit.toFixed(2)} net). Accumulate with strict discipline at or below current purchase basis.`;
    actionSummary = "Accumulate on dips. Margin of safety is narrow; avoid chasing above basis.";
  } else if (roiPct <= -40.0) {
    // Deep structural deficit below -40% (e.g. low-value moderns with $90+ slabbing cost)
    canonicalVerdict = "BUY_ESTABLISHED_SLAB";
    equityGuidance = "AGGRESSIVE_SELL";
    guidanceBadgeClass = "bg-rose-500/25 text-rose-300 border-rose-400 ring-1 ring-rose-400/40 font-black";
    verdictReason = `Severe capital deficit (net loss of -$${Math.abs(netDollarProfit).toFixed(2)} / ${roiPct}% margin). Raw manufacturing is economically irrational compared to secondary market pricing.`;
    actionSummary = "Aggressive Sell Raw / Buy Slab Direct. Secondary slabs trade at deep discount to manufacturing cost.";
  } else if (netDollarProfit <= -20.0 || roiPct <= -15.0) {
    // Moderate negative margin
    canonicalVerdict = "BUY_ESTABLISHED_SLAB";
    equityGuidance = "TRIM_PROFITS";
    guidanceBadgeClass = "bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold";
    verdictReason = `Raw submission is economically underwater (net loss of -$${Math.abs(netDollarProfit).toFixed(2)} / ${roiPct}% margin). It is cheaper to purchase an established certified slab directly from the secondary market.`;
    actionSummary = "Trim holdings / Avoid raw submission. Secondary market offers cheaper entry without slabbing friction.";
  } else {
    // Equilibrium between -15% and 0%
    canonicalVerdict = "HOLD_MARKET_EQUILIBRIUM";
    equityGuidance = "HOLD";
    guidanceBadgeClass = "bg-slate-800 text-slate-300 border-slate-700";
    verdictReason = `Spread sits in equilibrium ($${netDollarProfit >= 0 ? "+" : ""}${netDollarProfit.toFixed(2)} net delta). Neither raw submission nor immediate liquidation provides asymmetrical alpha.`;
    actionSummary = "Hold position. Asset is fairly valued relative to operational slabbing drag.";
  }

  return {
    lineItems: {
      rawAcquisition: rawAcquisitionCost,
      pressingFee,
      pressingDescription,
      gradingBaseFee,
      gradingTierDescription,
      isPreScreenRejected,
      signatureFee,
      signatureDescription,
      invoiceHandlingFee,
      inboundFreight,
      returnShippingAndInsurance,
      totalCapitalizedBasis,
    },
    postGradeFmv: fmv,
    sellingVenueFee,
    outboundDeliveryFee,
    netRealizedProceeds,
    netDollarProfit,
    breakevenSalePrice: breakevenSale,
    marginOfSafetyPct: mosPct,
    roiPct,
    canonicalVerdict,
    equityGuidance,
    guidanceBadgeClass,
    verdictReason,
    actionSummary,
  };
}
