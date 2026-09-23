import { describe, it, expect } from "vitest";
import {
  CANONICAL_MARKET_METRICS,
  getIntelligenceRailComics,
  getValuationRailComics,
  getFeaturedUniverseComics,
} from "@/lib/dashboard/queries";
import { PRIMARY_NAV_LINKS } from "@/components/shell/primary-nav";
import { resolveBaselinePrice, resolveComicPricing } from "@/lib/pricing/baseline";
import { calculateHoldingsSummary, calculateItemValuation } from "@/lib/account/calculations";

describe("Dashboard Queries & Bounds", () => {
  it("provides canonical market universe coverage metrics for the 3.48M catalog", () => {
    expect(CANONICAL_MARKET_METRICS.totalAuthoritativeComics).toBe(3481445);
    expect(CANONICAL_MARKET_METRICS.panelProfitsIndexed).toContain("350,000+");
    expect(CANONICAL_MARKET_METRICS.comicbaseEntities).toContain("1,200,000+");
    expect(CANONICAL_MARKET_METRICS.gcdBibliographicRecords).toContain("3,400,000+");
  });

  it("fetches bounded intelligence rail items without error", async () => {
    const items = await getIntelligenceRailComics(6);
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeLessThanOrEqual(6);
    if (items.length > 0) {
      expect(items[0]).toHaveProperty("id");
      expect(items[0]).toHaveProperty("series");
      expect(items[0]).toHaveProperty("issueNumber");
    }
  });

  it("fetches bounded valuation rail items with authentic pricing values", async () => {
    const items = await getValuationRailComics(6);
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeLessThanOrEqual(6);
    if (items.length > 0) {
      expect(items[0]).toHaveProperty("priceFormatted");
      expect(items[0]).toHaveProperty("sourceLabel");
      expect(items[0].priceValue).toBeGreaterThan(0);
    }
  });

  it("fetches deterministic featured universe records with covers", async () => {
    const comics = await getFeaturedUniverseComics(6);
    expect(Array.isArray(comics)).toBe(true);
    expect(comics.length).toBeLessThanOrEqual(6);
    if (comics.length > 0) {
      expect(comics[0]).toHaveProperty("id");
      expect(comics[0]).toHaveProperty("series");
    }
  });
});

describe("Pricing Fallback & 9.8 Reference Labeling", () => {
  it("keeps the market shell linked to the historical market and equities destinations", () => {
    const hrefs = PRIMARY_NAV_LINKS.map((link) => link.href);

    expect(hrefs).toContain("/market");
    expect(hrefs).toContain("/equities");
  });

  it("honestly marks missing prices as Unpriced rather than zero", () => {
    const unpricedComic = {
      id: "test-unpriced",
      series: "Unpriced Series",
      issue_number: "1",
      pp_grade_9_8_price: null,
      comicbase_price: null,
      baseline_grade_9_8_value: null,
      panel_profits_data: null,
    };

    const resolved = resolveBaselinePrice(unpricedComic);
    expect(resolved.price).toBeNull();
    expect(resolved.formatted).toBe("Unpriced");
  });

  it("properly labels Panel Profits 9.8 promoted price source", () => {
    const ppComic = {
      id: "test-pp",
      series: "Amazing Spider-Man",
      issue_number: "300",
      pp_grade_9_8_price: 2500,
      comicbase_price: 1800,
      baseline_grade_9_8_value: 2500,
    };

    const pricing = resolveComicPricing(ppComic);
    expect(pricing.panelProfitsPrice98).toBe(2500);
    expect(pricing.baselinePrice98).toBe(2500);
    expect(pricing.panelProfitsPriceSource).toContain("Panel Profits Promoted Grade 9.8");
  });

  it("distinguishes non-9.8 user holding grades from 9.8 valuation benchmarks", () => {
    const rawHolding = {
      id: "hold-1",
      user_id: "user-1",
      collection_id: "col-1",
      comic_id: "c-1",
      quantity: 1,
      grade: "8.0",
      grading_company: "CGC",
      certification_number: null,
      acquisition_date: null,
      acquisition_cost: 150,
      notes: null,
      ownership_status: "owned",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      comic: {
        id: "c-1",
        series: "Batman",
        title: "Batman",
        issue_number: "428",
        volume: "1",
        printing: "1",
        direct_or_variant: "Direct",
        cover_variant: null,
        publisher: "DC",
        publication_date: null,
        publication_year: 1988,
        upc: null,
        alt_upc: null,
        pp_source_id: null,
        comicbase_source_id: null,
        gcd_source_id: null,
        pp_grade_9_8_price: null,
        comicbase_price: null,
        baseline_grade_9_8_value: 600,
        baseline_grade_9_8_sources: "Blended",
        baseline_grade_9_8_observation_count: 5,
        panel_profits_data: null,
        comicbase_data: null,
        gcd_data: null,
        search_document: null,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
        cover_url: null,
        cover_storage_path: null,
        cover_source: null,
        cover_width: null,
        cover_height: null,
        cover_sha256: null,
        cover_verified_at: null,
        cover_original_url: null,
        cover_retrieval_url: null,
      },
    };

    const valuation = calculateItemValuation(rawHolding);
    // Grade 8.0 must NOT be given a 9.8 valuation
    expect(valuation.estimatedHoldingValue).toBeNull();
    expect(valuation.isNon98GradeWithReferenceOnly).toBe(true);
    expect(valuation.baseline98Price).toBe(600);
  });
});
