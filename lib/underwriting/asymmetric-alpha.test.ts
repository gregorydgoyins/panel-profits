import { describe, it, expect } from "vitest";
import { underwriteComicAsset, VERIFIED_CPR_HURDLE_USD } from "./asymmetric-alpha";

describe("Sovereign Asymmetric Alpha Engine (AAE)", () => {
  it("enforces the $88.00 verified CPR hurdle constant", () => {
    expect(VERIFIED_CPR_HURDLE_USD).toBe(88.00);
  });

  it("assigns ACCUMULATE when sales absorb hurdle and census is scarce", () => {
    const report = underwriteComicAsset({
      comicId: "2412811",
      series: "Silver Surfer: Black",
      issueNumber: "1",
      characterOrHero: "Silver Surfer",
      rawPriceUsd: 6.78,
      guidePrice98Usd: 117.32,
      recentHighSaleUsd: 185.00,
      athSaleUsd: 250.00,
      totalCensus98Count: 465,
      totalRawFloat: 129025
    });

    expect(report.verdict).toBe("ACCUMULATE");
    expect(report.verdictDisplay).toContain("ACCUMULATE");
    expect(report.targetPriceLowUsd).toBe(185.00);
    expect(report.targetPriceHighUsd).toBe(250.00);
    expect(report.pillars.capitalHurdle.body).toContain("$88.00");
  });

  it("assigns STRONG_BUY when guide price is depressed below the physical slabbing hurdle", () => {
    const report = underwriteComicAsset({
      comicId: "sample-undervalued",
      series: "Spawn",
      issueNumber: "1",
      characterOrHero: "Spawn",
      rawPriceUsd: 15.00,
      guidePrice98Usd: 65.00, // Severely below raw + $88 hurdle ($103)
      recentHighSaleUsd: 140.00,
      athSaleUsd: 210.00,
      totalCensus98Count: 800
    });

    expect(report.verdict).toBe("STRONG_BUY");
    expect(report.verdictDisplay).toContain("STRONG BUY");
  });

  it("assigns HARVEST or STRONG_SELL when prices trade at extreme multiples above historical ATH", () => {
    const report = underwriteComicAsset({
      comicId: "sample-peaked",
      series: "Overextended Key",
      issueNumber: "1",
      rawPriceUsd: 5.00,
      guidePrice98Usd: 450.00,
      recentHighSaleUsd: 200.00,
      athSaleUsd: 220.00,
      totalCensus98Count: 15000
    });

    expect(["HARVEST", "STRONG_SELL"]).toContain(report.verdict);
  });
});
