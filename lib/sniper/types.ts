export type ComicEra =
  | "platinum"
  | "golden"
  | "atomic"
  | "silver"
  | "bronze"
  | "copper"
  | "modern"
  | "postmodern"
  | "indy";

export type AuctionSource =
  | "ebay"
  | "ebay_uk"
  | "ebay_ca"
  | "ebay_fr"
  | "ebay_de"
  | "ebay_au"
  | "heritage"
  | "mycomicshop"
  | "comiclink"
  | "comicconnect"
  | "hipcomic"
  | "mercari"
  | "metropolis"
  | "hakes"
  | "atomicavenue"
  | "shortboxed"
  | "whatnot"
  | "pristine"
  | "goldin"
  | "pwcc"
  | "propstore";

export type ComicEdition = "direct" | "newsstand" | "variant" | "convention" | "foil" | "all";

export type GradingCompany = "CGC" | "CBCS" | "PSA" | "PGX" | "EGS";

export interface SniperFilterProfile {
  // Era Targeting
  eras: ComicEra[];
  
  // Grade Range (High Grade Only: 9.4, 9.6, 9.8, 9.9, 10.0)
  minGrade: number; // e.g. 9.4
  maxGrade: number; // e.g. 10.0
  
  // Budget Guardrail (All-in: Bid + Shipping + Tax)
  minAllInCost?: number; // e.g. 50.00 (Hard floor: no penny-ante junk under $50)
  maxAllInBudget: number; // e.g. 150.00, 500.00, 2500.00
  
  // Auction House Sources
  sources?: AuctionSource[];

  // Max Time Window (Sniper Urgency)
  maxSecondsRemaining?: number; // e.g. 900 (15m), 1800 (30m), 3600 (1h)
  
  // Edition Form
  editions: ComicEdition[];
  newsstandOnly?: boolean;
  
  // Arbitrage Special Angles
  crackAndPressCandidate: boolean; // 9.4-9.6 with pressable grader defects
  damagedSlab98: boolean;          // 9.8 in cracked/scuffed case (reholder arb)
  crackedCasesOnly?: boolean;      // Filter specifically for cracked/damaged cases ($25 reholder play)
  misspelledOnly?: boolean;        // Filter specifically for misspelled titles/typos
  signedLegendary: boolean;        // Yellow label deceased creators (Lee, Kirby, Pérez, etc.)
  belowGradingCost: boolean;       // Books under $45 (selling for less than cost of grading)
  requireDoubleUpOnly?: boolean;   // Target 100%+ net ROI (double your cash or better)
  
  // Discipline & Impulse Controls
  requireProvenSales: boolean;     // STRICT: Rejects books with 0 sales history
  minDiscountPercent: number;      // e.g. 30% below FMV
  minHistoricalSalesCount: number; // Minimum comp depth (e.g. 3+ verified sales)
  requireImage?: boolean;          // STRICT: Only books with authentic auction photos allowed
  requireCheckedCert?: boolean;    // STRICT: Only books with verified checked certification numbers allowed
  
  // Optional Character / Series Focus (e.g., "green lantern", "iron man")
  seriesWhitelist?: string[];

  // Buy It Now (BIN) vs Live Auction Filter
  listingTypeFilter?: "all" | "auctions_only" | "bin_only";
}

import type { SlabLabel } from "./label-reader";

export interface SniperAdmissionEvidence {
  identityVerified: boolean;
  certificationVerified: boolean;
  sourceReconciled: boolean;
  historicalSalesVerified: boolean;
  mathematicsAudited: boolean;
  threePagesComplete: boolean;
  rawFmv: number;
  certificationCost: number;
  gradedFmv: number;
  intrinsicValue: number;
  speculativePremium: number;
  storySynopsis: string;
  storyBreakdown: string;
  issueVideos: string[];
  financialExplanations: string[];
  chartObservations: Array<{ date: string; price: number; source: string }>;
}

