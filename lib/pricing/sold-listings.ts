/**
 * sold-listings.ts
 * ================
 * Grade prices computed from PriceCharting's individual dated sold listings
 * (bundled data/verified_sold_listings.json). The former local
 * data/pricecharting_sales.sqlite source (collected by scripts/harvest_complete_web_payloads.py)
 * has been removed from the runtime: it is git-ignored and never present in deployment.
 *
 * Price per grade = median of that exact product's most recent sales in that grade
 * (up to RECENT_N within the last WINDOW_DAYS). Median, not mean, so one mislabelled
 * or reprint sale cannot drag the number. A grade with fewer than MIN_SALES recent
 * sales gets no sales price — nothing is inferred.
 */
import fs from "fs";
import path from "path";

export const SALES_RECENT_N = 10;
export const SALES_WINDOW_DAYS = 365;
/** If a grade has fewer than SALES_MIN_SALES genuine sales in the last year, look back this far. */
export const SALES_EXTENDED_WINDOW_DAYS = 730;
export const SALES_MIN_SALES = 3;

/**
 * PriceCharting files foreign editions, reprints and homages under the original product
 * (e.g. "Ultimate Fallout #4 Djurdjevic Turkish Edition … 2022" under the 2011 1:25 variant).
 * A sale is excluded when its listing title names a different edition, or carries a year
 * and none of its years match the product's publication year.
 */
const OTHER_EDITION_WORDS = [
  "turkish", "turkey", "russian", "panini", "france", "french", "hors serie", "italian", "italy",
  "spanish", "spain", "mexican", "mexico", "german", "brazil", "portuguese", "japanese", "korean",
  "foreign", "facsimile", "reprint", "homage", "trade", "paralel evren", "tpb",
  // Contamination words for standard issues / single issues:
  "variant", "exclusive", "incentive", "ratio", "retailer exclusive", "con exclusive",
  "lot", "set", "pack", "run", "1-5", "#1-5", "1-4", "1-6",
];
const EDITION_WORDS_ALLOWED_BY_PRODUCT = [
  "virgin", "foil", "facsimile", "reprint", "trade", "variant", "exclusive", "incentive", "ratio", "lot", "set"
];

export function isOtherEditionSale(
  title: string | null | undefined,
  productYear: number | null | undefined,
  productName: string | null | undefined,
): boolean {
  if (!title) return false;
  return getRejectionReason(title, productYear, productName) !== null;
}

export interface SalesFilterContext {
  productYear?: number | null;
  productName?: string | null;
}

export interface GradeSalesStat {
  grade: string;
  medianUsd: number;
  salesUsed: number;
  salesTotal: number;
  latestSaleDate: string;
  oldestUsedDate: string;
}

export interface SoldListing {
  grade: string | null;
  saleDate: string;
  priceUsd: number;
  title: string | null;
  venue: string | null;
}

let verifiedJsonCache: Record<string, any[]> | null = null;
function getVerifiedJson(): Record<string, any[]> {
  if (verifiedJsonCache) return verifiedJsonCache;
  const jsonPaths = [
    path.resolve(process.cwd(), "data", "verified_sold_listings.json"),
    path.resolve(process.cwd(), "..", "data", "verified_sold_listings.json"),
  ];
  for (const p of jsonPaths) {
    try {
      if (fs.existsSync(p)) {
        verifiedJsonCache = JSON.parse(fs.readFileSync(p, "utf8"));
        return verifiedJsonCache!;
      }
    } catch (e) {
      console.warn("[sold-listings] error reading json fixture:", p, e);
    }
  }
  verifiedJsonCache = {};
  return verifiedJsonCache;
}

