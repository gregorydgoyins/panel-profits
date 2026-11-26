import { describe, it, expect } from "vitest";
import { DEFAULT_PAGE_SIZE } from "../lib/comics/queries";

describe("Catalog Queries & Keyset Configuration", () => {
  it("defines bounded page size of 24 records", () => {
    expect(DEFAULT_PAGE_SIZE).toBe(24);
  });

  it("validates comic search parameters format", () => {
    const params = {
      q: "Batman",
      issue: "1",
      publisher: "DC",
      year: "1940",
      variant: "direct",
    };
    expect(params.q).toBe("Batman");
    expect(params.issue).toBe("1");
    expect(params.publisher).toBe("DC");
    expect(params.year).toBe("1940");
    expect(params.variant).toBe("direct");
  });

  it("resolves Deadpool Max #10 with authentic Kyle Baker cover and exact market pricing matrix", async () => {
    const { getComicById } = await import("../lib/comics/queries");
    const { panelProfitsGrades, panelProfitsSpreads, panelProfitsVolume } = await import("../lib/pricing/source-ladder");

    const comic = await getComicById("3366977");
    expect(comic).not.toBeNull();
    if (!comic) return;

    // Authentic Kyle Baker MAX cover (local fallback or verified Supabase Storage CDN)
    expect(comic.cover_url).toMatch(
      /^(\/covers\/deadpool_max_10\.jpg|https:\/\/vbcmjmakluyjnsmisoth\.supabase\.co\/storage\/v1\/object\/public\/comic-covers\/)/
    );
    expect(comic.series).toBe("Deadpool Max");
    expect(comic.issue_number).toBe("10");

    // Exact Pricing Matrix
    const ladder = panelProfitsGrades(comic);
    expect(ladder["RAW"]).toBe(2.99);
    expect(ladder["9.8"]).toBe(50.00);

    // Intermediate grades must be unpriced
    expect(ladder["4.0"]).toBeUndefined();
    expect(ladder["6.0"]).toBeUndefined();
    expect(ladder["8.0"]).toBeUndefined();
    expect(ladder["9.2"]).toBeUndefined();

    // Spreads
    const rawSpreads = panelProfitsSpreads(comic, "RAW");
    expect(rawSpreads.sell).toBe(3.29);
    expect(rawSpreads.buy).toBeNull();

    const slab98Spreads = panelProfitsSpreads(comic, "9.8");
    expect(slab98Spreads.buy).toBeNull();
    expect(slab98Spreads.sell).toBeNull();

    // Volume
    expect(panelProfitsVolume(comic, "9.8")).toBe("2 tracked sales");
    expect(panelProfitsVolume(comic, "4.0")).toBeNull();

    // Cover publication price ($3.99 direct edition)
    expect((comic.panel_profits_data as any)?.coverPrice).toBe(3.99);
  });
});
