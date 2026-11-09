/**
 * DIY Pressing Materials, Equipment & Practice Mechanics for Panel Profits
 * Models the self-taught progression:
 * - Budget discount store materials vs archival tools
 * - Practice books (experimenting on beaters to gain EXP)
 * - Craft risk (scorched gloss, spine split, or successful lift)
 */

export type PressingSupplyTier = 
  | 'DISCOUNT_STORE'    // Cheap grocery iron, baking wax paper, makeshift steamer
  | 'STANDARD_HOBBY'    // Seal-press, parchment paper, distilled water spray, blotter boards
  | 'ARCHIVAL_STUDIO';  // Hydraulic heat press, LED lightbox, micro-spatula, humidity chamber

export interface PressingSupplyConfig {
  tier: PressingSupplyTier;
  displayName: string;
  costBasisUsd: number;      // Cost of materials per batch
  burnRiskPct: number;       // Probability of damaging book (scorching, fiber crush)
  expGainMultiplier: number; // Multiplier on DIY Pressing EXP
  maxGradeCeiling: number;   // Maximum grade this equipment can realistically achieve
  description: string;
}

export const PRESSING_SUPPLY_REGISTRY: Record<PressingSupplyTier, PressingSupplyConfig> = {
  DISCOUNT_STORE: {
    tier: 'DISCOUNT_STORE',
    displayName: 'Dollar Store / Improvised Tools',
    costBasisUsd: 3.50,
    burnRiskPct: 18.0,       // High risk of heat blister or paper scorch
    expGainMultiplier: 0.8,
    maxGradeCeiling: 9.4,    // Cannot reliably produce pristine 9.8s
    description: 'Baking parchment, standard clothing iron, and bathroom humidity. High risk of scorch or wavy page blocks.'
  },
  STANDARD_HOBBY: {
    tier: 'STANDARD_HOBBY',
    displayName: 'Hobbyist T-Shirt Press & Blotter Kit',
    costBasisUsd: 12.00,
    burnRiskPct: 5.0,
    expGainMultiplier: 1.2,
    maxGradeCeiling: 9.8,
    description: 'Digital swing-away flat press, 100% rag acid-free blotter paper, silicone release sheets, and controlled misting.'
  },
  ARCHIVAL_STUDIO: {
    tier: 'ARCHIVAL_STUDIO',
    displayName: 'Museum Archival Conservation Rig',
    costBasisUsd: 35.00,
    burnRiskPct: 0.5,
    expGainMultiplier: 2.0,
    maxGradeCeiling: 9.9,
    description: 'Precision vacuum heat table, ultrasonic humidification chamber, Taklon fiber erasers, and laboratory cold-weight racks.'
  }
};

export interface DIYPressResult {
  success: boolean;
  expGained: number;
  initialEstimatedGrade: number;
  finalEstimatedGrade: number;
  gradeChange: number;
  isDamaged: boolean;
  damageReason?: string;
  notes: string;
  potentialEasterEggId?: string;
}

/**
 * Executes a DIY Press session on an owned raw copy or practice book.
 * Labor is free in simulated cash, but carries real risk based on equipment and player skill level.
 */
export function executeDIYPress(params: {
  rawEstimatedGrade: number;
  playerPressingExp: number; // 0 to 1000+
  supplyTier: PressingSupplyTier;
  isPracticeBook?: boolean;  // True = low-stakes beater copy, no major capital loss
}): DIYPressResult {
  const {
    rawEstimatedGrade,
    playerPressingExp,
    supplyTier,
    isPracticeBook = false
  } = params;

  const supply = PRESSING_SUPPLY_REGISTRY[supplyTier];

  // Effective skill level (0 to 10)
  const skillLevel = Math.min(10, Math.floor(playerPressingExp / 100));

  // Base failure chance drops with player experience
  const effectiveBurnRisk = Math.max(0.2, (supply.burnRiskPct * (1 - skillLevel * 0.08)));

  const roll = Math.random() * 100;
  const isDamaged = roll < effectiveBurnRisk;

  // Base EXP gain
  let expGained = Math.round((isPracticeBook ? 40 : 80) * supply.expGainMultiplier);

  if (isDamaged) {
    // Damage drops grade by 0.5 to 2.0 grades
    const penalty = 0.5 + Math.random() * 1.5;
    const finalGrade = Math.max(1.5, Number((rawEstimatedGrade - penalty).toFixed(1)));
    
    const damageReasons = [
      "Excess heat caused slight gloss scorching and color blistering on back cover.",
      "Improper humidity balance resulted in cockling along the outer margins.",
      "Over-tightened clamp pressure induced a permanent spine roll stress fracture."
    ];
    const damageReason = damageReasons[Math.floor(Math.random() * damageReasons.length)];

    return {
      success: false,
      expGained: Math.round(expGained * 1.5), // Learn more from mistakes!
      initialEstimatedGrade: rawEstimatedGrade,
      finalEstimatedGrade: finalGrade,
      gradeChange: Number((finalGrade - rawEstimatedGrade).toFixed(1)),
      isDamaged: true,
      damageReason,
      notes: `DIY Failure: ${damageReason} Hard lesson learned.`
    };
  }

  // Success calculation
  // "Can't put lipstick on a pig": books <= 6.0 cannot gain more than 0.4
  let maxGain = 0.2;
  if (rawEstimatedGrade >= 9.2 && supply.maxGradeCeiling >= 9.8) {
    // Prime 9.8 candidate
    maxGain = 0.4; // Can jump 9.4 -> 9.8
  } else if (rawEstimatedGrade >= 7.5) {
    maxGain = 0.4;
  }

  // Skill roll for how much lift is achieved
  const skillRoll = Math.random() + (skillLevel * 0.05);
  let gain = 0;
  if (skillRoll > 0.6) {
    gain = maxGain;
  } else if (skillRoll > 0.2) {
    gain = 0.2;
  }

  const potentialNewGrade = Math.min(supply.maxGradeCeiling, rawEstimatedGrade + gain);
  const finalGrade = Number(potentialNewGrade.toFixed(1));

  let notes = "DIY press completed safely. Minor surface waviness successfully flattened.";
  if (gain >= 0.4) {
    notes = "Masterful pressing! Non-color-breaking dents completely smoothed out without gloss loss.";
  } else if (gain === 0) {
    notes = "Safe press, but underlying paper flaws were permanent ink breaks rather than pressable dents.";
  }

  return {
    success: true,
    expGained,
    initialEstimatedGrade: rawEstimatedGrade,
    finalEstimatedGrade: finalGrade,
    gradeChange: Number((finalGrade - rawEstimatedGrade).toFixed(1)),
    isDamaged: false,
    notes
  };
}
