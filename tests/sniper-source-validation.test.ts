import { describe, expect, it } from "vitest";
import {
  auditSourceRecord,
  isCanonicalComicBookStockExchangeUrl,
  isCbseAttributedRecord,
} from "@/lib/sniper/source-validation";

describe("Comic Book Stock Exchange source validation", () => {
  it("accepts only the exact authorized HTTPS host", () => {
    expect(isCanonicalComicBookStockExchangeUrl("https://comicbookstockexchange.com/sniper/listing-1")).toBe(true);
    expect(isCanonicalComicBookStockExchangeUrl("https://www.comicbookstockexchange.com/sniper/listing-1")).toBe(false);
    expect(isCanonicalComicBookStockExchangeUrl("http://comicbookstockexchange.com/sniper/listing-1")).toBe(false);
    expect(isCanonicalComicBookStockExchangeUrl("https://comicbookstockexchange.com.evil.example/listing-1")).toBe(false);
    expect(isCanonicalComicBookStockExchangeUrl("https://comicbookstockexchange.vercel.app/listing-1")).toBe(false);
  });

  it("requires traceable CBSE listing evidence", () => {
    const valid = auditSourceRecord({
      source: "Comic Book Stock Exchange",
      id: "cbse-123",
      title: "Amazing Spider-Man #300 CGC 9.8",
      url: "https://comicbookstockexchange.com/sniper/cbse-123",
      currentBid: 125,
      last_seen: "2026-10-19T09:00:00.000Z",
    });
    expect(valid).toMatchObject({ isCbseRecord: true, valid: true });

    expect(auditSourceRecord({
      source: "Comic Book Stock Exchange",
      id: "cbse-123",
      title: "Amazing Spider-Man #300",
      url: "https://fake-comicbookstockexchange.example/listing/cbse-123",
      currentBid: 125,
      last_seen: "2026-10-19T09:00:00.000Z",
    })).toMatchObject({ valid: false, reason: "cbse_source_url_not_exact_authorized_https_host" });
    expect(auditSourceRecord({
      source: "Comic Book Stock Exchange",
      title: "Amazing Spider-Man #300",
      url: "https://comicbookstockexchange.com/sniper/cbse-123",
      currentBid: 125,
      last_seen: "2026-10-19T09:00:00.000Z",
    })).toMatchObject({ valid: false, reason: "cbse_listing_identifier_missing" });
    expect(auditSourceRecord({
      source: "CBSE",
      id: "cbse-123",
      title: "Amazing Spider-Man #300",
      url: "https://comicbookstockexchange.com/sniper/cbse-123",
      currentBid: 125,
      last_seen: "2026-10-19T09:00:00.000Z",
    })).toMatchObject({ valid: false, reason: "cbse_source_alias_not_authorized" });
    expect(auditSourceRecord({
      source: "comicconnect",
      id: "cc-123",
      title: "Amazing Spider-Man #300",
      url: "https://comicbookstockexchange.com/sniper/cc-123",
      currentBid: 125,
      last_seen: "2026-10-19T09:00:00.000Z",
    })).toMatchObject({ valid: false, reason: "cbse_url_conflicts_with_non_cbse_venue" });
  });

  it("does not reinterpret another venue as CBSE", () => {
    expect(isCbseAttributedRecord({
      source: "comicconnect",
      id: "cc-1",
      title: "Batman #1 CGC 9.8",
      url: "https://www.comicconnect.com/item/1",
    })).toBe(false);
    expect(auditSourceRecord({
      source: "comicconnect",
      id: "cc-1",
      title: "Batman #1 CGC 9.8",
      url: "https://www.comicconnect.com/item/1",
      currentBid: 100,
      last_seen: "2026-10-19T09:00:00.000Z",
    })).toEqual({ isCbseRecord: false, valid: true });
  });
});