export interface RawAuctionListing {
  admissionEvidence?: SniperAdmissionEvidence;
  lotBooks?: import("./lot-valuation").LotBookValue[];
  /** Exact transcription of the slab label from the photo; null when not read/legible. */
  label?: SlabLabel | null;
  /** True when the census answer for this listing is already stored (even if the answer is "not found"). */
  censusResolved?: boolean;
  censusValue?: import("./census-population").GradeCensus | null;
  /** Realized-sale price for this slab's own grader, label type and grade (GoCollect); absent when no recorded sale. */
  gocollectPrice?: import("./gocollect-prices").GoCollectPrice;
  id: string;
  source: AuctionSource;
  title: string;
  /** Display-normalized title; original venue title remains in title. */
  normalizedTitle?: string;
  currentBid: number;
  shippingCost: number;
  bidCount: number;
  secondsRemaining: number;
  timeLeftStr?: string;
  url: string;
  imageUrl: string;
  certNumber?: string;
  sellerRating?: number;
  sellerUsername?: string;
  /** eBay's own flag: the seller accepts Best Offer on this listing */
  bestOfferEnabled?: boolean;
  graderNotes?: string;
  itemDescription?: string;
  anchorFmv?: number;
  fairMarketValue?: number;
  pricingSourceProvenance?: string;
  historicalComps?: Array<{ date: string; price: number; grade: number; venue: string }>;
  year?: number;
  era?: ComicEra;
  gradingCompany?: GradingCompany;
  resolvedGrade?: number;
  censusTotal?: number;
  censusCount98?: number;
  censusHigher?: number;
  censusScarcityTier?: string;
  isYellowLabel?: boolean;
  signerName?: string;
  signaturePremiumMultiplier?: number | null;
  // Buy It Now & Real-Time Bid Metrics
  listingType?: "Auction" | "BuyItNow";
  isBuyItNow?: boolean;
  buyItNowPrice?: number;
  isRealTimeLiveBid?: boolean;
  lastBidTimestamp?: number;
  // International & Foreign Currency Translation
  currency?: string;
  originalBid?: number;
  originalCurrencySymbol?: string;
  exchangeRateToUsd?: number;
  internationalRegion?: "US" | "UK" | "CA" | "FR" | "DE" | "AU";
  isCanadianPriceVariant?: boolean;
  isCanadianSuperhero?: boolean;
  isForeignLanguageEdition?: boolean;
  translatedTitle?: string;
  galleryImages?: string[];
  historicalSignificanceTier?: "MAJOR_KEY" | "MINOR_KEY" | "HISTORIC_LANDMARK" | "COVER_ICON" | "MILESTONE_CREATOR_RUN";
  historicalSignificanceLore?: string;
  longTermHoldingThesis?: string;
  gcdMetadata?: {
    writers?: string[];
    pencilers?: string[];
    coverArtists?: string[];
    publisher?: string;
    publicationDate?: string;
    storylines?: string;
  };
}

export interface CandidateEvaluation {
  lotBooks?: import("./lot-valuation").LotBookValue[];
  listing: RawAuctionListing;
  passed: boolean;
  rejectionReason?: string;
  gateFailed?: 1 | 2 | 3 | 4 | 5;
  
  // Resolved Identification
  normalizedTitle: string;
  resolvedSeries: string;
  resolvedIssue: string;
  resolvedYear?: number;
  resolvedEra: ComicEra;
  resolvedGrade: number;
  gradingCompany: GradingCompany;
  certNumber?: string;
  certVerificationUrl?: string;
  isYellowLabel: boolean;
  signerName?: string;
  isNewsstand: boolean;
  variantType?: string;
  isCrackedCase?: boolean;
  isMisspelled?: boolean;
  misspellingSnippet?: string;
  
  // Valuation Anchor & Spread
  anchorFmv: number;
  allInCost: number;
  dollarSpread: number;
  discountPercent: number;
  historicalComps: Array<{ date: string; grade: number; price: number; venue: string; title?: string; url?: string }>;

  // Buy It Now Sensibility & Real-Time Bid Metrics
  listingType?: "Auction" | "BuyItNow";
  isBuyItNow?: boolean;
  buyItNowPrice?: number;
  buyItNowUpsideDollars?: number;
  buyItNowUpsidePercent?: number;
  buyItNowNetProfit?: number;
  buyItNowSensibilityWhy?: string;
  isRealTimeLiveBid?: boolean;
  lastBidTimestamp?: number;
  
  // Explicit Reason Why This Is A Good Buy (Alpha Thesis)
  whyItsAGoodBuy: string;

