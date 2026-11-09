import type { SovereignEquityItem } from "./canonical-equities";

export interface VerifiedEquityRecord {
  id: string;
  series: string;
  issue_number: string;
  title: string;
  publication_year: number;
  publisher: string;
  fmv_usd: number;
  price_formatted: string;
  cover_url: string;
  ticker: string;
  origin_era: string;
  production_age: string;
  reference_grade: string;
  gregory_score: number;
  delta_percent: number;
  status: string;
  variant: string | null;
  source_product_id?: string | null;
}

// The former source for every lookup in this module was the local data/pp115k.sqlite file,
// which is git-ignored and never present in the deployed runtime. That SQLite path has been
// removed. These functions are synchronous and have no Supabase source, so they now report
// "no data" (empty list / null). The async Supabase-backed equivalents live in
// verified-equities-live.ts and continuous-queue-engine.ts.

/**
 * Retrieves authentic, verified comics with real market-cleared prices (with pennies)
 * and verified photographic cover images. Zero synthetic .00 fallbacks.
 * Interleaves across the canonical 9 publishing eras:
 * Platinum, Golden, Atomic, Silver, Bronze, Copper, Modern, Independent, Post-Modern.
 *
 * Local SQLite source removed; always returns no items.
 */
export function getVerifiedRealEquities(
  _offset = 0,
  _limit = 80,
  _random = false,
  _era?: string
): {
  items: SovereignEquityItem[];
  totalEligible: number;
} {
  return { items: [], totalEligible: 0 };
}

/**
 * Resolves a comic equity by ID, source_product_id (pp-XXXX), ticker, ticker alias, or series-issue slug.
 * Local SQLite source removed; always returns null.
 */
export function getVerifiedEquityByIdOrTicker(_idOrTicker: string): VerifiedEquityRecord | null {
  return null;
}

/** Local SQLite source removed; always returns an empty list. */
export function searchVerifiedEquities(_queryText = "", _limit = 48, _era?: string): VerifiedEquityRecord[] {
  return [];
}

/**
 * Looks up full catalog row from comics table by source_product_id or series/issue.
 * Local SQLite source removed; always returns null.
 */
export function getCatalogComicBySourceProductId(
  _sourceProductId?: string | null,
  _series?: string | null,
  _issueNumber?: string | null
): any | null {
  return null;
}

/**
 * Direct lookup of catalog comic by ID, ticker, or source_product_id.
 * Local SQLite source removed; always returns null.
 */
export function getCatalogComicById(_id: string): any | null {
  return null;
}
