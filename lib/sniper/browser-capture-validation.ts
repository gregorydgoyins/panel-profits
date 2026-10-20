import type { RawAuctionListing } from "./types";

const HOSTS: Record<string, string[]> = {
  heritage: ["comics.ha.com"], mycomicshop: ["www.mycomicshop.com", "mycomicshop.com"],
  comiclink: ["www.comiclink.com", "comiclink.com"], pristine: ["www.pristineauction.com", "pristineauction.com"],
  goldin: ["goldin.co", "www.goldin.co"],
};

export function validateBrowserListing(value: unknown): { ok: true; listing: RawAuctionListing } | { ok: false; reason: string } {
  if (!value || typeof value !== "object") return { ok: false, reason: "record is not an object" };
  const listing = value as RawAuctionListing;
  if (!listing.id || !listing.title || !listing.url || !listing.imageUrl) return { ok: false, reason: "id, title, url, and imageUrl are required" };
  if (!(listing.source in HOSTS)) return { ok: false, reason: "browser ingestion supports only authorized auction venues" };
  let parsed: URL;
  try { parsed = new URL(listing.url); } catch { return { ok: false, reason: "invalid source URL" }; }
  if (parsed.protocol !== "https:" || !HOSTS[listing.source].includes(parsed.hostname.toLowerCase())) return { ok: false, reason: "source URL host does not match venue" };
  if (!Number.isFinite(listing.currentBid) || listing.currentBid <= 0) return { ok: false, reason: "current bid must be positive" };
  if (!Number.isFinite(listing.secondsRemaining) || listing.secondsRemaining <= 0) return { ok: false, reason: "a live countdown/deadline is required" };
  if (!Number.isInteger(listing.bidCount) || listing.bidCount < 0) return { ok: false, reason: "bid count is invalid" };
  const capturePayload = (listing as RawAuctionListing & { payload?: unknown }).payload;
  const evidence = capturePayload && typeof capturePayload === "object" ? (capturePayload as Record<string, unknown>).rawAuctionEvidence : undefined;
  if (!evidence || typeof evidence !== "object") return { ok: false, reason: "lot-level rawAuctionEvidence is required; positional catalog arrays are not accepted" };
  const evidenceRecord = evidence as Record<string, unknown>;
  if (evidenceRecord.url !== listing.url) return { ok: false, reason: "lot evidence URL does not match listing URL" };
  if (typeof evidenceRecord.title !== "string" || !evidenceRecord.title.trim()) return { ok: false, reason: "lot evidence title is missing" };
  const evidenceBid = typeof evidenceRecord.currentBid === "number" ? evidenceRecord.currentBid : typeof evidenceRecord.bid === "string" ? Number(evidenceRecord.bid.replace(/[^\d.]/g, "")) : NaN;
  if (!Number.isFinite(evidenceBid) || evidenceBid !== listing.currentBid) return { ok: false, reason: "lot evidence bid does not match listing bid" };
  if (evidenceRecord.bidCount != null && Number(evidenceRecord.bidCount) !== listing.bidCount) return { ok: false, reason: "lot evidence bid count does not match listing" };
  return { ok: true, listing };
}
