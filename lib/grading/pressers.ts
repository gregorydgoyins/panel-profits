/**
 * Subcontractor Presser Studios & Negotiation Engine for Panel Profits
 * Allows players with high book volumes to hire independent third-party pressers.
 * Features:
 * - Variable turnaround latency
 * - Varied skill and defect risks
 * - Dynamic wholesale discounts strictly bounded between 15% and 50% (never trivial 1%)
 */

export type SubcontractorPresserId = 
  | 'KITCHEN_FLIPPER'
  | 'COMIC_SHOP_TECH'
  | 'BOUTIQUE_LAB'
  | 'ARCHIVAL_GUILDSMAN';

export interface SubcontractorPresserProfile {
  id: SubcontractorPresserId;
  name: string;
  reputationTitle: string;
  baseFeeUsd: number;
  latencyHours: number;
  damageRiskPct: number;
  miracleLiftPct: number;    // Chance to push borderline copies past normal ceiling
  minDiscountPct: number;    // Always >= 15%
  maxDiscountPct: number;    // Always <= 50%
  description: string;
}

export const SUBCONTRACTOR_PRESSERS: Record<SubcontractorPresserId, SubcontractorPresserProfile> = {
  KITCHEN_FLIPPER: {
    id: 'KITCHEN_FLIPPER',
    name: 'Mitch "The Steamer" Kowalski',
    reputationTitle: 'Shade Tree Kitchen Flipper',
    baseFeeUsd: 15.00,
    latencyHours: 12,
    damageRiskPct: 10.0,
    miracleLiftPct: 0.0,
    minDiscountPct: 35.0,
    maxDiscountPct: 50.0,
    description: 'Fast cash operator using a modified hat press in his basement. Cheap bulk rates, but occasionally leaves heat lines.'
  },
  COMIC_SHOP_TECH: {
    id: 'COMIC_SHOP_TECH',
    name: 'Sarah Chen',
    reputationTitle: 'Backroom Retail Shop Technician',
    baseFeeUsd: 28.00,
    latencyHours: 24,
    damageRiskPct: 3.0,
    miracleLiftPct: 4.0,
    minDiscountPct: 20.0,
    maxDiscountPct: 35.0,
    description: 'Experienced store tech who presses modern variants and silver age readers for local customers. Solid, dependable standard.'
  },
  BOUTIQUE_LAB: {
    id: 'BOUTIQUE_LAB',
    name: 'Precision Paper Conservation Lab',
    reputationTitle: 'Certified Paper Conservator',
    baseFeeUsd: 60.00,
    latencyHours: 48,
    damageRiskPct: 0.8,
    miracleLiftPct: 12.0,
    minDiscountPct: 15.0,
    maxDiscountPct: 25.0,
    description: 'Independent archival studio with climate-controlled humidity rooms. Excellent at lifting stubborn non-color breaks.'
  },
  ARCHIVAL_GUILDSMAN: {
    id: 'ARCHIVAL_GUILDSMAN',
    name: 'Arthur Pendelton, Fellow of AIC',
    reputationTitle: 'Master Archival Guildsman',
    baseFeeUsd: 110.00,
    latencyHours: 72,
    damageRiskPct: 0.1,
    miracleLiftPct: 25.0, // Can coax a gem 9.9 out of a pristine 9.8
    minDiscountPct: 15.0,
    maxDiscountPct: 20.0,
    description: 'Museum-grade restorer handling five-figure Golden Age pedigrees and milestone keys. Rarely discounts, virtually zero failure rate.'
  }
};

/**
 * Calculates a dynamic quote from an independent subcontractor presser.
 * Guarantees discount is between 15% and 50% (never trivial 1%).
 */
export function quoteSubcontractorPresser(params: {
  presserId: SubcontractorPresserId;
  bookCount: number;
  playerNegotiationLevel?: number; // 0 to 4
}): {
  presser: SubcontractorPresserProfile;
  unitCostUsd: number;
  totalCostUsd: number;
  appliedDiscountPct: number;
  totalLatencyHours: number;
} {
  const { presserId, bookCount, playerNegotiationLevel = 0 } = params;
  const presser = SUBCONTRACTOR_PRESSERS[presserId];

  // Base random discount within presser's specific range
  const spread = presser.maxDiscountPct - presser.minDiscountPct;
  const randomFactor = Math.random();
  let discountPct = presser.minDiscountPct + (spread * randomFactor);

  // Negotiation bonus from Academy career ladder
  discountPct += playerNegotiationLevel * 2.5;

  // Strict clamp: never < 15%, never > 50%
  discountPct = Math.max(15.0, Math.min(50.0, Number(discountPct.toFixed(1))));

  const unitCostUsd = Number((presser.baseFeeUsd * (1 - discountPct / 100)).toFixed(2));
  const totalCostUsd = Number((unitCostUsd * bookCount).toFixed(2));

  return {
    presser,
    unitCostUsd,
    totalCostUsd,
    appliedDiscountPct: discountPct,
    totalLatencyHours: presser.latencyHours
  };
}
