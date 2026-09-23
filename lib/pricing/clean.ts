import { createCleanReadOnlyServerClient } from "@/lib/supabase/admin";
import type { Grade } from "./source-ladder";

export type CleanPricingEvidence = {
  grades: Partial<Record<Grade, number>>;
  sources: Set<string>;
  observationCount: number;
};

export async function getCleanPricingEvidence(variantId: string): Promise<CleanPricingEvidence> {
  const db = createCleanReadOnlyServerClient();
  const { data, error } = await db
    .from("comic_market_instrument_grade_prices")
    .select("grade,price_usd,source_id")
    .eq("variant_id", variantId)
    .gt("price_usd", 0);

  if (error) {
    return { grades: {}, sources: new Set(), observationCount: 0 };
  }

  const grades: Partial<Record<Grade, number>> = {};
  const sources = new Set<string>();
  for (const row of data || []) {
    const grade = String(row.grade) as Grade;
    const price = Number(row.price_usd);
    if (price > 0 && !grades[grade]) grades[grade] = price;
    if (row.source_id) sources.add(row.source_id);
  }
  return { grades, sources, observationCount: data?.length || 0 };
}
