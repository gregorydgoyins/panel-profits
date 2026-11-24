import { describe, it, expect } from "vitest";
import {
  formatComicEquityTicker,
  CANONICAL_16_ASSET_FAMILIES,
  getSovereignEquities,
  getCanonicalAssetSurfaces,
  validateCe70Constituent,
} from "@/lib/equity/canonical-equities";
import { getCleanEquityDetail } from "@/lib/panel-profits/assets";
import { getComicById } from "@/lib/comics/queries";

describe("Canonical Equities Symbology & 16 Asset Families Canon", () => {
  it("formats canonical comic equity tickers following canonical series acronym standard", () => {
    expect(formatComicEquityTicker("Action Comics", "252")).toBe("ACT252");
    expect(formatComicEquityTicker("Amazing Spider-Man", "300")).toBe("ASM300");
    expect(formatComicEquityTicker("Batman", "251")).toBe("BAT251");
    expect(formatComicEquityTicker("Crime SuspenStories", "22")).toBe("CSS22");
    expect(formatComicEquityTicker("Incredible Hulk", "181")).toBe("HLK181");
    expect(formatComicEquityTicker("Teenage Mutant Ninja Turtles", "1")).toBe("TMNT1");
    expect(formatComicEquityTicker("Fantastic Four", "48")).toBe("FF048");
    expect(formatComicEquityTicker("Avengers", "4")).toBe("AVG04");
    expect(formatComicEquityTicker("Amazing Spider-Man", "1")).toBe("ASM01");
    expect(formatComicEquityTicker("The X-Men", "94")).toBe("XMN94");

    // Disambiguated spin-off and variant series
    expect(formatComicEquityTicker("Astonishing X-Men", "1")).toBe("AXM01");
    expect(formatComicEquityTicker("Ultimate X-Men", "1")).toBe("UXM01");
    expect(formatComicEquityTicker("Weapon X-Men", "1")).toBe("WXM01");
    expect(formatComicEquityTicker("Batman Adventures", "1")).toBe("BMA01");
    expect(formatComicEquityTicker("Batman Beyond", "1")).toBe("BMB01");
    expect(formatComicEquityTicker("Batman and Robin", "1")).toBe("BAR01");
  });

  it("contains exactly 16 Canonical Collectible Asset Families with valid liquidity tiers", () => {
    expect(CANONICAL_16_ASSET_FAMILIES.length).toBe(16);

    const expectedCodes = [
      "SOV", "SIG", "PED", "NEW", "PRV", "RAT", "RAW", "VAR",
      "DIR", "QLF", "RST", "CNS", "PRN", "INT", "ERR", "ASH"
    ];

    const actualCodes = CANONICAL_16_ASSET_FAMILIES.map((f) => f.shortCode);
    for (const code of expectedCodes) {
      expect(actualCodes).toContain(code);
    }

    for (const family of CANONICAL_16_ASSET_FAMILIES) {
      expect(["HIGH", "MEDIUM", "SPECIALIZED", "INSTITUTIONAL"]).toContain(family.liquidityTier);
      expect(family.pricingPremiumFactor.length).toBeGreaterThan(0);
      expect(family.marketRole.length).toBeGreaterThan(0);
    }
  });

  it("fetches sovereign equities universe with real pricing and authentic catalog metadata", async () => {
    const equities = await getSovereignEquities(20);
    expect(Array.isArray(equities)).toBe(true);
    expect(equities.length).toBeGreaterThan(0);

    const first = equities[0];
    expect(first).toHaveProperty("ticker");
    expect(first).toHaveProperty("series");
    expect(first).toHaveProperty("issueNumber");
    expect(first).toHaveProperty("referenceFmvUsd");
    expect(first.referenceFmvUsd).toBeGreaterThan(0);
    // Gregory Score is strictly restricted to CE70 explanation essays and is undefined on general sovereign equities
    expect(first.gregoryScore).toBeUndefined();
    expect(first.originEra).toBeDefined();
  });

  it("fetches canonical asset surfaces representing CE70 certified constituent seats", async () => {
    const seats = await getCanonicalAssetSurfaces(10);
    expect(Array.isArray(seats)).toBe(true);
    expect(seats.length).toBeGreaterThan(0);

    const seat = seats[0];
    expect(seat.seatNumber).toBeDefined();
    expect(seat.titleIssue).toBeDefined();
    expect(seat.primaryCreators).toBeDefined();
    expect(seat.gregoryScore).toBeGreaterThan(190);
  });

  it("resolves constitutional seat detail from getCleanEquityDetail", async () => {
    const seatDetail = await getCleanEquityDetail("seat-1");
    expect(seatDetail).not.toBeNull();
    if (seatDetail) {
      expect(seatDetail.seat_number).toBe(1);
      expect(seatDetail.gregory_score).toBeGreaterThan(190);
      expect(seatDetail.source).toContain("CE70");
    }
  });

  it("assigns authentic distinct cover artwork without brittle generic placeholders", async () => {
    const equities = await getSovereignEquities(20);
    const covers = equities.map((e) => e.coverUrl).filter(Boolean);
    expect(covers.length).toBeGreaterThan(0);

    // Ensure none are using the old brittle 526.jpg placeholder
    for (const cover of covers) {
      expect(cover).not.toContain("526.jpg");
    }

    // Ensure multiple distinct issues have distinct cover URLs
    const uniqueCovers = new Set(covers);
    expect(uniqueCovers.size).toBeGreaterThan(5);
  });

  it("assigns distinct authentic cover art to canonical asset seats", async () => {
    const seats = await getCanonicalAssetSurfaces(15);
    const seatCovers = seats.map((s) => s.coverUrl).filter(Boolean);
    expect(seatCovers.length).toBeGreaterThan(0);

    for (const cover of seatCovers) {
      expect(cover).not.toContain("526.jpg");
    }

    const uniqueSeatCovers = new Set(seatCovers);
    expect(uniqueSeatCovers.size).toBeGreaterThan(5);
  });

  it("provides canonical era colors and dynamic rimlight tokens across all eras", async () => {
    const { getEraColors, withAlpha } = await import("@/lib/design-system/colors");
    const eras = ["platinum", "golden", "atomic", "silver", "bronze", "copper", "modern", "independent", "postmodern"];

    for (const era of eras) {
      const colors = getEraColors(era);
      expect(colors).toBeDefined();
      expect(colors.border).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(colors.bg).toContain("rgba");
      expect(colors.glow).toContain("rgba");
    }

    // withAlpha helper test
    expect(withAlpha("#C9A227", 0.5)).toContain("rgba");
  });

  it("renders EquitiesRail with animated equity-cards, authentic covers, and era rimlights", async () => {
    const { EquitiesRail } = await import("@/components/shell/equities-rail");
    const { renderToString } = await import("react-dom/server");

    const sampleEquities = [
      {
        id: "eq-1",
        seatNumber: 1,
        seatType: "PRIMARY_DOMESTIC",
        ticker: "ACT.252.SOV",
        series: "Action Comics",
        issueNumber: "252",
        title: "Action Comics #252",
        originEra: "SILVER",
        productionAge: "SILVER",
        lineage: "Superman Lineage",
        referenceGrade: "9.8",
        referenceFmvUsd: 48500,
        priceFormatted: "$48,500",
        gregoryScore: 196.4,
        deltaPercent: 0.68,
        status: "ACTIVE",
        coverUrl: "/covers/action_comics_252.jpg",
        canonicalIssueId: null,
      },
      {
        id: "eq-2",
        seatNumber: 2,
        seatType: "PRIMARY_DOMESTIC",
        ticker: "BAT.251.SOV",
        series: "Batman",
        issueNumber: "251",
        title: "Batman #251",
        originEra: "BRONZE",
        productionAge: "BRONZE",
        lineage: "Batman Lineage",
        referenceGrade: "9.8",
        referenceFmvUsd: 8500,
        priceFormatted: "$8,500",
        gregoryScore: 194.2,
        deltaPercent: 0.42,
        status: "ACTIVE",
        coverUrl: "/covers/batman_251.jpg",
        canonicalIssueId: null,
      },
    ];

    const React = await import("react");
    const html = renderToString(React.createElement(EquitiesRail, { items: sampleEquities }));

    expect(html).toContain("EQUITIES");
    expect(html).toContain("CE70");
    expect(html).toContain("equity-card");
    expect(html).toContain("--rim");
    expect(html).toContain("ACT.252");
    expect(html).toContain("Action Comics");
    expect(html).toContain("$48,500");
    expect(html).toContain("/covers/action_comics_252.jpg");
    expect(html).toContain("equities-marquee-track");
  });

  it("renders AssetsRail with canonical non-equity asset surfaces across 16 families and 65 surfaces", async () => {
    const { AssetsRail } = await import("@/components/shell/assets-rail");
    const { renderToString } = await import("react-dom/server");
    const React = await import("react");

    const html = renderToString(React.createElement(AssetsRail));

    expect(html).toContain("ASSETS");
    expect(html).toContain("16 FAMILIES · 65 SURFACES");
    expect(html).toContain("DERIVATIVES · FUNDS · INDICES · MUNI BONDS · ALTER EGOS");
    expect(html).toContain("Certified Asset Surfaces Ticker");
  });

  it("resolves comic detail records via getComicById from stored rows only", async () => {
    // Each lookup returns a stored comics row or null. No benchmark price, creator list or seat text is injected.
    for (const [key, series, issue] of [
      ["XMN.001.SOV", ["X-Men", "Uncanny X-Men"], "1"],
      ["x_men_1", ["X-Men", "Uncanny X-Men"], "1"],
      ["MAD.001.SOV", ["MAD"], "1"],
      ["action_comics_252", ["Action Comics"], "252"],
    ] as const) {
      const comic = await getComicById(key);
      if (!comic) continue;
      expect((series as readonly string[]).includes(comic.series)).toBe(true);
      expect(comic.issue_number).toBe(issue);
      expect(comic.comicbase_price === null || typeof comic.comicbase_price === "number").toBe(true);
      const ppData = (comic.panel_profits_data ?? {}) as any;
      expect(ppData.essay).toBeUndefined();
      expect(ppData.quality_scores).toBeUndefined();
      expect(ppData.video_discussions).toBeUndefined();
    }
  });

  it("enforces the CE70 Constitution: exactly 65 books, grade >= 8.5, price < $65k, direct single issue only, zero variants", () => {
    // Valid: 9.8 Direct issue valued under $65k passes with 0 violations
    const valid98 = validateCe70Constituent({
      seatNumber: 11,
      referenceGrade: "9.8",
      referenceFmvUsd: 48114.81,
      isVariant: false,
      labelType: "UNIVERSAL",
    });
    expect(valid98.length).toBe(0);
    // Valid constituent (Fantastic Four #48 Grade 9.0 = $42,000)
    const valid = validateCe70Constituent({
      seatNumber: 11,
      referenceGrade: "9.0",
      referenceFmvUsd: 42000,
      series: "Fantastic Four",
      issueNumber: "48",
      isVariant: false,
    });
    expect(valid).toHaveLength(0);

    // Violation: Seat count > 65 (seats 66..70 are vacant)
    const seatViolation = validateCe70Constituent({
      seatNumber: 66,
      referenceGrade: "9.0",
      referenceFmvUsd: 5000,
    });
    expect(seatViolation.some((v) => v.rule === "SEAT_COUNT")).toBe(true);

    // Violation: Grade < 8.5
    const gradeFloorViolation = validateCe70Constituent({
      seatNumber: 12,
      referenceGrade: "8.0",
      referenceFmvUsd: 25000,
    });
    expect(gradeFloorViolation.some((v) => v.rule === "GRADE_FLOOR")).toBe(true);

    // Violation: Grade >= 9.9
    const gradeCeilingViolation = validateCe70Constituent({
      seatNumber: 12,
      referenceGrade: "9.9",
      referenceFmvUsd: 25000,
    });
    expect(gradeCeilingViolation.some((v) => v.rule === "GRADE_CEILING")).toBe(true);

    // Violation: Price >= $65,000 ceiling
    const priceViolation = validateCe70Constituent({
      seatNumber: 1,
      referenceGrade: "9.0",
      referenceFmvUsd: 75000,
    });
    expect(priceViolation.some((v) => v.rule === "PRICE_CEILING")).toBe(true);

    // Violation: Variant edition
    const variantViolation = validateCe70Constituent({
      seatNumber: 1,
      referenceGrade: "9.0",
      referenceFmvUsd: 15000,
      isVariant: true,
    });
    expect(variantViolation.some((v) => v.rule === "VARIANT_PROHIBITION")).toBe(true);
  });

  it("formats canonical exchange tickers for modern and landmark indie/key titles without CE70 or RAW contamination", () => {
    expect(formatComicEquityTicker("The Walking Dead", "1")).toBe("WKD01");
    expect(formatComicEquityTicker("Spawn", "1")).toBe("SPW01");
    expect(formatComicEquityTicker("Kingdom Come", "1")).toBe("KGC01");
    expect(formatComicEquityTicker("Invincible", "1")).toBe("INV01");
    expect(formatComicEquityTicker("Preacher", "1")).toBe("PRC01");
    expect(formatComicEquityTicker("Y: The Last Man", "1")).toBe("YLM01");
    expect(formatComicEquityTicker("The Brave and the Bold", "28")).toBe("BTB28");
    expect(formatComicEquityTicker("Justice League of America", "1")).toBe("JLA01");
    expect(formatComicEquityTicker("Teen Titans", "1")).toBe("NTT01");
    expect(formatComicEquityTicker("Action Comics", "1")).toBe("ACT01");
    expect(formatComicEquityTicker("Detective Comics", "27")).toBe("DET27");
  });

  it("streams distinct non-repeating chunks across 260-comic queue offsets in 5,000-comic blocks", async () => {
    const { getContinuousQueueSlice } = await import("@/lib/equity/continuous-queue-engine");

    const batch0 = await getContinuousQueueSlice(0, 10);
    const batch260 = await getContinuousQueueSlice(260, 10);
    const batch5000 = await getContinuousQueueSlice(5000, 10);

    expect(batch0.items.length).toBe(10);
    expect(batch260.items.length).toBe(10);
    expect(batch5000.items.length).toBe(10);

    const titles0 = new Set(batch0.items.map((i) => `${i.series} #${i.issueNumber}`));
    const titles260 = new Set(batch260.items.map((i) => `${i.series} #${i.issueNumber}`));

    // Offset 0 and Offset 260 must be completely non-overlapping
    const overlap = [...titles0].filter((t) => titles260.has(t));
    expect(overlap.length).toBe(0);

    // Ensure tickers are clean canonical exchange symbols
    for (const item of [...batch0.items, ...batch260.items, ...batch5000.items]) {
      expect(item.ticker).toBeDefined();
      expect(item.ticker).not.toMatch(/^CE70/i);
      expect(item.ticker.toUpperCase()).not.toBe("RAW");
      expect(item.ticker).not.toMatch(/^(SOV|STD|OTC|PREMIUM)$/i);
      expect(item.year).toBeGreaterThan(1930);
    }
  });
});

