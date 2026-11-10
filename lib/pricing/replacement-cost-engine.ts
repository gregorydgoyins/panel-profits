/**
 * Replacement Cost, Pressing Asymmetry, Scarcity & Box Discovery Calculation Engine
 * 
 * Provides verified mathematical ground truth for:
 * 1. Raw Acquisition + Inbound Freight & Insurance
 * 2. Pressing Profiles & Skill Asymmetry:
 *    - DIY ($0): Novice (high risk, low bump) vs Seasoned (+0.2 bump)
 *    - Private Master ($15-$25): Professional grade bump (+0.2 to +0.4)
 *    - CGC / CCS Factory ($15-$30): Standard turnaround queue
 * 3. Freight / Outbound Logistics:
 *    - USPS Priority Medium Flat Rate ($18.40) pro-rated by batch size (default: 2 books = $9.20/book)
 * 4. Grading Tiers:
 *    - Modern (post-1975, <=$400 FMV): $25
 *    - Pre-1975 Vintage (<=$400 FMV): $40
 *    - High Value (> $1,000 FMV): 3% FMV fee rule
 *    - Reholder / Cracked Case: $15
 * 5. Signatures & Forensic Authentication:
 *    - Universal Blue Label: $0
 *    - CGC Witnessed Signature Series: +$15 witness fee
 *    - JSA / CBCS Verified Forensic Authentication: +$25 first sig, +$15 each additional sig
 * 6. Scarcity & Wild Box Appearance Odds:
 *    - Short box (~150-200 raw comics)
 *    - Long box (~300-400 raw comics)
 *    - Graded slab vault (~30-50 slabs)
 */

export type PressingType = "NONE" | "DIY_NOVICE" | "DIY_SEASONED" | "PRIVATE_MASTER" | "CGC_CCS";

export type GradingTierSelection = "AUTO" | "MODERN" | "VINTAGE_PRE1975" | "HIGH_VALUE_3PCT" | "REHOLDER";

export type SignatureAuthType = "NONE" | "CGC_WITNESSED" | "JSA_CBCS_VERIFIED";

export interface ReplacementCostConfig {
  rawAcquisition: number;
  inboundShipping: number;
  transitInsurance: number;
  pressingType: PressingType;
  customPressingFee?: number;
  gradingTier: GradingTierSelection;
  pubYear?: number;
  targetFmv: number;
  shippingRoundTripBatchShare: number; // e.g. $9.20
  signatureAuth: SignatureAuthType;
  signatureCount: number;
  preScreenCutoff: "OFF" | "9.6" | "9.8";
  // Float & Scarcity Inputs
  printRunTotal?: number | null;
  rawCopiesEstimated?: number | null;
  totalCensusSlabs?: number | null;
  census98Count?: number | null;
}

export interface CalculatedReplacementHurdle {
  rawAcquisitionLanded: number;
  pressingFee: number;
  pressingBumpPotential: number; // e.g. +0.2 grades
  pressingDamageRiskPct: number; // e.g. 15% risk of slip
  gradingFee: number;
  gradingTierName: string;
  signatureFee: number;
  freightOverhead: number;
  totalFixedEncapsulationOverhead: number;
  totalLandedReplacementCost: number; // Hurdle = Raw Landed + Overhead
  preScreenRejectCost: number; // $9.00 fee + freight
  
  // Wild Box Discovery Probabilities
  boxOdds: {
    shortBoxOdds: string; // e.g. "1 in 42 boxes"
    shortBoxNumeric: number; // 42
    longBoxOdds: string; // e.g. "1 in 21 boxes"
    longBoxNumeric: number;
    slabVaultOdds: string; // e.g. "1 in 115 slabs"
    slabVaultNumeric: number;
    scarcityRating: "MASS_FLOAT" | "ACCESSIBLE_SPEC" | "RESTRICTED_FLOAT" | "HYPER_SCARCE_VAULT";
    scarcityMultiplierDescription: string;
  };
}

