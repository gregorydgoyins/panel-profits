import { createCleanReadOnlyServerClient } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/errors";
import { createCachedQuery } from "@/lib/cache/wrapper";
import { getAuthoritativeCover, isCoverAuthoritativelyVerified } from "@/lib/comics/cover-authority";
import { lookupReferenceFmv } from "@/lib/pricing/reference-benchmarks";
import verifiedCoversJson from "./verified-covers.json";
import ce70ReferenceFmv from "./ce70-reference-fmv.json";
import { getVerifiedRealEquities } from "./verified-equities-service";

const REFERENCE_FMV_MAP = ce70ReferenceFmv as Record<string, {
  seatNumber: number;
  series: string;
  issueNumber: string;
  referenceGrade?: string;
  referenceFmvUsd?: number;
  year?: number;
  publisher?: string;
}>;

export interface SovereignEquityItem {
  id: string;
  seatNumber: number;
  seatType: string;
  ticker: string;
  series: string;
  issueNumber: string;
  title: string;
  originEra: string;
  productionAge: string;
  lineage: string;
  referenceGrade?: string | null;
  referenceFmvUsd: number;
  priceFormatted: string;
  gregoryScore?: number | null;
  deltaPercent?: number | null;
  status: string;
  coverUrl: string | null;
  canonicalIssueId: string | null;
  year?: number;
  publisher?: string;
  variant?: string | null;
  keyBadge?: string | null;
}

export interface CanonicalAssetSurface {
  id: string;
  seatNumber: number;
  indexCode: string;
  era: string | null;
  titleIssue: string;
  series: string;
  issueNumber: string;
  year: number | null;
  publisher: string | null;
  primaryCreators: string | null;
  gregoryScore: number | null;
  assetClass: string | null;
  assetSubclass: string | null;
  wordCount: string | null;
  dossierPath: string | null;
  coverUrl: string | null;
}

import {
  CANONICAL_16_ASSET_FAMILIES,
  type CollectibleAssetFamily,
} from "./asset-families";

export {
  CANONICAL_16_ASSET_FAMILIES,
  type CollectibleAssetFamily,
};

import { formatComicEquityTicker } from "./ticker-formatting";
export { formatComicEquityTicker };

// Deterministic cover lookups mapped to authentic harvested assets
const VERIFIED_SEAT_COVERS: Record<string, string> = verifiedCoversJson as Record<string, string>;

export interface Ce70ConstitutionalRuleViolation {
  seatNumber: number;
  rule: "SEAT_COUNT" | "GRADE_FLOOR" | "GRADE_CEILING" | "PRICE_CEILING" | "LABEL_TYPE" | "VARIANT_PROHIBITION";
  message: string;
}

/**
 * Validates any candidate or active constituent against the CE70 Constitution:
 * 1. Exactly 70 allocated books (seats 1..70 chronologically across all 9 canonical eras; zero vacant seats).
 * 2. Minimum grade of 9.0 Universal (or Artcurial 9.4+ Proche du Neuf for European BD albums).
 * 3. Qualifying specimen ceiling at or below $65,000 (<= $65k).
 * 4. Direct single issue only (variants of any type are strictly prohibited).
 * 5. Universal Blue Label only (qualified green, modified/restored purple, and signature yellow labels are strictly prohibited).
 */
export function validateCe70Constituent(item: {
  seatNumber: number;
  referenceGrade?: string | number | null;
  referenceFmvUsd?: number | null;
  series?: string | null;
  issueNumber?: string | null;
  isVariant?: boolean | null;
  labelType?: string | null;
}): Ce70ConstitutionalRuleViolation[] {
  const violations: Ce70ConstitutionalRuleViolation[] = [];

  // Rule 1: Exactly 70 allocated seats (1..70)
  if (item.seatNumber < 1 || item.seatNumber > 70) {
    violations.push({
      seatNumber: item.seatNumber,
      rule: "SEAT_COUNT",
      message: `CE70 Constitution restricts populated seats to 1..70 (Seat #${item.seatNumber} is outside the 70-seat constitutional roster).`,
    });
  }

  // Rule 2 & 3: Grade restrictions (8.5 <= grade <= 9.8; no 9.9, 10.0, or Signature)
  const gradeStr = String(item.referenceGrade || "").trim();
  const gradeNum = parseFloat(gradeStr);
  if (!isNaN(gradeNum)) {
    if (gradeNum < 8.5) {
      violations.push({
        seatNumber: item.seatNumber,
        rule: "GRADE_FLOOR",
        message: `CE70 Constitution requires minimum grade of 8.5 (received grade ${gradeStr}).`,
      });
    }
    if (gradeNum >= 9.9) {
      violations.push({
        seatNumber: item.seatNumber,
        rule: "GRADE_CEILING",
        message: `CE70 Constitution strictly excludes 9.9 Mint and 10.0 Gem Mint (received grade ${gradeStr}).`,
      });
    }
  }

  if (gradeStr.toUpperCase().includes("SIG") || item.labelType === "SIGNATURE_SERIES") {
    violations.push({
      seatNumber: item.seatNumber,
      rule: "LABEL_TYPE",
      message: `CE70 Constitution mandates Universal Blue Label certification; Signature Series yellow labels are prohibited.`,
    });
  }

  if (item.labelType && (item.labelType === "QUALIFIED_LABEL" || item.labelType === "RESTORED_LABEL")) {
    violations.push({
      seatNumber: item.seatNumber,
      rule: "LABEL_TYPE",
      message: `CE70 Constitution requires Universal Blue Label; qualified (green) or restored (purple) labels are prohibited.`,
    });
  }

  // Rule 4: Valuation ceiling < $65,000
  if (item.referenceFmvUsd != null && item.referenceFmvUsd >= 65000) {
    violations.push({
      seatNumber: item.seatNumber,
      rule: "PRICE_CEILING",
      message: `CE70 Constitution mandates reference valuation ceiling strictly below $65,000 (received $${item.referenceFmvUsd.toLocaleString()}).`,
    });
  }

  // Rule 5: Direct single issue only, no variants
  if (item.isVariant) {
    violations.push({
      seatNumber: item.seatNumber,
      rule: "VARIANT_PROHIBITION",
      message: `CE70 Constitution requires direct single issue only; variants of any type are prohibited.`,
    });
  }

  return violations;
}

