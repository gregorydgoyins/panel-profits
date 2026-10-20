import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashSeed, respondToOffer, rng, sellerProfile, MAX_ROUNDS } from "../lib/sniper/haggle";
import { bidIncrement, paperProfit, settleAuction } from "../lib/sniper/paper";

// In-memory mock state for Supabase and watchLot so paper-store and replay-store can be tested deterministically
const mockDbState: {
  sniper_listings: any[];
  sniper_paper_orders: any[];
  sniper_ticks: any[];
} = {
  sniper_listings: [],
  sniper_paper_orders: [],
  sniper_ticks: [],
};

const watchLotMock = vi.fn();

vi.mock("../lib/sniper/watch", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/sniper/watch")>();
  return {
    ...actual,
    watchLot: (...args: any[]) => watchLotMock(...args),
  };
});

function makeBuilder(table: keyof typeof mockDbState) {
  let rows = () => [...(mockDbState[table] ?? [])];
  const filters: Array<(r: any) => boolean> = [];
  let sortCol: string | null = null;
  let sortAsc = true;
  let limitCount: number | null = null;
  let pendingInsert: any = null;
  let pendingUpdate: any = null;

  const apply = () => {
    if (pendingInsert) {
      const inserted = Array.isArray(pendingInsert) ? pendingInsert[0] : pendingInsert;
      const withId = { id: mockDbState[table].length + 1, created_at: new Date().toISOString(), ...inserted };
      mockDbState[table].push(withId);
      return [withId];
    }
    let out = rows().filter((r) => filters.every((fn) => fn(r)));
    if (pendingUpdate) {
      out = out.map((r) => {
        Object.assign(r, pendingUpdate);
        return r;
      });
    }
    if (sortCol) {
      const c = sortCol;
      out.sort((a, b) => (a[c] < b[c] ? (sortAsc ? -1 : 1) : a[c] > b[c] ? (sortAsc ? 1 : -1) : 0));
    }
    if (limitCount != null) out = out.slice(0, limitCount);
    return out;
  };

  const chain: any = {
    select: () => chain,
    insert: (row: any) => {
      pendingInsert = row;
      return chain;
    },
    update: (patch: any) => {
      pendingUpdate = patch;
      return chain;
    },
    eq: (k: string, v: any) => {
      filters.push((r) => r[k] === v);
      return chain;
    },
    in: (k: string, vals: any[]) => {
      filters.push((r) => vals.includes(r[k]));
      return chain;
    },
    not: (k: string, op: string, v: any) => {
      if (op === "is" && v === null) filters.push((r) => r[k] != null);
      return chain;
    },
    gt: (k: string, v: any) => {
      filters.push((r) => r[k] > v);
      return chain;
    },
    gte: (k: string, v: any) => {
      filters.push((r) => r[k] >= v);
      return chain;
    },
    lt: (k: string, v: any) => {
      filters.push((r) => r[k] < v);
      return chain;
    },
    lte: (k: string, v: any) => {
      filters.push((r) => r[k] <= v);
      return chain;
    },
    order: (col: string, opts?: { ascending?: boolean }) => {
      sortCol = col;
      sortAsc = opts?.ascending ?? true;
      return chain;
    },
    limit: (n: number) => {
      limitCount = n;
      return chain;
    },
    maybeSingle: async () => {
      const res = apply();
      return { data: res[0] ?? null, error: null };
    },
    single: async () => {
      const res = apply();
      return { data: res[0] ?? null, error: res[0] ? null : { message: "not found" } };
    },
    then: (resolve: any) => resolve({ data: apply(), error: null }),
  };
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminServerClient: () => ({
    from: (table: keyof typeof mockDbState) => makeBuilder(table),
  }),
}));

import { closingWatch, listOrders } from "../lib/sniper/paper-store";
import { listReplays, playReplay, revealReplay } from "../lib/sniper/replay-store";
import { resolveAuctionDbMetadata } from "../lib/sniper/auction-metadata";

