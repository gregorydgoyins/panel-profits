/**
 * Grading Submission & Turnaround Engine for Panel Profits
 * Models real-world grading turnaround, condition preservation math,
 * and authenticated yield rolls across grading authorities (CGC, CBCS, PSA).
 * 
 * CORE PRINCIPLE: "You can't put lipstick on a pig and call her Bo Derek."
 * Pressing removes non-color-breaking bends, light ripples, and stacking indentations.
 * It CANNOT cure ink fracture, missing paper, tears, water stains, or severe spine splits.
 * A 6.0 book will NEVER become a 9.8 via pressing; pressing has an absolute physical ceiling
 * proportional to the raw copy's underlying structural integrity.
 */

import {
  GradingCompany,
  GradingServiceTier,
  GradingSubmissionBatch,
  GradingSubmissionItem,
  GRADING_TIER_CONFIGS,
  GRADING_AUTHORITY_PROFILES,
  PRESSING_ADDON_CONFIG,
  PlayerAppraisalModifiers
} from "./types";

/**
 * Standard CGC numerical grade scale
 */
export const CERTIFIED_GRADES: number[] = [
  9.9, 9.8, 9.6, 9.4, 9.2, 9.0, 8.5, 8.0, 7.5, 7.0, 6.5, 6.0, 5.0, 4.0, 3.0, 2.0, 1.0
];

/**
 * Calculates authenticated grade yield based on:
 * - Grading Company Profile (CGC vs CBCS vs PSA)
 * - Underlying Structural Integrity Ceiling ("Lipstick on a pig" constraint)
 * - Era baseline difficulty (Modern vs Vintage)
 * - Professional Pressing add-on (+12h, bumps non-color-breaking defects only)
 * - Player's Academy Appraisal Credentials
 */
export function rollCertifiedGrade(params: {
  gradingCompany?: GradingCompany;
  era?: string;
  year?: number;
  hasPressing: boolean;
  rawEstimatedGrade?: number;
  playerModifiers?: PlayerAppraisalModifiers;
}): { grade: number; label: string; notes: string; graderMultiplier: number } {
  const {
    gradingCompany = "CGC",
    era = "Modern",
    year = 2020,
    hasPressing,
    rawEstimatedGrade = 9.4,
    playerModifiers = { appraisalLevel: 0, negotiationLevel: 0, underwritingLevel: 0, hasPressingMastery: false, hasPrinterDefectEye: false }
  } = params;

  const authority = GRADING_AUTHORITY_PROFILES[gradingCompany] || GRADING_AUTHORITY_PROFILES.CGC;

  // Era base difficulty factor (Golden/Silver age books are vastly harder to yield 9.8)
  const isVintage = year < 1985 || era.toLowerCase().includes("golden") || era.toLowerCase().includes("silver") || era.toLowerCase().includes("bronze");
  
  // -------------------------------------------------------------
  // RULE: "Can't put lipstick on a pig and call her Bo Derek"
  // Physical Condition Ceilings:
  // - A raw copy at 9.4 - 9.6 has pressable defects: pressing can bump it to 9.8.
  // - A raw copy at 8.0 - 9.0 has minor handling wear: pressing can bump it by +0.2 to +0.4 max (to 8.5 - 9.4).
  // - A raw copy at <= 7.0 has permanent paper/color-break defects: pressing cannot lift it beyond +0.4 to +0.6.
  // -------------------------------------------------------------
  const maxPossibleGradeWithPressing = rawEstimatedGrade <= 6.0 
    ? rawEstimatedGrade + 0.6 
    : rawEstimatedGrade <= 8.0
    ? rawEstimatedGrade + 0.8
    : rawEstimatedGrade <= 9.2
    ? 9.6
    : 9.8;

  // If the book does not have high-enough structural integrity, 9.8 is physically impossible
  const is98Eligible = rawEstimatedGrade >= 9.2 && (!isVintage || rawEstimatedGrade >= 9.6);

  // Base 9.8 probability (only evaluated if eligible)
  let prob98 = 0.0;
  if (is98Eligible) {
    prob98 = isVintage ? 0.03 : 0.40;

    if (rawEstimatedGrade >= 9.6) {
      prob98 += 0.22;
    } else if (rawEstimatedGrade <= 9.2) {
      prob98 -= 0.15;
    }

    // Pressing effect on eligible books
    if (hasPressing) {
      // If player has Pressing Mastery (Tree A Level 2), pressing efficiency is higher
      prob98 += playerModifiers.hasPressingMastery ? 0.24 : 0.14;
    }

    // Grader authority bias on high-grade tolerances:
    // CBCS is slightly more forgiving on modern production roller marks (+5% to 9.8)
    // PSA applies aggressive card-style centering & foil edge scrutiny (-5% to 9.8 on comics)
    if (gradingCompany === "CBCS") {
      prob98 += 0.05;
    } else if (gradingCompany === "PSA") {
      prob98 -= 0.05;
    }

    // Player appraisal level bonus (discerning eye screens out permanent ink tears from pressable waves)
    prob98 += playerModifiers.appraisalLevel * 0.04;
    if (playerModifiers.hasPrinterDefectEye) {
      prob98 += 0.08;
    }

    // Clamp probability
    prob98 = Math.max(0.01, Math.min(0.92, prob98));
  }

  const roll = Math.random();

  let finalGrade = Math.min(rawEstimatedGrade, 9.4);
  let notes = "Certified standard eye appeal with minor surface wear.";

  if (is98Eligible && roll <= prob98) {
    // Check for rare 9.9/10.0 gem roll
    if (roll <= prob98 * 0.02 && !isVintage) {
      finalGrade = 9.9;
      notes = `Flawless manufacturing preservation. Pristine gem copy authenticated by ${gradingCompany}.`;
    } else {
      finalGrade = 9.8;
      notes = hasPressing 
        ? `Professional pressing eliminated non-color-breaking surface indents. Elevated to ${gradingCompany} 9.8.`
        : `Exceptional structural integrity, sharp corners, pristine centering (${gradingCompany} 9.8).`;
    }
  } else {
    // Below 9.8 yield: calculate grade based on raw estimate + press boost, capped at physical ceiling
    let pressBoost = 0;
    if (hasPressing) {
      if (rawEstimatedGrade >= 9.2) {
        pressBoost = 0.2; // 9.2 -> 9.4 or 9.4 -> 9.6
      } else if (rawEstimatedGrade >= 7.5) {
        pressBoost = 0.4;
      } else {
        pressBoost = 0.2; // Deep flaws cannot be pressed out
      }
    }

    const calculatedGrade = Math.min(maxPossibleGradeWithPressing, rawEstimatedGrade + pressBoost);
    
    // Find closest valid CGC step
    finalGrade = CERTIFIED_GRADES.reduce((prev, curr) => 
      Math.abs(curr - calculatedGrade) < Math.abs(prev - calculatedGrade) ? curr : prev
    );

    if (hasPressing && pressBoost > 0) {
      notes = `Pressed: light dents removed, but underlying ink fractures prevent higher grade (${gradingCompany} ${finalGrade}).`;
    } else {
      notes = `Original unpressed surface integrity maintained (${gradingCompany} ${finalGrade}).`;
    }
  }

  // Vintage safety clamp (Silver/Bronze books rarely exceed 9.4 without pedigree)
  if (isVintage && finalGrade > 9.6 && roll > 0.02) {
    finalGrade = 9.6;
    notes += ` (Vintage preservation ceiling applied by ${gradingCompany})`;
  }

  const label = gradingCompany === "CGC" 
    ? "Universal Blue Label" 
    : gradingCompany === "CBCS" 
    ? "Standard White Label" 
    : "Red Border Label";

  return {
    grade: finalGrade,
    label,
    notes,
    graderMultiplier: authority.secondaryMarketMultiplier
  };
}

