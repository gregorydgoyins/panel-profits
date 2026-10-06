/**
 * continuous-queue-engine.ts
 *
 * High-performance continuous queue engine for the 115,712 Panel Profits catalog.
 * Partitions the catalog into continuous queues of 5,000-comic blocks (24 blocks total),
 * streaming non-repeating multi-era equities to the surveillance rail with zero repetition.
 */

import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";
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

let cachedSqliteDb: any = null;
let sqliteAvailable: boolean | null = null;

function getSqliteDb(): any {
  if (cachedSqliteDb) return cachedSqliteDb;
  if (sqliteAvailable === false) return null;

  try {
    const require = createRequire(import.meta.url);
    const { DatabaseSync } = require("node:sqlite");
    sqliteAvailable = true;

    const dbPaths = [
      path.join(process.cwd(), "data", "pp115k.sqlite"),
      path.join(process.cwd(), "panel-profits", "data", "pp115k.sqlite"),
    ];

    for (const p of dbPaths) {
      if (fs.existsSync(p)) {
        try {
          cachedSqliteDb = new DatabaseSync(p, { readOnly: true });
          try {
            cachedSqliteDb.exec("PRAGMA query_only = ON;");
            cachedSqliteDb.exec("PRAGMA cache_size = -65536;"); // 64MB RAM page cache
          } catch {}
          return cachedSqliteDb;
        } catch {
          // Continue to next path
        }
      }
    }
  } catch {
    sqliteAvailable = false;
  }
  return null;
}

