import { ASSET_CLASS_CONFIG } from "@/lib/equity/ticker-constants";
import { getCbrTermBySlug, type CbrLexiconEntry } from "@/lib/lexicon/cbr-lexicon";

export interface ComicValuationMetrics {
  fmvUsd: number;
  grade: string;
  assetClass: string;
  assetClassLabel: string;
  marginHaircut: string;
  venue: string;
  wholesaleBidUsd: number;
  retailAskUsd: number;
  bidAskSpreadUsd: number;
  bidAskSpreadPercent: number;
  estimatedPrintRun?: number;
  censusCount?: number;
  scarcityRatioPercent?: number;
  relevantTerms: CbrLexiconEntry[];
}

export function computeComicValuationMetrics(comic: {
  baseline_grade_9_8_value?: number | null;
  pp_grade_9_8_price?: number | null;
  publication_year?: number | null;
  publisher?: string | null;
  series?: string | null;
  issue_number?: string | null;
  census_total?: number | null;
  is_sovereign?: boolean | null;
  isSovereign?: boolean | null;
  grade?: string | number | null;
  variant?: string | null;
  editionForm?: string | null;
  labelType?: string | null;
}): ComicValuationMetrics {
  const fmvUsd = Number(comic.baseline_grade_9_8_value || comic.pp_grade_9_8_price || 0);

  // Asset Class determination:
  // - Sovereign: direct universal bluelabel 9.8 comic
  // - Premium: 45.00 to infinity
  // - Standard: 25.00 to 44.99
  // - OTC: less than 25.00
  const isDirect = !comic.variant || ["direct", "base", "regular", "standard"].includes(comic.variant.toLowerCase());
  const isBlueLabel = !comic.labelType || !["SIGNATURE", "QUALIFIED", "RESTORED", "CONSERVED"].some(t => (comic.labelType || "").toUpperCase().includes(t));
  const is98 = !comic.grade || String(comic.grade).trim() === "9.8";
  const isTrulySovereign = Boolean((comic.is_sovereign || comic.isSovereign) && isDirect && isBlueLabel && is98);

  let assetClass = "OTC";
  if (isTrulySovereign) {
    assetClass = "SOV";
  } else if (fmvUsd >= 45.0) {
    assetClass = "PREMIUM";
  } else if (fmvUsd >= 25.0) {
    assetClass = "STD";
  } else if (fmvUsd > 0) {
    assetClass = "OTC";
  } else {
    assetClass = "RAW";
  }

  const config = ASSET_CLASS_CONFIG[assetClass] || ASSET_CLASS_CONFIG.STD;

  // Wholesale Bid calculation based on liquidity class
  // Blue-chip SOV keys command tight 80-85% dealer bids; illiquid OTC commands 50-60%
  const bidRatio = assetClass === "SOV" ? 0.82 : assetClass === "PREMIUM" ? 0.75 : assetClass === "STD" ? 0.65 : 0.50;
  const wholesaleBidUsd = Number((fmvUsd * bidRatio).toFixed(2));
  const retailAskUsd = fmvUsd;
  const bidAskSpreadUsd = Number((retailAskUsd - wholesaleBidUsd).toFixed(2));
  const bidAskSpreadPercent = retailAskUsd > 0 ? Number(((bidAskSpreadUsd / retailAskUsd) * 100).toFixed(1)) : 0;

  // Estimated historical print run based on publication era
  const year = Number(comic.publication_year || 1980);
  let estimatedPrintRun = 250000;
  if (year < 1950) estimatedPrintRun = 350000; // Golden Age mass pulp runs
  else if (year < 1970) estimatedPrintRun = 300000; // Silver Age
  else if (year < 1985) estimatedPrintRun = 200000; // Bronze Age
  else if (year < 1996) estimatedPrintRun = 600000; // Copper / 90s boom
  else estimatedPrintRun = 85000; // Modern direct market

  const censusCount = Number(comic.census_total || 0);
  const scarcityRatioPercent = censusCount > 0 && estimatedPrintRun > 0
    ? Number(((censusCount / estimatedPrintRun) * 100).toFixed(3))
    : undefined;

  // Contextual Investopedia Glossary entries mapped from cbr-lexicon
  const slugs = [
    "fair-market-value-fmv-benchmark",
    "market-capitalization-asset-float-cap",
    "bid-ask-spread-fmv-liquidity-spread",
    "grade-compression",
  ];

  const relevantTerms: CbrLexiconEntry[] = slugs
    .map((slug) => getCbrTermBySlug(slug))
    .filter((t): t is CbrLexiconEntry => Boolean(t));

  return {
    fmvUsd,
    grade: "9.8",
    assetClass,
    assetClassLabel: config.fullName,
    marginHaircut: config.marginHaircut,
    venue: config.venue,
    wholesaleBidUsd,
    retailAskUsd,
    bidAskSpreadUsd,
    bidAskSpreadPercent,
    estimatedPrintRun,
    censusCount: censusCount > 0 ? censusCount : undefined,
    scarcityRatioPercent,
    relevantTerms,
  };
}
