import { describe, it, expect } from "vitest";
import {
  calculateCanonicalUnderwriting,
  ebayFinalValueFee,
  netSaleProceeds,
  breakevenSalePrice,
  marginOfSafetyPct,
  cgcGradingFee,
  cgcPressingFee,
} from "./canonical-underwriting-core";

describe("canonical-underwriting-core", () => {
  it("calculates modern standard submission correctly (e.g. SSB#1)", () => {
    const result = calculateCanonicalUnderwriting({
      pubYear: 2019,
      rawAcquisitionCost: 6.78,
      postGradeTargetFmv: 117.32,
      achievedGrade: "9.8",
      operation: "STANDARD_GRADING",
      pressingProvider: "NONE",
    });

    // Basis: raw ($6.78) + CGC modern ($30) + invoice ($5) + inbound ($25) + return ($25) = $91.78
    expect(result.lineItems.gradingBaseFee).toBe(30.0);
    expect(result.lineItems.totalCapitalizedBasis).toBe(91.78);
    // Net proceeds: 117.32 − eBay (13.25% + $0.40 = $15.94) − $25 shipping = $76.38
    expect(result.netRealizedProceeds).toBeCloseTo(76.38, 2);
    expect(result.netDollarProfit).toBeCloseTo(-15.4, 2);
    // Breakeven must exceed the sale price, so margin of safety is negative
    expect(result.breakevenSalePrice).toBeGreaterThan(117.32);
    expect(result.marginOfSafetyPct).toBeLessThan(0);
    expect(result.canonicalVerdict).toBe("BUY_ESTABLISHED_SLAB");
  });

  it("handles high-value re-tiering on modern variant breakout (e.g. UF4 1:25 $14,000)", () => {
    const result = calculateCanonicalUnderwriting({
      pubYear: 2011,
      rawAcquisitionCost: 320.0,
      postGradeTargetFmv: 14000.0,
      achievedGrade: "9.8",
      operation: "STANDARD_GRADING",
    });

    // Unlimited tier: 4% of 14,000 = $560
    expect(result.lineItems.gradingBaseFee).toBe(560.0);
    // Return courier + insurance for $14k = $165.00
    expect(result.lineItems.returnShippingAndInsurance).toBe(165.0);
    expect(result.lineItems.totalCapitalizedBasis).toBe(320 + 560 + 5 + 25 + 165);
    expect(result.canonicalVerdict).toBe("SUBMIT_RAW_TO_SLAB");
  });

  it("handles pre-screen rejection when grade falls below requested threshold", () => {
    const result = calculateCanonicalUnderwriting({
      pubYear: 2019,
      rawAcquisitionCost: 6.78,
      postGradeTargetFmv: 73.35, // 9.6 FMV
      achievedGrade: "9.6",
      operation: "PRE_SCREEN",
      preScreenCutoffGrade: "9.8",
    });

    expect(result.lineItems.isPreScreenRejected).toBe(true);
    expect(result.lineItems.gradingBaseFee).toBe(9.0); // $9 reject fee
  });

  it("handles quad-signed JSA authentication with line items", () => {
    const result = calculateCanonicalUnderwriting({
      pubYear: 2014,
      rawAcquisitionCost: 20.0,
      postGradeTargetFmv: 650.0,
      achievedGrade: "9.8",
      signatureMode: "JSA_AUTHENTICATED",
      signatureCount: 4,
    });

    // 4 sigs * $30 = $120 JSA fee
    expect(result.lineItems.signatureFee).toBe(120.0);
    // FMV is $650 -> High Value tier = $105
    expect(result.lineItems.gradingBaseFee).toBe(105.0);
  });

  it("handles official CGC reholder of cracked case without regrading penalty", () => {
    const result = calculateCanonicalUnderwriting({
      pubYear: 2013,
      rawAcquisitionCost: 150.0, // Acquired cracked 9.8 slab
      postGradeTargetFmv: 450.0,
      achievedGrade: "9.8",
      operation: "REHOLDER",
    });

    expect(result.lineItems.gradingBaseFee).toBe(35.0); // Standard $35 reholder
    expect(result.canonicalVerdict).toBe("REHOLDER_CANDIDATE");
  });

  it("charges eBay's tiered comic fee: 13.25% to $7,500, 2.35% above, plus per-order fee", () => {
    expect(ebayFinalValueFee(10)).toBeCloseTo(1.33 + 0.3, 2);
    expect(ebayFinalValueFee(100)).toBeCloseTo(13.25 + 0.4, 2);
    // $1,380,000: 7,500 × 13.25% + 1,372,500 × 2.35% + $0.40
    expect(ebayFinalValueFee(1_380_000)).toBeCloseTo(993.75 + 32253.75 + 0.4, 2);
  });

  it("uses CGC's 2026 grading and pressing schedule", () => {
    expect(cgcGradingFee(300, 2019)).toBe(30);
    expect(cgcGradingFee(300, 1963)).toBe(45);
    expect(cgcGradingFee(800, 1963)).toBe(105);
    expect(cgcGradingFee(2000, 1963)).toBe(135); // 4% = $80, $135 minimum
    expect(cgcGradingFee(52000, 1963)).toBe(2080);
    expect(cgcPressingFee(300, 2019)).toBe(12);
    expect(cgcPressingFee(300, 1963)).toBe(30);
    expect(cgcPressingFee(800, 2019)).toBe(70);
    expect(cgcPressingFee(52000, 1963)).toBe(2080);
  });

  it("solves breakeven so that net proceeds exactly cover the basis", () => {
    const basis = 91.78;
    const be = breakevenSalePrice(basis);
    expect(netSaleProceeds(be)).toBeGreaterThanOrEqual(basis);
    expect(netSaleProceeds(be - 0.02)).toBeLessThan(basis);
    expect(marginOfSafetyPct(be, be)).toBe(0);
    expect(marginOfSafetyPct(200, 100)).toBe(50);
  });

  it("charges $5 per reject on Modern Bulk PreScreen", () => {
    const result = calculateCanonicalUnderwriting({
      pubYear: 2019,
      rawAcquisitionCost: 6.78,
      postGradeTargetFmv: 73.35,
      achievedGrade: "9.6",
      operation: "PRE_SCREEN",
      preScreenCutoffGrade: "9.8",
      preScreenBulk: true,
    });
    expect(result.lineItems.gradingBaseFee).toBe(5);
  });
});
