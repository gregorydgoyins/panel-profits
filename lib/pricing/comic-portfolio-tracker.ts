/**
 * lib/pricing/comic-portfolio-tracker.ts
 *
 * Institutional Multi-Era Comic Portfolio Tracking & Asset Ledger Engine.
 *
 * Implements the 7 Historical Comic Eras:
 * 1. Platinum (1897-1937) - Physical survival trumps numerical grade
 * 2. Golden (1938-1955) - High baseline demand across all grades
 * 3. Silver (1956-1969) - Extreme high-grade multipliers (9.0+)
 * 4. Bronze (1970-1983) - 9.2 to 9.8 spread dictates volatility
 * 5. Copper (1984-1991) - High print runs, direct market expansion
 * 6. Modern (1992-1999) - Overproduction, 9.8 mandatory liquidity anchor
 * 7. Post-Modern (2000-Present) - Incentive variants, movie option catalysts
 *
 * Incorporates full transaction lifecycle:
 * Total Replacement Cost, Platform Friction Drag, Break-Even Threshold, and Net Realized ROI.
 */
import { ebayFinalValueFee, marginOfSafetyPct as coreMarginOfSafety } from "./canonical-underwriting-core";

export type ComicEra =
  | "Platinum"
  | "Golden"
  | "Atomic"
  | "Silver"
  | "Bronze"
  | "Copper"
  | "Modern"
  | "Independent"
  | "Post-Modern";

export interface EraProfile {
  era: ComicEra;
  startYear: number;
  endYear: number;
  valuationDynamic: string;
  liquidityGradeAnchor: string;
}

export const COMIC_ERA_PROFILES: Record<ComicEra, EraProfile> = {
  Platinum: {
    era: "Platinum",
    startYear: 1897,
    endYear: 1937,
    valuationDynamic: "Physical survival trumps numerical grading condition. Baseline rarity driven.",
    liquidityGradeAnchor: "RAW",
  },
  Golden: {
    era: "Golden",
    startYear: 1938,
    endYear: 1945,
    valuationDynamic: "Universal archetype demand. Low-grade incomplete books hold strong baseline value.",
    liquidityGradeAnchor: "4.0",
  },
  Atomic: {
    era: "Atomic",
    startYear: 1946,
    endYear: 1955,
    valuationDynamic: "Post-war genres (Horror, Crime, Sci-Fi) & EC pre-code scarcity. Mid-grades drive volume.",
    liquidityGradeAnchor: "6.0",
  },
  Silver: {
    era: "Silver",
    startYear: 1956,
    endYear: 1969,
    valuationDynamic: "Marvel silver boom. Extreme grade multipliers above 9.0.",
    liquidityGradeAnchor: "8.0",
  },
  Bronze: {
    era: "Bronze",
    startYear: 1970,
    endYear: 1983,
    valuationDynamic: "High census population volume. The 9.2 to 9.8 spread dictates volatility.",
    liquidityGradeAnchor: "9.2",
  },
  Copper: {
    era: "Copper",
    startYear: 1984,
    endYear: 1991,
    valuationDynamic: "Rise of direct-market shops and high print runs. High-grade condition sensitive.",
    liquidityGradeAnchor: "9.6",
  },
  Modern: {
    era: "Modern",
    startYear: 1992,
    endYear: 2003,
    valuationDynamic: "Speculation era. High supply; 9.8 is mandatory benchmark for raw asset liquidity.",
    liquidityGradeAnchor: "9.8",
  },
  Independent: {
    era: "Independent",
    startYear: 2004,
    endYear: 2016,
    valuationDynamic: "Creator-owned & indie publisher expansion (Image, Dark Horse, IDW). Short print runs.",
    liquidityGradeAnchor: "9.8",
  },
  "Post-Modern": {
    era: "Post-Modern",
    startYear: 2017,
    endYear: 2026,
    valuationDynamic: "Retailer ratio incentives and variant covers. Catalyzed by cinematic options.",
    liquidityGradeAnchor: "9.8",
  },
};

/**
 * Resolves the canonical comic era from publication year and optional publisher matching Panel Profits canon.
 * In Panel Profits canon:
 * - Platinum: Pre-1938
 * - Golden: 1938-1945
 * - Atomic: 1946-1955
 * - Silver: 1956-1969
 * - Bronze: 1970-1983
 * - Copper: 1984-1991
 * - Modern: 1992-2003
 * - Independent: Modern-era non-premier/independent publisher titles (e.g. Image, Dark Horse, IDW, Fantagraphics, Valiant, etc.) or 2004-2016 indie titles
 * - Post-Modern: 2004+ mainstream / 2017+ current
 */
export interface ResolveComicEraOptions {
  series?: string | null;
  issue?: string | null;
  publisher?: string | null;
}

/**
 * Resolves the canonical 9 comic eras matching Panel Profits Product Canon:
 * Platinum, Golden, Atomic, Silver, Bronze, Copper, Modern, Independent, Post-Modern.
 *
 * OWNER CANON / CANONICAL OVERRIDES:
 * - Detective Comics #1-26 (March 1937 - April 1939): Platinum Era (Pulp anthology prior to Batman debut).
 * - Detective Comics #27 (May 1939): Golden Age comic of the Platinum Era (Batman debut).
 * - Action Comics #1 (June 1938): Golden Age Inception Anchor (Superman debut).
 */
