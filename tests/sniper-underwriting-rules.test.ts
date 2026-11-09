import { describe, it, expect } from "vitest";
import { detectBookEraAndPolicy, transformRowToLot } from "@/lib/sniper/sim/lot-service";

describe("Sniper Underwriting Policy: Era Grade Cutoffs & Starting Bid Ceiling", () => {
  describe("detectBookEraAndPolicy", () => {
    it("classifies Bronze, Copper, Modern, Indy, and Post-Modern as high-grade only (8.5+)", () => {
      // Bronze Age (1970–1983)
      const bronze = detectBookEraAndPolicy(1974, "Amazing Spider-Man #129 (1974)");
      expect(bronze.era).toBe("bronze");
      expect(bronze.isHighGradeOnly).toBe(true);
      expect(bronze.eraDisplayName).toContain("8.5+");

      // Copper Age (1984–1991)
      const copper = detectBookEraAndPolicy(1991, "New Mutants #98 (1991)");
      expect(copper.era).toBe("copper");
      expect(copper.isHighGradeOnly).toBe(true);
      expect(copper.eraDisplayName).toContain("8.5+");

      // Modern Age (1992–2009)
      const modern = detectBookEraAndPolicy(1993, "Amazing Spider-Man #361 (1992)");
      expect(modern.era).toBe("modern");
      expect(modern.isHighGradeOnly).toBe(true);
      expect(modern.eraDisplayName).toContain("8.5+");

      // Post-Modern Age (2017+)
      const postmodern = detectBookEraAndPolicy(2023, "Ultimate Spider-Man #1 (2024)");
      expect(postmodern.era).toBe("postmodern");
      expect(postmodern.isHighGradeOnly).toBe(true);
      expect(postmodern.eraDisplayName).toContain("8.5+");

      // Independent Age (2002–2016) — 30 Days of Night #1 (2002)
      const indy = detectBookEraAndPolicy(2002, "30 Days of Night #1 (2002)", "30 Days of Night");
      expect(indy.era).toBe("indy");
      expect(indy.isHighGradeOnly).toBe(true);
      expect(indy.eraDisplayName).toContain("8.5+");
    });

    it("allows vintage 0.5–9.8 range for Platinum, Golden, Atomic, and Silver eras", () => {
      // Platinum Age (< 1938)
      const platinum = detectBookEraAndPolicy(1935, "New Fun Comics #1 (1935)");
      expect(platinum.era).toBe("platinum");
      expect(platinum.isHighGradeOnly).toBe(false);
      expect(platinum.eraDisplayName).toContain("0.5 – 9.8");

      // Golden Age (1938–1945)
      const golden = detectBookEraAndPolicy(1938, "Action Comics #1 (1938)");
      expect(golden.era).toBe("golden");
      expect(golden.isHighGradeOnly).toBe(false);
      expect(golden.eraDisplayName).toContain("0.5 – 9.8");

      // Atomic Age (1946–1955)
      const atomic = detectBookEraAndPolicy(1950, "Strange Tales #1 (1951)");
      expect(atomic.era).toBe("atomic");
      expect(atomic.isHighGradeOnly).toBe(false);
      expect(atomic.eraDisplayName).toContain("0.5 – 9.8");

      // Silver Age (1956–1969)
      const silver = detectBookEraAndPolicy(1962, "Amazing Fantasy #15 (1962)");
      expect(silver.era).toBe("silver");
      expect(silver.isHighGradeOnly).toBe(false);
      expect(silver.eraDisplayName).toContain("0.5 – 9.8");
    });
  });

  describe("transformRowToLot Grade Restrictions", () => {
    const bronzeBook = {
      id: "2314852",
      title: "Amazing Spider-Man #129 (1974)",
      series: "Amazing Spider-Man, The",
      issue_number: "129",
      raw: "$1245.31",
      "4.0": "$990.87",
      "6.0": "$1383.09",
      "8.0": "$2296.53",
      "9.2": "$3450.78",
      "9.4": "$4200.00",
      "9.6": "$5804.45",
      "9.8": "$16165.00",
      "10.0": null,
      spread_raw_to_98: "14919.69",
      ratio_96_to_98: "0.3591",
      sales_volume: "484",
      highres_cover_url: "https://example.com/asm129.webp",
      summary: "1st Punisher",
      why_i_should_invest_in_this_comic: "Blue chip",
    };

    it("strictly generates grades >= 8.5 for Bronze through Post-Modern books across all broker levels", () => {
      const allowedHighGrades = ["9.2", "9.4", "9.6", "9.8", "10.0"];

      // Test 40 iterations across Broker L1, L2, L3 and Whale
      for (let i = 0; i < 40; i++) {
        const brokerL1Lot = transformRowToLot(bronzeBook, "broker", 1);
        expect(allowedHighGrades).toContain(brokerL1Lot.grade);
        expect(parseFloat(brokerL1Lot.grade)).toBeGreaterThanOrEqual(8.5);
        expect(brokerL1Lot.isHighGradeOnly).toBe(true);

        const brokerL2Lot = transformRowToLot(bronzeBook, "broker", 2);
        expect(allowedHighGrades).toContain(brokerL2Lot.grade);
        expect(parseFloat(brokerL2Lot.grade)).toBeGreaterThanOrEqual(8.5);

        const whaleLot = transformRowToLot(bronzeBook, "whale", 1);
        expect(allowedHighGrades).toContain(whaleLot.grade);
        expect(parseFloat(whaleLot.grade)).toBeGreaterThanOrEqual(8.5);
      }
    });

    it("upgrades forced sub-8.5 grades to the minimum institutional grade (9.2) for Bronze+ eras", () => {
      const lotForced40 = transformRowToLot(bronzeBook, "broker", 1, "4.0");
      expect(parseFloat(lotForced40.grade)).toBeGreaterThanOrEqual(8.5);
      expect(lotForced40.grade).toBe("9.2");

      const lotForced60 = transformRowToLot(bronzeBook, "broker", 1, "6.0");
      expect(parseFloat(lotForced60.grade)).toBeGreaterThanOrEqual(8.5);
      expect(lotForced60.grade).toBe("9.2");

      const lotForced80 = transformRowToLot(bronzeBook, "broker", 1, "8.0");
      expect(parseFloat(lotForced80.grade)).toBeGreaterThanOrEqual(8.5);
      expect(lotForced80.grade).toBe("9.2");
    });

    it("permits low/mid vintage grades (4.0, 6.0, 8.0) for Golden Age and Atomic Age books", () => {
      const goldenBook = {
        id: "1000001",
        title: "Action Comics #1 (1938)",
        series: "Action Comics",
        issue_number: "1",
        raw: "$150000.00",
        "4.0": "$450000.00",
        "6.0": "$950000.00",
        "8.0": "$1800000.00",
        "9.2": "$2500000.00",
        "9.4": "$3100000.00",
        "9.6": "$4500000.00",
        "9.8": "$6000000.00",
        "10.0": null,
        spread_raw_to_98: "5850000.00",
        ratio_96_to_98: "0.75",
        sales_volume: "12",
        highres_cover_url: "https://example.com/ac1.webp",
        summary: "1st Superman",
        why_i_should_invest_in_this_comic: "Apex grail",
      };

      const lotForced40 = transformRowToLot(goldenBook, "broker", 1, "4.0");
      expect(lotForced40.grade).toBe("4.0");
      expect(lotForced40.isHighGradeOnly).toBe(false);

      const lotForced60 = transformRowToLot(goldenBook, "broker", 1, "6.0");
      expect(lotForced60.grade).toBe("6.0");
    });
  });

  describe("Opening Floor Bid Hard Cap at $10,000", () => {
    it("caps opening floor bid at $10,000 maximum even for mega-grails with FMVs over $50k", () => {
      const megaGrailBook = {
        id: "9999999",
        title: "Action Comics #1 (1938)",
        series: "Action Comics",
        issue_number: "1",
        raw: "$100000.00",
        "4.0": "$250000.00",
        "6.0": "$500000.00",
        "8.0": "$1000000.00",
        "9.2": "$1800000.00",
        "9.4": "$2400000.00",
        "9.6": "$3200000.00",
        "9.8": "$5000000.00",
        "10.0": null,
        spread_raw_to_98: "4900000.00",
        ratio_96_to_98: "0.64",
        sales_volume: "5",
        highres_cover_url: "https://example.com/ac1.webp",
        summary: "Mega Grail",
        why_i_should_invest_in_this_comic: "Ultra high value key",
      };

      const lot = transformRowToLot(megaGrailBook, "whale", 1, "9.8");

      // Opening bid is strictly capped at $10k
      expect(lot.openingBid).toBeLessThanOrEqual(10000);
      expect(lot.currentBid).toBeLessThanOrEqual(10000);
      expect(lot.openingBid).toBe(10000);

      // Meanwhile FMV and hammer price clear unconstrained over $10k
      expect(lot.fmv).toBe(5000000);
      expect(lot.hammerPrice).toBeGreaterThan(10000);
      expect(lot.hammerPrice).toBeGreaterThan(2000000);
    });

    it("caps ASM #129 9.8 opening bid at $10,000 while FMV remains $16,165", () => {
      const asmBook = {
        id: "2314852",
        title: "Amazing Spider-Man #129 (1974)",
        series: "Amazing Spider-Man, The",
        issue_number: "129",
        raw: "$1245.31",
        "4.0": "$990.87",
        "6.0": "$1383.09",
        "8.0": "$2296.53",
        "9.2": "$3450.78",
        "9.4": "$4200.00",
        "9.6": "$5804.45",
        "9.8": "$16165.00",
        "10.0": null,
        spread_raw_to_98: "14919.69",
        ratio_96_to_98: "0.3591",
        sales_volume: "484",
        highres_cover_url: "https://example.com/asm129.webp",
        summary: "1st Punisher",
        why_i_should_invest_in_this_comic: "Blue chip",
      };

      const lot = transformRowToLot(asmBook, "whale", 1, "9.8");
      expect(lot.openingBid).toBeLessThanOrEqual(10000);
      expect(lot.fmv).toBe(16165);
      expect(lot.hammerPrice).toBeGreaterThan(10000);
    });
  });
});
