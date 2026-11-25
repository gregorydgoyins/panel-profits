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

/**
 * Documented U.S. comic industry average print run per issue by publication year/era,
 * used ONLY when an issue-specific publisher ledger, USPS Statement of Ownership, or
 * Diamond order count is not on file (never returns 0 / Unrecorded for US comics).
 * Sources: Publishers Weekly / Business Week (1942: ~15M/mo across 1,000+ issues), Market
 * Research Co. of America (1943-45: ~25M/mo), 1954 U.S. Senate Subcommittee (Kefauver) Report
 * (~800M-1.2B/yr), USPS Statements of Ownership (1960-88), and Comichron / Diamond annual totals.
 */
export function documentedIndustryAvgPrintRun(
  year: number | null | undefined,
): { printRun: number; basisLabel: string; sourceNote: string } | null {
  if (!year || year < 1933 || year > 2030) return null;
  if (year <= 1937) {
    return {
      printRun: 150_000,
      basisLabel: `${year} Industry Avg`,
      sourceNote: "Platinum Age U.S. newsstand industry average (~150k/issue; Comichron / ABC).",
    };
  }
  if (year <= 1941) {
    return {
      printRun: 200_000,
      basisLabel: `${year} Industry Avg`,
      sourceNote: "Early Golden Age U.S. newsstand industry average (~200k/issue; Comichron / trade press).",
    };
  }
  if (year === 1942) {
    return {
      printRun: 225_000,
      basisLabel: "1942 Industry Avg",
      sourceNote: "1942 U.S. comic industry average (~200k–250k/issue; ~15M/mo across 1,000+ issues, Publishers Weekly / Business Week / Comichron).",
    };
  }
  if (year <= 1945) {
    return {
      printRun: 300_000,
      basisLabel: `${year} Industry Avg`,
      sourceNote: "WWII Golden Age U.S. industry average (~25M/mo; Market Research Co. / Comichron).",
    };
  }
  if (year <= 1954) {
    return {
      printRun: 400_000,
      basisLabel: `${year} Industry Avg`,
      sourceNote: "Atomic Age peak U.S. industry average (~70–80M/mo; 1954 Senate Kefauver Report / Comichron).",
    };
  }
  if (year <= 1959) {
    return {
      printRun: 250_000,
      basisLabel: `${year} Industry Avg`,
      sourceNote: "Post-Code contraction U.S. industry average (~250k/issue; Comichron).",
    };
  }
  if (year <= 1969) {
    return {
      printRun: 250_000,
      basisLabel: `${year} Industry Avg`,
      sourceNote: "Silver Age U.S. industry average (~400–500M/yr; USPS Statements of Ownership / Comichron).",
    };
  }
  if (year <= 1977) {
    return {
      printRun: 175_000,
      basisLabel: `${year} Industry Avg`,
      sourceNote: "Early Bronze Age U.S. industry average (~300–350M/yr; USPS Statements of Ownership / Comichron).",
    };
  }
  if (year <= 1983) {
    return {
      printRun: 110_000,
      basisLabel: `${year} Industry Avg`,
      sourceNote: "Late Bronze Age U.S. industry average (~150–200M/yr; USPS Statements of Ownership / Comichron).",
    };
  }
  if (year <= 1991) {
    return {
      printRun: 100_000,
      basisLabel: `${year} Industry Avg`,
      sourceNote: "Copper Age U.S. industry average (~200–300M/yr across Direct Market + Newsstand; Comichron).",
    };
  }
  if (year <= 1995) {
    return {
      printRun: 125_000,
      basisLabel: `${year} Industry Avg`,
      sourceNote: "Early Modern speculator boom U.S. industry average (Comichron / Capital City).",
    };
  }
  if (year <= 2004) {
    return {
      printRun: 35_000,
      basisLabel: `${year} Industry Avg`,
      sourceNote: "Modern Direct Market U.S. industry average (~69M/yr; Comichron / Diamond).",
    };
  }
  if (year <= 2015) {
    return {
      printRun: 25_000,
      basisLabel: `${year} Industry Avg`,
      sourceNote: "Independent Age Direct Market U.S. industry average (~74M/yr; Comichron / Diamond).",
    };
  }
  return {
    printRun: 20_000,
    basisLabel: `${year} Industry Avg`,
    sourceNote: "Postmodern Age Direct Market U.S. industry average (~63M+/yr; Comichron / Diamond).",
  };
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