describe("simulated seller haggling", () => {
  it("gives a seller the same type every time", () => {
    const a = sellerProfile("comic_king_77", true);
    const b = sellerProfile("Comic_King_77", true);
    expect(a.archetype).toBe(b.archetype);
    expect(a.maxDiscount).toBe(b.maxDiscount);
  });

  it("spreads sellers across all five types in roughly the intended proportions", () => {
    const n = 4000;
    const c: Record<string, number> = { firm: 0, fair: 0, dealer: 0, motivated: 0, wildcard: 0 };
    for (let i = 0; i < n; i++) c[sellerProfile(`seller-${i}`, false).archetype]++;
    expect(Math.abs(c.firm / n - 0.25) < 0.04).toBe(true);
    expect(Math.abs(c.fair / n - 0.35) < 0.04).toBe(true);
    expect(Math.abs(c.dealer / n - 0.2) < 0.04).toBe(true);
    expect(Math.abs(c.motivated / n - 0.12) < 0.03).toBe(true);
    expect(Math.abs(c.wildcard / n - 0.08) < 0.03).toBe(true);
  });

  it("is more permissive when the listing advertises Best Offer", () => {
    let on = 0, off = 0;
    for (let i = 0; i < 500; i++) {
      on += sellerProfile(`s${i}`, true).maxDiscount;
      off += sellerProfile(`s${i}`, false).maxDiscount;
    }
    expect(on > off).toBe(true);
  });

  it("replays the same reply for the same seed and differs across seeds", () => {
    const p = sellerProfile("dealer_dan", true);
    const x = respondToOffer({ ask: 200, offer: 175, round: 1, profile: p, seed: "o1" });
    const y = respondToOffer({ ask: 200, offer: 175, round: 1, profile: p, seed: "o1" });
    expect(JSON.stringify(x)).toBe(JSON.stringify(y));
    const outcomes = new Set<string>();
    for (let i = 0; i < 60; i++) outcomes.add(respondToOffer({ ask: 200, offer: 180, round: 1, profile: { ...p, maxDiscount: 0.15, counters: true }, seed: `s${i}` }).result);
    expect(outcomes.size > 1).toBe(true);
  });

  it("accepts the asking price and refuses an insulting offer", () => {
    const p = sellerProfile("anyone", true);
    expect(respondToOffer({ ask: 100, offer: 100, round: 1, profile: p, seed: "a" }).result).toBe("accepted");
    expect(respondToOffer({ ask: 100, offer: 40, round: 1, profile: p, seed: "a" }).result).toBe("declined");
  });

  it("a counter always sits between the offer and the ask", () => {
    const p = { archetype: "dealer" as const, label: "", maxDiscount: 0.2, counters: true };
    let seen = 0;
    for (let i = 0; i < 200; i++) {
      const r = respondToOffer({ ask: 300, offer: 255, round: 1, profile: p, seed: `c${i}` });
      if (r.result === "countered") {
        seen++;
        expect(r.price! > 255 && r.price! <= 300).toBe(true);
      }
    }
    expect(seen > 0).toBe(true);
  });

  it("a firm seller never counters and nobody counters on the last round", () => {
    const firm = { archetype: "firm" as const, label: "", maxDiscount: 0.03, counters: false };
    for (let i = 0; i < 100; i++) expect(respondToOffer({ ask: 100, offer: 90, round: 1, profile: firm, seed: `f${i}` }).result === "countered").toBe(false);
    const dealer = { archetype: "dealer" as const, label: "", maxDiscount: 0.2, counters: true };
    for (let i = 0; i < 100; i++) expect(respondToOffer({ ask: 100, offer: 85, round: MAX_ROUNDS, profile: dealer, seed: `l${i}` }).result === "countered").toBe(false);
  });

  it("a higher offer is never less likely to be accepted", () => {
    const p = { archetype: "fair" as const, label: "", maxDiscount: 0.12, counters: true };
    for (let i = 0; i < 100; i++) {
      const lo = respondToOffer({ ask: 100, offer: 92, round: 1, profile: p, seed: `m${i}` }).result === "accepted";
      const hi = respondToOffer({ ask: 100, offer: 97, round: 1, profile: p, seed: `m${i}` }).result === "accepted";
      expect(lo && !hi).toBe(false);
    }
  });

  it("seeded generator is repeatable", () => {
    const a = rng(hashSeed("x")), b = rng(hashSeed("x"));
    expect(a()).toBe(b());
  });
});

