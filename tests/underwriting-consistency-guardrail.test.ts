import { describe, it, expect } from "vitest";
import { calculateCanonicalUnderwriting } from "@/lib/pricing/canonical-underwriting-core";

describe("Automated Valuation & Underwriting Consistency Guardrails", () => {
  const sampleBooks = [
    {
      name: "Silver Surfer: Black #1 (2019 Modern Standard)",
      pubYear: 2019,
      rawAcquisitionCost: 6.47,
      postGradeTargetFmv: 87.50,
      achievedGrade: "9.8",
      expectedTier: "CGC Modern ($30.00)",
      expectedMinBasis: 85,
      expectedMaxBasis: 100,
    },
    {
      name: "Amazing Spider-Man #129 (1974 Bronze Key)",
      pubYear: 1974,
      rawAcquisitionCost: 1245.31,
      postGradeTargetFmv: 16165.0,
      achievedGrade: "9.8",
      expectedTier: "CGC Unlimited Value (4% of final FMV, $135 min: $646.60)",
      expectedMinBasis: 2000,
      expectedMaxBasis: 2200,
    },
    {
      name: "Amazing Spider-Man #300 (1988 Copper Landmark)",
      pubYear: 1988,
      rawAcquisitionCost: 379.0,
      postGradeTargetFmv: 3152.0,
      achievedGrade: "9.8",
      expectedTier: "CGC Unlimited Value (4% of final FMV, $135 min: $135.00)",
      expectedMinBasis: 550,
      expectedMaxBasis: 650,
    },
    {
      name: "Ultimate Fallout #4 Djurdjevic 1:25 (2011 Modern Variant Breakout)",
      pubYear: 2011,
      rawAcquisitionCost: 2500.0,
      postGradeTargetFmv: 14000.0,
      achievedGrade: "9.8",
      expectedTier: "CGC Unlimited Value (4% of final FMV, $135 min: $560.00)",
      expectedMinBasis: 3200,
      expectedMaxBasis: 3500,
    },
  ];

  it("enforces arithmetic integrity: netDollarProfit = netRealizedProceeds - totalCapitalizedBasis", () => {
    for (const book of sampleBooks) {
      const res = calculateCanonicalUnderwriting({
        pubYear: book.pubYear,
        rawAcquisitionCost: book.rawAcquisitionCost,
        postGradeTargetFmv: book.postGradeTargetFmv,
        achievedGrade: book.achievedGrade,
      });

      const derivedProfit = Number(
        (res.netRealizedProceeds - res.lineItems.totalCapitalizedBasis).toFixed(2)
      );
      expect(res.netDollarProfit).toBe(derivedProfit);
    }
  });

  it("enforces exit liquidation formula: netRealizedProceeds = postGradeFmv - sellingVenueFee - outboundDeliveryFee", () => {
    for (const book of sampleBooks) {
      const res = calculateCanonicalUnderwriting({
        pubYear: book.pubYear,
        rawAcquisitionCost: book.rawAcquisitionCost,
        postGradeTargetFmv: book.postGradeTargetFmv,
        achievedGrade: book.achievedGrade,
      });

      const expectedNet = Number(
        (res.postGradeFmv - res.sellingVenueFee - res.outboundDeliveryFee).toFixed(2)
      );
      expect(res.netRealizedProceeds).toBe(expectedNet);
    }
  });

  it("strictly enforces one rating string per underwriting evaluation", () => {
    const validRatings = [
      "SUBMIT_RAW_TO_SLAB",
      "HOLD_MARKET_EQUILIBRIUM",
      "BUY_ESTABLISHED_SLAB",
      "REHOLDER_CANDIDATE",
    ];

    const validGuidance = [
      "AGGRESSIVE_BUY",
      "BUY",
      "ACCUMULATE",
      "HOLD",
      "TRIM_PROFITS",
      "AGGRESSIVE_SELL",
    ];

    for (const book of sampleBooks) {
      const res = calculateCanonicalUnderwriting({
        pubYear: book.pubYear,
        rawAcquisitionCost: book.rawAcquisitionCost,
        postGradeTargetFmv: book.postGradeTargetFmv,
        achievedGrade: book.achievedGrade,
      });

      expect(validRatings).toContain(res.canonicalVerdict);
      expect(validGuidance).toContain(res.equityGuidance);
      expect(typeof res.canonicalVerdict).toBe("string");
      expect(typeof res.equityGuidance).toBe("string");
      expect(res.verdictReason.length).toBeGreaterThan(15);
      expect(res.actionSummary.length).toBeGreaterThan(10);
    }
  });

  it("accurately categorizes CGC tiers and capitalized basis boundaries across archetypes", () => {
    for (const book of sampleBooks) {
      const res = calculateCanonicalUnderwriting({
        pubYear: book.pubYear,
        rawAcquisitionCost: book.rawAcquisitionCost,
        postGradeTargetFmv: book.postGradeTargetFmv,
        achievedGrade: book.achievedGrade,
      });

      expect(res.lineItems.gradingTierDescription).toBe(book.expectedTier);
      expect(res.lineItems.totalCapitalizedBasis).toBeGreaterThanOrEqual(book.expectedMinBasis);
      expect(res.lineItems.totalCapitalizedBasis).toBeLessThanOrEqual(book.expectedMaxBasis);
    }
  });

  it("enforces pre-screen rejection when achieved grade is below user threshold", () => {
    const res = calculateCanonicalUnderwriting({
      pubYear: 2019,
      rawAcquisitionCost: 15.0,
      postGradeTargetFmv: 85.0,
      achievedGrade: "9.4",
      operation: "PRE_SCREEN",
      preScreenCutoffGrade: "9.8",
    });

    expect(res.lineItems.isPreScreenRejected).toBe(true);
    expect(res.lineItems.gradingBaseFee).toBe(9.0); // Exact $9 reject fee
    expect(res.canonicalVerdict).toBe("HOLD_MARKET_EQUILIBRIUM");
  });
});