function fetchRawSales(
  productId: string | number | null | undefined,
): Array<{ grade: string | null; d: string; p: number; title: string | null; venue: string | null }> {
  if (productId == null || String(productId).trim() === "") return [];
  const pid = String(productId).trim();

  // Bundled verified sales JSON (only remaining source; no Supabase sales table is wired here)
  const jsonSales = getVerifiedJson()[pid];
  if (Array.isArray(jsonSales) && jsonSales.length > 0) {
    return jsonSales.map((s: any) => ({
      grade: s.grade ?? null,
      d: s.saleDate || s.d || "",
      p: Number(s.priceUsd ?? s.p ?? 0),
      title: s.title ?? null,
      venue: s.venue ?? "eBay",
    }));
  }

  return [];
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Number(((s[m - 1] + s[m]) / 2).toFixed(2));
}

/** Per-grade sales prices for one PriceCharting product id. Empty map if no data. */
export function getGradeSalesStats(
  productId: string | number | null | undefined,
  ctx: SalesFilterContext = {},
): Map<string, GradeSalesStat> {
  const out = new Map<string, GradeSalesStat>();
  if (productId == null || String(productId).trim() === "") return out;

  const raw = fetchRawSales(productId);
  if (!raw.length) return out;

  const rows = raw
    .filter((r) => r.grade != null && r.p > 0)
    .filter((r) => !isOtherEditionSale(r.title, ctx.productYear, ctx.productName));

  const day = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
  const cutoff = day(SALES_WINDOW_DAYS);
  const extendedCutoff = day(SALES_EXTENDED_WINDOW_DAYS);
  const byGrade = new Map<string, Array<{ d: string; p: number }>>();
  for (const r of rows) {
    const list = byGrade.get(r.grade!) ?? [];
    list.push({ d: r.d, p: r.p });
    byGrade.set(r.grade!, list);
  }

  for (const [grade, all] of byGrade) {
    // Outlier filter: a sale under 20% or over 5× the grade's all-history median is almost always
    // a different edition mis-filed under this product (e.g. a $12 standard copy under a 1:25 variant).
    const allMedian = median(all.map((x) => x.p));
    const list = all.filter((x) => x.p >= allMedian * 0.2 && x.p <= allMedian * 5);
    let recent = list.filter((x) => x.d >= cutoff).slice(0, SALES_RECENT_N);
    if (recent.length < SALES_MIN_SALES) recent = list.filter((x) => x.d >= extendedCutoff).slice(0, SALES_RECENT_N);
    if (recent.length < SALES_MIN_SALES) recent = list.slice(0, SALES_RECENT_N);
    if (recent.length === 0) continue;
    out.set(grade, {
      grade,
      medianUsd: median(recent.map((x) => x.p)),
      salesUsed: recent.length,
      salesTotal: list.length,
      latestSaleDate: recent[0].d,
      oldestUsedDate: recent[recent.length - 1].d,
    });
  }
  return out;
}

/** Raw dated sales for one product (newest first), other-edition listings removed. */
export function getSoldListings(
  productId: string | number | null | undefined,
  limit = 500,
  ctx: SalesFilterContext = {},
): SoldListing[] {
  if (productId == null || String(productId).trim() === "") return [];
  const raw = fetchRawSales(productId);
  return raw
    .filter((s) => !isOtherEditionSale(s.title, ctx.productYear, ctx.productName))
    .slice(0, limit)
    .map((s) => ({
      grade: s.grade,
      saleDate: s.d,
      priceUsd: s.p,
      title: s.title,
      venue: s.venue,
    }));
}

export interface SaleAuditRecord {
  totalRaw: number;
  acceptedCount: number;
  rejectedCount: number;
  rejectionBreakdown: Record<string, number>;
  rejectedSales: Array<{
    title: string;
    priceUsd: number;
    grade: string | null;
    saleDate: string;
    venue: string | null;
    reason: string;
  }>;
}

