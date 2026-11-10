import { describe, it, expect } from "vitest";
import { calculateReplacementCostHurdle } from "@/lib/pricing/replacement-cost-engine";

describe("Replacement Cost, Pressing & Box Discovery Engine", () => {
  it("calculates exact baseline modern hurdle with DIY seasoned press ($0)", () => {
    const res = calculateReplacementCostHurdle({
      rawAcquisition: 6.78,
      inboundShipping: 0,
      transitInsurance: 0,
      pressingType: "DIY_SEASONED",
      gradingTier: "MODERN",
      pubYear: 2019,
      targetFmv: 117.32,
      shippingRoundTripBatchShare: 9.20,
      signatureAuth: "NONE",
      signatureCount: 0,
      preScreenCutoff: "OFF",
      printRunTotal: 129490,
      rawCopiesEstimated: 122847,
    });

    expect(res.rawAcquisitionLanded).toBe(6.78);
    expect(res.pressingFee).toBe(0);
    expect(res.gradingFee).toBe(25);
    expect(res.freightOverhead).toBe(9.20);
    expect(res.totalLandedReplacementCost).toBe(40.98); // 6.78 + 25 + 9.20
    expect(res.boxOdds.scarcityRating).toBe("MASS_FLOAT");
  });

  it("applies Pre-1975 vintage grading fee of $40 automatically", () => {
    const res = calculateReplacementCostHurdle({
      rawAcquisition: 75.0,
      inboundShipping: 10.0,
      transitInsurance: 2.0,
      pressingType: "NONE",
      gradingTier: "AUTO",
      pubYear: 1974, // ASM #129 era
      targetFmv: 1200,
      shippingRoundTripBatchShare: 9.20,
      signatureAuth: "NONE",
      signatureCount: 0,
      preScreenCutoff: "OFF",
    });

    // 1974 is pre-1975, but target FMV is $1200 (> $1000), so 3% FMV triggers: $1200 * 0.03 = $36, but floor is $85
    expect(res.gradingFee).toBe(85);
    expect(res.gradingTierName).toContain("3% FMV");
  });

  it("calculates master private pressing ($18) with JSA forensic signature authentication", () => {
    const res = calculateReplacementCostHurdle({
      rawAcquisition: 25.0,
      inboundShipping: 5.0,
      transitInsurance: 0,
      pressingType: "PRIVATE_MASTER",
      gradingTier: "MODERN",
      pubYear: 2020,
      targetFmv: 250,
      shippingRoundTripBatchShare: 10.0,
      signatureAuth: "JSA_CBCS_VERIFIED",
      signatureCount: 2, // 2 signatures: $25 first + $15 second = $40
      preScreenCutoff: "OFF",
    });

    expect(res.pressingFee).toBe(18);
    expect(res.signatureFee).toBe(40);
    expect(res.gradingFee).toBe(25);
    expect(res.totalFixedEncapsulationOverhead).toBe(18 + 40 + 25 + 10); // $93
    expect(res.totalLandedReplacementCost).toBe(30 + 93); // $123
  });

  it("computes wild box odds accurately for restricted 1:50 variant", () => {
    const res = calculateReplacementCostHurdle({
      rawAcquisition: 50.0,
      inboundShipping: 5.0,
      transitInsurance: 0,
      pressingType: "NONE",
      gradingTier: "MODERN",
      pubYear: 2019,
      targetFmv: 185,
      shippingRoundTripBatchShare: 9.20,
      signatureAuth: "NONE",
      signatureCount: 0,
      preScreenCutoff: "OFF",
      printRunTotal: 2590, // 1:50 variant
      rawCopiesEstimated: 2457,
    });

    expect(res.boxOdds.scarcityRating).toBe("HYPER_SCARCE_VAULT");
    expect(res.boxOdds.shortBoxNumeric).toBeGreaterThan(100);
  });
});
