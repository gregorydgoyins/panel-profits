/**
 * Physical Inventory & Storage Format Specifications for Panel Profits
 * Establishes the authentic secondary-market container hierarchy:
 * Raw Stacks, Bagged & Boarded Mylar, Short Boxes, Long Boxes, and Certified Slab Cases.
 */

export type InventoryFormatType = 
  | 'LOOSE_RAW_STACK'
  | 'BAGGED_AND_BOARDED'
  | 'SHORT_BOX'
  | 'LONG_BOX'
  | 'CERTIFIED_SLAB_CASE';

export type PreservationGrade = 
  | 'ARCHIVAL_MYLAR'       // 2-mil Mylar + Acid-Free Board
  | 'STANDARD_POLY'        // Standard Polypropylene Bag + Board
  | 'UNPROTECTED_BARE';    // Bare paper, vulnerable to handling and shelf friction

export interface PhysicalContainerConfig {
  format: InventoryFormatType;
  displayName: string;
  minCapacity: number;
  maxCapacity: number;
  standardCapacity: number;
  weightLbs: number;
  handlingFrictionRisk: number; // 0.00 (archival safe) to 0.15 (high handling damage risk)
  liquidityTurnDays: number;   // Expected market turnover time
  bulkLotDiscountPct: number;  // Typical wholesale discount over single retail FMV
  description: string;
}

export const PHYSICAL_CONTAINER_REGISTRY: Record<InventoryFormatType, PhysicalContainerConfig> = {
  LOOSE_RAW_STACK: {
    format: 'LOOSE_RAW_STACK',
    displayName: 'Loose Raw Stack',
    minCapacity: 5,
    maxCapacity: 25,
    standardCapacity: 10,
    weightLbs: 2.5,
    handlingFrictionRisk: 0.12, // High risk of handling friction & spine dings
    liquidityTurnDays: 0,       // Instant cash turnover
    bulkLotDiscountPct: 35.0,   // 35% discount for buying unbagged bulk
    description: 'Unbagged raw issues direct from reader collections or garage cleanouts. High handling vulnerability.'
  },
  BAGGED_AND_BOARDED: {
    format: 'BAGGED_AND_BOARDED',
    displayName: 'Bagged & Boarded Units',
    minCapacity: 1,
    maxCapacity: 50,
    standardCapacity: 1,
    weightLbs: 0.25,
    handlingFrictionRisk: 0.01, // Negligible handling wear
    liquidityTurnDays: 1,       // Retail active turn
    bulkLotDiscountPct: 0.0,    // Standard retail baseline
    description: 'Individual comics preserved in protective poly/mylar sleeves with acid-free backing boards.'
  },
  SHORT_BOX: {
    format: 'SHORT_BOX',
    displayName: 'Standard Short Box',
    minCapacity: 140,
    maxCapacity: 180,
    standardCapacity: 160,
    weightLbs: 32.0,
    handlingFrictionRisk: 0.02,
    liquidityTurnDays: 3,       // Standard convention/dealer lot turn
    bulkLotDiscountPct: 20.0,   // 20% lot discount
    description: 'Standard corrugated archive short box holding ~160 bagged and boarded comics. Ideal for convention floor trading.'
  },
  LONG_BOX: {
    format: 'LONG_BOX',
    displayName: 'Industrial Long Box',
    minCapacity: 280,
    maxCapacity: 350,
    standardCapacity: 320,
    weightLbs: 65.0,
    handlingFrictionRisk: 0.03,
    liquidityTurnDays: 7,       // Bulk warehouse/estate lot turn
    bulkLotDiscountPct: 40.0,   // 40% wholesale lot discount
    description: 'Heavy industrial archive long box holding ~320 books. Sourced primarily from estate cleanouts and store inventory acquisitions.'
  },
  CERTIFIED_SLAB_CASE: {
    format: 'CERTIFIED_SLAB_CASE',
    displayName: 'Heavy-Duty Slab Case',
    minCapacity: 20,
    maxCapacity: 30,
    standardCapacity: 25,
    weightLbs: 45.0,
    handlingFrictionRisk: 0.00, // Encapsulated in ultrasonic sealed acrylic
    liquidityTurnDays: 5,       // High-ticket auction clearing
    bulkLotDiscountPct: 10.0,   // Tighter margins on certified graded slabs
    description: 'Reinforced foam-lined hard case designed for transporting encapsulated CGC/CBCS/PSA certified investment slabs.'
  }
};

export interface PhysicalBoxHolding {
  id: string;
  userId: string;
  format: InventoryFormatType;
  label: string;
  preservation: PreservationGrade;
  totalComicsCount: number;
  estimatedCostBasisUsd: number;
  currentEstimatedFmvUsd: number;
  acquiredAt: string;
  sourceVenue: string;
  isSealed: boolean;
  notes?: string | null;
}