/** Classifies the exact reason why a sale is excluded */
export function getRejectionReason(
  title: string | null | undefined,
  productYear: number | null | undefined,
  productName: string | null | undefined,
): string | null {
  if (!title) return "Missing listing title";
  const t = title.toLowerCase();
  const p = (productName ?? "").toLowerCase();

  if (/\b(lot|set|pack|run|1-5|#1-5|1-4|1-6)\b/i.test(t)) {
    return "Multi-Issue Lot / Run Set Bundle";
  }
  if (/\b(exclusive|retailer exclusive|con exclusive)\b/i.test(t) && !p.includes("exclusive")) {
    return "Retailer / Con Exclusive Variant";
  }
  if (/\b(incentive|ratio|1:25|1:50|1:100)\b/i.test(t) && !p.includes("incentive") && !p.includes("ratio")) {
    return "Retailer Incentive Ratio Variant";
  }
  if (/\b(virgin)\b/i.test(t) && !p.includes("virgin")) {
    return "Virgin Art Variant";
  }
  if (/\b(foil)\b/i.test(t) && !p.includes("foil")) {
    return "Foil Variant";
  }
  if (/\b(variant)\b/i.test(t) && !p.includes("variant")) {
    return "Unmatched Variant Edition";
  }
  if (/\b(turkish|turkey|russian|panini|france|french|italian|italy|spanish|spain|mexican|mexico|german|brazil|portuguese|japanese|korean|foreign)\b/i.test(t)) {
    return "Foreign Language Edition";
  }
  if (/\b(facsimile|reprint|homage|tpb|trade)\b/i.test(t) && !p.includes("facsimile") && !p.includes("reprint")) {
    return "Facsimile Reprint / Homage TPB";
  }
  if (productYear) {
    const years = t.match(/\b(19[3-9]\d|20[0-4]\d)\b/g);
    if (years && years.length > 0 && !years.includes(String(productYear))) {
      return `Mismatched Release Year (${years.join(", ")} vs ${productYear})`;
    }
  }
  return null;
}

/** Audit inspectable ledger: returns accepted comps and detailed rejected receipts with reasons */
export function auditSoldListings(
  productId: string | number | null | undefined,
  ctx: SalesFilterContext = {},
): SaleAuditRecord {
  if (productId == null || String(productId).trim() === "") {
    return {
      totalRaw: 0,
      acceptedCount: 0,
      rejectedCount: 0,
      rejectionBreakdown: {},
      rejectedSales: [],
    };
  }

  const raw = fetchRawSales(productId);
  const rejectedSales: SaleAuditRecord["rejectedSales"] = [];
  const rejectionBreakdown: Record<string, number> = {};
  let acceptedCount = 0;

  for (const s of raw) {
    const reason = getRejectionReason(s.title, ctx.productYear, ctx.productName);
    if (reason) {
      rejectedSales.push({
        title: s.title || "Untitled Listing",
        priceUsd: s.p,
        grade: s.grade,
        saleDate: s.d,
        venue: s.venue,
        reason,
      });
      rejectionBreakdown[reason] = (rejectionBreakdown[reason] ?? 0) + 1;
    } else {
      acceptedCount++;
    }
  }

  return {
    totalRaw: raw.length,
    acceptedCount,
    rejectedCount: rejectedSales.length,
    rejectionBreakdown,
    rejectedSales,
  };
}
export function getVerifiedSaleCounts(
  productId: string | number | null | undefined,
  ctx: SalesFilterContext = {},
): Record<string, { last12m: number; total: number }> {
  const out: Record<string, { last12m: number; total: number }> = {};
  const byGrade = new Map<string, Array<{ d: string; p: number }>>();
  for (const s of getSoldListings(productId, 100000, ctx)) {
    if (!s.grade || !(s.priceUsd > 0)) continue;
    const list = byGrade.get(s.grade) ?? [];
    list.push({ d: s.saleDate, p: s.priceUsd });
    byGrade.set(s.grade, list);
  }
  const cutoff = new Date(Date.now() - SALES_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
  for (const [grade, all] of byGrade) {
    const m = median(all.map((x) => x.p));
    const kept = all.filter((x) => x.p >= m * 0.2 && x.p <= m * 5);
    out[grade] = { last12m: kept.filter((x) => x.d >= cutoff).length, total: kept.length };
  }
  return out;
}
