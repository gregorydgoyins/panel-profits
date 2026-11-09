/**
 * Grading Submission & Turnaround Engine for Panel Profits
 * Models real-world grading turnaround, condition preservation math,
 * and authenticated yield rolls.
 */

import {
  GradingCompany,
  GradingServiceTier,
  GradingSubmissionBatch,
  GradingSubmissionItem,
  GRADING_TIER_CONFIGS,
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
 * - Era baseline difficulty (Modern vs Silver Age)
 * - Raw condition estimate
 * - Professional Pressing add-on (+12h, bumps pressable defects)
 * - Player's Academy Appraisal Credentials
 */
export function rollCertifiedGrade(params: {
  era?: string;
  year?: number;
  hasPressing: boolean;
  rawEstimatedGrade?: number;
  playerModifiers?: PlayerAppraisalModifiers;
}): { grade: number; label: string; notes: string } {
  const {
    era = "Modern",
    year = 2020,
    hasPressing,
    rawEstimatedGrade = 9.4,
    playerModifiers = { appraisalLevel: 0, negotiationLevel: 0, underwritingLevel: 0, hasPressingMastery: false, hasPrinterDefectEye: false }
  } = params;

  // Era base difficulty factor (Golden/Silver age books are vastly harder to yield 9.8)
  const isVintage = year < 1985 || era.toLowerCase().includes("golden") || era.toLowerCase().includes("silver") || era.toLowerCase().includes("bronze");
  
  // Base 9.8 probability
  let prob98 = isVintage ? 0.03 : 0.45;

  // Raw estimated baseline boost
  if (rawEstimatedGrade >= 9.6) {
    prob98 += 0.20;
  } else if (rawEstimatedGrade <= 9.0) {
    prob98 -= 0.25;
  }

  // Pressing effect
  if (hasPressing) {
    // If player has Pressing Mastery (Tree A Level 2), pressing efficiency is higher
    prob98 += playerModifiers.hasPressingMastery ? 0.22 : 0.12;
  }

  // Player appraisal level bonus (discerning eye screens out factory dings)
  prob98 += playerModifiers.appraisalLevel * 0.05;
  if (playerModifiers.hasPrinterDefectEye) {
    prob98 += 0.08;
  }

  // Clamp probability
  prob98 = Math.max(0.01, Math.min(0.92, prob98));

  const roll = Math.random();

  let finalGrade = 9.4;
  let notes = "Certified standard eye appeal with minor surface wear.";

  if (roll <= prob98) {
    // Check for rare 9.9/10.0 gem roll
    if (roll <= prob98 * 0.03) {
      finalGrade = 9.9;
      notes = "Flawless manufacturing preservation. Pristine gem copy.";
    } else {
      finalGrade = 9.8;
      notes = "Exceptional structural integrity, sharp corners, pristine centering.";
    }
  } else if (roll <= prob98 + 0.30) {
    finalGrade = 9.6;
    notes = "Near Mint+ copy with microscopic spine fleck or slight printer roller impression.";
  } else if (roll <= prob98 + 0.50) {
    finalGrade = 9.4;
    notes = "Near Mint with subtle non-color-breaking bend or minor corner softening.";
  } else if (roll <= prob98 + 0.70) {
    finalGrade = 9.2;
    notes = "Light surface scuffing or slight spine roll from initial storage.";
  } else {
    finalGrade = 9.0;
    notes = "Fine to Very Fine presentation with handling creases.";
  }

  // Vintage safety clamp (Silver/Bronze books rarely exceed 9.4 without pedigree)
  if (isVintage && finalGrade > 9.6 && roll > 0.02) {
    finalGrade = 9.6;
    notes += " (Vintage preservation benchmark applied)";
  }

  return {
    grade: finalGrade,
    label: "Universal Blue Label",
    notes
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
