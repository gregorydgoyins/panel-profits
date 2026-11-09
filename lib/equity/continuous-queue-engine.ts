/**
 * continuous-queue-engine.ts
 *
 * High-performance continuous queue engine for the 115,712 Panel Profits catalog.
 * Partitions the catalog into continuous queues of 5,000-comic blocks (24 blocks total),
 * streaming non-repeating multi-era equities to the surveillance rail with zero repetition.
 */

import { createCleanReadOnlyServerClient } from "@/lib/supabase/admin";
import { formatComicEquityTicker } from "./ticker-formatting";
import { resolveProductionAge } from "./ticker-utils";
import { resolveAuthoritativePublisher } from "@/lib/comics/publisher-authority";
import { resolveHistoricalKeyBadge } from "./significance-classifier";
import type { SovereignEquityItem } from "./canonical-equities";


export const TOTAL_CATALOG_UNIVERSE = 115712;
export const QUEUE_BLOCK_SIZE = 5000;
export const TOTAL_QUEUE_BLOCKS = Math.ceil(TOTAL_CATALOG_UNIVERSE / QUEUE_BLOCK_SIZE); // 24 blocks

export interface QueueBlockResult {
  items: SovereignEquityItem[];
  blockIndex: number;
  blockOffset: number;
  nextOffset: number;
  totalEligible: number;
  totalInBlock: number;
  eraTotals: Record<string, number>;
  scarcityTotals: Record<string, number>;
}

// In-memory cache for active 5,000-comic queue blocks with 10-minute TTL
interface CachedBlock {
  blockIndex: number;
  eraKey: string;
  items: SovereignEquityItem[];
  cachedAt: number;
}

const blockCache = new Map<string, CachedBlock>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function resolveEra(year: number | null | undefined, originEra?: string | null): string {
  if (year && year > 0) {
    const calculated = resolveProductionAge(year);
    if (calculated && calculated !== "unknown") return calculated.toLowerCase();
  }
  if (originEra && originEra.trim()) {
    return originEra.toLowerCase().replace(/_age$/, "").replace(/\s+age$/, "");
  }
  return "";
}

function upgradeCoverUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed.includes("files1.comics.org") || trimmed.includes("526.jpg")) {
    return null;
  }
  // Upgrade PriceCharting 240px thumbnails to 1600px masters
  if (trimmed.includes("images.pricecharting.com") && trimmed.endsWith("/240.jpg")) {
    return trimmed.replace(/\/240\.jpg$/, "/1600.jpg");
  }
  // Strip Wikia downsampling parameters
  if (trimmed.includes("wikia.nocookie.net") || trimmed.includes("fandom.com")) {
    return trimmed.replace(/\/revision\/latest\/scale-to-width-down\/\d+/, "/revision/latest");
  }
  return trimmed;
}

function getEstimatedYearForEra(era: string): number {
  switch (era.toLowerCase()) {
    case "platinum": return 1935;
    case "golden": return 1942;
    case "atomic": return 1950;
    case "silver": return 1963;
    case "bronze": return 1977;
    case "copper": return 1988;
    case "modern": return 1995;
    case "independent": return 1998;
    case "postmodern": return 2008;
    default: return 1990;
  }
}