export function calculateReplacementCostHurdle(config: ReplacementCostConfig): CalculatedReplacementHurdle {
  const rawAcquisitionLanded = Math.max(0, config.rawAcquisition) + Math.max(0, config.inboundShipping) + Math.max(0, config.transitInsurance);

  // 1. Pressing Math & Skill Curve
  let pressingFee = 0;
  let pressingBumpPotential = 0;
  let pressingDamageRiskPct = 0;

  switch (config.pressingType) {
    case "NONE":
      pressingFee = 0;
      pressingBumpPotential = 0;
      pressingDamageRiskPct = 0;
      break;
    case "DIY_NOVICE":
      pressingFee = 0;
      pressingBumpPotential = 0.1;
      pressingDamageRiskPct = 18; // High risk of heat burn / roller indent
      break;
    case "DIY_SEASONED":
      pressingFee = 0;
      pressingBumpPotential = 0.2;
      pressingDamageRiskPct = 4; // Learned humidity control
      break;
    case "PRIVATE_MASTER":
      pressingFee = config.customPressingFee != null && config.customPressingFee > 0 ? config.customPressingFee : 18;
      pressingBumpPotential = 0.3; // Clean lift from 9.4 -> 9.6/9.8
      pressingDamageRiskPct = 0.5; // Commercial vacuum press
      break;
    case "CGC_CCS":
      pressingFee = (config.pubYear && config.pubYear < 1975) ? 30 : 15;
      pressingBumpPotential = 0.2;
      pressingDamageRiskPct = 1.0;
      break;
  }

  // 2. Grading Tier Math
  let gradingFee = 25;
  let gradingTierName = "Modern (Post-1975)";

  const isPre1975 = config.pubYear != null && config.pubYear < 1975;
  const isHighValue = config.targetFmv > 1000;

  if (config.gradingTier === "REHOLDER") {
    gradingFee = 15;
    gradingTierName = "Reholder (Cracked Case Refresh)";
  } else if (config.gradingTier === "HIGH_VALUE_3PCT" || (config.gradingTier === "AUTO" && isHighValue)) {
    gradingFee = Math.max(85, Math.round(config.targetFmv * 0.03));
    gradingTierName = `Unlimited / High-Value 3% FMV ($${gradingFee})`;
  } else if (config.gradingTier === "VINTAGE_PRE1975" || (config.gradingTier === "AUTO" && isPre1975)) {
    gradingFee = 40;
    gradingTierName = "Vintage (Pre-1975 Tier)";
  } else {
    gradingFee = 25;
    gradingTierName = "Modern (1975–Present Tier)";
  }

  // 3. Signature & Forensic Authentication Math
  let signatureFee = 0;
  if (config.signatureAuth === "CGC_WITNESSED") {
    // CGC Witnessed signature fee
    signatureFee = Math.max(1, config.signatureCount) * 15;
  } else if (config.signatureAuth === "JSA_CBCS_VERIFIED") {
    // Forensic handwriting verification: $25 first sig, $15 each additional
    const count = Math.max(1, config.signatureCount);
    signatureFee = 25 + (count - 1) * 15;
  }

  // 4. Logistics Freight
  const freightOverhead = Math.max(0, config.shippingRoundTripBatchShare);

  const totalFixedEncapsulationOverhead = pressingFee + gradingFee + signatureFee + freightOverhead;
  const totalLandedReplacementCost = Math.round((rawAcquisitionLanded + totalFixedEncapsulationOverhead) * 100) / 100;
  const preScreenRejectCost = 9.0 + freightOverhead;

  // 5. Wild Float, Scarcity & Box Hunt Probabilities
  const printRun = config.printRunTotal && config.printRunTotal > 0 ? config.printRunTotal : 129490;
  const rawFloat = config.rawCopiesEstimated && config.rawCopiesEstimated > 0 ? config.rawCopiesEstimated : Math.round(printRun * 0.94);
  const totalSlabs = config.totalCensusSlabs && config.totalCensusSlabs > 0 ? config.totalCensusSlabs : 465;

  // Approximate comic universe per box:
  // Standard comic store / con back issue universe density
  // A typical long box holds ~300 books.
  // Frequency of encountering this specific title is proportional to its surviving raw float vs estimated active circulating pool (~60,000,000 back issues).
  const baselineCirculatingUniverse = 60000000;
  const densityRatio = Math.max(0.00000001, rawFloat / baselineCirculatingUniverse);

  // Short box holds ~175 books
  const booksPerShortBox = 175;
  const booksPerLongBox = 350;

  const rawShortBoxFloat = Math.max(1, Math.round(1 / (densityRatio * booksPerShortBox)));
  const rawLongBoxFloat = Math.max(1, Math.round(1 / (densityRatio * booksPerLongBox)));
  
  // Graded slab vault odds (chance of encountering a 9.8 in a 40-slab display)
  const census98 = config.census98Count && config.census98Count > 0 ? config.census98Count : Math.round(totalSlabs * 0.45);
  const slabUniversePool = 500000; // active convention slab float
  const slabDensityRatio = Math.max(0.000001, census98 / slabUniversePool);
  const slabVaultFloat = Math.max(1, Math.round(1 / (slabDensityRatio * 40)));

  let scarcityRating: CalculatedReplacementHurdle["boxOdds"]["scarcityRating"] = "MASS_FLOAT";
  let scarcityMultiplierDescription = "Standard high-float issue. Broad distribution in convention dealer bins.";

  if (printRun <= 3000 || rawFloat <= 2500) {
    scarcityRating = "HYPER_SCARCE_VAULT";
    scarcityMultiplierDescription = "Sub-3,000 incentive tier. Virtually absent from general bins; strictly backroom wall stock.";
  } else if (printRun <= 10000 || rawFloat <= 8000) {
    scarcityRating = "RESTRICTED_FLOAT";
    scarcityMultiplierDescription = "Restricted print variant. Rare dealer find requiring targeted collection hunting.";
  } else if (printRun <= 35000) {
    scarcityRating = "ACCESSIBLE_SPEC";
    scarcityMultiplierDescription = "Moderate print tier. Consistent raw availability across major regional conventions.";
  }

  return {
    rawAcquisitionLanded,
    pressingFee,
    pressingBumpPotential,
    pressingDamageRiskPct,
    gradingFee,
    gradingTierName,
    signatureFee,
    freightOverhead,
    totalFixedEncapsulationOverhead,
    totalLandedReplacementCost,
    preScreenRejectCost,
    boxOdds: {
      shortBoxOdds: `1 in ${rawShortBoxFloat.toLocaleString()} boxes`,
      shortBoxNumeric: rawShortBoxFloat,
      longBoxOdds: `1 in ${rawLongBoxFloat.toLocaleString()} boxes`,
      longBoxNumeric: rawLongBoxFloat,
      slabVaultOdds: `1 in ${slabVaultFloat.toLocaleString()} dealer displays`,
      slabVaultNumeric: slabVaultFloat,
      scarcityRating,
      scarcityMultiplierDescription,
    },
  };
}