export function resolveComicEra(
  year: number | null | undefined,
  publisherOrOptions?: string | null | ResolveComicEraOptions
): ComicEra {
  let publisher: string | null | undefined = null;
  let series: string | null | undefined = null;
  let issue: string | null | undefined = null;

  if (typeof publisherOrOptions === "object" && publisherOrOptions !== null) {
    publisher = publisherOrOptions.publisher;
    series = publisherOrOptions.series;
    issue = publisherOrOptions.issue;
  } else if (typeof publisherOrOptions === "string") {
    publisher = publisherOrOptions;
  }

  // TIER 1: EXPLICIT PP CANONICAL ISSUE/SERIES OVERRIDES
  if (series && /detective\s+comics/i.test(series)) {
    const num = parseFloat(issue || "0");
    if (num > 0 && num < 27) {
      // Detective Comics #1-26 is Platinum Era
      return "Platinum";
    }
    if (num === 27) {
      // Detective Comics #27 is Golden Age comic of the Platinum Era
      return "Golden";
    }
  }

  if (series && /action\s+comics/i.test(series)) {
    const num = parseFloat(issue || "0");
    if (num === 1) {
      return "Golden";
    }
  }

  if (!year || !Number.isFinite(year)) return "Bronze";
  if (year < 1938) return "Platinum";
  if (year <= 1945) return "Golden";
  if (year <= 1955) return "Atomic";
  if (year <= 1969) return "Silver";
  if (year <= 1983) return "Bronze";
  if (year <= 1991) return "Copper";

  // Master age table: Modern 1992-2001, Independent 2002-2016, Post-Modern 2017+
  if (year <= 2001) return "Modern";
  if (year <= 2016) return "Independent";
  return "Post-Modern";
}

export interface PortfolioPositionInput {
  comicId: string;
  title: string;
  issue: string;
  publicationYear?: number;
  publisher?: string;
  targetGrade: string; // e.g. "9.8", "9.2", "4.0", "RAW"
  certificationCompany?: "CGC" | "CBCS" | "RAW";
  isSignatureSeries?: boolean; // CGC Yellow Label

  // Acquisition Layer
  rawPurchaseCost: number;
  salesTax: number;
  inboundShipping: number;

  // Capitalization Load
  pressingFee: number;
  gradingFee: number;
  gradingShippingAndInsurance: number;
  signatureWitnessFee?: number;

  // Liquidation / Target FMV Layer
  expectedGrossSaleFmv: number;
  platformFeePct?: number; // omit (or 13.25) for eBay's tiered schedule; else flat venue rate
  processingFeePct?: number; // default 2.9% or 0%
  fixedFeePerSale?: number; // non-eBay venues only (eBay per-order fee is in the core)
  outboundInsuredShipping?: number;

  // Temporal Tracking
  acquisitionDate: string; // YYYY-MM-DD
  targetLiquidationDate?: string; // YYYY-MM-DD
}

export interface PortfolioPositionEvaluation {
  comicId: string;
  title: string;
  issue: string;
  era: ComicEra;
  eraProfile: EraProfile;
  targetGrade: string;

  // Capitalized Cost
  rawCostBasis: number;
  processingLoad: number;
  totalReplacementCost: number; // Break-even before friction

  // Friction Drag
  estimatedPlatformFriction: number;
  netRealizedProceeds: number;

  // Returns
  netRealizedProfit: number;
  estimatedRoiPct: number;
  holdingDays: number;
  annualizedCagrPct: number;
  breakevenGrossSaleUsd: number;
  marginOfSafetyPct: number;
  status: "DEEP_PROFIT" | "MODERATE_GAIN" | "UNDERWATER" | "BREAK_EVEN";
}

/**
 * Evaluates an individual position with complete friction tracking.
 */
