/**
 * Easter Egg & Opportunity Engine for Panel Profits
 * Grounded in canonical architecture: PANEL_PROFITS_EASTER_EGG_AND_OPPORTUNITY_ENGINE_SOL_XHIGH.md
 * 
 * Rules:
 * - Easter Eggs are historically grounded publishing anomalies and relationships, not cheap video game loot drops.
 * - Triggered organically across:
 *   1. CONSERVATION / PRESSING (e.g. Double Cover discovered during disassembly)
 *   2. ESTATE UNBOXING (e.g. Upside-down printer proof or Mile High church pedigree stamp in a long box)
 *   3. AUCTION FLOOR / SNIPER (e.g. Misspelled listing title allowing deep wholesale buy)
 *   4. RAW ARCHIVE (e.g. Uncataloged Mark Jewelers military insert in the centerfold)
 */

export type EasterEggClass = 
  | 'CONSERVATION_DISCOVERY'  // Discovered during book pressing or slabbing disassembly
  | 'ESTATE_UNBOXING'         // Discovered inside a barn find or estate long box
  | 'AUCTION_ANOMALY'         // Discovered on the public trading floor / sniper
  | 'PUBLICATION_VARIANT';    // Discovered inside a raw stack run

export interface EasterEggCandidate {
  id: string;
  eggClass: EasterEggClass;
  title: string;
  triggerEvent: string;
  narrativeClue: string;
  historicalContext: string;
  marketConsequenceDescription: string;
  fmvMultiplier: number; // e.g. 2.5x for Double Cover, 1.8x for Mark Jewelers, 0.55x for mislisted auction buy
  requiresSkillCheck: boolean;
  minSkillLevelRequired: number; // If player is above or below, outcome shifts
}

