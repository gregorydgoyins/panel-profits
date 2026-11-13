/**
 * lib/equity/float-model.ts
 *
 * The one survival / float / active-supply model. Replaces the era-constant print runs
 * in lib/comics/census.ts (resolveDynamicPrintRun) and lib/equity/scarcity-float.ts.
 *
 *   distribution  = print run on file (comic_print_runs: Comichron/Diamond estimate,
 *                   Statement of Ownership average, or a labelled extrapolation) — the CEILING
 *   census        = CGC copies graded at numeric grades (cgc_population) — the FLOOR
 *   survivors     = distribution × era survival rate, clamped to [census, distribution]  (ESTIMATE)
 *   raw float     = survivors − census, never below 0                                   (ESTIMATE)
 *   active supply = distinct clean sales in the last 12 months                          (MEASURED)
 *
 * No print run on file → distribution, survivors and raw float are null (never an era guess).
 */
import { createAdminServerClient } from "@/lib/supabase/admin";

export type PrintRunMethod = "DIAMOND_ESTIMATE" | "SOO_YEARLY_AVERAGE" | "EXTRAPOLATED";

export interface PrintRunRecord {
  printRun: number;
  method: PrintRunMethod;
  sourceNote: string;
  sourceUrl: string | null;
}

/** Survival-rate assumption by publication year. Labelled as an estimate wherever shown. */
export function eraSurvivalRate(year: number | null | undefined): { rate: number; era: string } | null {
  if (!year) return null;
  if (year < 1956) return { rate: 0.02, era: "Golden" };
  if (year <= 1969) return { rate: 0.08, era: "Silver" };
  if (year <= 1983) return { rate: 0.15, era: "Bronze" };
  if (year <= 1991) return { rate: 0.25, era: "Copper" };
  if (year <= 1999) return { rate: 0.45, era: "Modern" };
  return { rate: 0.7, era: "Post-Modern" };
}

export interface FloatProfile {
  distribution: number | null;
  distributionMethod: PrintRunMethod | null;
  distributionNote: string | null;
  distributionUrl: string | null;
  census: number;
  survivorsEstimate: number | null;
  survivalRate: number | null;
  rawFloatEstimate: number | null;
  activeSupply12m: number;
  /** Share of estimated survivors that traded in the last 12 months. */
  turnoverPct: number | null;
  /** Share of estimated survivors already slabbed by CGC. */
  slabbedPct: number | null;
}

export function computeFloatProfile(input: {
  printRun: PrintRunRecord | null;
  censusTotal: number | null | undefined;
  publicationYear: number | null | undefined;
  sales12m: number;
}): FloatProfile {
  const census = Math.max(0, Number(input.censusTotal ?? 0));
  const pr = input.printRun;
  const sr = eraSurvivalRate(input.publicationYear);
  let survivors: number | null = null;
  if (pr && pr.printRun > 0 && sr) {
    survivors = Math.min(pr.printRun, Math.max(census, Math.round(pr.printRun * sr.rate)));
  }
  const rawFloat = survivors != null ? Math.max(0, survivors - census) : null;
  return {
    distribution: pr?.printRun ?? null,
    distributionMethod: pr?.method ?? null,
    distributionNote: pr?.sourceNote ?? null,
    distributionUrl: pr?.sourceUrl ?? null,
    census,
    survivorsEstimate: survivors,
    survivalRate: survivors != null ? sr!.rate : null,
    rawFloatEstimate: rawFloat,
    activeSupply12m: input.sales12m,
    turnoverPct: survivors ? Number(((input.sales12m / survivors) * 100).toFixed(2)) : null,
    slabbedPct: survivors ? Number(((census / survivors) * 100).toFixed(1)) : null,
  };
}

export async function loadPrintRun(catalogId: string | null | undefined): Promise<PrintRunRecord | null> {
  if (!catalogId) return null;
  try {
    const { data, error } = await createAdminServerClient()
      .from("comic_print_runs")
      .select("print_run, method, source_note, source_url")
      .eq("catalog_id", catalogId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      printRun: Number(data.print_run),
      method: data.method as PrintRunMethod,
      sourceNote: String(data.source_note),
      sourceUrl: data.source_url ?? null,
    };
  } catch {
    return null;
  }
}