  // Commercial Flipping Metrics & Win Multipliers
  targetWinPrice100Pct: number; // Price to sell for 100% Net Profit (The Double-Up / 2x)
  targetWinPrice50Pct: number;  // Price to sell for 50% Net Profit (1.5x)
  projectedNetProfit: number;   // Realized net profit on anchor FMV flip (after 13% platform fee)
  netRoiPercent: number;        // Net ROI % on flip
  liquidityVelocity: "HIGH_VELOCITY_TURN" | "MODERATE_LIQUIDITY" | "ILLIQUID_TRAP";
  liquidityTurnDays: number;    // Estimated turn time (e.g. 7-14 days vs 90+ days)
  isViableFlip: boolean;        // True = liquid real key; False = cheap horseshit/dead money
  keySignificanceNote: string;  // Landmark key / character milestone description

  // Arbitrage Strategy Badges
  specialPlay?:
    | "CRACK_AND_PRESS"
    | "REHOLDER_ARBITRAGE"
    | "CRACKED_CASE"
    | "DAMAGED_HOLDER"
    | "CANADIAN_PRICE_VARIANT"
    | "FOREIGN_LANGUAGE_KEY"
    | "MISSPELLED_KEY"
    | "LEGENDARY_SIGNATURE"
    | "HIGH_GRADE_NEWSSTAND"
    | "BELOW_GRADING_COST"
    | "DOUBLE_UP_KEY"
    | "STUMBLED_INTO_GREATNESS";
  strategySummary?: string;
  cgcGradingCostFloor?: number; // What it actually cost seller to grade ($30 modern + $15 ship = $45 floor)
  censusCount98?: number;       // Census population in 9.8
  censusTotal?: number;         // Total copies on Census across all grades
  censusHigher?: number;        // Copies 9.9/10.0 graded higher than 9.8
  label?: SlabLabel | null;     // exact transcription of the slab label
  gocollectPrice?: import("./gocollect-prices").GoCollectPrice; // realized-sale price for this slab's own grader/label/grade
  censusScarcityTier?: string;  // e.g. "Ultra Low Float (<25 Copies)", "Investment Grade"
  pricingSourceProvenance?: string; // Exact venue & methodology source for valuation
  signaturePremiumMultiplier?: number; // Verified signature multiplier over unsigned blue label
  lastSalePrice?: number;
  lastSaleDate?: string;
  
  verdict: "STRONG_BUY_SNIPE" | "CONSIDER" | "OVERPRICED" | "UNPROVEN_RISK" | "DISCARD";
  recommendedMaxBid: number;
  confidenceScore: number; // 0-100

  // Collector Lore, Historical Significance & GCD Canon
  galleryImages?: string[];
  historicalSignificanceTier?: "MAJOR_KEY" | "MINOR_KEY" | "HISTORIC_LANDMARK" | "COVER_ICON" | "MILESTONE_CREATOR_RUN";
  historicalSignificanceLore?: string;
  longTermHoldingThesis?: string;
  gcdMetadata?: {
    writers?: string[];
    pencilers?: string[];
    coverArtists?: string[];
    publisher?: string;
    publicationDate?: string;
    storylines?: string;
  };

  // Multi-Source Price Matrix (eBay vs ComicBase vs Panel Profits)
  priceMatrix?: PriceMatrixTier[];

  // Purchaser Due Diligence & Investopedia Valuation Lens
  investopediaLens?: DueDiligenceInvestopediaLens;

  // Video Intelligence & ComicBase Archival Mentions
  videoDossier?: ComicVideoDossier;
}

export interface PriceMatrixTier {
  grade: number | "Raw";
  gradeLabel: string;
  ebayPrice: number;
  ppFmv: number;
  cbPrice: number;
  gocollectPrice?: number;
  spreadPercent: number;
  isInspectedGrade?: boolean;
}

export interface DueDiligenceInvestopediaLens {
  term: string;
  category: "Arbitrage & Valuation" | "Liquidity & Float" | "Risk & Capital Preservation";
  definition: string;
  application: string;
  bidAskSpreadPercent: number;
  wholesaleBidUsd: number;
  retailAskUsd: number;
  marginHaircutPercent: number;
  capitalAssetPricingNote: string;
}

export interface ComicVideoDossier {
  hasVideo: boolean;
  comicBaseVideo?: {
    id: string;
    title: string;
    creatorOrSubject: string;
    type: "interview" | "retrospective";
    duration: number;
    videoUrl: string;
    headline: string;
    description: string;
  };
  youtubeQuery: string;
}

