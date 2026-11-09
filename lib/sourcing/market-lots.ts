/**
 * Secondary Market Sourcing & Inventory Lot Engine for Panel Profits
 * Models wholesale sourcing channels:
 * - Liquidator Barn Finds (Blind unpicked long boxes, high variance)
 * - Convention Show Sharks (Curated short boxes, quick flips)
 * - Retail Back-Issue Bins (Bagged and boarded singles)
 * - 25 Institutional Desks (High-value authenticated slabs)
 */

import { InventoryFormatType, PHYSICAL_CONTAINER_REGISTRY } from "@/lib/inventory/types";
import { PlayerAppraisalModifiers } from "@/lib/grading/types";

export type SourcingCounterpartyType = 
  | 'ESTATE_LIQUIDATOR'      // Barn finds, garage cleanouts, blind long boxes
  | 'LOCAL_COMIC_SHOP'       // Retail bins, bagged & boarded wall books
  | 'CONVENTION_SHARK'       // Show floor flipper, fast cash, curated short boxes
  | 'INSTITUTIONAL_DESK';    // Wall Street comic brokerage firm, sovereign vault reserves

export interface MarketLotListing {
  id: string;
  counterpartyType: SourcingCounterpartyType;
  counterpartyName: string;
  format: InventoryFormatType;
  title: string;
  totalComicsCount: number;
  featuredAnchorSeries: string;
  featuredAnchorIssue: string;
  preservationState: 'ARCHIVAL_MYLAR' | 'STANDARD_POLY' | 'UNPROTECTED_BARE';
  isOpenForSampling: boolean; // True = cherry-picking allowed; False = blind estate box
  askingPriceUsd: number;
  estimatedFmvUsd: number;
  wholesaleDiscountPct: number;
  counterpartyNote: string;
  requiredCareerTier: number; // Academy career level needed to negotiate/buy
}

export const SOURCING_ARCHETYPES: Record<SourcingCounterpartyType, { displayName: string; defaultFormat: InventoryFormatType; defaultSampling: boolean }> = {
  ESTATE_LIQUIDATOR: {
    displayName: "Barn Find Liquidator",
    defaultFormat: 'LONG_BOX',
    defaultSampling: false // Blind estate boxes
  },
  LOCAL_COMIC_SHOP: {
    displayName: "Retail Shop Back-Issues",
    defaultFormat: 'BAGGED_AND_BOARDED',
    defaultSampling: true // Open inspection
  },
  CONVENTION_SHARK: {
    displayName: "Show Floor Shark",
    defaultFormat: 'SHORT_BOX',
    defaultSampling: true // Partial cherry-picking
  },
  INSTITUTIONAL_DESK: {
    displayName: "Brokerage Firm Desk",
    defaultFormat: 'CERTIFIED_SLAB_CASE',
    defaultSampling: true // Fully transparent ledger
  }
};

/**
 * Generates an authentic market lot for an anchor comic (e.g. Silver Surfer: Black #1)
 */
export function generateAnchorMarketLot(params: {
  comicId: string;
  series: string;
  issueNumber: string;
  rawFmvUsd: number;
  format?: InventoryFormatType;
  counterparty?: SourcingCounterpartyType;
  playerModifiers?: PlayerAppraisalModifiers;
}): MarketLotListing {
  const {
    series,
    issueNumber,
    rawFmvUsd,
    format = 'SHORT_BOX',
    counterparty = 'CONVENTION_SHARK',
    playerModifiers = { appraisalLevel: 0, negotiationLevel: 0, underwritingLevel: 0, hasPressingMastery: false, hasPrinterDefectEye: false }
  } = params;

  const container = PHYSICAL_CONTAINER_REGISTRY[format];
  const count = container.standardCapacity;

  // Base retail FMV of the lot contents
  const baseLotFmv = count * rawFmvUsd;

  // Wholesale counterparty discount
  let discountPct = container.bulkLotDiscountPct;
  if (counterparty === 'ESTATE_LIQUIDATOR') {
    discountPct = 55.0; // Deep estate discount
  } else if (counterparty === 'CONVENTION_SHARK') {
    discountPct = 25.0;
  } else if (counterparty === 'LOCAL_COMIC_SHOP') {
    discountPct = 10.0;
  }

  // Player negotiation bonus
  discountPct += playerModifiers.negotiationLevel * 3.0;
  discountPct = Math.min(75.0, discountPct);

  const askingPriceUsd = Math.round(baseLotFmv * (1 - discountPct / 100));

  const isOpen = counterparty !== 'ESTATE_LIQUIDATOR';

  let title = `${container.displayName} · ${series} Run`;
  let note = `Freshly surfaced lot featuring ${series} #${issueNumber}.`;
  let requiredTier = 1;

  if (format === 'LONG_BOX') {
    title = `Unsearched Estate Long Box (~${count} Books)`;
    note = "Barn find lot from private estate. Uninspected raw runs, high high-grade variance.";
    requiredTier = 3;
  } else if (format === 'SHORT_BOX') {
    title = `Curated Convention Short Box (~${count} Books)`;
    note = "Dealer curated modern/copper box with high-grade key runs bagged and boarded.";
    requiredTier = 1;
  } else if (format === 'LOOSE_RAW_STACK') {
    title = `Reader Copy Raw Stack (${count} Copies)`;
    note = "Unbagged reader copies straight off the show table. Immediate cash turn.";
    requiredTier = 0;
  } else if (format === 'CERTIFIED_SLAB_CASE') {
    title = `Institutional Slab Flight (${count} Graded Units)`;
    note = "Encapsulated investment-grade CGC 9.8 inventory from brokerage syndicate.";
    requiredTier = 4;
  }

  return {
    id: `LOT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
    counterpartyType: counterparty,
    counterpartyName: SOURCING_ARCHETYPES[counterparty].displayName,
    format,
    title,
    totalComicsCount: count,
    featuredAnchorSeries: series,
    featuredAnchorIssue: issueNumber,
    preservationState: format === 'LOOSE_RAW_STACK' ? 'UNPROTECTED_BARE' : 'STANDARD_POLY',
    isOpenForSampling: isOpen,
    askingPriceUsd,
    estimatedFmvUsd: Math.round(baseLotFmv),
    wholesaleDiscountPct: discountPct,
    counterpartyNote: note,
    requiredCareerTier: requiredTier
  };
}