describe("paper auction settlement against the real close", () => {
  it("uses eBay's published increments", () => {
    expect(bidIncrement(0.5)).toBe(0.05);
    expect(bidIncrement(4.99)).toBe(0.25);
    expect(bidIncrement(24.99)).toBe(0.5);
    expect(bidIncrement(99.99)).toBe(1);
    expect(bidIncrement(249.99)).toBe(2.5);
    expect(bidIncrement(500)).toBe(10);
    expect(bidIncrement(5000)).toBe(100);
  });

  it("wins at one step above the close when the max clears it, and pays no more than the max", () => {
    const s = settleAuction(150, 120, 9);
    expect(s.outcome).toBe("won");
    expect(s.fill).toBe(122.5);
    const tight = settleAuction(121, 120, 9); // needs 122.50
    expect(tight.outcome).toBe("outbid");
    const capped = settleAuction(122.5, 120, 9);
    expect(capped.fill).toBe(122.5);
  });

  it("an auction nobody bid on is won at its opening price by any max at or above it", () => {
    expect(settleAuction(50, 40, 0).fill).toBe(40);
    expect(settleAuction(30, 40, 0).outcome).toBe("outbid");
  });

  it("refuses to settle without a usable price", () => {
    expect(settleAuction(0, 100, 3).outcome).toBe("outbid");
    expect(settleAuction(100, 0, 3).outcome).toBe("outbid");
  });

  it("paper profit uses the platform exit rule and keeps losses negative", () => {
    expect(paperProfit(1000, 600)).toBe(265);
    expect(paperProfit(100, 120)! < 0).toBe(true);
    expect(paperProfit(null, 50)).toBeNull();
  });
});

describe("closingWatch and listOrders (lib/sniper/paper-store.ts)", () => {
  beforeEach(() => {
    mockDbState.sniper_listings = [];
    mockDbState.sniper_paper_orders = [];
    mockDbState.sniper_ticks = [];
    watchLotMock.mockReset();
  });

  it("closingWatch reads qualifying live eBay auctions ending soon with observe:true and halts on HTTP 429", async () => {
    const now = Date.now();
    // Lot 1 qualifies (bid_count > 0, price >= 25, ending in 20s -> would normally trigger 3 reads: now, T-5s, T+7s)
    // Lot 2 has 0 bids (excluded), Lot 3 is under $25 (excluded), Lot 4 ends in 90s (> 62s window, excluded)
    mockDbState.sniper_listings = [
      {
        item_id: "v1|lot-high|0",
        status: "live",
        venue: "ebay",
        buying_option: "AUCTION",
        bid_count: 5,
        price_usd: 180,
        end_time: new Date(now + 20_000).toISOString(),
      },
      {
        item_id: "v1|lot-zero-bids|0",
        status: "live",
        venue: "ebay",
        buying_option: "AUCTION",
        bid_count: 0,
        price_usd: 200,
        end_time: new Date(now + 20_000).toISOString(),
      },
      {
        item_id: "v1|lot-cheap|0",
        status: "live",
        venue: "ebay",
        buying_option: "AUCTION",
        bid_count: 4,
        price_usd: 15,
        end_time: new Date(now + 20_000).toISOString(),
      },
      {
        item_id: "v1|lot-far|0",
        status: "live",
        venue: "ebay",
        buying_option: "AUCTION",
        bid_count: 6,
        price_usd: 250,
        end_time: new Date(now + 90_000).toISOString(),
      },
    ];

    // Simulate HTTP 429 on first read so closingWatch halts T-5s and T+7s reads immediately
    watchLotMock.mockResolvedValue({ ok: false, ended: false, currentBid: null, bidCount: null, status: 429 });

    const reads = await closingWatch(now);
    expect(reads).toBe(1);
    expect(watchLotMock).toHaveBeenCalledTimes(1);
    expect(watchLotMock).toHaveBeenCalledWith("v1|lot-high|0", { observe: true });
  });

  it("listOrders hides win/loss for live auctions before the clock and hides seller personality while negotiating", async () => {
    const owner = "owner-device-12345";
    const futureIso = new Date(Date.now() + 45_000).toISOString();
    const pastIso = new Date(Date.now() - 45_000).toISOString();

    mockDbState.sniper_paper_orders = [
      {
        id: 1,
        owner,
        item_id: "v1|live-auction|0",
        kind: "auction",
        status: "won", // Even if prematurely marked won in DB, listOrders must mask while end_time > now
        end_time: futureIso,
        final_price_usd: 110,
        final_bid_count: 8,
        fill_price_usd: 112.5,
        paper_profit_usd: 45,
        detail: "Premature detail",
        basis: "Premature basis",
        settled_at: futureIso,
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        owner,
        item_id: "v1|bin-haggle|0",
        kind: "bin",
        status: "negotiating",
        personality: "Collector — fair",
        created_at: new Date().toISOString(),
      },
      {
        id: 3,
        owner,
        item_id: "v1|settled-auction|0",
        kind: "auction",
        status: "won",
        end_time: pastIso,
        final_price_usd: 90,
        final_bid_count: 6,
        fill_price_usd: 91,
        paper_profit_usd: 30,
        detail: "Won after close",
        basis: "eBay's own reading after the close",
        settled_at: pastIso,
        created_at: new Date().toISOString(),
      },
    ];

    const orders = await listOrders(owner);
    const liveOrder = orders.find((o) => o.id === 1)!;
    expect(liveOrder.status).toBe("armed");
    expect(liveOrder.final_price_usd).toBeNull();
    expect(liveOrder.fill_price_usd).toBeNull();
    expect(liveOrder.paper_profit_usd).toBeNull();
    expect(liveOrder.detail).toBeNull();
    expect(liveOrder.basis).toBeNull();

    const binOrder = orders.find((o) => o.id === 2)!;
    expect(binOrder.personality).toBeNull();

    const settledOrder = orders.find((o) => o.id === 3)!;
    expect(settledOrder.status).toBe("won");
    expect(settledOrder.fill_price_usd).toBe(91);
  });
});

