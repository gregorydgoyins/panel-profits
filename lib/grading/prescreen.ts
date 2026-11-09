/**
 * Pre-Screening Protocols & Reject Fee Economics for Panel Profits
 * Models the CGC/CBCS Pre-Screen service:
 * - Minimum Target Grade (typically 9.8)
 * - $9.00 Rejection Fee if the book fails the grade check (returned raw without full slabbing fee)
 * - Full slabbing fee ($25+) only charged if it PASSES the 9.8 threshold
 * - Saves the player from absorbing the catastrophic -$56.75 loss on a 9.6 miss!
 */

export interface PreScreenConfig {
  minimumGradeThreshold: number; // e.g. 9.8
  rejectFeeUsd: number;          // Exact $9.00 CGC standard reject fee
  transitPerUnitUsd: number;      // Pro-rated freight & insurance share (~$9.00 per unit)
  description: string;
}

export const OFFICIAL_PRESCREEN_CONFIG: PreScreenConfig = {
  minimumGradeThreshold: 9.8,
  rejectFeeUsd: 9.00,
  transitPerUnitUsd: 9.00,
  description: 'CGC Minimum 9.8 Pre-Screen. If the book does not meet 9.8, it is rejected and returned raw for a $9 reject fee instead of the full $25+ slabbing fee.'
};

export interface PreScreenEvaluationResult {
  passed: boolean;
  actualGrade: number;
  totalCostChargedUsd: number;
  capitalSavedVsFullSlabbingUsd: number;
  notes: string;
}

/**
 * Evaluates a pre-screened submission item
 */
export function evaluatePreScreenItem(params: {
  actualRolledGrade: number;
  fullSlabbingCostUsd: number; // e.g. $40 standard tier or $25 bulk tier
  minimumGradeThreshold?: number; // defaults to 9.8
}): PreScreenEvaluationResult {
  const { actualRolledGrade, fullSlabbingCostUsd, minimumGradeThreshold = 9.8 } = params;

  if (actualRolledGrade >= minimumGradeThreshold) {
    return {
      passed: true,
      actualGrade: actualRolledGrade,
      totalCostChargedUsd: fullSlabbingCostUsd,
      capitalSavedVsFullSlabbingUsd: 0,
      notes: `Pre-Screen PASSED: Grader verified ${actualRolledGrade} meets the minimum ${minimumGradeThreshold} standard. Full encapsulation executed.`
    };
  }

  // REJECTED: Player only pays the $9.00 reject fee + $9.00 pro-rated freight ($18 total) instead of full slabbing!
  const rejectOutlay = OFFICIAL_PRESCREEN_CONFIG.rejectFeeUsd + OFFICIAL_PRESCREEN_CONFIG.transitPerUnitUsd;
  const savedCapital = Math.max(0, fullSlabbingCostUsd - OFFICIAL_PRESCREEN_CONFIG.rejectFeeUsd);

  return {
    passed: false,
    actualGrade: actualRolledGrade,
    totalCostChargedUsd: rejectOutlay,
    capitalSavedVsFullSlabbingUsd: savedCapital,
    notes: `Pre-Screen REJECTED: Grader assessed at ${actualRolledGrade} (below ${minimumGradeThreshold}). Book returned raw. Charged $9.00 reject fee + $9.00 transit ($18 total). Saved $${savedCapital.toFixed(2)} in wasted encapsulation fees.`
  };
}
