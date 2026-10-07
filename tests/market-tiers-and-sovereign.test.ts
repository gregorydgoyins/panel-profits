import { describe, it, expect } from "vitest";
import {
  resolvePriceTier,
  isDirectEdition,
  isUniversalBlueLabel,
  isSovereignSpecimen,
  resolveAssetClass,
  OTC_MAX_PRICE,
  STANDARD_MIN_PRICE,
  STANDARD_MAX_PRICE,
  PREMIUM_MIN_PRICE,
} from "@/lib/pricing/market-tiers";
import { isProvenSovereignCopy } from "@/lib/pricing/reference-benchmarks";
import { resolveHistoricalMarketClass } from "@/lib/equity/significance-classifier";
import { computeComicValuationMetrics } from "@/lib/finance/investopedia-service";

describe("Panel Profits Canonical Market Tiers & Sovereign Constitution", () => {
  describe("Price Tiers: OTC, Standard, Premium", () => {
    it("classifies prices strictly less than 25.00 as OTC", () => {
      expect(resolvePriceTier(0)).toBe("OTC");
      expect(resolvePriceTier(0.25)).toBe("OTC");
      expect(resolvePriceTier(5.0)).toBe("OTC");
      expect(resolvePriceTier(12.5)).toBe("OTC");
      expect(resolvePriceTier(17.98)).toBe("OTC");
      expect(resolvePriceTier(18.0)).toBe("OTC");
      expect(resolvePriceTier(24.99)).toBe("OTC");
      expect(resolvePriceTier(OTC_MAX_PRICE - 0.01)).toBe("OTC");
    });

    it("classifies prices from 25.00 to 44.99 as STD (Standard)", () => {
      expect(resolvePriceTier(25.0)).toBe("STD");
      expect(resolvePriceTier(32.5)).toBe("STD");
      expect(resolvePriceTier(44.99)).toBe("STD");
      expect(resolvePriceTier(STANDARD_MIN_PRICE)).toBe("STD");
      expect(resolvePriceTier(STANDARD_MAX_PRICE)).toBe("STD");
    });

    it("classifies prices 45.00 to infinity as PREMIUM", () => {
      expect(resolvePriceTier(45.0)).toBe("PREMIUM");
      expect(resolvePriceTier(45.01)).toBe("PREMIUM");
      expect(resolvePriceTier(100.0)).toBe("PREMIUM");
      expect(resolvePriceTier(5000.0)).toBe("PREMIUM");
      expect(resolvePriceTier(PREMIUM_MIN_PRICE)).toBe("PREMIUM");
    });
  });

  describe("Sovereign Constitution: Direct Universal Blue Label 9.8 Comic", () => {
    it("confirms Sovereign ONLY for direct universal blue label 9.8 comics", () => {
      const sov = isSovereignSpecimen({
        grade: "9.8",
        variant: "Direct",
        labelType: "UNIVERSAL BLUE",
      });
      expect(sov).toBe(true);

      const benchmarkMock = { grade98FmvUsd: 1200 };
      expect(isProvenSovereignCopy("9.8", benchmarkMock)).toBe(true);
    });

    it("strictly rejects non-9.8 grades from being Sovereign", () => {
      expect(isSovereignSpecimen({ grade: "9.6", variant: "Direct" })).toBe(false);
      expect(isSovereignSpecimen({ grade: "9.4", variant: "Direct" })).toBe(false);
      expect(isSovereignSpecimen({ grade: "9.0", variant: "Direct" })).toBe(false);
      expect(isSovereignSpecimen({ grade: "8.5", variant: "Direct" })).toBe(false);
      expect(isSovereignSpecimen({ grade: "8.0", variant: "Direct" })).toBe(false);
      expect(isSovereignSpecimen({ grade: "RAW", variant: "Direct" })).toBe(false);

      const benchmarkMock = { grade98FmvUsd: 1200, grade80FmvUsd: 250 };
      expect(isProvenSovereignCopy("9.6", benchmarkMock)).toBe(false);
      expect(isProvenSovereignCopy("8.5", benchmarkMock)).toBe(false);
      expect(isProvenSovereignCopy("8.0", benchmarkMock)).toBe(false);
    });

    it("strictly rejects variants, newsstands, and reprints from being Sovereign", () => {
      expect(
        isSovereignSpecimen({
          grade: "9.8",
          variant: "Variant Cover A",
          isVariant: true,
        })
      ).toBe(false);

      expect(
        isSovereignSpecimen({
          grade: "9.8",
          variant: "Newsstand Edition",
          isNewsstand: true,
        })
      ).toBe(false);

      expect(
        isSovereignSpecimen({
          grade: "9.8",
          variant: "2nd Printing",
          isReprint: true,
        })
      ).toBe(false);
    });

    it("strictly rejects non-blue labels (signature, qualified, restored) from being Sovereign", () => {
      expect(
        isSovereignSpecimen({
          grade: "9.8",
          labelType: "CGC SIGNATURE SERIES (YELLOW)",
          isSignature: true,
        })
      ).toBe(false);

      expect(
        isSovereignSpecimen({
          grade: "9.8",
          labelType: "CGC QUALIFIED (GREEN LABEL)",
        })
      ).toBe(false);

      expect(
        isSovereignSpecimen({
          grade: "9.8",
          labelType: "RESTORED PURPLE LABEL",
        })
      ).toBe(false);
    });
  });

  describe("Integration with resolveHistoricalMarketClass & computeComicValuationMetrics", () => {
    it("assigns market classes based on price when non-sovereign", () => {
      expect(
        resolveHistoricalMarketClass({
          isSovereign: false,
          price: 12.0,
        })
      ).toBe("OTC");

      expect(
        resolveHistoricalMarketClass({
          isSovereign: false,
          price: 25.0,
        })
      ).toBe("STD");

      expect(
        resolveHistoricalMarketClass({
          isSovereign: false,
          price: 150.0,
        })
      ).toBe("PREMIUM");

      expect(
        resolveHistoricalMarketClass({
          isSovereign: true,
          price: 25.0,
        })
      ).toBe("SOV");
    });

    it("computes valuation metrics with sovereign and price tier rules", () => {
      // Direct 9.8 sovereign copy
      const sovMetrics = computeComicValuationMetrics({
        baseline_grade_9_8_value: 500,
        is_sovereign: true,
        grade: "9.8",
      });
      expect(sovMetrics.assetClass).toBe("SOV");

      // Non-sovereign Premium copy ($45+)
      const premiumMetrics = computeComicValuationMetrics({
        baseline_grade_9_8_value: 120,
        is_sovereign: false,
      });
      expect(premiumMetrics.assetClass).toBe("PREMIUM");

      // Non-sovereign Standard copy ($18 - $44.99)
      const stdMetrics = computeComicValuationMetrics({
        baseline_grade_9_8_value: 30,
        is_sovereign: false,
      });
      expect(stdMetrics.assetClass).toBe("STD");

      // Non-sovereign OTC copy (< $25.00)
      const otcMetrics = computeComicValuationMetrics({
        baseline_grade_9_8_value: 14,
        is_sovereign: false,
      });
      expect(otcMetrics.assetClass).toBe("OTC");
    });
  });
});