export function evaluatePortfolioPosition(
  pos: PortfolioPositionInput
): PortfolioPositionEvaluation {
  const era = resolveComicEra(pos.publicationYear, pos.publisher);
  const eraProfile = COMIC_ERA_PROFILES[era];

  // 1. Raw Cost Basis
  const rawCostBasis = Number(
    (pos.rawPurchaseCost + pos.salesTax + pos.inboundShipping).toFixed(2)
  );

  // 2. Processing Load
  const sigFee = pos.isSignatureSeries ? (pos.signatureWitnessFee ?? 25) : 0;
  const processingLoad = Number(
    (pos.pressingFee + pos.gradingFee + pos.gradingShippingAndInsurance + sigFee).toFixed(2)
  );

  // 3. Total Replacement Cost (True Cost Basis)
  const totalReplacementCost = Number((rawCostBasis + processingLoad).toFixed(2));

  // 4. Platform Friction — eBay tiered schedule (core) unless a different venue rate is given
  const gross = Math.max(0, pos.expectedGrossSaleFmv);
  const useEbay = pos.platformFeePct == null || pos.platformFeePct === 13.25;
  const pFeePct = (pos.platformFeePct ?? 13.25) / 100;
  const procPct = (pos.processingFeePct ?? 0) / 100;
  const fixed = useEbay ? 0 : (pos.fixedFeePerSale ?? 0);
  const outboundShip = pos.outboundInsuredShipping ?? 0;
  const frictionAt = (price: number): number =>
    (useEbay ? ebayFinalValueFee(price) : price * pFeePct) + price * procPct + fixed + outboundShip;

  const estimatedPlatformFriction = Number(frictionAt(gross).toFixed(2));

  // 5. Net Proceeds & Net Profit
  const netRealizedProceeds = Number(Math.max(0, gross - estimatedPlatformFriction).toFixed(2));
  const netRealizedProfit = Number((netRealizedProceeds - totalReplacementCost).toFixed(2));

  // 6. ROI %
  const estimatedRoiPct =
    totalReplacementCost > 0
      ? Number(((netRealizedProfit / totalReplacementCost) * 100).toFixed(2))
      : 0;

  // 7. Holding Days & CAGR
  const acqTime = Date.parse(pos.acquisitionDate) || Date.now();
  const liqTime = pos.targetLiquidationDate ? Date.parse(pos.targetLiquidationDate) : Date.now();
  const holdingDays = Math.max(1, Math.round((liqTime - acqTime) / 86_400_000));
  const holdingYears = holdingDays / 365.25;

  let annualizedCagrPct = estimatedRoiPct;
  if (holdingYears > 0.05 && totalReplacementCost > 0 && netRealizedProceeds > 0) {
    annualizedCagrPct = Number(
      ((Math.pow(netRealizedProceeds / totalReplacementCost, 1 / holdingYears) - 1) * 100).toFixed(2)
    );
  }

  // 8. Breakeven Gross Sale Price: lowest price whose net covers total cost (bisection)
  let breakevenGrossSaleUsd = totalReplacementCost;
  if (totalReplacementCost > 0 && pFeePct + procPct < 1) {
    let lo = 0, hi = Math.max(100, totalReplacementCost * 2);
    while (hi - frictionAt(hi) < totalReplacementCost) hi *= 2;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (mid - frictionAt(mid) >= totalReplacementCost) hi = mid; else lo = mid;
    }
    breakevenGrossSaleUsd = Number(hi.toFixed(2));
  }

  // 9. Margin of Safety % — how far the expected sale sits above breakeven (canonical definition)
  const marginOfSafetyPct = coreMarginOfSafety(pos.expectedGrossSaleFmv, breakevenGrossSaleUsd);

  let status: PortfolioPositionEvaluation["status"] = "BREAK_EVEN";
  if (estimatedRoiPct >= 35) status = "DEEP_PROFIT";
  else if (estimatedRoiPct > 0) status = "MODERATE_GAIN";
  else if (estimatedRoiPct < 0) status = "UNDERWATER";

  return {
    comicId: pos.comicId,
    title: pos.title,
    issue: pos.issue,
    era,
    eraProfile,
    targetGrade: pos.targetGrade,
    rawCostBasis,
    processingLoad,
    totalReplacementCost,
    estimatedPlatformFriction,
    netRealizedProceeds,
    netRealizedProfit,
    estimatedRoiPct,
    holdingDays,
    annualizedCagrPct,
    breakevenGrossSaleUsd,
    marginOfSafetyPct,
    status,
  };
}

/**
 * Generates an institutional CSV data export matching the user's template specification.
 */
export function generatePortfolioTemplateCsv(positions: PortfolioPositionEvaluation[]): string {
  const headers = [
    "Comic_ID",
    "Title",
    "Issue",
    "Age_Era",
    "Target_Grade",
    "Raw_Cost_Basis",
    "Processing_Load",
    "Total_Replacement_Cost",
    "Expected_Gross_Sale",
    "Estimated_Platform_Friction",
    "Net_Realized_Proceeds",
    "Net_Realized_Profit",
    "Estimated_ROI_Pct",
    "Holding_Days",
    "Annualized_CAGR_Pct",
    "Breakeven_Gross_Sale",
    "Margin_Of_Safety_Pct",
    "Status",
  ];

  const rows = positions.map((p) => [
    p.comicId,
    `"${p.title.replace(/"/g, '""')}"`,
    p.issue,
    p.era,
    p.targetGrade,
    p.rawCostBasis.toFixed(2),
    p.processingLoad.toFixed(2),
    p.totalReplacementCost.toFixed(2),
    (p.netRealizedProceeds + p.estimatedPlatformFriction).toFixed(2),
    p.estimatedPlatformFriction.toFixed(2),
    p.netRealizedProceeds.toFixed(2),
    p.netRealizedProfit.toFixed(2),
    p.estimatedRoiPct.toFixed(2),
    p.holdingDays,
    p.annualizedCagrPct.toFixed(2),
    p.breakevenGrossSaleUsd.toFixed(2),
    p.marginOfSafetyPct.toFixed(2),
    p.status,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
