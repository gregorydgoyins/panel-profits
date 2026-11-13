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

import { FEE_SCHEDULE, cgcGradingFee, cgcPressingFee } from "./canonical-underwriting-core";

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
  
  // Wild Box & Collection Discovery Probabilities (Stratified Float Model)
  boxOdds: {
    catalogOdds: string; // "1 in 355,692 titles"
    catalogNumeric: number; // 355692
    rawCirculatingFloat: number | null; // estimated raw copies; null without a print run
    shortBoxOdds: string; // "1 in 355,692"
    shortBoxNumeric: number;
    longBoxOdds: string;
    longBoxNumeric: number | null;
    slabVaultOdds: string; // e.g. "209 CGC 9.8s"
    slabVaultNumeric: number;
    clusterAnomalyMultiplier: string; // e.g. "1.8x Retail Clustering (Multiples/Bundles in Estate Finds)"
    scarcityRating: "MASS_FLOAT" | "ACCESSIBLE_SPEC" | "RESTRICTED_FLOAT" | "HYPER_SCARCE_VAULT" | "NOT_RATED";
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
      pressingFee = cgcPressingFee(config.targetFmv, config.pubYear ?? 1975);
      pressingBumpPotential = 0.2;
      pressingDamageRiskPct = 1.0;
      break;
  }

  // 2. Grading Tier Math — CGC 2026 schedule from canonical-underwriting-core
  const g = FEE_SCHEDULE.cgcGrading;
  const yearForTier = config.pubYear ?? 1975;
  let gradingFee: number;
  let gradingTierName: string;

  if (config.gradingTier === "REHOLDER") {
    const r = FEE_SCHEDULE.reholder;
    gradingFee = config.targetFmv > r.standardCap ? r.highValue : r.standard;
    gradingTierName = config.targetFmv > r.standardCap ? "ReHolder – High Value" : "ReHolder";
  } else if (config.gradingTier === "HIGH_VALUE_3PCT") {
    // Forced Unlimited tier: 4% of final value, minimum applies
    gradingFee = Math.max(g.unlimitedMin, Math.round(config.targetFmv * g.unlimitedPct * 100) / 100);
    gradingTierName = `Unlimited 4% FMV ($${gradingFee.toFixed(2)})`;
  } else if (config.gradingTier === "VINTAGE_PRE1975") {
    gradingFee = cgcGradingFee(config.targetFmv, 1974);
    gradingTierName = config.targetFmv > g.tierCap ? `Value tier ($${gradingFee.toFixed(2)})` : "Vintage (Pre-1975)";
  } else if (config.gradingTier === "MODERN") {
    gradingFee = cgcGradingFee(config.targetFmv, 1975);
    gradingTierName = config.targetFmv > g.tierCap ? `Value tier ($${gradingFee.toFixed(2)})` : "Modern (1975–Present)";
  } else {
    gradingFee = cgcGradingFee(config.targetFmv, yearForTier);
    gradingTierName =
      config.targetFmv > g.highValueCap
        ? `Unlimited 4% FMV ($${gradingFee.toFixed(2)})`
        : config.targetFmv > g.tierCap
          ? "High Value (to $1,000)"
          : yearForTier < 1975
            ? "Vintage (Pre-1975)"
            : "Modern (1975–Present)";
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
  const preScreenRejectCost = FEE_SCHEDULE.preScreenRejectFee + freightOverhead;

  // 5. Wild Float, Scarcity & Stratified Discovery Probabilities
  // Standard catalog universe across all catalogued comics: 355,692 titles
  const CANONICAL_CATALOG_UNIVERSE = 355692;

  // Print run and raw float come from the float model (lib/equity/float-model). Nothing assumed here.
  const printRun = config.printRunTotal && config.printRunTotal > 0 ? config.printRunTotal : null;
  const rawFloat = config.rawCopiesEstimated != null && config.rawCopiesEstimated >= 0 ? config.rawCopiesEstimated : null;

  // Certified Census Slabs (kept strictly separate from raw finds)
  const totalSlabs = config.totalCensusSlabs && config.totalCensusSlabs > 0 ? config.totalCensusSlabs : 0;
  const census98 = config.census98Count && config.census98Count > 0 ? config.census98Count : 0;

  // Collection Archaeology Clustering Anomaly:
  // High-float modern books (print run > 50,000) often surface in retailer doubles/triplicates or reader bundles.
  // Low-float vintage or restricted incentive variants surface strictly as solitary singleton finds.
  let clusterAnomalyMultiplier = "Not rated: no print run on file";
  if (printRun != null) {
    clusterAnomalyMultiplier = printRun >= 100000
      ? "2.4x Multi-Copy Clustering (Doubles/Triplicates Likely in Estate Finds)"
      : printRun >= 50000
        ? "1.5x Multi-Copy Clustering (Occasional Duplicate in Estate Runs)"
        : "Solitary Singleton (1x: No Duplicate Clustering)";
  }

  let scarcityRating: CalculatedReplacementHurdle["boxOdds"]["scarcityRating"] = "NOT_RATED";
  let scarcityMultiplierDescription = "No print run on file — float not rated.";
  if (printRun != null) {
    if (printRun <= 3000 || (rawFloat != null && rawFloat <= 2500)) {
      scarcityRating = "HYPER_SCARCE_VAULT";
      scarcityMultiplierDescription = "Sub-3,000 distribution. Virtually absent from general bins; strictly backroom wall stock.";
    } else if (printRun <= 10000 || (rawFloat != null && rawFloat <= 8000)) {
      scarcityRating = "RESTRICTED_FLOAT";
      scarcityMultiplierDescription = "Restricted distribution. Rare dealer find requiring targeted collection hunting.";
    } else if (printRun <= 35000) {
      scarcityRating = "ACCESSIBLE_SPEC";
      scarcityMultiplierDescription = "Moderate distribution. Consistent raw availability across major regional conventions.";
    } else {
      scarcityRating = "MASS_FLOAT";
      scarcityMultiplierDescription = "High distribution. Broad availability in convention dealer bins.";
    }
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
      catalogOdds: `1 in ${CANONICAL_CATALOG_UNIVERSE.toLocaleString()} titles`,
      catalogNumeric: CANONICAL_CATALOG_UNIVERSE,
      rawCirculatingFloat: rawFloat,
      shortBoxOdds: `1 in ${CANONICAL_CATALOG_UNIVERSE.toLocaleString()}`,
      shortBoxNumeric: CANONICAL_CATALOG_UNIVERSE,
      longBoxOdds: rawFloat != null ? `Circulating Raw Float (est.): ~${rawFloat.toLocaleString()} copies` : "Raw float not rated (no print run on file)",
      longBoxNumeric: rawFloat,
      slabVaultOdds: `${census98.toLocaleString()} in CGC 9.8 Census`,
      slabVaultNumeric: census98,
      clusterAnomalyMultiplier,
      scarcityRating,
      scarcityMultiplierDescription,
    },
  };
}
