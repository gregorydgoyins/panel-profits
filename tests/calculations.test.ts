import { describe, it, expect } from "vitest";
import { calculateItemValuation, calculateHoldingsSummary } from "../lib/account/calculations";
import { CollectionItem } from "../lib/account/types";
import { ComicRecord } from "../lib/comics/types";

describe("Holdings Valuation & Financial Calculations", () => {
  const sampleComic: ComicRecord = {
    id: "sample-comic-1",
    series: "Amazing Spider-Man",
    title: "Venom",
    issue_number: "300",
    volume: "1",
    printing: "1",
    direct_or_variant: "Direct",
    cover_variant: "Direct Edition",
    publisher: "Marvel Comics",
    publication_date: "1988-05-01",
    publication_year: 1988,
    upc: null,
    alt_upc: null,
    pp_source_id: "1",
    comicbase_source_id: "1",
    gcd_source_id: "1",
    pp_grade_9_8_price: 2400.0,
    comicbase_price: 50.0,
    baseline_grade_9_8_value: 2400.0,
    baseline_grade_9_8_sources: "CGC Consensus",
    baseline_grade_9_8_observation_count: 50,
    panel_profits_data: {
      "PP - Grade 9.8 Market Price": "2400.00",
      "Panel Profits Baseline Grade 9.8 Value": "2400.00",
      "Panel Profits Baseline Grade 9.8 Sources": "CGC Consensus",
    },
    comicbase_data: null,
    gcd_data: null,
    search_document: null,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    cover_url: null,
    cover_storage_path: null,
    cover_source: null,
    cover_original_url: null,
    cover_retrieval_url: null,
    cover_width: null,
    cover_height: null,
    cover_sha256: null,
    cover_verified_at: null,
  };

  it("accurately calculates certified 9.8 holding valuation and positive gain", () => {
    const item: CollectionItem = {
      id: "item-1",
      collection_id: "col-1",
      user_id: "user-1",
      comic_id: sampleComic.id,
      quantity: 1,
      grade: "9.8",
      grading_company: "CGC",
      certification_number: "123456",
      acquisition_date: "2020-01-01",
      acquisition_cost: 1200.0,
      notes: "White pages",
      ownership_status: "owned",
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-01T00:00:00Z",
      comic: sampleComic,
    };

    const val = calculateItemValuation(item);
    expect(val.estimatedHoldingValue).toBe(2400.0);
    expect(val.isUnadjusted98Reference).toBe(false);
    expect(val.dollarGainLoss).toBe(1200.0);
    expect(val.percentageGainLoss).toBe(100.0);
  });

  it("handles unadjusted 9.8 market reference when grade is unspecified", () => {
    const item: CollectionItem = {
      id: "item-2",
      collection_id: "col-1",
      user_id: "user-1",
      comic_id: sampleComic.id,
      quantity: 2,
      grade: null,
      grading_company: null,
      certification_number: null,
      acquisition_date: null,
      acquisition_cost: 500.0,
      notes: null,
      ownership_status: "owned",
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-01T00:00:00Z",
      comic: sampleComic,
    };

    const val = calculateItemValuation(item);
    // 2 * 2400 = 4800
    expect(val.estimatedHoldingValue).toBe(4800.0);
    expect(val.isUnadjusted98Reference).toBe(true);
    // total cost: 2 * 500 = 1000. Gain: 4800 - 1000 = 3800. %: 380%
    expect(val.totalAcquisitionCost).toBe(1000.0);
    expect(val.dollarGainLoss).toBe(3800.0);
    expect(val.percentageGainLoss).toBe(380.0);
  });

  it("does not treat lower/different grades (e.g. 8.0) as 9.8 valuation", () => {
    const item: CollectionItem = {
      id: "item-3",
      collection_id: "col-1",
      user_id: "user-1",
      comic_id: sampleComic.id,
      quantity: 1,
      grade: "8.0",
      grading_company: "CGC",
      certification_number: "987654",
      acquisition_date: "2021-05-15",
      acquisition_cost: 300.0,
      notes: null,
      ownership_status: "owned",
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-01T00:00:00Z",
      comic: sampleComic,
    };

    const val = calculateItemValuation(item);
    expect(val.estimatedHoldingValue).toBeNull();
    expect(val.isNon98GradeWithReferenceOnly).toBe(true);
    expect(val.baseline98Price).toBe(2400.0);
  });

  it("honestly handles unpriced holdings without treating them as zero value", () => {
    const unpricedComic: ComicRecord = {
      ...sampleComic,
      id: "unpriced-comic-2",
      pp_grade_9_8_price: null,
      baseline_grade_9_8_value: null,
      comicbase_price: null,
      panel_profits_data: null,
    };

    const item: CollectionItem = {
      id: "item-4",
      collection_id: "col-1",
      user_id: "user-1",
      comic_id: unpricedComic.id,
      quantity: 1,
      grade: "9.8",
      grading_company: "CGC",
      certification_number: null,
      acquisition_date: null,
      acquisition_cost: 50.0,
      notes: null,
      ownership_status: "owned",
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-01T00:00:00Z",
      comic: unpricedComic,
    };

    const val = calculateItemValuation(item);
    expect(val.estimatedHoldingValue).toBeNull();
    expect(val.hasValidValuation).toBe(false);

    const summary = calculateHoldingsSummary([item]);
    expect(summary.totalOwnedQuantity).toBe(1);
    expect(summary.totalAcquisitionCost).toBe(50.0);
    expect(summary.totalBaselineValue).toBe(0.0);
    expect(summary.unpricedHoldingsCount).toBe(1);
    expect(summary.pricedHoldingsCount).toBe(0);
    expect(summary.dollarGainLoss).toBeNull();
  });
});
