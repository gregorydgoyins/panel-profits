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
  marginOfSafetyPct: number;
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

export function calculateCanonicalUnderwriting(input: UnderwritingInput): UnderwritingOutput {
  const {
    pubYear,
    rawAcquisitionCost,
    postGradeTargetFmv,
    achievedGrade,
    operation = "STANDARD_GRADING",
    preScreenCutoffGrade,
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
    const returnShipping = fmv > 1000 ? 55.0 : 25.0;
    const totalBasis = Number((rawAcquisitionCost + reholderFee + invoiceFee + inbound + returnShipping).toFixed(2));

    const venueFee = Number((fmv * 0.1325).toFixed(2));
    const outboundBuyerDelivery = 25.0;
    const netProceeds = Number((fmv - venueFee - outboundBuyerDelivery).toFixed(2));
    const netProfit = Number((netProceeds - totalBasis).toFixed(2));
    const mosPct = totalBasis > 0 ? Number(((netProfit / totalBasis) * 100).toFixed(2)) : 0;

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
      marginOfSafetyPct: mosPct,
      roiPct: mosPct,
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
    if (fmv <= 400) {
      pressingFee = isVintage ? 30.0 : 12.0;
      pressingDescription = isVintage ? "CGC Pressing Vintage ($30.00)" : "CGC Pressing Modern ($12.00)";
    } else if (fmv <= 1000) {
      pressingFee = 70.0;
      pressingDescription = "CGC Pressing High Value ($70.00)";
    } else {
      pressingFee = Number(Math.max(100.0, fmv * 0.04).toFixed(2));
      pressingDescription = `CGC Pressing Unlimited (4% FMV: $${pressingFee.toFixed(2)})`;
    }
  }

  // 4. GRADING TIER DETERMINATION
  let gradingBaseFee = 0.0;
  let gradingTierDescription = "";

  if (isPreScreenRejected) {
    gradingBaseFee = 9.0; // CGC official $9.00 reject fee
    gradingTierDescription = `Pre-Screen Rejected (< ${preScreenCutoffGrade}) · $9.00 Reject Fee (Returned Raw)`;
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
    if (fmv <= 400) {
      gradingBaseFee = isVintage ? 45.0 : 30.0;
      gradingTierDescription = isVintage ? "CGC Vintage Standard ($45.00)" : "CGC Modern Standard ($30.00)";
    } else if (fmv <= 1000) {
      gradingBaseFee = 105.0;
      gradingTierDescription = "CGC High Value ($105.00)";
    } else {
      gradingBaseFee = Number(Math.max(135.0, fmv * 0.04).toFixed(2));
      gradingTierDescription = `CGC Unlimited Value (4% FMV Re-Tiered: $${gradingBaseFee.toFixed(2)})`;
    }
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
  let returnShippingAndInsurance = 25.0;
  if (!isPreScreenRejected) {
    if (fmv > 25000) {
      returnShippingAndInsurance = 250.0;
    } else if (fmv > 10000) {
      returnShippingAndInsurance = 165.0; // $100 courier + $65 transit ins
    } else if (fmv > 5000) {
      returnShippingAndInsurance = 100.0; // $65 courier + $35 transit ins
    } else if (fmv > 1000) {
      returnShippingAndInsurance = 55.0;  // $40 courier + $15 transit ins
    }
  }

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
  const sellingVenueFee = Number((fmv * 0.1325).toFixed(2)); // Standard 13.25% eBay / Auction fee
  const outboundDeliveryFee = 25.0; // Insured tracked shipping to buyer
  const netRealizedProceeds = Number((fmv - sellingVenueFee - outboundDeliveryFee).toFixed(2));
  const netDollarProfit = Number((netRealizedProceeds - totalCapitalizedBasis).toFixed(2));
  const marginOfSafetyPct = totalCapitalizedBasis > 0 
    ? Number(((netDollarProfit / totalCapitalizedBasis) * 100).toFixed(2)) 
    : 0;

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
  } else if (marginOfSafetyPct >= 50.0 && netDollarProfit >= 50.0) {
    // Exceptional margin of safety > 50%
    canonicalVerdict = "SUBMIT_RAW_TO_SLAB";
    equityGuidance = "AGGRESSIVE_BUY";
    guidanceBadgeClass = "bg-emerald-500/25 text-emerald-300 border-emerald-400 ring-1 ring-emerald-400/40 font-black";
    verdictReason = `Apex capital expansion (+${marginOfSafetyPct}% margin, +$${netDollarProfit.toFixed(2)} net realized surplus). Manufacturing spread provides deep asymmetrical cushion.`;
    actionSummary = "Aggressive Buy / Immediate Encasement. Strong upside asymmetry over capitalized basis.";
  } else if (netDollarProfit >= 25.0 && marginOfSafetyPct >= 20.0) {
    // Standard positive submission margin 20% to 50%
    canonicalVerdict = "SUBMIT_RAW_TO_SLAB";
    equityGuidance = "BUY";
    guidanceBadgeClass = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold";
    verdictReason = `Landed capitalized basis of $${totalCapitalizedBasis.toFixed(2)} yields +$${netDollarProfit.toFixed(2)} (+${marginOfSafetyPct}%) net profit after 13.25% commission and outbound shipping.`;
    actionSummary = "Buy Raw & Submit. Favorable risk/reward profile clearing secondary liquidation hurdle.";
  } else if (netDollarProfit >= 0 && marginOfSafetyPct < 20.0) {
    // Low positive margin 0% to 20%
    canonicalVerdict = "HOLD_MARKET_EQUILIBRIUM";
    equityGuidance = "ACCUMULATE";
    guidanceBadgeClass = "bg-cyan-500/20 text-cyan-300 border-cyan-400/40 font-semibold";
    verdictReason = `Moderate positive spread (+${marginOfSafetyPct}% margin, +$${netDollarProfit.toFixed(2)} net). Accumulate with strict discipline at or below current purchase basis.`;
    actionSummary = "Accumulate on dips. Margin of safety is narrow; avoid chasing above basis.";
  } else if (marginOfSafetyPct <= -40.0) {
    // Deep structural deficit below -40% (e.g. low-value moderns with $90+ slabbing cost)
    canonicalVerdict = "BUY_ESTABLISHED_SLAB";
    equityGuidance = "AGGRESSIVE_SELL";
    guidanceBadgeClass = "bg-rose-500/25 text-rose-300 border-rose-400 ring-1 ring-rose-400/40 font-black";
    verdictReason = `Severe capital deficit (net loss of -$${Math.abs(netDollarProfit).toFixed(2)} / ${marginOfSafetyPct}% margin). Raw manufacturing is economically irrational compared to secondary market pricing.`;
    actionSummary = "Aggressive Sell Raw / Buy Slab Direct. Secondary slabs trade at deep discount to manufacturing cost.";
  } else if (netDollarProfit <= -20.0 || marginOfSafetyPct <= -15.0) {
    // Moderate negative margin
    canonicalVerdict = "BUY_ESTABLISHED_SLAB";
    equityGuidance = "TRIM_PROFITS";
    guidanceBadgeClass = "bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold";
    verdictReason = `Raw submission is economically underwater (net loss of -$${Math.abs(netDollarProfit).toFixed(2)} / ${marginOfSafetyPct}% margin). It is cheaper to purchase an established certified slab directly from the secondary market.`;
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
    marginOfSafetyPct,
    roiPct: marginOfSafetyPct,
    canonicalVerdict,
    equityGuidance,
    guidanceBadgeClass,
    verdictReason,
    actionSummary,
  };
}
