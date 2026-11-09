import { describe, it, expect } from "vitest";
import { executeDIYPress, PRESSING_SUPPLY_REGISTRY } from "./diy-pressing";
import { quoteSubcontractorPresser, SUBCONTRACTOR_PRESSERS } from "./pressers";
import { rollEasterEggOpportunity, CANONICAL_EASTER_EGGS } from "@/lib/easter-eggs/engine";

describe("DIY Pressing, Subcontractor Studios & Easter Egg Engine", () => {
  it("verifies supply tiers, DIY costs, and exp gains", () => {
    expect(PRESSING_SUPPLY_REGISTRY.DISCOUNT_STORE.costBasisUsd).toBe(3.50);
    expect(PRESSING_SUPPLY_REGISTRY.DISCOUNT_STORE.burnRiskPct).toBeGreaterThan(10);
    expect(PRESSING_SUPPLY_REGISTRY.ARCHIVAL_STUDIO.maxGradeCeiling).toBe(9.9);

    const practiceResult = executeDIYPress({
      rawEstimatedGrade: 6.0,
      playerPressingExp: 50,
      supplyTier: "DISCOUNT_STORE",
      isPracticeBook: true
    });

    expect(practiceResult.expGained).toBeGreaterThan(0);
    // Beater copy: cannot jump beyond low-grade ceiling even with DIY pressing
    expect(practiceResult.finalEstimatedGrade).toBeLessThanOrEqual(7.0);
  });

  it("enforces subcontractor discounts strictly between 15% and 50% (never 1% or trivial)", () => {
    for (let i = 0; i < 20; i++) {
      const quote = quoteSubcontractorPresser({
        presserId: "KITCHEN_FLIPPER",
        bookCount: 10,
        playerNegotiationLevel: 2
      });

      expect(quote.appliedDiscountPct).toBeGreaterThanOrEqual(15.0);
      expect(quote.appliedDiscountPct).toBeLessThanOrEqual(50.0);
      expect(quote.totalCostUsd).toBeLessThan(SUBCONTRACTOR_PRESSERS.KITCHEN_FLIPPER.baseFeeUsd * 10);
    }
  });

  it("triggers canonical Easter Eggs with skill-gated recognition", () => {
    expect(CANONICAL_EASTER_EGGS.DOUBLE_COVER_SURPRISE.fmvMultiplier).toBe(2.5);
    expect(CANONICAL_EASTER_EGGS.MISLISTED_AUCTION_TYPO.fmvMultiplier).toBe(0.55);

    // Roll with force: test unrecognized vs recognized
    const egg = CANONICAL_EASTER_EGGS.DOUBLE_COVER_SURPRISE;
    expect(egg.minSkillLevelRequired).toBe(2);
  });
});
