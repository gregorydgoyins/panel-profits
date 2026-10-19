import { describe, expect, it } from "vitest";
import { filterLiveListings, normalizePersistedLiveListing } from "@/lib/sniper/live-listing-normalizer";
import type { RawAuctionListing } from "@/lib/sniper/types";

const comicLinkRow = (overrides: Record<string, unknown> = {}) => ({
  payload: {
    id: "comiclink-1980112",
    source: "comiclink",
    title: "AMAZING ADVENTURES #19 CGC 9.8 NM/MT",
    url: "https://www.comiclink.com/auctions/item.asp?id=1980112",
    imageUrl: "https://www.comiclink.com/img/comics/2026/example_TH.jpg",
    currentBid: 34,
    bidCount: 3,
    isBuyItNow: false,
    listingType: "Auction",
    ...overrides,
  },
  price_usd: 34,
  bid_count: 3,
  end_time: "2026-10-27T01:25:50Z",
  last_seen: "2026-10-19T21:22:46Z",
});

describe("persisted live auction normalization", () => {
  it("keeps a browser-captured lot active when optional research metadata is absent", () => {
    const item = normalizePersistedLiveListing(comicLinkRow(), Date.parse("2026-10-19T21:25:00Z"));
    expect(item).not.toBeNull();
    expect(item?.source).toBe("comiclink");
    expect(item?.currentBid).toBe(34);
    expect(item?.bidCount).toBe(3);
    expect(item?.secondsRemaining).toBeGreaterThan(0);
    expect(item?.label).toBeNull();
    expect(item?.censusResolved).toBe(false);
  });

  it("rejects malformed payload identity instead of inventing display fields", () => {
    expect(normalizePersistedLiveListing(comicLinkRow({ title: undefined }))).toBeNull();
    expect(normalizePersistedLiveListing(comicLinkRow({ url: undefined }))).toBeNull();
  });

  it("filters by venue and title without crashing on missing optional metadata", () => {
    const comicLink = normalizePersistedLiveListing(comicLinkRow())!;
    const myComicShop: RawAuctionListing = { ...comicLink, id: "mycomicshop-1", source: "mycomicshop", title: "BATMAN #1 CGC 9.8" };
    expect(filterLiveListings([comicLink, myComicShop], { source: "comiclink" })).toEqual([comicLink]);
    expect(filterLiveListings([comicLink, myComicShop], { query: "Batman" })).toEqual([myComicShop]);
  });
});
