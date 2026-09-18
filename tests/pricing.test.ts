import { describe, it, expect } from "vitest";
import { resolveComicPricing } from "../lib/pricing/baseline";
import { ComicRecord } from "../lib/comics/types";

describe("Pricing Fallback Engine", () => {
  it("uses promoted pp_grade_9_8_price when available", () => {
    const comic: Partial<ComicRecord> = {
      pp_grade_9_8_price: 450.0,
      panel_profits_data: {
        "PP - Grade 9.8 Market Price": "300.00",
      },
    };
    const result = resolveComicPricing(comic);
    expect(result.panelProfitsPrice98).toBe(450.0);
    expect(result.panelProfitsPriceSource).toBe("Panel Profits Promoted Grade 9.8");
  });

  it("falls back to panel_profits_data['PP - Grade 9.8 Market Price'] when pp_grade_9_8_price is null", () => {
    const comic: Partial<ComicRecord> = {
      pp_grade_9_8_price: null,
      panel_profits_data: {
        "PP - Grade 9.8 Market Price": "$350.50",
      },
    };
    const result = resolveComicPricing(comic);
    expect(result.panelProfitsPrice98).toBe(350.5);
    expect(result.panelProfitsPriceSource).toBe("Panel Profits Historical Grade 9.8");
  });

  it("resolves baseline value from panel_profits_data when promoted column is null", () => {
    const comic: Partial<ComicRecord> = {
      baseline_grade_9_8_value: null,
      panel_profits_data: {
        "Panel Profits Baseline Grade 9.8 Value": "1250.00",
        "Panel Profits Baseline Grade 9.8 Sources": "Auction Sales Consensus",
        "Panel Profits Baseline Grade 9.8 Observation Count": "42",
      },
    };
    const result = resolveComicPricing(comic);
    expect(result.baselinePrice98).toBe(1250.0);
    expect(result.baselineSource).toBe("Auction Sales Consensus");
    expect(result.observationCount).toBe(42);
  });

  it("falls back to comicbase_price when both promoted and json baseline values are missing", () => {
    const comic: Partial<ComicRecord> = {
      baseline_grade_9_8_value: null,
      panel_profits_data: null,
      comicbase_price: 24.95,
    };
    const result = resolveComicPricing(comic);
    expect(result.baselinePrice98).toBe(24.95);
    expect(result.comicbasePrice).toBe(24.95);
    expect(result.baselineSource).toBe("ComicBase Reference Valuation");
  });

  it("gracefully handles complete absence of pricing data", () => {
    const comic: Partial<ComicRecord> = {
      pp_grade_9_8_price: null,
      comicbase_price: null,
      baseline_grade_9_8_value: null,
      panel_profits_data: null,
    };
    const result = resolveComicPricing(comic);
    expect(result.panelProfitsPrice98).toBeNull();
    expect(result.comicbasePrice).toBeNull();
    expect(result.baselinePrice98).toBeNull();
    expect(result.baselineSource).toBeNull();
  });
});