function resolveEra(year: number | null | undefined, originEra?: string | null): string {
  if (year && year > 0) {
    const calculated = resolveProductionAge(year);
    if (calculated && calculated !== "unknown") return calculated.toLowerCase();
  }
  if (originEra && originEra.trim()) {
    return originEra.toLowerCase().replace(/_age$/, "").replace(/\s+age$/, "");
  }
  return "modern";
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

function mapDbRow(r: any, idx: number, offset: number, blockIndex: number): SovereignEquityItem {
  const rawYear = r.publication_year ? Number(r.publication_year) : null;
  const eraKey = resolveEra(rawYear, r.origin_era || r.production_age);
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
    year: rawYear || undefined,
    publisher: resolveAuthoritativePublisher(r.series, r.publisher),
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

// ─────────────────────────────────────────────────────────────────────────────
// Rail source: public.rail_equities (confirmed single issues, trusted covers).
// Every book appears exactly once: direct and variant pools are each partitioned
// across the blocks by true row position (no modulo wrap, no repeats), and each
// block is interleaved in proportion to the real direct/variant mix.
// ─────────────────────────────────────────────────────────────────────────────
interface RailUniverse {
  total: number;
  direct: number;
  variant: number;
  blocks: number;
}

const railUniverseCache = new Map<string, { at: number; data: RailUniverse }>();
const RAIL_COLUMNS =
  "id, series, issue_number, title, publication_year, publisher, fmv_usd, cover_url, production_age, reference_grade, variant, status";
const RAIL_PAGE = 1000; // stay under the PostgREST per-request row cap

async function getRailUniverse(era?: string): Promise<RailUniverse | null> {
  const key = era && era !== "all" ? era.toLowerCase() : "all";
  const hit = railUniverseCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;
  try {
    const db = createCleanReadOnlyServerClient();
    const count = async (isDirect: boolean): Promise<number> => {
      let q = db
        .from("rail_equities")
        .select("id", { count: "exact", head: true })
        .eq("cover_trusted", true)
        .eq("is_direct", isDirect);
      if (key !== "all") q = q.ilike("production_age", key);
      const { count: c, error } = await q;
      if (error) throw error;
      return c ?? 0;
    };
    const [direct, variant] = await Promise.all([count(true), count(false)]);
    const total = direct + variant;
    if (total <= 0) return null;
    const data: RailUniverse = {
      total,
      direct,
      variant,
      blocks: Math.max(1, Math.ceil(total / QUEUE_BLOCK_SIZE)),
    };
    railUniverseCache.set(key, { at: Date.now(), data });
    return data;
  } catch (err) {
    console.warn("Notice reading rail universe from rail_equities:", err);
    return null;
  }
}

function railBounds(uni: RailUniverse, blockIndex: number) {
  const dS = Math.floor((blockIndex * uni.direct) / uni.blocks);
  const dE = Math.floor(((blockIndex + 1) * uni.direct) / uni.blocks);
  const vS = Math.floor((blockIndex * uni.variant) / uni.blocks);
  const vE = Math.floor(((blockIndex + 1) * uni.variant) / uni.blocks);
  return { dS, dE, vS, vE, start: dS + vS };
}

function railBlockIndexFor(uni: RailUniverse, offset: number): number {
  let idx = 0;
  for (let b = 0; b < uni.blocks; b++) {
    if (railBounds(uni, b).start <= offset) idx = b;
    else break;
  }
  return idx;
}

/** Total number of rail books for an era (falls back to the legacy constant if the table is unreadable). */
export async function getCatalogUniverseTotal(era?: string): Promise<number> {
  const uni = await getRailUniverse(era);
  return uni ? uni.total : TOTAL_CATALOG_UNIVERSE;
}

async function fetchRailPool(isDirect: boolean, from: number, to: number, era?: string): Promise<any[]> {
  if (to <= from) return [];
  const db = createCleanReadOnlyServerClient();
  const pages: PromiseLike<any[]>[] = [];
  for (let s = from; s < to; s += RAIL_PAGE) {
    const e = Math.min(s + RAIL_PAGE, to) - 1;
    let q = db
      .from("rail_equities")
      .select(RAIL_COLUMNS)
      .eq("cover_trusted", true)
      .eq("is_direct", isDirect);
    if (era && era !== "all") q = q.ilike("production_age", era);
    pages.push(
      q
        .order("publication_year", { ascending: true, nullsFirst: false })
        .order("fmv_usd", { ascending: false })
        .order("id", { ascending: true })
        .range(s, e)
        .then(({ data, error }) => {
          if (error) throw error;
          return data || [];
        })
    );
  }
  return (await Promise.all(pages)).flat();
}

function interleaveProportional(base: SovereignEquityItem[], variants: SovereignEquityItem[]): SovereignEquityItem[] {
  const total = base.length + variants.length;
  const out: SovereignEquityItem[] = [];
  let b = 0;
  let v = 0;
  for (let i = 0; i < total; i++) {
    const wantVariant = Math.floor(((i + 1) * variants.length) / total) > Math.floor((i * variants.length) / total);
    if (wantVariant && v < variants.length) out.push(variants[v++]);
    else if (b < base.length) out.push(base[b++]);
    else out.push(variants[v++]);
  }
  return out;
}

async function loadRailBlock(uni: RailUniverse, blockIndex: number, era?: string): Promise<SovereignEquityItem[]> {
  const bd = railBounds(uni, blockIndex);
  const [directRows, variantRows] = await Promise.all([
    fetchRailPool(true, bd.dS, bd.dE, era),
    fetchRailPool(false, bd.vS, bd.vE, era),
  ]);
  const base = directRows.map((r, idx) => mapDbRow(r, idx, bd.start, blockIndex));
  const vari = variantRows.map((r, idx) => mapDbRow(r, bd.dE - bd.dS + idx, bd.start, blockIndex));
  return interleaveProportional(base, vari);
}

/**
 * Loads a full 5,000-comic queue block from storage (SQLite or PostgreSQL)
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

  // Source 0: rail_equities (confirmed single issues, trusted covers, true partition)
  try {
    const uni = await getRailUniverse(era);
    if (uni) items = await loadRailBlock(uni, blockIndex, era);
  } catch (railErr) {
    console.warn("Notice loading queue block from rail_equities:", railErr);
  }

  // Source 1 (legacy fallback): Local High-Speed SQLite if available
  const sqlite = items.length === 0 ? getSqliteDb() : null;
  if (sqlite) {
    try {
      let baseSql = `
        SELECT id, series, issue_number, title, publication_year, publisher, 
               fmv_usd, price_formatted, cover_url, ticker, origin_era, production_age, 
               reference_grade, gregory_score, delta_percent, status, variant 
        FROM verified_equities 
        WHERE cover_url IS NOT NULL AND cover_url != '' AND (variant IS NULL OR variant = '') AND publication_year > 1930
      `;
      let varSql = `
        SELECT id, series, issue_number, title, publication_year, publisher, 
               fmv_usd, price_formatted, cover_url, ticker, origin_era, production_age, 
               reference_grade, gregory_score, delta_percent, status, variant 
        FROM verified_equities 
        WHERE cover_url IS NOT NULL AND cover_url != '' AND variant IS NOT NULL AND variant != '' AND publication_year > 1930
      `;
      const baseParams: any[] = [];
      const varParams: any[] = [];
      if (era && era !== "all") {
        baseSql += ` AND (LOWER(production_age) = ? OR LOWER(origin_era) = ?)`;
        baseParams.push(era.toLowerCase(), era.toLowerCase());
        varSql += ` AND (LOWER(production_age) = ? OR LOWER(origin_era) = ?)`;
        varParams.push(era.toLowerCase(), era.toLowerCase());
      }

      const historicalSort = `
        ORDER BY 
          CASE 
            WHEN publication_year <= 1945 THEN 1
            WHEN publication_year <= 1955 THEN 2
            WHEN publication_year <= 1969 THEN 3
            WHEN publication_year <= 1983 THEN 4
            WHEN publication_year <= 1991 THEN 5
            ELSE 6
          END ASC, 
          gregory_score DESC, 
          publication_year ASC, 
          id ASC 
        LIMIT ? OFFSET ?
      `;

      baseSql += historicalSort;
      baseParams.push(Math.floor(limit * 0.8), (offset % 38957));

      varSql += historicalSort;
      varParams.push(Math.ceil(limit * 0.25), Math.floor((offset * 0.2) % 3445));

      const baseRows = sqlite.prepare(baseSql).all(...baseParams) as any[];
      const varRows = sqlite.prepare(varSql).all(...varParams) as any[];

      const mappedBase = (baseRows || []).map((r, idx) => mapDbRow(r, idx, offset, blockIndex));
      const mappedVar = (varRows || []).map((r, idx) => mapDbRow(r, idx, offset, blockIndex));

      items = interleaveItems(mappedBase, mappedVar, limit);
    } catch (sqliteErr) {
      console.warn("Notice loading queue block from sqlite:", sqliteErr);
    }
  }

  // Source 2: Remote PostgreSQL (Supabase) via verified_equities
  if (items.length === 0) {
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

      const safeBaseOffset = offset % 38957;
      const safeVarOffset = Math.floor((offset * 0.2) % 3445);

      const [baseRes, varRes] = await Promise.all([
        baseQuery.order("gregory_score", { ascending: false }).order("publication_year", { ascending: true }).order("id", { ascending: true }).range(safeBaseOffset, safeBaseOffset + Math.floor(limit * 0.8) - 1),
        varQuery.order("gregory_score", { ascending: false }).order("publication_year", { ascending: true }).order("id", { ascending: true }).range(safeVarOffset, safeVarOffset + Math.ceil(limit * 0.25) - 1),
      ]);

      const mappedBase = (baseRes.data || []).map((r, idx) => mapDbRow(r, idx, offset, blockIndex));
      const mappedVar = (varRes.data || []).map((r, idx) => mapDbRow(r, idx, offset, blockIndex));

      items = interleaveItems(mappedBase, mappedVar, limit);
    } catch (pgErr) {
      console.warn("Notice loading queue block from postgres:", pgErr);
    }
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
  const uni = await getRailUniverse(era);
  const total = uni ? uni.total : TOTAL_CATALOG_UNIVERSE;
  const blockCount = uni ? uni.blocks : TOTAL_QUEUE_BLOCKS;
  const safeOffset = Math.max(0, offset) % total;
  const blockIndex = uni
    ? railBlockIndexFor(uni, safeOffset)
    : Math.floor(safeOffset / QUEUE_BLOCK_SIZE) % TOTAL_QUEUE_BLOCKS;
  const blockStart = uni ? railBounds(uni, blockIndex).start : blockIndex * QUEUE_BLOCK_SIZE;
  const blockOffset = safeOffset - blockStart;

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
    const nextBlockIndex = (blockIndex + 1) % blockCount;
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

  const nextOffset = (safeOffset + limit) % total;

  return {
    items: slice,
    blockIndex,
    blockOffset,
    nextOffset,
    totalEligible: total,
    totalInBlock: candidateItems.length,
    eraTotals,
    scarcityTotals,
  };
}
