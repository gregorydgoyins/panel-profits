import { describe, it, expect } from "vitest";
import { calculateCanonicalUnderwriting } from "./canonical-underwriting-core";

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
    // Net proceeds: 117.32 * (1 - 0.1325) - 25 = 101.78 - 25 = 76.78 (approx)
    expect(result.netRealizedProceeds).toBeCloseTo(76.78, 1);
    // Loss: 76.78 - 91.78 = -15.00
    expect(result.netDollarProfit).toBeCloseTo(-15.0, 1);
    // Margin of safety is -16.34% (loss of -$15.00 against $91.78 basis), which cleanly triggers BUY_ESTABLISHED_SLAB
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
});