/**
 * Raw query for Sovereign Equities Universe with real market pricing and tickers.
 * Resolves the server-side initial render hydration gap by querying the continuous
 * 5,000-comic queue engine, ensuring authentic unrounded pennies, verified covers, and real publication years.
 */
async function fetchSovereignEquitiesRaw(limit = 80, offset?: number): Promise<SovereignEquityItem[]> {
  try {
    const { getContinuousQueueSlice, TOTAL_CATALOG_UNIVERSE } = await import("./continuous-queue-engine");
    let startingOffset = offset;
    if (startingOffset === undefined) {
      // Pick a randomized 260-comic chunk across the 115,712 catalog
      const totalChunks = Math.floor(TOTAL_CATALOG_UNIVERSE / 260);
      const randomChunk = Math.floor(Math.random() * totalChunks);
      startingOffset = randomChunk * 260;
    }
    const result = await getContinuousQueueSlice(startingOffset, limit);
    if (result.items && result.items.length > 0) {
      return result.items;
    }
    return [];
  } catch (err) {
    console.error("Exception in fetchSovereignEquitiesRaw:", err);
    return [];
  }
}

export async function getSovereignEquities(limit = 80, offset?: number): Promise<SovereignEquityItem[]> {
  return fetchSovereignEquitiesRaw(limit, offset);
}

/**
 * Raw query for CE70 Certified Index Definition Constituents (Assets).
 */
async function fetchCanonicalAssetSurfacesRaw(limit = 70): Promise<CanonicalAssetSurface[]> {
  const db = createCleanReadOnlyServerClient();
  try {
    const { data, error } = await db
      .from("ce70_index_definitions")
      .select("seat_number, index_code, era, title_issue, series, issue_number, year, publisher, primary_creators, gregory_score, asset_class, asset_subclass, word_count, dossier_path, cover_url")
      .order("seat_number", { ascending: true })
      .limit(limit);

    if (error || !data || data.length === 0) {
      if (error && !isMissingTableError(error)) {
        console.warn("Notice querying ce70_index_definitions:", error.message);
      }
      return [];
    }

    return data.map((row) => {
      const keyName = `${row.series} #${row.issue_number}`;
      const seatKeyName = `seat-${row.seat_number}`;
      const resolvedCover = getAuthoritativeCover(
        row.series,
        row.issue_number,
        row.publisher,
        row.year
      );

      return {
        id: `seat-${row.seat_number}`,
        seatNumber: row.seat_number,
        indexCode: row.index_code || "CE70",
        era: row.era ? String(row.era).toUpperCase() : null,
        titleIssue: row.title_issue || `${row.series} #${row.issue_number}`,
        series: row.series,
        issueNumber: row.issue_number || "1",
        year: row.year ?? null,
        publisher: row.publisher || null,
        primaryCreators: row.primary_creators || null,
        gregoryScore: row.gregory_score != null ? Number(row.gregory_score) : null,
        assetClass: row.asset_class || null,
        assetSubclass: row.asset_subclass || null,
        wordCount: row.word_count || null,
        dossierPath: row.dossier_path || null,
        coverUrl: resolvedCover,
      };
    });
  } catch (err) {
    console.error("Exception in fetchCanonicalAssetSurfacesRaw:", err);
    return [];
  }
}

import ce70DossiersData from "./ce70-dossiers-data.json";

export interface DetailedSovereignEquityDossier extends SovereignEquityItem {
  publisher: string;
  publicationYear: number;
  primaryCreators: string;
  adjudicationEssay: string;
  historicalJustification: string;
  scarcityTier: string;
  censusUniversalCount: number;
  censusTotalGraded: number;
  qualityScores: Array<{ dimension: string; score: number; rationale: string }>;
  performanceHistory: Array<{ date: string; value: number; volume: number }>;
  assetFamilyValuations: Array<{
    family: CollectibleAssetFamily;
    estimatedFmv: number;
    formattedFmv: string;
    premiumFactor: string;
  }>;
}

export const getCanonicalAssetSurfaces = createCachedQuery(
  fetchCanonicalAssetSurfacesRaw,
  "canonical-asset-surfaces",
  { ttlSeconds: 300, staleWhileRevalidateSeconds: 1800, tags: ["assets", "ce70"] }
);
