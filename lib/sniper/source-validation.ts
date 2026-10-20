/**
 * Source provenance rules for auction records.
 *
 * Comic Book Stock Exchange is the Panel Profits application domain, not a
 * venue whose auctions can be inferred from another marketplace.  We only
 * accept a CBSE-attributed record when its original URL is an exact HTTPS URL
 * on the authorized host and the record retains the minimum evidence needed
 * to trace it back to the source.
 */

export const COMIC_BOOK_STOCK_EXCHANGE_ORIGIN = "https://comicbookstockexchange.com";
export const COMIC_BOOK_STOCK_EXCHANGE_HOST = "comicbookstockexchange.com";

const CBSE_SOURCE_LABELS = new Set([
  "comicbookstockexchange",
  "comic book stock exchange",
]);

const CBSE_SOURCE_ALIASES = new Set([
  "cbse",
  "comicbookstockexchange.com",
  "www.comicbookstockexchange.com",
  "comicbook-stock-exchange",
  "comic_book_stock_exchange",
]);

export interface CbseRecordCandidate {
  source?: unknown;
  venue?: unknown;
  id?: unknown;
  item_id?: unknown;
  title?: unknown;
  url?: unknown;
  price?: unknown;
  currentBid?: unknown;
  price_usd?: unknown;
  collectedAt?: unknown;
  collectionTimestamp?: unknown;
  last_seen?: unknown;
  payload?: {
    source?: unknown;
    venue?: unknown;
    id?: unknown;
    title?: unknown;
    url?: unknown;
    currentBid?: unknown;
    price_usd?: unknown;
    collectedAt?: unknown;
    collectionTimestamp?: unknown;
  } | null;
}

export type SourceAuditResult =
  | { isCbseRecord: false; valid: true }
  | { isCbseRecord: true; valid: true; canonicalUrl: string }
  | { isCbseRecord: true; valid: false; reason: string };

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown): number | null {
  const result = typeof value === "number" ? value : Number(value);
  return Number.isFinite(result) ? result : null;
}

function sourceLabel(record: CbseRecordCandidate): string {
  return text(record.source ?? record.venue ?? record.payload?.source ?? record.payload?.venue).toLowerCase();
}

function sourceUrl(record: CbseRecordCandidate): string {
  return text(record.url ?? record.payload?.url);
}

/** True only for the exact authorized host; subdomains and lookalike domains fail. */
export function isCanonicalComicBookStockExchangeUrl(value: unknown): boolean {
  const raw = text(value);
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" && parsed.hostname === COMIC_BOOK_STOCK_EXCHANGE_HOST &&
      (parsed.port === "" || parsed.port === "443");
  } catch {
    return false;
  }
}

export function isCbseSourceLabel(value: unknown): boolean {
  return CBSE_SOURCE_LABELS.has(text(value).toLowerCase());
}

export function isCbseSourceAlias(value: unknown): boolean {
  return CBSE_SOURCE_ALIASES.has(text(value).toLowerCase());
}

export function isCbseAttributedRecord(record: CbseRecordCandidate): boolean {
  const url = sourceUrl(record);
  return isCbseSourceLabel(record.source) || isCbseSourceLabel(record.venue) ||
    isCbseSourceAlias(record.source) || isCbseSourceAlias(record.venue) ||
    isCbseSourceLabel(record.payload?.source) || isCbseSourceLabel(record.payload?.venue) ||
    isCbseSourceAlias(record.payload?.source) || isCbseSourceAlias(record.payload?.venue) ||
    (() => { try { return new URL(url).hostname === COMIC_BOOK_STOCK_EXCHANGE_HOST; } catch { return false; } })();
}

/**
 * Audit a raw or persisted record.  Non-CBSE records are deliberately left
 * alone so legitimate eBay, Heritage, ComicConnect, etc. data is preserved.
 */
export function auditSourceRecord(record: CbseRecordCandidate): SourceAuditResult {
  if (!isCbseAttributedRecord(record)) return { isCbseRecord: false, valid: true };

  const label = sourceLabel(record);
  if (isCbseSourceAlias(label)) {
    return { isCbseRecord: true, valid: false, reason: "cbse_source_alias_not_authorized" };
  }

  const url = sourceUrl(record);
  if (label && !isCbseSourceLabel(label) && isCanonicalComicBookStockExchangeUrl(url)) {
    return { isCbseRecord: true, valid: false, reason: "cbse_url_conflicts_with_non_cbse_venue" };
  }
  if (!isCanonicalComicBookStockExchangeUrl(url)) {
    return { isCbseRecord: true, valid: false, reason: "cbse_source_url_not_exact_authorized_https_host" };
  }

  const listingId = text(record.id ?? record.item_id ?? record.payload?.id);
  if (!listingId) return { isCbseRecord: true, valid: false, reason: "cbse_listing_identifier_missing" };

  const title = text(record.title ?? record.payload?.title);
  if (!title) return { isCbseRecord: true, valid: false, reason: "cbse_comic_identity_missing" };

  const price = number(record.currentBid ?? record.price_usd ?? record.price ?? record.payload?.currentBid ?? record.payload?.price_usd);
  if (price == null || price <= 0) return { isCbseRecord: true, valid: false, reason: "cbse_price_missing_or_invalid" };

  const collectedAt = text(record.collectedAt ?? record.collectionTimestamp ?? record.last_seen ?? record.payload?.collectedAt ?? record.payload?.collectionTimestamp);
  if (!collectedAt || Number.isNaN(Date.parse(collectedAt))) {
    return { isCbseRecord: true, valid: false, reason: "cbse_collection_timestamp_missing_or_invalid" };
  }

  return { isCbseRecord: true, valid: true, canonicalUrl: url };
}

export function sourceAuditPayload(result: SourceAuditResult) {
  if (!result.isCbseRecord) return null;
  return {
    source: "comicbookstockexchange",
    valid: result.valid,
    ...(result.valid ? { canonicalUrl: result.canonicalUrl } : { reason: result.reason }),
    auditedAt: new Date().toISOString(),
  };
}
