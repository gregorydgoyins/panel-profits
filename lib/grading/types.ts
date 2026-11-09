/**
 * Grading Submission & Turnaround Economics for Panel Profits
 * Models real-world grading friction, simulated latency tiers, pressing add-ons,
 * and certification yield rolls based on comic era, raw preservation state,
 * and the player's Academy appraisal credentials.
 */

export type GradingServiceTier = 
  | 'ECONOMY_BULK'
  | 'STANDARD'
  | 'EXPRESS'
  | 'SOVEREIGN_DESK';

export type GradingCompany = 'CGC' | 'CBCS' | 'PSA';

export interface GradingTierConfig {
  tier: GradingServiceTier;
  displayName: string;
  latencyHours: number; // Simulated turnaround time in in-game hours
  costUsd: number;      // Grading fee per unit
  minUnits: number;     // Minimum submission size
  description: string;
  expressSurcharge: number;
}

export const GRADING_TIER_CONFIGS: Record<GradingServiceTier, GradingTierConfig> = {
  ECONOMY_BULK: {
    tier: 'ECONOMY_BULK',
    displayName: 'Economy Bulk (Walk-In)',
    latencyHours: 72, // 3 in-game days
    costUsd: 25.00,
    minUnits: 10,
    description: 'Slow-turn bulk submission tier for high-volume modern raw lots. Low cost per unit, extended turnaround.',
    expressSurcharge: 0.00
  },
  STANDARD: {
    tier: 'STANDARD',
    displayName: 'Standard Turnaround',
    latencyHours: 24, // 1 in-game day
    costUsd: 40.00,
    minUnits: 1,
    description: 'Active single-issue turnaround tier for core keys and convention acquisitions.',
    expressSurcharge: 0.00
  },
  EXPRESS: {
    tier: 'EXPRESS',
    displayName: 'Express / Walk-Through',
    latencyHours: 6, // 6 in-game hours (same day)
    costUsd: 85.00,
    minUnits: 1,
    description: 'Fast-track priority grading room submission for high-volatility breaking news catalysts.',
    expressSurcharge: 45.00
  },
  SOVEREIGN_DESK: {
    tier: 'SOVEREIGN_DESK',
    displayName: 'Institutional Sovereign Desk',
    latencyHours: 1, // 1 in-game hour (T+0 Flash authentication)
    costUsd: 150.00,
    minUnits: 1,
    description: 'High-roller syndicate direct grading desk for immediate settlement into sovereign firm vaults.',
    expressSurcharge: 110.00
  }
};

export const PRESSING_ADDON_CONFIG = {
  name: 'Professional Clean & Press',
  costUsd: 15.00,
  additionalLatencyHours: 12,
  description: 'Removes non-color-breaking dimples, roller indents, and stacking waves, potentially bumping borderline 9.6 to 9.8.'
};

export type GradingSubmissionStatus = 
  | 'IN_TRANSIT'
  | 'CLEAN_AND_PRESS'
  | 'GRADING_ROOM'
  | 'ENCAPSULATION'
  | 'DELIVERED_TO_VAULT';

export interface GradingSubmissionItem {
  id: string;
  holdingId?: string;
  comicId: string;
  ppcfId?: string | null;
  series: string;
  issueNumber: string;
  publisher?: string;
  publicationYear?: number;
  originEra?: string;
  sourceRawGradeEstimate?: number; // e.g. 9.4
  hasPressing: boolean;
  finalCertifiedGrade?: number;    // Assigned upon completion
  finalGradingCompany: GradingCompany;
  finalCertificationNumber?: string;
  status: GradingSubmissionStatus;
}

export interface GradingSubmissionBatch {
  id: string;
  userId: string;
  gradingCompany: GradingCompany;
  serviceTier: GradingServiceTier;
  totalUnits: number;
  items: GradingSubmissionItem[];
  hasPressing: boolean;
  totalCostUsd: number;
  submittedAt: string;          // ISO timestamp
  estimatedCompletionAt: string; // ISO timestamp
  completedAt?: string | null;
  status: GradingSubmissionStatus;
}

export interface PlayerAppraisalModifiers {
  appraisalLevel: number;        // Level 0 to Level 4 (from Academy classes)
  negotiationLevel: number;      // Level 0 to Level 4
  underwritingLevel: number;     // Level 0 to Level 4
  hasPressingMastery: boolean;   // Tree A Level 2
  hasPrinterDefectEye: boolean;  // Tree A Level 3
}
