import type { RawAuctionListing } from "./types";
import { auditSourceRecord } from "./source-validation";
import { parseAndFilterListing } from "./anti-bullshit";

export interface PersistedLiveListingRow {
  payload?: unknown;
  price_usd?: number | string | null;
  bid_count?: number | string | null;
  end_time?: string | null;
  last_seen?: string | null;
  label?: RawAuctionListing["label"];
  census?: RawAuctionListing["censusValue"];
  census_at?: string | null;
  admission_evidence?: RawAuctionListing["admissionEvidence"];
}

/**
 * Rehydrates the venue payload contract used by the API.  Relational columns
 * carry live values, while identity and provenance remain in payload.  A row
 * without the payload's title or URL is intentionally not displayable.
 */
export function normalizePersistedLiveListing(
  row: PersistedLiveListingRow,
  nowMs = Date.now(),
): RawAuctionListing | null {
  if (!row.payload || typeof row.payload !== "object") return null;
  const payload = row.payload as Partial<RawAuctionListing>;
  if (typeof payload.id !== "string" || !payload.id.trim()) return null;
  if (typeof payload.title !== "string" || !payload.title.trim()) return null;
  if (typeof payload.url !== "string" || !payload.url.trim()) return null;

  const sourceAudit = auditSourceRecord({
    source: payload.source,
    url: payload.url,
    id: payload.id,
    title: payload.title,
    currentBid: payload.currentBid ?? row.price_usd,
    last_seen: row.last_seen,
    payload,
  });
  if (sourceAudit.isCbseRecord && !sourceAudit.valid) return null;

  // Keep observed slab facts available even when the scheduled enrichment
  // worker has not refreshed this row yet. This is display/matching evidence,
  // not certification verification: admission still relies on its separate
  // certificationVerification and admissionEvidence gates.
  const parsed = parseAndFilterListing(payload.title);
  const enrichmentIdentity = (payload as any).admissionEnrichment?.identity;
  const observedGrader = payload.gradingCompany ?? enrichmentIdentity?.grader ?? parsed.gradingCompany;
  const observedGrade = payload.resolvedGrade ?? enrichmentIdentity?.grade ?? parsed.grade;
  const observedCertNumber = payload.certNumber ?? enrichmentIdentity?.certNumber ?? parsed.certNumber;

  return {
    ...payload,
    ...(observedGrader ? { gradingCompany: observedGrader } : {}),
    ...(Number.isFinite(Number(observedGrade)) ? { resolvedGrade: Number(observedGrade) } : {}),
    ...(observedCertNumber ? { certNumber: String(observedCertNumber) } : {}),
    admissionEvidence: row.admission_evidence ?? undefined,
    label: row.label ?? null,
    censusResolved: row.census_at != null,
    censusValue: row.census ?? null,
    currentBid: Number(row.price_usd ?? payload.currentBid ?? 0),
    bidCount: Number(row.bid_count ?? payload.bidCount ?? 0) || 0,
    secondsRemaining: row.end_time
      ? Math.max(0, Math.round((new Date(row.end_time).getTime() - nowMs) / 1000))
      : Number(payload.secondsRemaining ?? 0),
  } as RawAuctionListing;
}

export function filterLiveListings(
  items: RawAuctionListing[],
  options: { source?: string | null; query?: string | null } = {},
): RawAuctionListing[] {
  const source = options.source?.trim().toLowerCase();
  // Search is intentionally punctuation-insensitive so a user query such as
  // "Amazing Adventures 19" still finds a source title rendered as
  // "Amazing Adventures #19". This changes matching only; source payloads
  // and exact catalog identity remain untouched.
  const query = normalizeSearchText(options.query);
  return items.filter((item) => {
    if (source && String(item.source ?? "").toLowerCase() !== source) return false;
    if (!query) return true;
    return normalizeSearchText(item.title).includes(query) ||
      normalizeSearchText(item.itemDescription).includes(query);
  });
}

function normalizeSearchText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
