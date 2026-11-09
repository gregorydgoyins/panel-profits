/**
 * Academy Career Gating & Player Skill Attribution for Panel Profits
 * Calculates player proficiency across:
 * - Tree A: Defect Appraisal & Grading Science (yield rolls & pressing)
 * - Tree B: Negotiation & Deal Alignment (lot discounts & wholesale access)
 * - Tree C: Market-Making & Institutional Underwriting (orderbooks & firms)
 */

import { PlayerAppraisalModifiers } from "@/lib/grading/types";

export interface AcademyCareerProfile {
  userId: string;
  totalCompletedCourses: number;
  careerTier: number;            // 0 (Street Picker) to 4 (Sovereign Underwriter)
  tierTitle: string;
  appraisalModifiers: PlayerAppraisalModifiers;
  unlockedFeatures: {
    canBuyRawSingles: boolean;
    canSubmitEconomyBulk: boolean;
    canSubmitStandardGrading: boolean;
    canSubmitExpressGrading: boolean;
    canSubmitSovereignDesk: boolean;
    canAddPressing: boolean;
    canBuyShortBoxes: boolean;
    canBuyLongBoxes: boolean;
    canInspectBoxCherryPick: boolean;
    canAccessInstitutionalDesks: boolean;
  };
}

export const CAREER_TIER_DESCRIPTIONS: Record<number, { title: string; minCourses: number; summary: string }> = {
  0: {
    title: 'Street Picker',
    minCourses: 0,
    summary: 'Fresh entrant navigating local yard sales and back-issue dollar bins. Buys raw singles and relies on unvetted seller claims.'
  },
  1: {
    title: 'Certified Apprentice',
    minCourses: 2,
    summary: 'Completed basic grading coursework. Unlocks standard CGC submission queues, bagged/boarded lot purchases, and Short Box trading.'
  },
  2: {
    title: 'Back-Issue Appraiser',
    minCourses: 5,
    summary: 'Proficient in spine stress vs manufacturing defects. Unlocks professional pressing, defect screening, and wholesale Short Box discounts.'
  },
  3: {
    title: 'Floor Shark / Dealmaker',
    minCourses: 10,
    summary: 'Seasoned convention trader. Unlocks Long Box estate buyouts, counterparty negotiation leverage, and Express grading queues.'
  },
  4: {
    title: 'Sovereign Underwriter',
    minCourses: 18,
    summary: 'Master of institutional valuation and physical preservation. Full access to 25 Brokerage Desks and 1-Hour Sovereign Grading.'
  }
};

/**
 * Computes the player's active career level and unlocked capabilities
 * from their completed course count or passed certifications.
 */
export function calculatePlayerCareerProfile(
  userId: string,
  completedCourseIds: string[] = []
): AcademyCareerProfile {
  const count = completedCourseIds.length;

  let tier = 0;
  if (count >= 18) {
    tier = 4;
  } else if (count >= 10) {
    tier = 3;
  } else if (count >= 5) {
    tier = 2;
  } else if (count >= 2) {
    tier = 1;
  }

  const appraisalLevel = Math.min(4, Math.floor(count / 4));
  const negotiationLevel = Math.min(4, Math.floor(count / 5));
  const underwritingLevel = Math.min(4, Math.floor(count / 6));

  const hasPressingMastery = tier >= 2;
  const hasPrinterDefectEye = tier >= 3;

  return {
    userId,
    totalCompletedCourses: count,
    careerTier: tier,
    tierTitle: CAREER_TIER_DESCRIPTIONS[tier]?.title || 'Street Picker',
    appraisalModifiers: {
      appraisalLevel,
      negotiationLevel,
      underwritingLevel,
      hasPressingMastery,
      hasPrinterDefectEye
    },
    unlockedFeatures: {
      canBuyRawSingles: true, // Always accessible
      canSubmitEconomyBulk: tier >= 1,
      canSubmitStandardGrading: tier >= 1,
      canSubmitExpressGrading: tier >= 3,
      canSubmitSovereignDesk: tier >= 4,
      canAddPressing: hasPressingMastery,
      canBuyShortBoxes: tier >= 1,
      canBuyLongBoxes: tier >= 3,
      canInspectBoxCherryPick: tier >= 2,
      canAccessInstitutionalDesks: tier >= 4
    }
  };
}