export const CANONICAL_EASTER_EGGS: Record<string, EasterEggCandidate> = {
  DOUBLE_COVER_SURPRISE: {
    id: 'DOUBLE_COVER_SURPRISE',
    eggClass: 'CONSERVATION_DISCOVERY',
    title: 'Manufacturing Anomaly: Factory Double Cover',
    triggerEvent: 'PRESSING_DISASSEMBLY',
    narrativeClue: 'While carefully preparing the staple area for pressing, the outer cover separates to reveal a second, pristine identical cover underneath.',
    historicalContext: 'During the high-speed print runs of the copper and modern eras, printer feed errors occasionally stapled a duplicate cover wrap onto the interior text block.',
    marketConsequenceDescription: 'Recognized on CGC/CBCS labels as a certified manufacturing error. Commands an immediate 2.5x premium over single-cover census FMV.',
    fmvMultiplier: 2.5,
    requiresSkillCheck: true,
    minSkillLevelRequired: 2
  },
  UPSIDE_DOWN_PRINTER_PROOF: {
    id: 'UPSIDE_DOWN_PRINTER_PROOF',
    eggClass: 'ESTATE_UNBOXING',
    title: 'Factory Inversion: Inverted Centerfold / Cover',
    triggerEvent: 'ESTATE_BOX_OPEN',
    narrativeClue: 'Tucked upside-down between ordinary back issues is a copy bound inverted at the bindery. Most readers discarded them; this one survived.',
    historicalContext: 'Bindery folder misfeeds created rare inverted copies that escaped quality control before newsstand delivery.',
    marketConsequenceDescription: 'A classic oddity key sought by niche variant specialists. Great practice book for learning or valuable oddity sale.',
    fmvMultiplier: 1.75,
    requiresSkillCheck: true,
    minSkillLevelRequired: 1
  },
  MARK_JEWELERS_INSERT: {
    id: 'MARK_JEWELERS_INSERT',
    eggClass: 'PUBLICATION_VARIANT',
    title: 'Military Base Variant: Mark Jewelers Insert',
    triggerEvent: 'RAW_INSPECTION',
    narrativeClue: 'Flipping through the interior reveals a thick, 16-page glossy jewelry insert with ring sizers bound into the center staples.',
    historicalContext: 'Distributed exclusively to military commissaries and bases overseas in small quantities (approx. 5% of direct market print run).',
    marketConsequenceDescription: 'Highly coveted regional variant. Surviving census in NM 9.4+ is a fraction of standard direct market copies.',
    fmvMultiplier: 2.2,
    requiresSkillCheck: true,
    minSkillLevelRequired: 2
  },
  PEDIGREE_CHURCH_STAMP: {
    id: 'PEDIGREE_CHURCH_STAMP',
    eggClass: 'ESTATE_UNBOXING',
    title: 'Historic Provenance: Uncataloged Pedigree Archive Stamp',
    triggerEvent: 'ESTATE_BOX_OPEN',
    narrativeClue: 'A tiny, crisp ink stamp on the upper margin of the back cover matches an unrecorded distributor collection archive from 1968.',
    historicalContext: 'Major historical collections (like the Edgar Church / Mile High collection) gained legendary provenance from distributor inventory stamps.',
    marketConsequenceDescription: 'Unlocks Pedigree certification eligibility at CGC, transforming an ordinary raw holding into an institutional asset.',
    fmvMultiplier: 3.0,
    requiresSkillCheck: true,
    minSkillLevelRequired: 3
  },
  MISLISTED_AUCTION_TYPO: {
    id: 'MISLISTED_AUCTION_TYPO',
    eggClass: 'AUCTION_ANOMALY',
    title: 'Floor Typo: Misspelled Apex Key Listing',
    triggerEvent: 'AUCTION_SURVEILLANCE',
    narrativeClue: 'An estate seller listed an unpressed key issue under an erroneous series title with no bids and an imminent countdown timer.',
    historicalContext: 'Real-world snipers routinely exploit seller title typos that evade automated search alerts and scraper bots.',
    marketConsequenceDescription: 'Allows executing an instantaneous sniper buy at 45% below Sovereign FMV before automated algorithms catch up.',
    fmvMultiplier: 0.55, // Purchase price is 45% discount
    requiresSkillCheck: false,
    minSkillLevelRequired: 0
  }
};

/**
 * Checks for a potential Easter Egg encounter during a game event
 */
export function rollEasterEggOpportunity(params: {
  event: 'PRESSING_DISASSEMBLY' | 'ESTATE_BOX_OPEN' | 'AUCTION_SURVEILLANCE' | 'RAW_INSPECTION';
  playerSkillLevel?: number; // 0 to 10
  subscriptionStage?: number; // 0 = Free, 1 = Stage I, 2 = Stage II, 3 = Stage III
}): EasterEggCandidate | null {
  const { event, playerSkillLevel = 0 } = params;

  // Authentic rare probability (approx 4-8% on qualifying actions)
  const roll = Math.random() * 100;
  if (roll > 7.0) {
    return null; // No Easter Egg on this turn
  }

  // Filter candidates matching the trigger event
  const eligible = Object.values(CANONICAL_EASTER_EGGS).filter(e => e.triggerEvent === event);
  if (eligible.length === 0) return null;

  const candidate = eligible[Math.floor(Math.random() * eligible.length)];

  // Check if player recognizes significance based on their skill/career stage
  if (candidate.requiresSkillCheck && playerSkillLevel < candidate.minSkillLevelRequired) {
    // Player encountered it, but lacks experience to recognize the full value!
    // Creates realistic missed opportunity narrative or upside-down practice dilemma
    return {
      ...candidate,
      title: `${candidate.title} (Unrecognized Curio)`,
      narrativeClue: `${candidate.narrativeClue} You notice something unusual about this copy, but without advanced appraisal credentials, you aren't certain whether it's a defect or a rare treasure.`,
      fmvMultiplier: 1.0 // Unrecognized for now
    };
  }

  return candidate;
}
