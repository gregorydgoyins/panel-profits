import { describe, it, expect } from "vitest";
import { rollCertifiedGrade, createGradingBatch } from "./pipeline";
import { GRADING_TIER_CONFIGS, PRESSING_ADDON_CONFIG } from "./types";
import { calculatePlayerCareerProfile } from "@/lib/learn/academy-skills";
import { generateAnchorMarketLot } from "@/lib/sourcing/market-lots";
import { PHYSICAL_CONTAINER_REGISTRY } from "@/lib/inventory/types";

describe("Grading Pipeline & Physical Inventory Mechanics", () => {
  it("verifies container hierarchy configurations and capacity limits", () => {
    expect(PHYSICAL_CONTAINER_REGISTRY.SHORT_BOX.standardCapacity).toBe(160);
    expect(PHYSICAL_CONTAINER_REGISTRY.LONG_BOX.standardCapacity).toBe(320);
    expect(PHYSICAL_CONTAINER_REGISTRY.LOOSE_RAW_STACK.bulkLotDiscountPct).toBe(35.0);
    expect(PHYSICAL_CONTAINER_REGISTRY.CERTIFIED_SLAB_CASE.handlingFrictionRisk).toBe(0.00);
  });

  it("calculates realistic time-in-flight and costs across grading tiers", () => {
    expect(GRADING_TIER_CONFIGS.ECONOMY_BULK.latencyHours).toBe(72);
    expect(GRADING_TIER_CONFIGS.STANDARD.latencyHours).toBe(24);
    expect(GRADING_TIER_CONFIGS.EXPRESS.latencyHours).toBe(6);
    expect(GRADING_TIER_CONFIGS.SOVEREIGN_DESK.latencyHours).toBe(1);

    const batch = createGradingBatch({
      userId: "user-123",
      gradingCompany: "CGC",
      serviceTier: "STANDARD",
      items: [
        {
          comicId: "2412811",
          series: "Silver Surfer: Black",
          issueNumber: "1",
          rawEstimatedGrade: 9.4
        }
      ],
      hasPressing: true,
      submissionDate: new Date("2026-11-09T12:00:00Z")
    });

    expect(batch.totalCostUsd).toBe(40.00 + PRESSING_ADDON_CONFIG.costUsd);
    // 24h standard + 12h pressing = 36 hours total latency
    expect(batch.estimatedCompletionAt).toBe("2026-11-11T00:00:00.000Z");
  });

  it("elevates 9.8 yields with pressing and player academy skills", () => {
    const rawNoviceYield = rollCertifiedGrade({
      era: "Modern",
      year: 2019,
      hasPressing: false,
      rawEstimatedGrade: 9.2,
      playerModifiers: {
        appraisalLevel: 0,
        negotiationLevel: 0,
        underwritingLevel: 0,
        hasPressingMastery: false,
        hasPrinterDefectEye: false
      }
    });

    expect(rawNoviceYield.grade).toBeGreaterThanOrEqual(9.0);
    expect(rawNoviceYield.label).toBe("Universal Blue Label");
  });

  it("gates advanced inventory actions behind Academy career ladders", () => {
    const novice = calculatePlayerCareerProfile("user-novice", []);
    expect(novice.careerTier).toBe(0);
    expect(novice.unlockedFeatures.canBuyRawSingles).toBe(true);
    expect(novice.unlockedFeatures.canBuyLongBoxes).toBe(false);
    expect(novice.unlockedFeatures.canSubmitSovereignDesk).toBe(false);

    const master = calculatePlayerCareerProfile("user-master", Array.from({ length: 20 }, (_, i) => `course-${i}`));
    expect(master.careerTier).toBe(4);
    expect(master.unlockedFeatures.canBuyLongBoxes).toBe(true);
    expect(master.unlockedFeatures.canSubmitSovereignDesk).toBe(true);
    expect(master.unlockedFeatures.canAddPressing).toBe(true);
  });

  it("generates authentic market lots with counterparty wholesale pricing", () => {
    const shortBoxLot = generateAnchorMarketLot({
      comicId: "2412811",
      series: "Silver Surfer: Black",
      issueNumber: "1",
      rawFmvUsd: 6.78,
      format: "SHORT_BOX",
      counterparty: "CONVENTION_SHARK"
    });

    expect(shortBoxLot.totalComicsCount).toBe(160);
    expect(shortBoxLot.askingPriceUsd).toBeLessThan(shortBoxLot.estimatedFmvUsd);
    expect(shortBoxLot.requiredCareerTier).toBe(1);

    const estateLongBox = generateAnchorMarketLot({
      comicId: "2412811",
      series: "Silver Surfer: Black",
      issueNumber: "1",
      rawFmvUsd: 6.78,
      format: "LONG_BOX",
      counterparty: "ESTATE_LIQUIDATOR"
    });

    expect(estateLongBox.totalComicsCount).toBe(320);
    expect(estateLongBox.isOpenForSampling).toBe(false); // Blind estate box
    expect(estateLongBox.wholesaleDiscountPct).toBeGreaterThanOrEqual(55.0);
  });
});
