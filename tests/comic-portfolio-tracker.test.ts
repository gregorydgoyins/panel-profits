import { describe, it, expect } from "vitest";
import {
  resolveComicEra,
  evaluatePortfolioPosition,
  generatePortfolioTemplateCsv,
  type PortfolioPositionInput,
} from "@/lib/pricing/comic-portfolio-tracker";

describe("Multi-Era Comic Portfolio Tracker & Asset Ledger Engine", () => {
  it("resolves all canonical comic eras accurately including Atomic and Independent", () => {
    expect(resolveComicEra(1910)).toBe("Platinum");
    expect(resolveComicEra(1938)).toBe("Golden");
    expect(resolveComicEra(1950)).toBe("Atomic");
    expect(resolveComicEra(1962)).toBe("Silver");
    expect(resolveComicEra(1974)).toBe("Bronze");
    expect(resolveComicEra(1986)).toBe("Copper");
    expect(resolveComicEra(1995)).toBe("Modern");
    // Independent classification verifies publisher context
    expect(resolveComicEra(2008, "Image Comics")).toBe("Independent");
    expect(resolveComicEra(2008, "Dark Horse")).toBe("Independent");
    expect(resolveComicEra(2008, "IDW Publishing")).toBe("Independent");
    expect(resolveComicEra(2008, "Marvel Comics")).toBe("Independent");
    expect(resolveComicEra(2001, "DC Comics")).toBe("Modern");
    expect(resolveComicEra(2020)).toBe("Post-Modern");
  });

  it("calculates multi-phase replacement cost, friction, and net ROI", () => {
    const input: PortfolioPositionInput = {
      comicId: "2386994",
      title: "The Incredible Hulk",
      issue: "181",
      publicationYear: 1974,
      targetGrade: "9.2",
      rawPurchaseCost: 4500,
      salesTax: 315, // 7%
      inboundShipping: 50,
      pressingFee: 35,
      gradingFee: 85,
      gradingShippingAndInsurance: 45,
      expectedGrossSaleFmv: 9200,
      platformFeePct: 10.0, // Heritage 10%
      outboundInsuredShipping: 60,
      acquisitionDate: "2025-01-15",
      targetLiquidationDate: "2025-07-15", // 181 days
    };

    const evalResult = evaluatePortfolioPosition(input);

    expect(evalResult.era).toBe("Bronze");
    // Raw basis: 4500 + 315 + 50 = 4865
    expect(evalResult.rawCostBasis).toBe(4865);
    // Processing: 35 + 85 + 45 = 165
    expect(evalResult.processingLoad).toBe(165);
    // Total Replacement Cost: 4865 + 165 = 5030
    expect(evalResult.totalReplacementCost).toBe(5030);

    // Friction: 9200 * 10% + 60 + 0.3 = 980.30
    expect(evalResult.estimatedPlatformFriction).toBe(980.3);
    // Net: 9200 - 980.3 = 8219.70
    expect(evalResult.netRealizedProceeds).toBe(8219.7);
    // Profit: 8219.70 - 5030 = 3189.70
    expect(evalResult.netRealizedProfit).toBe(3189.7);

    // ROI: (3189.70 / 5030) * 100 = 63.41%
    expect(evalResult.estimatedRoiPct).toBe(63.41);
    expect(evalResult.status).toBe("DEEP_PROFIT");
    expect(evalResult.marginOfSafetyPct).toBeGreaterThan(45);
  });

  it("generates formatted CSV matching institutional template", () => {
    const input: PortfolioPositionInput = {
      comicId: "2523721",
      title: "Nightcrawler",
      issue: "10",
      publicationYear: 2020,
      targetGrade: "9.8",
      rawPurchaseCost: 15,
      salesTax: 1.05,
      inboundShipping: 5,
      pressingFee: 15,
      gradingFee: 25,
      gradingShippingAndInsurance: 15,
      expectedGrossSaleFmv: 64.03,
      platformFeePct: 13.25,
      acquisitionDate: "2026-01-01",
      targetLiquidationDate: "2026-10-01",
    };

    const evalResult = evaluatePortfolioPosition(input);
    const csv = generatePortfolioTemplateCsv([evalResult]);

    expect(csv).toContain("Comic_ID,Title,Issue,Age_Era");
    expect(csv).toContain("2523721,\"Nightcrawler\",10,Post-Modern,9.8");
  });
});
