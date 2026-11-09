/**
 * Grading Submission & Turnaround Economics for Panel Profits
 * Models real-world grading friction, simulated latency tiers, pressing add-ons,
 * authority bias (CGC vs CBCS vs PSA), and condition ceilings ("can't put lipstick on a pig").
 */

export type GradingServiceTier = 
  | 'ECONOMY_BULK'
  | 'STANDARD'
  | 'EXPRESS'
  | 'SOVEREIGN_DESK';

export type GradingCompany = 'CGC' | 'CBCS' | 'PSA';

export interface GradingAuthorityProfile {
  company: GradingCompany;
  displayName: string;
  marketSharePct: number;        // e.g. CGC 85%, CBCS 10%, PSA 5%
  secondaryMarketMultiplier: number; // e.g. 1.00 for CGC (standard liquid FMV), 0.82 for CBCS, 0.90 for PSA
  strictnessFactor: number;      // How forgiving or punishing the grader is on manufacturing vs handling defects
  turnaroundReliability: number; // Variance on turnaround time
  description: string;
}

export const GRADING_AUTHORITY_PROFILES: Record<GradingCompany, GradingAuthorityProfile> = {
  CGC: {
    company: 'CGC',
    displayName: 'Certified Guaranty Company (CGC)',
    marketSharePct: 85.0,
    secondaryMarketMultiplier: 1.00, // Benchmark Sovereign FMV standard
    strictnessFactor: 1.00,          // Balanced industry benchmark
    turnaroundReliability: 0.95,
    description: 'The global market standard for comic certification. Highest liquidity, commanding 100% Sovereign FMV on the exchange.'
  },
  CBCS: {
    company: 'CBCS',
    displayName: 'Comic Book Certification Service (CBCS)',
    marketSharePct: 10.0,
    secondaryMarketMultiplier: 0.82, // Historical 15-20% discount compared to CGC 9.8
    strictnessFactor: 1.08,          // Known for slightly more forgiving modern grading but stricter on vintage restoration
    turnaroundReliability: 0.98,
    description: 'Renowned for signature verification and collector consistency. Slabs typically trade at an 18% discount to CGC FMV.'
  },
  PSA: {
    company: 'PSA',
    displayName: 'Professional Sports Authenticator (PSA Comics)',
    marketSharePct: 5.0,
    secondaryMarketMultiplier: 0.90, // Emerging share in comics, premium in sports crossover
    strictnessFactor: 1.15,          // Card-centric centering and edge rigor applied to comic book paper
    turnaroundReliability: 0.92,
    description: 'Trading card titan expanding aggressively into comic slabs. Strong cross-asset liquidity with card crossover collectors.'
  }
};

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
  description: 'Removes non-color-breaking dimples, roller indents, and stacking waves. Cannot fix color breaks, tears, or structural degradation.'
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