describe("replay-store (listReplays, playReplay, revealReplay)", () => {
  const owner = "owner-replay-device-99";

  beforeEach(() => {
    mockDbState.sniper_listings = [];
    mockDbState.sniper_paper_orders = [];
    mockDbState.sniper_ticks = [];
  });

  it("listReplays selects ended auctions with start reading in 15..75s window and never includes finalPrice", async () => {
    const endMs = Date.now() - 3600_000;
    const endIso = new Date(endMs).toISOString();

    mockDbState.sniper_listings = [
      {
        item_id: "v1|replay-good|0",
        title: "Amazing Spider-Man #300 CGC 9.8",
        series: "Amazing Spider-Man",
        issue: "300",
        grade: 9.8,
        grader: "CGC",
        cert_number: "1234567890",
        status: "ended",
        venue: "ebay",
        buying_option: "AUCTION",
        final_price_usd: 240,
        final_bid_count: 14,
        final_seen_secs_before_end: 2,
        end_time: endIso,
        payload: { shippingCost: 15 },
      },
      {
        item_id: "v1|replay-stale-gap|0",
        title: "Stale Close Gap",
        status: "ended",
        venue: "ebay",
        buying_option: "AUCTION",
        final_price_usd: 150,
        final_bid_count: 5,
        final_seen_secs_before_end: 45, // > MAX_FINAL_GAP_SECS (10)
        end_time: endIso,
      },
    ];

    mockDbState.sniper_ticks = [
      {
        item_id: "v1|replay-good|0",
        seen_at: new Date(endMs - 55_000).toISOString(), // 55s before end (inside 15..75s)
        price_usd: 185,
        bid_count: 9,
      },
      {
        item_id: "v1|replay-good|0",
        seen_at: new Date(endMs - 5_000).toISOString(),
        price_usd: 220,
        bid_count: 12,
      },
    ];

    const res = await listReplays(owner);
    expect(res.lots.length).toBe(1);
    const lot = res.lots[0];
    expect(lot.itemId).toBe("v1|replay-good|0");
    expect(lot.startPrice).toBe(185);
    expect(lot.startBids).toBe(9);
    expect(lot.startSecs).toBe(55);
    expect((lot as any).finalPrice).toBeUndefined();
    expect((lot as any).final_price_usd).toBeUndefined();
  });

  it("playReplay seals win/loss while secsLeft > 0 and revealReplay unlocks only after revealAt", async () => {
    const endMs = Date.now() - 1800_000;
    const endIso = new Date(endMs).toISOString();

    mockDbState.sniper_listings = [
      {
        item_id: "v1|replay-seal|0",
        title: "X-Men #101 CGC 9.6",
        series: "X-Men",
        issue: "101",
        grade: 9.6,
        grader: "CGC",
        status: "ended",
        venue: "ebay",
        buying_option: "AUCTION",
        final_price_usd: 200,
        final_bid_count: 11,
        final_seen_secs_before_end: 0,
        end_time: endIso,
        payload: { shippingCost: 12 },
      },
    ];

    mockDbState.sniper_ticks = [
      {
        item_id: "v1|replay-seal|0",
        seen_at: new Date(endMs - 40_000).toISOString(),
        price_usd: 160,
        bid_count: 8,
      },
      {
        item_id: "v1|replay-seal|0",
        seen_at: new Date(endMs - 4_000).toISOString(),
        price_usd: 195,
        bid_count: 10,
      },
    ];

    // Fire with 20 seconds left on the practice countdown
    const playRes = await playReplay({
      owner,
      itemId: "v1|replay-seal|0",
      maxBid: 225,
      fmv: 320,
      secsLeft: 20,
    });

    expect(playRes.ok).toBe(true);
    expect(playRes.result?.locked).toBe(true);
    expect(playRes.result?.finalPrice).toBeNull();
    expect(playRes.result?.finalBids).toBeNull();
    expect(playRes.result?.steps).toEqual([]);
    expect(playRes.result?.order.status).toBe("pending");
    expect(playRes.result?.order.fill_price_usd).toBeNull();
    expect(playRes.result?.order.final_price_usd).toBeNull();
    expect(playRes.result?.order.paper_profit_usd).toBeNull();

    // Attempting to reveal before revealAt must fail
    const earlyReveal = await revealReplay({ owner, itemId: "v1|replay-seal|0" });
    expect(earlyReveal.ok).toBe(false);
    expect(earlyReveal.error).toBe("clock still running");

    // Once revealAt is in the past, revealReplay returns the real outcome and steps
    mockDbState.sniper_paper_orders[0].result.revealAt = new Date(Date.now() - 1000).toISOString();
    const finalReveal = await revealReplay({ owner, itemId: "v1|replay-seal|0" });
    expect(finalReveal.ok).toBe(true);
    expect(finalReveal.result?.locked).toBe(false);
    expect(finalReveal.result?.finalPrice).toBe(200);
    expect(finalReveal.result?.order.status).toBe("won");
    expect(finalReveal.result?.order.fill_price_usd).toBe(202.5);
    expect(finalReveal.result?.steps.length).toBe(1);
  });
});

describe("resolveAuctionDbMetadata (no invented FMV multipliers)", () => {
  it("computes FMV strictly from recorded sales at the matching grade and returns null when none exist", async () => {
    const sales = [
      { date: "2026-09-01", price: 410, grade: 9.8, grader: "CGC", venue: "ebay", source: "sniper_sales", confirmed: true },
      { date: "2026-09-05", price: 450, grade: 9.8, grader: "CGC", venue: "ebay", source: "sniper_sales", confirmed: true },
      { date: "2026-09-03", price: 210, grade: 9.4, grader: "CGC", venue: "ebay", source: "sniper_sales", confirmed: true },
    ];

    const at98 = await resolveAuctionDbMetadata("Unknown Indie Key #1 CGC 9.8", 9.8, sales);
    expect(at98.fmv).toBe(430);

    const at94 = await resolveAuctionDbMetadata("Unknown Indie Key #1 CGC 9.4", 9.4, sales);
    expect(at94.fmv).toBe(210);

    // At grade 9.0 there are no recorded sales -> must be null (never multiplied from 9.8 or raw base)
    const at90 = await resolveAuctionDbMetadata("Unknown Indie Key #1 CGC 9.0", 9.0, sales);
    expect(at90.fmv).toBeNull();
  });
});

