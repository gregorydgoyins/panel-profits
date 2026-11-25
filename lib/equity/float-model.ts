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
 * Year-by-year documented U.S. comic book industry average print run per issue (1935–1962),
 * closing the pre-USPS Statement of Ownership blind spot using contemporaneous trade press,
 * ABC/S-M News audits, 1954 Senate Kefauver Subcommittee data, 1960-62 USPS filings,
 * Bradford W. Wright (Comic Book Nation), Jean-Paul Gabilliet (Of Comics and Men), and Comichron.
 */
export const HISTORICAL_YEAR_AVG_PRINT_RUN: Record<number, { printRun: number; sourceNote: string }> = {
  1935: { printRun: 150_000, sourceNote: "1935 Platinum Age U.S. newsstand avg (~150k/issue; Comichron / ABC)." },
  1936: { printRun: 150_000, sourceNote: "1936 Platinum Age U.S. newsstand avg (~150k/issue; Comichron / ABC)." },
  1937: { printRun: 150_000, sourceNote: "1937 U.S. newsstand avg (~2–3M printed/mo across ~180 issues; Famous Funnies ABC / Comichron)." },
  1938: { printRun: 190_000, sourceNote: "1938 U.S. newsstand avg (~3–5M printed/mo across ~275 issues; Action #1 ~200k–250k)." },
  1939: { printRun: 210_000, sourceNote: "1939 U.S. newsstand avg (~7–10M printed/mo across ~500 issues; Superman 500k+)." },
  1940: { printRun: 200_000, sourceNote: "1940 U.S. newsstand avg (~12–13M printed/mo across ~750 issues; trade press / Comichron)." },
  1941: { printRun: 215_000, sourceNote: "1941 U.S. newsstand avg (~14–18M printed/mo across ~900 issues; Cap #1 / Cap Marvel >1M)." },
  1942: { printRun: 225_000, sourceNote: "1942 U.S. industry avg (~200k–250k/issue; ~15M sold/mo across 1,000+ issues; Publishers Weekly / Business Week / Gabilliet / Comichron)." },
  1943: { printRun: 310_000, sourceNote: "1943 U.S. industry avg (~25M sold / ~30M printed/mo across ~1,150 issues; Market Research Co. / Wright)." },
  1944: { printRun: 310_000, sourceNote: "1944 U.S. industry avg (~33M printed/mo across ~1,300 issues; WPB L-244 cap + military PX demand)." },
  1945: { printRun: 330_000, sourceNote: "1945 U.S. industry avg (~40M printed/mo across ~1,450 issues; post-WWII paper decontrol)." },
  1946: { printRun: 410_000, sourceNote: "1946 U.S. industry avg (~55M printed/mo across ~1,600 issues; post-war expansion)." },
  1947: { printRun: 430_000, sourceNote: "1947 U.S. industry avg (~62M printed/mo across ~1,750 issues; S-M News Box Score / ABC audits)." },
  1948: { printRun: 430_000, sourceNote: "1948 U.S. industry avg (~68M printed/mo across ~1,900 issues; S-M News Box Score / ABC audits)." },
  1949: { printRun: 410_000, sourceNote: "1949 U.S. industry avg (~72M printed/mo across ~2,100 issues; ABC group audits / Comichron)." },
  1950: { printRun: 415_000, sourceNote: "1950 U.S. industry avg (~85M printed/mo across ~2,400 issues; Comichron / industry estimates)." },
  1951: { printRun: 400_000, sourceNote: "1951 U.S. industry avg (~90M printed/mo across ~2,700 issues; Korean War / EC surge)." },
  1952: { printRun: 390_000, sourceNote: "1952 U.S. industry avg (~100M printed/mo across ~3,100 issues; all-time boom, Comichron / Wright)." },
  1953: { printRun: 400_000, sourceNote: "1953 U.S. industry avg (~105M printed/mo across ~3,100 issues; all-time peak, Dell WDC&S 3M/mo)." },
  1954: { printRun: 400_000, sourceNote: "1954 U.S. industry avg (~100M printed/mo across ~3,000 issues; U.S. Senate Kefauver Subcommittee Report)." },
  1955: { printRun: 250_000, sourceNote: "1955 U.S. industry avg (~48M printed/mo across ~2,300 issues; post-Comics Code contraction)." },
  1956: { printRun: 240_000, sourceNote: "1956 U.S. industry avg (~42M printed/mo across ~2,100 issues; post-Code stabilization)." },
  1957: { printRun: 225_000, sourceNote: "1957 U.S. industry avg (~36M printed/mo across ~1,900 issues; American News Co. distributor collapse)." },
  1958: { printRun: 235_000, sourceNote: "1958 U.S. industry avg (~33M printed/mo across ~1,700 issues; post-ANC trough)." },
  1959: { printRun: 235_000, sourceNote: "1959 U.S. industry avg (~26M sold / ~32M printed/mo across ~1,650 issues; Comichron trade data)." },
  1960: { printRun: 275_000, sourceNote: "1960 U.S. industry avg (~42M printed/mo across ~1,800 issues; first mandatory USPS Statements of Ownership)." },
  1961: { printRun: 260_000, sourceNote: "1961 U.S. industry avg (~37M printed/mo across ~1,700 issues; USPS Statements of Ownership / Comichron)." },
  1962: { printRun: 250_000, sourceNote: "1962 U.S. industry avg (~35M printed/mo across ~1,650 issues; 12¢ cover shift, USPS / Comichron)." },
};

/**
 * Documented U.S. comic industry average print run per issue by publication year/era,
 * used ONLY when an issue-specific publisher ledger, USPS Statement of Ownership, or
 * Diamond order count is not on file.
 */
export function documentedIndustryAvgPrintRun(
  year: number | null | undefined,
): { printRun: number; basisLabel: string; sourceNote: string } | null {
  if (!year || year < 1933 || year > 2030) return null;
  const exactYear = HISTORICAL_YEAR_AVG_PRINT_RUN[year];
  if (exactYear) {
    return {
      printRun: exactYear.printRun,
      basisLabel: `${year} Industry Avg`,
      sourceNote: exactYear.sourceNote,
    };
  }
  if (year < 1935) {
    return {
      printRun: 150_000,
      basisLabel: `${year} Industry Avg`,
      sourceNote: "Early Platinum Age U.S. newsstand industry average (~150k/issue; Comichron).",
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
