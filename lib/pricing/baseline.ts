import { ComicRecord, ResolvedPricing } from "@/lib/comics/types";

function parseNumeric(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") {
    return isNaN(val) ? null : val;
  }
  if (typeof val === "string") {
    const cleaned = val.replace(/[\$,\s]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

export function resolveComicPricing(comic: Partial<ComicRecord>): ResolvedPricing {
  const ppData = (comic.panel_profits_data && typeof comic.panel_profits_data === "object")
    ? comic.panel_profits_data
    : null;

  // 1. Panel Profits 9.8 Price
  let panelProfitsPrice98: number | null = parseNumeric(comic.pp_grade_9_8_price);
  let panelProfitsPriceSource: string | null = null;

  if (panelProfitsPrice98 !== null) {
    panelProfitsPriceSource = "Panel Profits Promoted Grade 9.8";
  } else if (ppData && ppData["PP - Grade 9.8 Market Price"]) {
    panelProfitsPrice98 = parseNumeric(ppData["PP - Grade 9.8 Market Price"]);
    if (panelProfitsPrice98 !== null) {
      panelProfitsPriceSource = "Panel Profits Historical Grade 9.8";
    }
  }

  // 2. ComicBase Price
  const comicbasePrice: number | null = parseNumeric(comic.comicbase_price);

  // 3. Baseline 9.8 Value
  let baselinePrice98: number | null = parseNumeric(comic.baseline_grade_9_8_value);
  let baselineSource: string | null = null;

  if (baselinePrice98 !== null) {
    baselineSource = comic.baseline_grade_9_8_sources || "Panel Profits Clean Baseline";
  } else if (ppData && ppData["Panel Profits Baseline Grade 9.8 Value"]) {
    baselinePrice98 = parseNumeric(ppData["Panel Profits Baseline Grade 9.8 Value"]);
    if (baselinePrice98 !== null) {
      baselineSource = ppData["Panel Profits Baseline Grade 9.8 Sources"] || "Panel Profits Baseline Dataset";
    }
  } else if (comicbasePrice !== null) {
    baselinePrice98 = comicbasePrice;
    baselineSource = "ComicBase Reference Valuation";
  }

  // Baseline source fallback cleanup
  if (!baselineSource && baselinePrice98 !== null) {
    if (panelProfitsPrice98 !== null && baselinePrice98 === panelProfitsPrice98) {
      baselineSource = "Panel Profits Market Valuation";
    } else if (comicbasePrice !== null && baselinePrice98 === comicbasePrice) {
      baselineSource = "ComicBase Reference Valuation";
    } else {
      baselineSource = "Blended Market Baseline";
    }
  }

  // Observation count
  let observationCount: number | null = null;
  if (comic.baseline_grade_9_8_observation_count !== null && comic.baseline_grade_9_8_observation_count !== undefined) {
    observationCount = Number(comic.baseline_grade_9_8_observation_count);
  } else if (ppData && ppData["Panel Profits Baseline Grade 9.8 Observation Count"]) {
    observationCount = parseNumeric(ppData["Panel Profits Baseline Grade 9.8 Observation Count"]);
  }

  return {
    panelProfitsPrice98,
    panelProfitsPriceSource,
    comicbasePrice,
    baselinePrice98,
    baselineSource,
    observationCount,
  };
}

export interface BaselinePriceResult {
  price: number | null;
  formatted: string;
  source: string;
}

export function resolveBaselinePrice(comic: Partial<ComicRecord> | null): BaselinePriceResult {
  if (!comic) {
    return {
      price: null,
      formatted: "Unpriced",
      source: "No Pricing Data Available",
    };
  }
  const resolved = resolveComicPricing(comic);
  const price = resolved.baselinePrice98;
  return {
    price,
    formatted: price !== null ? `$${price.toFixed(2)}` : "Unpriced",
    source: resolved.baselineSource || "Market Reference",
  };
}
