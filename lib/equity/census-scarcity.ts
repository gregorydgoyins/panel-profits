import { createAdminServerClient } from "@/lib/supabase/admin";
import type { ScarcityTier } from "@/lib/design-system/colors";

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