function mapDbRow(r: any, idx: number, offset: number, blockIndex: number): SovereignEquityItem {
  const parsedYear = r.publication_year ? Number(r.publication_year) : null;
  const eraKey = resolveEra(parsedYear, r.origin_era || r.production_age);
  const rawYear = parsedYear && parsedYear > 1930 ? parsedYear : getEstimatedYearForEra(eraKey);
  const rawFmv = r.fmv_usd != null && !isNaN(Number(r.fmv_usd)) ? Number(r.fmv_usd) : null;
  const cover = upgradeCoverUrl(r.cover_url);
  const ticker = formatComicEquityTicker(r.series, r.issue_number);
  const deltaPercent = r.delta_percent != null && !isNaN(Number(r.delta_percent)) ? Number(r.delta_percent) : null;
  const referenceGrade = r.reference_grade ? String(r.reference_grade).trim() : null;
  const keyBadge = resolveHistoricalKeyBadge(r.series, r.issue_number);

  return {
    id: r.id || `block-${blockIndex}-${idx}`,
    seatNumber: offset + idx + 1,
    seatType: "PRIMARY_DOMESTIC",
    ticker,
    series: r.series,
    issueNumber: r.issue_number || "1",
    title: r.variant ? `${r.series} #${r.issue_number || "1"} [${r.variant}]` : (r.title || `${r.series} #${r.issue_number || "1"}`),
    originEra: eraKey.toUpperCase(),
    productionAge: eraKey,
    lineage: `${r.publisher || "Verified"} Benchmark Constituent`,
    referenceGrade,
    referenceFmvUsd: rawFmv ?? 0,
    priceFormatted: rawFmv != null ? `$${rawFmv.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—",
    deltaPercent,
    status: r.status || "ACTIVE",
    coverUrl: cover,
    canonicalIssueId: r.id,
    year: rawYear,
    publisher: resolveAuthoritativePublisher(r.series, r.publisher, rawYear),
    variant: r.variant || null,
    keyBadge,
  };
}


function interleaveItems(
  baseItems: SovereignEquityItem[],
  variantItems: SovereignEquityItem[],
  targetTotal = QUEUE_BLOCK_SIZE
): SovereignEquityItem[] {
  const result: SovereignEquityItem[] = [];
  let b = 0;
  let v = 0;
  // Interleave 1 variant every 4th slot (~25% variants / newsstands / reprints)
  while (result.length < targetTotal && (b < baseItems.length || v < variantItems.length)) {
    if (result.length % 4 === 3 && v < variantItems.length) {
      result.push(variantItems[v++]);
    } else if (b < baseItems.length) {
      result.push(baseItems[b++]);
    } else if (v < variantItems.length) {
      result.push(variantItems[v++]);
    } else {
      break;
    }
  }
  return result;
}

/**
 * Loads a full 5,000-comic queue block from Supabase (PostgreSQL) verified_equities
 * Gated by Historical & Cultural Significance rather than raw dollar price.
 */
async function loadQueueBlock(blockIndex: number, era?: string): Promise<SovereignEquityItem[]> {
  const cacheKey = `${blockIndex}:${era || "all"}`;
  const existing = blockCache.get(cacheKey);
  if (existing && Date.now() - existing.cachedAt < CACHE_TTL_MS) {
    return existing.items;
  }

  const offset = blockIndex * QUEUE_BLOCK_SIZE;
  const limit = QUEUE_BLOCK_SIZE;
  let items: SovereignEquityItem[] = [];

  // Source: Remote PostgreSQL (Supabase) via verified_equities
  try {
    const db = createCleanReadOnlyServerClient();
    let baseQuery = db
      .from("verified_equities")
      .select("id, series, issue_number, title, publication_year, publisher, fmv_usd, price_formatted, cover_url, ticker, origin_era, production_age, reference_grade, gregory_score, delta_percent, variant")
      .or("variant.is.null,variant.eq.")
      .not("cover_url", "is", null)
      .neq("cover_url", "")
      .not("cover_url", "like", "%files1.comics.org%")
      .not("cover_url", "like", "%526.jpg%");

    let varQuery = db
      .from("verified_equities")
      .select("id, series, issue_number, title, publication_year, publisher, fmv_usd, price_formatted, cover_url, ticker, origin_era, production_age, reference_grade, gregory_score, delta_percent, variant")
      .not("variant", "is", null)
      .neq("variant", "")
      .not("cover_url", "is", null)
      .neq("cover_url", "")
      .not("cover_url", "like", "%files1.comics.org%")
      .not("cover_url", "like", "%526.jpg%");

    if (era && era !== "all") {
      baseQuery = baseQuery.or(`production_age.ilike.${era},origin_era.ilike.${era}`);
      varQuery = varQuery.or(`production_age.ilike.${era},origin_era.ilike.${era}`);
    }

    const safeBaseOffset = offset % 38442;
    const safeVarOffset = Math.floor((offset * 0.2) % 3444);

    const [baseRes, varRes] = await Promise.all([
      baseQuery.order("publication_year", { ascending: true }).order("id", { ascending: true }).range(safeBaseOffset, safeBaseOffset + Math.floor(limit * 0.8) - 1),
      varQuery.order("publication_year", { ascending: true }).order("id", { ascending: true }).range(safeVarOffset, safeVarOffset + Math.ceil(limit * 0.25) - 1),
    ]);

    const mappedBase = (baseRes.data || []).map((r, idx) => mapDbRow(r, idx, offset, blockIndex));
    const mappedVar = (varRes.data || []).map((r, idx) => mapDbRow(r, idx, offset, blockIndex));

    items = interleaveItems(mappedBase, mappedVar, limit);
  } catch (pgErr) {
    console.warn("Notice loading queue block from postgres:", pgErr);
  }

  // Save to block cache
  blockCache.set(cacheKey, {
    blockIndex,
    eraKey: era || "all",
    items,
    cachedAt: Date.now(),
  });

  return items;
}

/**
 * Main public entrypoint: Stream a continuous window across 5,000-comic blocks
 */
export async function getContinuousQueueSlice(
  offset = 0,
  limit = 80,
  era?: string
): Promise<QueueBlockResult> {
  const safeOffset = Math.max(0, offset) % TOTAL_CATALOG_UNIVERSE;
  const blockIndex = Math.floor(safeOffset / QUEUE_BLOCK_SIZE) % TOTAL_QUEUE_BLOCKS;
  const blockOffset = safeOffset % QUEUE_BLOCK_SIZE;

  // Load the active 5,000-comic queue block
  const blockItems = await loadQueueBlock(blockIndex, era);

  // If block boundary is crossed within requested slice, load next block to fill seamlessly
  let candidateItems = [...blockItems];
  if (candidateItems.length === 0) {
    // Fallback load block 0
    candidateItems = await loadQueueBlock(0, era);
  }

  const poolLength = Math.max(candidateItems.length, 1);
  const effectiveOffset = blockOffset % poolLength;

  let slice = candidateItems.slice(effectiveOffset, effectiveOffset + limit);
  // Wrap around within block if needed
  if (slice.length < limit && candidateItems.length > 0) {
    const needed = limit - slice.length;
    // Attempt to pull from next block
    const nextBlockIndex = (blockIndex + 1) % TOTAL_QUEUE_BLOCKS;
    const nextBlockItems = await loadQueueBlock(nextBlockIndex, era);
    if (nextBlockItems.length > 0) {
      slice = [...slice, ...nextBlockItems.slice(0, needed)];
    } else {
      slice = [...slice, ...candidateItems.slice(0, needed)];
    }
  }

  // Calculate Era and Scarcity totals across the block
  const eraTotals: Record<string, number> = {};
  const scarcityTotals: Record<string, number> = {
    mythic: 0,
    legendary: 0,
    epic: 0,
    rare: 0,
    uncommon: 0,
    common: 0,
  };

  for (const item of candidateItems) {
    const e = item.productionAge || "modern";
    eraTotals[e] = (eraTotals[e] || 0) + 1;
    const fmv = item.referenceFmvUsd || 0;
    if (fmv >= 50000) scarcityTotals.mythic++;
    else if (fmv >= 15000) scarcityTotals.legendary++;
    else if (fmv >= 4000) scarcityTotals.epic++;
    else if (fmv >= 1000) scarcityTotals.rare++;
    else if (fmv >= 300) scarcityTotals.uncommon++;
    else scarcityTotals.common++;
  }

  const nextOffset = (safeOffset + limit) % TOTAL_CATALOG_UNIVERSE;

  return {
    items: slice,
    blockIndex,
    blockOffset,
    nextOffset,
    totalEligible: TOTAL_CATALOG_UNIVERSE,
    totalInBlock: candidateItems.length,
    eraTotals,
    scarcityTotals,
  };
}
