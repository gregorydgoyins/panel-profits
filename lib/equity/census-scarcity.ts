import { createAdminServerClient } from "@/lib/supabase/admin";
import type { ScarcityTier } from "@/lib/design-system/colors";

export interface UnifiedScarcityInput {
  totalGraded: number;
  totalAllLabels?: number | null;
  exact98Count: number;
  highGradeCount: number;
  printRunTotal?: number | null;
  rawFmvUsd?: number | null;
  anchorFmvUsd?: number | null;
  pubYear?: number | null;
  gradeGapTier?: ScarcityTier | null;
}

/**
 * Single unified scarcity classifier shared by both the Hero badge and CensusBanner
 * so they never disagree:
 *  - Modern Anti-Census Illusion Gate: post-1979 books with low raw/anchor values
 *    (raw < $100 and anchor < $250) have low CGC counts due to submission apathy,
 *    not true scarcity.
 *  - Vintage / economically-incentivized books (pre-1980, or raw >= $100, or anchor >= $250):
 *    graded census vs. print run (<0.1% graded -> Mythic) and apex high-grade population
 *    (<=5 apex slabs or <=25 total Universal -> Mythic; <=25 apex or <=250 Universal -> Legendary;
 *    <=50 -> Epic; <=100 -> Rare; <=500 -> Uncommon; else Common).
 */
export function resolveUnifiedScarcityTier(input: UnifiedScarcityInput): ScarcityTier | null {
  const {
    totalGraded,
    totalAllLabels,
    exact98Count,
    highGradeCount,
    printRunTotal,
    rawFmvUsd,
    anchorFmvUsd,
    pubYear,
    gradeGapTier,
  } = input;

  if (!totalGraded || totalGraded <= 0) {
    return gradeGapTier ?? null;
  }

  const allLabels = totalAllLabels && totalAllLabels > 0 ? totalAllLabels : totalGraded;
  const isVintageEra = pubYear != null && pubYear < 1980;
  const hasGradingIncentive =
    isVintageEra ||
    (rawFmvUsd != null && rawFmvUsd >= 100) ||
    (anchorFmvUsd != null && anchorFmvUsd >= 250);

  if (!hasGradingIncentive) {
    // Modern low-value books: guard against submission-apathy "Census Illusion"
    if (gradeGapTier === "uncommon" && totalGraded >= 250) return "uncommon";
    return "common";
  }

  const apexCount = exact98Count > 0 ? exact98Count : highGradeCount;
  const gradedRatioPct =
    printRunTotal != null && printRunTotal > 0 ? (allLabels / printRunTotal) * 100 : null;

  if (
    totalGraded <= 25 ||
    (apexCount > 0 && apexCount <= 5) ||
    (gradedRatioPct != null && gradedRatioPct < 0.1) ||
    (apexCount === 0 && totalGraded <= 250)
  ) {
    return "mythic";
  }
  if (
    (apexCount > 0 && apexCount <= 25) ||
    apexCount === 0 ||
    totalGraded <= 250 ||
    (gradedRatioPct != null && gradedRatioPct < 0.5)
  ) {
    return "legendary";
  }
  if ((apexCount > 0 && apexCount <= 50) || totalGraded <= 500) {
    return "epic";
  }
  if ((apexCount > 0 && apexCount <= 100) || totalGraded <= 1000) {
    return "rare";
  }
  if ((apexCount > 0 && apexCount <= 500) || totalGraded <= 2500) {
    return "uncommon";
  }
  return "common";
}

/**
 * Scarcity tier from the CGC census-gap method (table cgc_issue_scarcity_v2):
 * the issue's average CGC grade (NG/PG/CVR count as 0, snapped to the CGC ladder)
 * versus its series average. Gap <0.5 common, 0.5–1 uncommon, 1–2 rare, 2–3 epic,
 * 3–4 legendary, ≥4 mythic. Null when the series is too thin to rate — no tier shown.
 */
export async function loadCensusScarcityTier(populationId: number | null | undefined): Promise<{
  tier: ScarcityTier | null;
  gradeGap: number | null;
  avgGrade: number | null;
  seriesAvg: number | null;
} | null> {
  if (!populationId) return null;
  try {
    const { data, error } = await createAdminServerClient()
      .from("cgc_issue_scarcity_v2")
      .select("tier, grade_gap, avg_grade, series_avg")
      .eq("population_id", populationId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      tier: (data.tier as ScarcityTier | null) ?? null,
      gradeGap: data.grade_gap != null ? Number(data.grade_gap) : null,
      avgGrade: data.avg_grade != null ? Number(data.avg_grade) : null,
      seriesAvg: data.series_avg != null ? Number(data.series_avg) : null,
    };
  } catch {
    return null;
  }
}