/**
 * Creates a simulated grading submission batch with authentic time-in-flight
 */
export function createGradingBatch(params: {
  userId: string;
  gradingCompany: GradingCompany;
  serviceTier: GradingServiceTier;
  items: Array<{
    holdingId?: string;
    comicId: string;
    ppcfId?: string | null;
    series: string;
    issueNumber: string;
    publisher?: string;
    publicationYear?: number;
    originEra?: string;
    rawEstimatedGrade?: number;
  }>;
  hasPressing: boolean;
  submissionDate?: Date;
}): GradingSubmissionBatch {
  const {
    userId,
    gradingCompany,
    serviceTier,
    items,
    hasPressing,
    submissionDate = new Date()
  } = params;

  const tierConfig = GRADING_TIER_CONFIGS[serviceTier];
  const unitCost = tierConfig.costUsd + (hasPressing ? PRESSING_ADDON_CONFIG.costUsd : 0);
  const totalCostUsd = unitCost * items.length;

  let totalLatencyHours = tierConfig.latencyHours;
  if (hasPressing) {
    totalLatencyHours += PRESSING_ADDON_CONFIG.additionalLatencyHours;
  }

  const completionDate = new Date(submissionDate.getTime() + totalLatencyHours * 60 * 60 * 1000);
  const batchId = `SUB-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

  const submissionItems: GradingSubmissionItem[] = items.map((item, idx) => ({
    id: `${batchId}-${idx + 1}`,
    holdingId: item.holdingId,
    comicId: item.comicId,
    ppcfId: item.ppcfId,
    series: item.series,
    issueNumber: item.issueNumber,
    publisher: item.publisher,
    publicationYear: item.publicationYear,
    originEra: item.originEra,
    sourceRawGradeEstimate: item.rawEstimatedGrade || 9.4,
    hasPressing,
    finalGradingCompany: gradingCompany,
    status: 'IN_TRANSIT'
  }));

  return {
    id: batchId,
    userId,
    gradingCompany,
    serviceTier,
    totalUnits: items.length,
    items: submissionItems,
    hasPressing,
    totalCostUsd,
    submittedAt: submissionDate.toISOString(),
    estimatedCompletionAt: completionDate.toISOString(),
    completedAt: null,
    status: 'IN_TRANSIT'
  };
}
