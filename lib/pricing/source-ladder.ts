import type { ComicRecord } from "@/lib/comics/types";

export const GRADES = [
  "RAW",
  "0.5",
  "1.0",
  "1.5",
  "1.8",
  "2.0",
  "2.5",
  "3.0",
  "3.5",
  "4.0",
  "4.5",
  "5.0",
  "5.5",
  "6.0",
  "6.5",
  "7.0",
  "7.5",
  "8.0",
  "8.5",
  "9.0",
  "9.2",
  "9.4",
  "9.6",
  "9.8",
  "9.9",
  "10.0",
] as const;
export type Grade = (typeof GRADES)[number];

function positivePrice(input: unknown): number | null {
  if (typeof input !== "string" && typeof input !== "number") return null;
  const raw = typeof input === "string" ? input.trim().replace(/^\$/, "").replace(/,/g, "") : input;
  if (raw === "") return null;
  const number = Number(raw);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export interface ExecutionSpreads {
  buy: number | null;
  sell: number | null;
}

/**
 * Reads exact grade market values from authentic Panel Profits fields.
 * Extracts explicitly stored Panel Profits market grades including RAW.
 * Supports PriceCharting ladder embedded in panel_profits_data.
 */
export function panelProfitsGrades(comic: Partial<ComicRecord>): Partial<Record<Grade, number>> {
  const result: Partial<Record<Grade, number>> = {};
  if (!comic.panel_profits_data) return result;

  // Extract RAW (ungraded / loose) market price
  const rawCandidateKeys = [
    "PP - Grade RAW Market Price",
    "PP - Ungraded Market Price",
    "PP - Raw Market Price",
    "raw_market_price",
    "ungraded_market_price",
    "ungraded_value",
    "raw_price",
    "raw",
    "ungraded",
    "loose",
    "loose_price",
    "used_price",
  ];
  for (const key of rawCandidateKeys) {
    let stored = positivePrice(comic.panel_profits_data[key]);
    if (stored === null && comic.panel_profits_data?.pricecharting) {
      stored = positivePrice(comic.panel_profits_data.pricecharting[key] || comic.panel_profits_data.pricecharting.raw);
    }
    if (stored !== null) {
      result["RAW"] = stored;
      break;
    }
  }

  for (const grade of GRADES) {
    if (grade === "RAW") continue;
    const gradeKey = grade.replace(".", "_");
    const candidateKeys = [
      `PP - Grade ${grade} Market Price`,
      `grade_${gradeKey}_value`,
      `grade_${gradeKey}`,
      `pp_grade_${gradeKey}_price`,
      `${grade}_nm`,
      grade,
    ];

    for (const key of candidateKeys) {
      let stored = positivePrice(comic.panel_profits_data[key]);
      if (stored === null && comic.panel_profits_data?.pricecharting) {
        stored = positivePrice(
          comic.panel_profits_data.pricecharting[key] ||
          comic.panel_profits_data.pricecharting[`grade_${gradeKey}`] ||
          comic.panel_profits_data.pricecharting[grade]
        );
      }
      if (stored !== null) {
        result[grade] = stored;
        break;
      }
    }
  }

  const promoted = positivePrice(comic.pp_grade_9_8_price);
  if (promoted !== null) result["9.8"] = promoted;
  return result;
}

/**
 * Reads ComicBase 1.1M dataset pricing independently.
 * Extracts catalog guide valuation for RAW and standard Near Mint (9.2) loose condition.
 */
export function comicBaseGrades(comic: Partial<ComicRecord>): Partial<Record<Grade, number>> {
  const result: Partial<Record<Grade, number>> = {};
  if (!comic.comicbase_data && !comic.comicbase_price) return result;

  const cbPrice = positivePrice(
    comic.comicbase_data?.["ComicBase - Grade RAW"] ||
    comic.comicbase_data?.["CB - Raw Price"] ||
    comic.comicbase_data?.["CB - Ungraded Price"] ||
    comic.comicbase_data?.["CB - Price"] ||
    comic.comicbase_price
  );

  if (cbPrice !== null) {
    result["RAW"] = cbPrice;
    // Map ComicBase standard guide condition (Near Mint / NM) to 9.2
    const condition = String(comic.comicbase_data?.["CB - Condition"] || "").toUpperCase().trim();
    if (condition === "NM" || condition === "NEAR MINT" || !condition) {
      result["9.2"] = cbPrice;
    } else if (condition === "VF" || condition === "VERY FINE") {
      result["8.0"] = cbPrice;
    } else if (condition === "FN" || condition === "FINE") {
      result["6.0"] = cbPrice;
    } else if (condition === "VG" || condition === "VERY GOOD") {
      result["4.0"] = cbPrice;
    }
  }

  // Explicit grade keys if present in ComicBase payload
  if (comic.comicbase_data) {
    for (const grade of GRADES) {
      if (grade === "RAW" && result["RAW"]) continue;
      const key = `ComicBase - Grade ${grade}`;
      const stored = positivePrice(comic.comicbase_data[key] || comic.comicbase_data[grade]);
      if (stored !== null) result[grade] = stored;
    }
  }

  return result;
}

/**
 * Reads authentic GoCollect price ladder if present in payload or metadata.
 */
export function goCollectGrades(comic: Partial<ComicRecord>): Partial<Record<Grade, number>> {
  return goCollectCgcGrades(comic);
}

/**
 * Reads authentic GoCollect - CGC certified observation ladder.
 * CGC is exclusively a certified grading company — it NEVER issues a RAW or ungraded price.
 */
export function goCollectCgcGrades(comic: Partial<ComicRecord>): Partial<Record<Grade, number>> {
  const result: Partial<Record<Grade, number>> = {};
  const data = (comic as Record<string, unknown>).gocollect_cgc_data as Record<string, unknown> | undefined ||
    (comic as Record<string, unknown>).gocollect_data as Record<string, unknown> | undefined ||
    (comic.panel_profits_data as Record<string, unknown> | undefined)?.gocollect_cgc as Record<string, unknown> | undefined ||
    (comic.panel_profits_data as Record<string, unknown> | undefined)?.gocollect as Record<string, unknown> | undefined;
  if (!data) return result;

  for (const grade of GRADES) {
    if (grade === "RAW") continue;
    const gradeKey = grade.replace(".", "_");
    const stored = positivePrice(
      data[`GoCollect - CGC - Grade ${grade}`] ||
      data[`GoCollect - Grade ${grade}`] ||
      data[`gc_cgc_grade_${gradeKey}_price`] ||
      data[`gc_grade_${gradeKey}_price`] ||
      data[`gocollect_${gradeKey}`] ||
      (data as any)[grade]
    );
    if (stored !== null) result[grade] = stored;
  }
  return result;
}

/**
 * Reads authentic GoCollect - CBCS certified observation ladder.
 * CBCS is exclusively a certified grading company — it NEVER issues a RAW or ungraded price.
 */
export function goCollectCbcsGrades(comic: Partial<ComicRecord>): Partial<Record<Grade, number>> {
  const result: Partial<Record<Grade, number>> = {};
  const data = (comic as Record<string, unknown>).gocollect_cbcs_data as Record<string, unknown> | undefined ||
    (comic.panel_profits_data as Record<string, unknown> | undefined)?.gocollect_cbcs as Record<string, unknown> | undefined ||
    (comic.panel_profits_data as Record<string, unknown> | undefined)?.cbcs_grades as Record<string, unknown> | undefined;
  if (!data) return result;

  for (const grade of GRADES) {
    if (grade === "RAW") continue;
    const gradeKey = grade.replace(".", "_");
    const stored = positivePrice(
      data[`GoCollect - CBCS - Grade ${grade}`] ||
      data[`gc_cbcs_grade_${gradeKey}_price`] ||
      (data as any)[`cbcs_${gradeKey}`]
    );
    if (stored !== null) result[grade] = stored;
  }
  return result;
}

/**
 * Reads authentic GoCollect - PSA certified observation ladder.
 * PSA is exclusively a certified grading company — it NEVER issues a RAW or ungraded price.
 */
export function goCollectPsaGrades(comic: Partial<ComicRecord>): Partial<Record<Grade, number>> {
  const result: Partial<Record<Grade, number>> = {};
  const data = (comic as Record<string, unknown>).gocollect_psa_data as Record<string, unknown> | undefined ||
    (comic.panel_profits_data as Record<string, unknown> | undefined)?.gocollect_psa as Record<string, unknown> | undefined ||
    (comic.panel_profits_data as Record<string, unknown> | undefined)?.psa_grades as Record<string, unknown> | undefined;
  if (!data) return result;

  for (const grade of GRADES) {
    if (grade === "RAW") continue;
    const gradeKey = grade.replace(".", "_");
    const stored = positivePrice(
      data[`GoCollect - PSA - Grade ${grade}`] ||
      data[`gc_psa_grade_${gradeKey}_price`] ||
      (data as any)[`psa_${gradeKey}`]
    );
    if (stored !== null) result[grade] = stored;
  }
  return result;
}

/**
 * Reads authentic CGC · GPA sales observation ladder if present in payload or metadata.
 * CGC is exclusively a certified grading company — it NEVER issues a RAW or ungraded price.
 */
export function cgcGrades(comic: Partial<ComicRecord>): Partial<Record<Grade, number>> {
  const result: Partial<Record<Grade, number>> = {};
  const cgcData = (comic as Record<string, unknown>)?.cgc_data as Record<string, unknown> | undefined;

  // 1. Array of sale observations
  const obsList = Array.isArray(cgcData?.cgc_grades)
    ? cgcData.cgc_grades
    : Array.isArray((comic as any).cgc)
    ? (comic as any).cgc
    : null;

  if (obsList) {
    for (const obs of obsList) {
      if (obs && obs.grade && obs.amount && obs.grade !== "RAW") {
        const p = positivePrice(obs.amount);
        if (p !== null && (!result[obs.grade as Grade] || p > (result[obs.grade as Grade] ?? 0))) {
          result[obs.grade as Grade] = p;
        }
      }
    }
  }

  // 2. Dictionary lookups
  const cgcDict =
    (comic as Record<string, unknown>)?.cgc_data as Record<string, unknown> | undefined ||
    (comic.panel_profits_data as Record<string, unknown> | undefined)?.cgc_grades as Record<string, unknown> | undefined;

  if (cgcDict) {
    for (const grade of GRADES) {
      if (grade === "RAW") continue;
      const gradeKey = grade.replace(".", "_");
      const stored = positivePrice(
        cgcDict[`CGC - Grade ${grade}`] ||
        cgcDict[`cgc_grade_${gradeKey}_price`] ||
        cgcDict[`cgc_${gradeKey}`] ||
        (cgcDict as any)[grade]
      );
      if (stored !== null && !result[grade]) result[grade] = stored;
    }
  }

  return result;
}

/**
 * Reads PriceCharting secondary market auction/sales observation ladder.
 * Operates as an independent pricing authority.
 */
export function priceChartingGrades(comic: Partial<ComicRecord>): Partial<Record<Grade, number>> {
  const result: Partial<Record<Grade, number>> = {};

  const pcData = (comic as Record<string, unknown>).pricecharting_data as Record<string, unknown> | undefined ||
    (comic.panel_profits_data as Record<string, unknown> | undefined)?.pricecharting as Record<string, unknown> | undefined;

  if (pcData) {
    // Panel Profits 37-column translation legend. Source values are USD here;
    // do not divide by 100 unless a separately verified ingestion contract
    // explicitly identifies an integer-cents representation.
    const csvGradeFields: Partial<Record<Grade, string>> = {
      RAW: "loose-price",
      "2.0": "condition-9-price",
      "3.0": "condition-13-price",
      "4.0": "cib-price",
      "5.0": "condition-14-price",
      "6.0": "new-price",
      "7.0": "condition-15-price",
      "8.0": "graded-price",
      "9.0": "condition-16-price",
      "9.2": "box-only-price",
      "9.4": "condition-17-price",
      "9.6": "condition-10-price",
      "9.8": "manual-only-price",
      "10.0": "bgs-10-price",
    };
    for (const [grade, field] of Object.entries(csvGradeFields) as Array<[Grade, string]>) {
      const observed = positivePrice(pcData[field]);
      if (observed !== null) result[grade] = observed;
    }
    // ASM #1 source audit: condition-18-price is an unresolved chart-derived
    // value, NOT a verified 9.9 grade price. Keep it out of the grade ladder.
    // manual-only-price is a 9.8 chart observation; the current displayed
    // PriceCharting 9.8 page value is a separate, time-specific measurement.
    const rawVal = positivePrice(pcData["raw"] || pcData["RAW"] || pcData["raw_price"] || pcData["ungraded"]);
    if (rawVal !== null) result["RAW"] = rawVal;

    for (const grade of GRADES) {
      if (grade === "RAW") continue;
      const gradeKey = grade.replace(".", "_");
      const stored = positivePrice(
        pcData[`grade_${gradeKey}`] ||
        pcData[`PriceCharting - Grade ${grade}`] ||
        pcData[grade]
      );
      if (stored !== null) result[grade] = stored;
    }
  }

  return result;
}

/**
 * Reads authentic CBCS certified observation ladder if present in payload or metadata.
 */
export function cbcsGrades(comic: Partial<ComicRecord>): Partial<Record<Grade, number>> {
  const result: Partial<Record<Grade, number>> = {};
  const data = (comic as Record<string, unknown>).cbcs_data as Record<string, unknown> | undefined ||
    (comic.panel_profits_data as Record<string, unknown> | undefined)?.cbcs_grades as Record<string, unknown> | undefined;
  if (!data) return result;

  for (const grade of GRADES) {
    if (grade === "RAW") continue;
    const gradeKey = grade.replace(".", "_");
    const stored = positivePrice(
      data[`CBCS - Grade ${grade}`] ||
      data[`cbcs_grade_${gradeKey}_price`] ||
      data[grade]
    );
    if (stored !== null) result[grade] = stored;
  }
  return result;
}

/**
 * Reads authentic PSA certified observation ladder if present in payload or metadata.
 */
export function psaGrades(comic: Partial<ComicRecord>): Partial<Record<Grade, number>> {
  const result: Partial<Record<Grade, number>> = {};
  const data = (comic as Record<string, unknown>).psa_data as Record<string, unknown> | undefined ||
    (comic.panel_profits_data as Record<string, unknown> | undefined)?.psa_grades as Record<string, unknown> | undefined;
  if (!data) return result;

  for (const grade of GRADES) {
    if (grade === "RAW") continue;
    const gradeKey = grade.replace(".", "_");
    const stored = positivePrice(
      data[`PSA - Grade ${grade}`] ||
      data[`psa_grade_${gradeKey}_price`] ||
      data[grade]
    );
    if (stored !== null) result[grade] = stored;
  }
  return result;
}

/**
 * Reads verified eBay sold transaction observations ladder.
 */
export function ebayGrades(comic: Partial<ComicRecord>): Partial<Record<Grade, number>> {
  const result: Partial<Record<Grade, number>> = {};
  const ebayData =
    (comic as Record<string, unknown>).ebay_data as Record<string, unknown> | undefined ||
    (comic as Record<string, unknown>).ebay_sales as Record<string, unknown> | undefined ||
    (comic.panel_profits_data as Record<string, unknown> | undefined)?.ebay as Record<string, unknown> | undefined;

  if (ebayData) {
    // 1. If ebayData or sales is an array of verified sold records
    const salesList = Array.isArray(ebayData)
      ? ebayData
      : Array.isArray((ebayData as any).sales)
      ? (ebayData as any).sales
      : Array.isArray((comic as any).ebay_sales)
      ? (comic as any).ebay_sales
      : null;

    if (salesList) {
      for (const sale of salesList) {
        if (sale && sale.grade && (sale.price || sale.amount)) {
          const rawG = String(sale.grade).toUpperCase();
          const g: Grade = rawG === "RAW" || rawG === "UNGRADED" ? "RAW" : (String(sale.grade) as Grade);
          const p = positivePrice(sale.price ?? sale.amount);
          if (p !== null && (!result[g] || p > (result[g] ?? 0))) {
            result[g] = p;
          }
        }
      }
    }

    // 2. Dictionary lookups
    const rawVal = positivePrice(ebayData["raw"] || ebayData["RAW"] || ebayData["raw_price"] || ebayData["Ungraded"]);
    if (rawVal !== null) result["RAW"] = rawVal;

    for (const grade of GRADES) {
      if (grade === "RAW") continue;
      const gradeKey = grade.replace(".", "_");
      const stored = positivePrice(
        ebayData[`eBay - Grade ${grade}`] ||
        ebayData[`ebay_grade_${gradeKey}_price`] ||
        ebayData[`grade_${gradeKey}`] ||
        ebayData[grade]
      );
      if (stored !== null && !result[grade]) result[grade] = stored;
    }
  }

  return result;
}

/**
 * Reads authentic PGX certified observation ladder if present in payload or metadata.
 * PGX is exclusively a certified grading company — it NEVER issues a RAW or ungraded price.
 */
export function pgxGrades(comic: Partial<ComicRecord>): Partial<Record<Grade, number>> {
  const result: Partial<Record<Grade, number>> = {};
  const data =
    (comic as Record<string, unknown>).pgx_data as Record<string, unknown> | undefined ||
    (comic.panel_profits_data as Record<string, unknown> | undefined)?.pgx as Record<string, unknown> | undefined ||
    (comic.panel_profits_data as Record<string, unknown> | undefined)?.pgx_grades as Record<string, unknown> | undefined ||
    ((comic as Record<string, unknown>).ebay_data as Record<string, unknown> | undefined)?.pgx as Record<string, unknown> | undefined;
  if (!data) return result;

  for (const grade of GRADES) {
    if (grade === "RAW") continue;
    const gradeKey = grade.replace(".", "_");
    const stored = positivePrice(
      data[`PGX - Grade ${grade}`] ||
      data[`pgx_grade_${gradeKey}_price`] ||
      data[`pgx_${gradeKey}`] ||
      (data as any)[grade]
    );
    if (stored !== null) result[grade] = stored;
  }
  return result;
}

/**
 * Reads authentic EGS / EGA (European Grading Service) certified observation ladder if present in payload or metadata.
 * EGS is exclusively a certified grading company — it NEVER issues a RAW or ungraded price.
 */
export function egsGrades(comic: Partial<ComicRecord>): Partial<Record<Grade, number>> {
  const result: Partial<Record<Grade, number>> = {};
  const data =
    (comic as Record<string, unknown>).egs_data as Record<string, unknown> | undefined ||
    (comic as Record<string, unknown>).ega_data as Record<string, unknown> | undefined ||
    (comic.panel_profits_data as Record<string, unknown> | undefined)?.egs as Record<string, unknown> | undefined ||
    (comic.panel_profits_data as Record<string, unknown> | undefined)?.ega as Record<string, unknown> | undefined ||
    (comic.panel_profits_data as Record<string, unknown> | undefined)?.egs_grades as Record<string, unknown> | undefined ||
    (comic.panel_profits_data as Record<string, unknown> | undefined)?.ega_grades as Record<string, unknown> | undefined ||
    ((comic as Record<string, unknown>).ebay_data as Record<string, unknown> | undefined)?.egs as Record<string, unknown> | undefined ||
    ((comic as Record<string, unknown>).ebay_data as Record<string, unknown> | undefined)?.ega as Record<string, unknown> | undefined;
  if (!data) return result;

  for (const grade of GRADES) {
    if (grade === "RAW") continue;
    const gradeKey = grade.replace(".", "_");
    const stored = positivePrice(
      data[`EGS - Grade ${grade}`] ||
      data[`EGA - Grade ${grade}`] ||
      data[`egs_grade_${gradeKey}_price`] ||
      data[`ega_grade_${gradeKey}_price`] ||
      data[`egs_${gradeKey}`] ||
      data[`ega_${gradeKey}`] ||
      (data as any)[grade]
    );
    if (stored !== null) result[grade] = stored;
  }
  return result;
}

export interface HighestGradedPriceResult {
  grade: Grade;
  price: number;
  source: string;
  isRaw: boolean;
}

/**
 * Determines the authentic highest graded price and its grade across source ladders.
 * Evaluates numeric graded prices first (10.0 down to 0.5), then RAW if only ungraded exists.
 */
export function getHighestGradedPrice(
  ladders: Record<string, Partial<Record<Grade, number>> | undefined>
): HighestGradedPriceResult | null {
  // Check from 10.0 down to 0.5 (numeric grades)
  for (let i = GRADES.length - 1; i >= 1; i--) {
    const grade = GRADES[i];
    for (const [source, ladder] of Object.entries(ladders)) {
      if (ladder && ladder[grade] !== undefined && ladder[grade] !== null && ladder[grade]! > 0) {
        return {
          grade,
          price: ladder[grade]!,
          source,
          isRaw: false,
        };
      }
    }
  }

  // Fallback to RAW if no numeric grade prices exist
  for (const [source, ladder] of Object.entries(ladders)) {
    if (ladder && ladder["RAW"] !== undefined && ladder["RAW"] !== null && ladder["RAW"]! > 0) {
      return {
        grade: "RAW",
        price: ladder["RAW"]!,
        source,
        isRaw: true,
      };
    }
  }

  return null;
}

/**
 * Returns continuous market execution spreads (Buy / Sell).
 * Prioritizes explicitly recorded spreads from dataset.
 * If unrecorded, derives realistic exchange execution spreads:
 * Bid (Buy): 0.88 * FMV
 * Ask (Sell): 1.12 * FMV
 */
export function panelProfitsSpreads(
  comic: Partial<ComicRecord>,
  grade: Grade,
  fallbackPrice?: number | null
): ExecutionSpreads {
  const ppData = comic.panel_profits_data as Record<string, any> | undefined;
  if (!ppData && !fallbackPrice) return { buy: null, sell: null };

  const gradeKey = grade.replace(".", "_");

  // Original PriceCharting CSV dealer quotes, resolved through the PP
  // 37-column translation legend. These are quoted bid/ask amounts, not FMV.
  const csvSpreadFields: Partial<Record<Grade, readonly [string, string]>> = {
    RAW: ["retail-loose-buy", "retail-loose-sell"],
    "4.0": ["retail-cib-buy", "retail-cib-sell"],
    "6.0": ["retail-new-buy", "retail-new-sell"],
  };
  const rawPc = ((comic as Record<string, unknown>).pricecharting_data ??
    ppData?.pricecharting) as Record<string, unknown> | undefined;
  const quoteFields = csvSpreadFields[grade];
  if (rawPc && quoteFields) {
    const buy = positivePrice(rawPc[quoteFields[0]]);
    const sell = positivePrice(rawPc[quoteFields[1]]);
    if (buy !== null || sell !== null) return { buy, sell };
  }

  // 1. Direct structured spreads object from benchmark / dataset
  if (ppData?.spreads && typeof ppData.spreads === "object") {
    const s =
      ppData.spreads[grade] ??
      ppData.spreads[grade.toLowerCase()] ??
      (grade === "RAW" ? ppData.spreads.raw : ppData.spreads[`grade_${gradeKey}`]);
    if (s && typeof s === "object") {
      const b = positivePrice(s.buy);
      const sl = positivePrice(s.sell);
      if (b !== null || sl !== null) {
        return { buy: b, sell: sl };
      }
    }
  }

  let buy: number | null = null;
  let sell: number | null = null;

  // 2. Check explicit individual bid/ask spread keys if present
  if (ppData) {
    if (grade === "RAW") {
      const rawBuyKeys = [
        "raw_buy",
        "ungraded_buy",
        "PP - Grade RAW Buy Price",
        "PP - Ungraded Buy Price",
        "raw_bid",
      ];
      const rawSellKeys = [
        "raw_sell",
        "ungraded_sell",
        "PP - Grade RAW Sell Price",
        "PP - Ungraded Sell Price",
        "raw_ask",
      ];
      for (const key of rawBuyKeys) {
        const v = positivePrice(ppData[key]);
        if (v !== null) { buy = v; break; }
      }
      for (const key of rawSellKeys) {
        const v = positivePrice(ppData[key]);
        if (v !== null) { sell = v; break; }
      }
    } else {
      const buyKeys = [
        `grade_${gradeKey}_buy`,
        `PP - Grade ${grade} Buy Price`,
        `${grade}_buy`,
        `grade_${gradeKey.replace("_", "")}_buy`,
      ];
      const sellKeys = [
        `grade_${gradeKey}_sell`,
        `PP - Grade ${grade} Sell Price`,
        `${grade}_sell`,
        `grade_${gradeKey.replace("_", "")}_sell`,
      ];
      for (const key of buyKeys) {
        const v = positivePrice(ppData[key]);
        if (v !== null) { buy = v; break; }
      }
      for (const key of sellKeys) {
        const v = positivePrice(ppData[key]);
        if (v !== null) { sell = v; break; }
      }
    }
  }

  // If explicit spreads were partially or completely found
  if (buy !== null || sell !== null) {
    return { buy, sell };
  }

  // Strictly no synthetic placeholder spreads: if no authentic quotes are recorded, return null
  return { buy: null, sell: null };
}

export function panelProfitsDelta(
  comic: Partial<ComicRecord>,
  grade: Grade
): number | null {
  const ppData = comic.panel_profits_data as Record<string, any> | undefined;
  if (!ppData?.deltas) return null;
  const val = ppData.deltas[grade];
  return typeof val === "number" ? val : null;
}

export function panelProfitsVolume(
  comic: Partial<ComicRecord>,
  grade: Grade
): string | null {
  const ppData = comic.panel_profits_data as Record<string, any> | undefined;
  if (!ppData) return null;
  if (ppData.volume) {
    const gradeKey = grade.replace(".", "_");
    const val =
      ppData.volume[grade] ??
      ppData.volume[grade.toLowerCase()] ??
      (grade === "RAW" ? ppData.volume.raw : ppData.volume[`grade_${gradeKey}`]);
    if (typeof val === "string") return val;
  }
  if (ppData.pricecharting?.volume_score) {
    return String(ppData.pricecharting.volume_score);
  }
  if (grade === "RAW" && typeof ppData["PP - Sales Volume"] === "string") {
    return ppData["PP - Sales Volume"];
  }
  if (grade === "9.8" && ppData["Panel Profits Baseline Grade 9.8 Observation Count"]) {
    return `${ppData["Panel Profits Baseline Grade 9.8 Observation Count"]} tracked sales`;
  }
  return null;
}

export function comicBaseReference(comic: Partial<ComicRecord>): number | null {
  return positivePrice(comic.comicbase_price) || positivePrice(comic.comicbase_data?.["CB - Price"]);
}

export function panelProfitsListings(
  comic: Partial<ComicRecord>,
  grade: Grade
): number | null {
  const ppData = comic.panel_profits_data as Record<string, any> | undefined;
  if (!ppData) return null;
  if (ppData.salesListings) {
    const listings = ppData.salesListings;
    const gradeKey = grade.replace(".", "_");
    const val =
      listings[grade] ??
      listings[grade.toLowerCase()] ??
      (grade === "RAW"
        ? (listings.raw ?? listings.ungraded ?? listings.ungradedCount)
        : (listings[`grade_${gradeKey}`] ?? listings[`grade${gradeKey.replace("_", "")}Count`]));
    if (typeof val === "number") return val;
  }
  if (grade === "9.8") {
    const countVal = ppData["Panel Profits Baseline Grade 9.8 Observation Count"] ?? ppData["PP - Grade 9.8 Observation Count"];
    if (countVal !== undefined && countVal !== null) {
      const n = Number(countVal);
      if (!isNaN(n) && n >= 0) return n;
    }
  }
  if (grade === "RAW") {
    const rawVal = ppData["PP - Grade RAW Observation Count"] ?? ppData["PP - Ungraded Observation Count"];
    if (rawVal !== undefined && rawVal !== null) {
      const n = Number(rawVal);
      if (!isNaN(n) && n >= 0) return n;
    }
  }
  return null;
}

/**
 * Returns certified graded slab spreads (CGC / Slabbed).
 * Certified slabs NEVER carry a RAW or ungraded price/spread.
 */
export function cgcSpreads(comic: Partial<ComicRecord>, grade: Grade): ExecutionSpreads {
  if (grade === "RAW") return { buy: null, sell: null };
  return panelProfitsSpreads(comic, grade);
}

/**
 * Returns certified graded slab volume.
 * Certified grading authorities NEVER report RAW copies.
 */
export function cgcVolume(comic: Partial<ComicRecord>, grade: Grade): string | null {
  if (grade === "RAW") return null;
  return panelProfitsVolume(comic, grade);
}

/**
 * Returns certified graded slab sold listings count.
 * Certified slabs NEVER report RAW copies.
 */
export function cgcListings(comic: Partial<ComicRecord>, grade: Grade): number | null {
  if (grade === "RAW") return null;
  return panelProfitsListings(comic, grade);
}
