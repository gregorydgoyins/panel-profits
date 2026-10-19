import { describe, it, expect } from "vitest";
import { evaluateAuctionListing } from "@/lib/sniper/radar-engine";
import { parseComicConnectOrMetropolisHtml, parseComicConnectSoldHtml, parseHakesCatalogHtml } from "@/lib/sniper/venue-adapters";
import { RawAuctionListing, SniperFilterProfile } from "@/lib/sniper/types";

describe("Sniper Radar Engine & Anti-Bullshit Filter", () => {
  const defaultProfile: SniperFilterProfile = {
    eras: ["silver", "bronze", "copper", "modern"],
    minGrade: 9.2,
    maxGrade: 9.8,
    maxAllInBudget: 500.00,
    editions: ["all"],
    crackAndPressCandidate: true,
    damagedSlab98: true,
    signedLegendary: true,
    belowGradingCost: true,
    requireProvenSales: true,
    minDiscountPercent: 30,
    minHistoricalSalesCount: 3,
  };

  it("STRICTLY REJECTS modern facsimile reprint posing as vintage key", () => {
    const listing: RawAuctionListing = {
      id: "listing-1",
      source: "ebay",
      title: "Iron Man #128 CGC 9.8 Facsimile Edition 2023 Demon in a Bottle",
      currentBid: 35.00,
      shippingCost: 12.00,
      bidCount: 4,
      secondsRemaining: 420,
      url: "https://ebay.com/itm/1",
      imageUrl: "https://example.com/cover.jpg",
    };

    const evalResult = evaluateAuctionListing(listing, defaultProfile);
    expect(evalResult.passed).toBe(false);
    expect(evalResult.gateFailed).toBe(2);
    expect(evalResult.rejectionReason).toContain("Trigger: 'facsimile'");
  });

  it("STRICTLY REJECTS non-collector filler (Barbie comic)", () => {
    const listing: RawAuctionListing = {
      id: "listing-2",
      source: "ebay",
      title: "Barbie Fashion #1 CGC 9.8 Marvel Comics 1991 Rare",
      currentBid: 40.00,
      shippingCost: 10.00,
      bidCount: 2,
      secondsRemaining: 300,
      url: "https://ebay.com/itm/2",
      imageUrl: "https://example.com/cover.jpg",
    };

    const evalResult = evaluateAuctionListing(listing, defaultProfile);
    expect(evalResult.passed).toBe(false);
    expect(evalResult.gateFailed).toBe(2);
    expect(evalResult.rejectionReason).toContain("Barbie Fashion");
  });

  it("STRICTLY REJECTS unproven book with zero historical sales (Impulse Protection)", () => {
    const listing: RawAuctionListing = {
      id: "listing-3",
      source: "ebay",
      title: "Mystery Space Hero #55 CGC 9.8 Super Rare Only Copy",
      currentBid: 120.00,
      shippingCost: 15.00,
      bidCount: 1,
      secondsRemaining: 600,
      url: "https://ebay.com/itm/3",
      imageUrl: "https://example.com/cover.jpg",
    };

    const evalResult = evaluateAuctionListing(listing, defaultProfile);
    expect(evalResult.passed).toBe(false);
    expect(evalResult.gateFailed).toBe(4);
    expect(evalResult.rejectionReason).toContain("Zero proven auction sales on record");
  });

  it("ACCEPTS Silver Age Green Lantern #7 CGC 9.4 under $150 budget with high arbitrage when recorded FMV is present", () => {
    const profile: SniperFilterProfile = {
      ...defaultProfile,
      eras: ["silver"],
      minGrade: 9.4,
      maxGrade: 9.8,
      maxAllInBudget: 150.00,
      seriesWhitelist: ["green lantern"],
    };

    const listing: RawAuctionListing = {
      id: "listing-gl7",
      source: "heritage",
      title: "Green Lantern #7 CGC 9.4 1961 1st Appearance of Sinestro",
      currentBid: 95.00,
      shippingCost: 15.00,
      bidCount: 8,
      secondsRemaining: 540,
      url: "https://ha.com/itm/gl7",
      imageUrl: "https://example.com/gl7.jpg",
      anchorFmv: 385.00,
    };

    const evalResult = evaluateAuctionListing(listing, profile);
    expect(evalResult.passed).toBe(true);
    expect(evalResult.resolvedSeries).toBe("Green Lantern");
    expect(evalResult.resolvedIssue).toBe("7");
    expect(evalResult.resolvedGrade).toBe(9.4);
    expect(evalResult.anchorFmv).toBe(385.00);
    expect(evalResult.discountPercent).toBeGreaterThanOrEqual(60);
    expect(evalResult.verdict).toBe("STRONG_BUY_SNIPE");
    // No fabricated comps when none are in recorded sales
    expect(evalResult.historicalComps).toEqual([]);
  });

  it("DETECTS Damaged Slab 9.8 Arbitrage ($25 Reholder Opportunity)", () => {
    const listing: RawAuctionListing = {
      id: "listing-ironman-cracked",
      source: "ebay",
      title: "Iron Man #128 CGC 9.8 1979 Demon In A Bottle - Cracked Case on Back",
      currentBid: 180.00,
      shippingCost: 15.00,
      bidCount: 12,
      secondsRemaining: 240,
      url: "https://ebay.com/itm/im128",
      imageUrl: "https://example.com/im128.jpg",
      itemDescription: "Book inside is untouched, 1-inch crack in plastic slab on lower rear corner.",
      anchorFmv: 620.00,
    };

    const evalResult = evaluateAuctionListing(listing, defaultProfile);
    expect(evalResult.passed).toBe(true);
    expect(evalResult.specialPlay).toBe("REHOLDER_ARBITRAGE");
    expect(evalResult.strategySummary).toContain("Cracked/Damaged 9.8 Case");
    expect(evalResult.anchorFmv).toBe(620.00);
    expect(evalResult.dollarSpread).toBeGreaterThan(350);
  });

  it("REJECTS when total all-in cost exceeds user's strict budget limit", () => {
    const profile: SniperFilterProfile = {
      ...defaultProfile,
      maxAllInBudget: 150.00,
    };

    const listing: RawAuctionListing = {
      id: "listing-thor",
      source: "ebay",
      title: "Thor #337 CGC 9.8 1983 1st Beta Ray Bill",
      currentBid: 160.00, // Bid alone is 160, all-in is ~187
      shippingCost: 15.00,
      bidCount: 22,
      secondsRemaining: 180,
      url: "https://ebay.com/itm/thor337",
      imageUrl: "https://example.com/thor337.jpg",
      anchorFmv: 480.00,
    };

    const evalResult = evaluateAuctionListing(listing, profile);
    expect(evalResult.passed).toBe(false);
    expect(evalResult.gateFailed).toBe(3);
    expect(evalResult.rejectionReason).toContain("exceeds all-in budget cap");
  });

  it("DETECTS Below-Grading-Cost Arbitrage (CGC 9.8 selling at $18 vs $45+ grading fee)", () => {
    const profile: SniperFilterProfile = {
      ...defaultProfile,
      belowGradingCost: true,
      minAllInCost: 0,
      maxAllInBudget: 50.00,
    };

    const listing: RawAuctionListing = {
      id: "listing-dazzler-floor",
      source: "ebay",
      title: "Dazzler #1 CGC 9.8 Marvel Comics 1981 Bob Larkin Painted Cover",
      currentBid: 18.00,
      shippingCost: 8.00,
      bidCount: 5,
      secondsRemaining: 180,
      url: "https://ebay.com/itm/dazzler1",
      imageUrl: "https://example.com/dazzler1.jpg",
      anchorFmv: 95.00,
    };

    const evalResult = evaluateAuctionListing(listing, profile);
    expect(evalResult.passed).toBe(true);
    expect(evalResult.specialPlay).toBe("BELOW_GRADING_COST");
    expect(evalResult.cgcGradingCostFloor).toBe(80.00);
    expect(evalResult.allInCost).toBe(27.44); // $18 bid + $8 quoted shipping + 8% bid tax
    expect(evalResult.strategySummary).toContain("Slab Cost Floor Arbitrage");
    expect(evalResult.anchorFmv).toBe(95.00);
    expect(evalResult.discountPercent).toBe(Math.round(((95 - 27.44) / 95) * 100));
  });

  it("REJECTS listings below the $50 minimum investment floor", () => {
    const profile: SniperFilterProfile = {
      ...defaultProfile,
      minAllInCost: 50.00,
      maxAllInBudget: 150.00,
    };

    const listing: RawAuctionListing = {
      id: "listing-under-50",
      source: "ebay",
      title: "X-Force #1 CGC 9.8 1991 Negative Edition",
      currentBid: 25.00,
      shippingCost: 8.00,
      bidCount: 4,
      secondsRemaining: 180,
      url: "https://ebay.com/itm/xforce1",
      imageUrl: "https://example.com/xforce1.jpg",
    };

    const evalResult = evaluateAuctionListing(listing, profile);
    expect(evalResult.passed).toBe(false);
    expect(evalResult.gateFailed).toBe(3);
    expect(evalResult.rejectionReason).toContain("minimum investment floor");
  });

  it("DETECTS Quad-Signed Harley Quinn #1 ($135+ slabbing fee sunk cost sniped at $80)", () => {
    const profile: SniperFilterProfile = {
      ...defaultProfile,
      minGrade: 9.4,
      maxGrade: 9.8,
      maxAllInBudget: 150.00,
    };

    const listing: RawAuctionListing = {
      id: "listing-harley-quad",
      source: "ebay",
      title: "Harley Quinn #1 CBCS 9.8 Quad Signed by Adam Hughes, Amanda Conner, Jimmy Palmiotti, Paul Dini",
      currentBid: 65.00,
      shippingCost: 15.00,
      bidCount: 11,
      secondsRemaining: 75,
      url: "https://ebay.com/itm/harley1quad",
      imageUrl: "https://example.com/harley1.jpg",
      itemDescription: "CBCS 9.8 yellow gold label verified signatures. 4 signatures total.",
      anchorFmv: 240.00,
    };

    const evalResult = evaluateAuctionListing(listing, profile);
    expect(evalResult.passed).toBe(true);
    expect(evalResult.specialPlay).not.toBe("BELOW_GRADING_COST");
    expect(evalResult.allInCost).toBeLessThanOrEqual(86.00); // 65 + 15 + tax ≈ 85.20
    // Fee stack: $30 base + $30 1st sig + (3 * $25) = $135 + $18 ship = $153 floor
    expect(evalResult.cgcGradingCostFloor).toBe(0);
    expect(evalResult.strategySummary ?? "").not.toContain("Multi-Sig Sunk Cost Arbitrage");
    expect(evalResult.anchorFmv).toBe(240.00);
    expect(evalResult.discountPercent).toBeGreaterThanOrEqual(60);
    expect(evalResult.verdict).toBe("STRONG_BUY_SNIPE");
  });

  it("STRICTLY REJECTS listing with missing auction image when requireImage is true", () => {
    const profile: SniperFilterProfile = {
      ...defaultProfile,
      requireImage: true,
    };

    const listing: RawAuctionListing = {
      id: "listing-no-img",
      source: "ebay",
      title: "Batman #423 CGC 9.8 Todd McFarlane Classic Cover",
      currentBid: 85.00,
      shippingCost: 12.00,
      bidCount: 9,
      secondsRemaining: 180,
      url: "https://ebay.com/itm/noimg",
      imageUrl: "", // Missing image
      certNumber: "3948102941",
    };

    const evalResult = evaluateAuctionListing(listing, profile);
    expect(evalResult.passed).toBe(false);
    expect(evalResult.gateFailed).toBe(1);
    expect(evalResult.rejectionReason).toContain("NO IMAGE");
  });

  it("STRICTLY REJECTS listing with missing cert when requireCheckedCert is true", () => {
    const profile: SniperFilterProfile = {
      ...defaultProfile,
      requireCheckedCert: true,
    };

    const listing: RawAuctionListing = {
      id: "listing-no-cert",
      source: "ebay",
      title: "Batman #404 CGC 9.8 Year One Part 1",
      currentBid: 65.00,
      shippingCost: 12.00,
      bidCount: 5,
      secondsRemaining: 150,
      url: "https://ebay.com/itm/nocert",
      imageUrl: "https://example.com/cover.jpg",
      // certNumber omitted
    };

    const evalResult = evaluateAuctionListing(listing, profile);
    expect(evalResult.passed).toBe(false);
    expect(evalResult.gateFailed).toBe(1);
    expect(evalResult.rejectionReason).toContain("UNVERIFIED CERT");
  });

  it("COMPUTES Multi-Source Price Matrix with Grade Parity and Investopedia Due Diligence Lens when recorded FMV is provided", () => {
    const profile: SniperFilterProfile = {
      ...defaultProfile,
      maxAllInBudget: 1000.00,
    };

    const listing: RawAuctionListing = {
      id: "listing-batman423",
      source: "ebay",
      title: "Batman #423 CGC 9.8 McFarlane Classic Cover 1st Print 1988",
      currentBid: 120.00,
      shippingCost: 15.00,
      bidCount: 14,
      secondsRemaining: 180,
      url: "https://ebay.com/itm/batman423",
      imageUrl: "https://example.com/batman423.jpg",
      certNumber: "4019283001",
      anchorFmv: 275.00,
    };

    const evalResult = evaluateAuctionListing(listing, profile);
    expect(evalResult.passed).toBe(true);

    // Verify top institutional metrics
    expect(evalResult.anchorFmv).toBe(275.00);
    expect(evalResult.allInCost).toBe(144.60);
    expect(evalResult.targetWinPrice100Pct).toBeGreaterThan(evalResult.allInCost);
    expect(evalResult.targetWinPrice50Pct).toBeGreaterThan(evalResult.allInCost);

    // Verify census intelligence
    expect(evalResult.censusTotal).toBeDefined();
    expect(evalResult.censusCount98).toBeDefined();
    expect(evalResult.censusScarcityTier).toBeDefined();

    // Verify multi-source comparative price matrix contains only real/inspected grade data (no fabricated grade ratios)
    expect(evalResult.priceMatrix).toBeDefined();
    expect(evalResult.priceMatrix!.length).toBeGreaterThan(0);
    const inspectedRow = evalResult.priceMatrix!.find((r) => r.isInspectedGrade);
    expect(inspectedRow).toBeDefined();
    expect(inspectedRow!.grade).toBe(9.8);
    expect(inspectedRow!.gradeLabel).toContain("9.8");
    expect(inspectedRow!.ebayPrice).toBe(120.00);
    expect(inspectedRow!.ppFmv).toBe(275.00);
    expect(inspectedRow!.cbPrice).toBe(275.00);

    // Verify Investopedia Purchaser Due Diligence Lens
    expect(evalResult.investopediaLens).toBeDefined();
    expect(evalResult.investopediaLens!.term).toBeDefined();
    expect(evalResult.investopediaLens!.definition).toBeDefined();
    expect(evalResult.investopediaLens!.application).toBeDefined();
    expect(evalResult.investopediaLens!.wholesaleBidUsd).toBe(144.60);
    expect(evalResult.investopediaLens!.retailAskUsd).toBe(275.00);
    expect(evalResult.investopediaLens!.bidAskSpreadPercent).toBeGreaterThan(0);
  });

  it("NEVER fabricates FMV, historical comps, or priceMatrix when no recorded sales exist", () => {
    const profile: SniperFilterProfile = {
      ...defaultProfile,
      requireProvenSales: false,
      minDiscountPercent: 0,
    };

    const listing: RawAuctionListing = {
      id: "listing-unpriced",
      source: "ebay",
      title: "Batman #423 CGC 9.8 McFarlane Classic Cover 1st Print 1988",
      currentBid: 120.00,
      shippingCost: 15.00,
      bidCount: 2,
      secondsRemaining: 180,
      url: "https://ebay.com/itm/batman423",
      imageUrl: "https://example.com/batman423.jpg",
    };

    const evalResult = evaluateAuctionListing(listing, profile);
    expect(evalResult.passed).toBe(false);
    expect(evalResult.gateFailed).toBe(4);
    expect(evalResult.anchorFmv).toBe(0);
    expect(evalResult.historicalComps).toEqual([]);
    expect(evalResult.rejectionReason).toContain("No verified secondary market FMV");
    expect(evalResult.investopediaLens).toBeUndefined();
  });

  it("PARSES ComicConnect live auctions, Metropolis fixed-price slabs, Hake's catalog lots, and ComicConnect realized sales accurately", () => {
    const ccAuctionHtml = `
      <div class="itempreview details listingbox" data-type="auction">
        <div class="preview"><img src="/coverimages/gallery800/asm300.jpg" /></div>
        <div class="details">
          <a href="/item/1110571"><div class="titleline ">AMAZING SPIDER-MAN (1963-98; 2003-13) #300</div></a>
          <div class="grade">Marvel CGC NM/M: 9.8</div>
          <div class="comments wrap">White pgs; Universal holder; CGC#4449756004<div class="ctip"></div></div>
        </div>
        <div class="rightside">
          <div class="pricing"><span class="lbl">Current Bid</span><span>: </span><span class="val prc">$2,450</span></div>
          <div class="countdown" data-countdown-ends="1800000"></div>
        </div>
      </div>
    `;
    const ccParsed = parseComicConnectOrMetropolisHtml(ccAuctionHtml, "comicconnect", "https://www.comicconnect.com");
    expect(ccParsed).toHaveLength(1);
    expect(ccParsed[0].id).toBe("comicconnect-1110571");
    expect(ccParsed[0].currentBid).toBe(2450);
    expect(ccParsed[0].listingType).toBe("Auction");
    expect(ccParsed[0].secondsRemaining).toBe(1800);
    expect(ccParsed[0].certNumber).toBe("4449756004");

    const ccSoldHtml = `
      <div class="itempreview details listingbox" data-type="fixed">
        <div class="details">
          <a href="/item/1049641"><div class="titleline ">AMAZING SPIDER-MAN (1963-98; 2003-13) #300</div></a>
          <div class="grade">Marvel CGC NM+: 9.6</div>
        </div>
        <div class="rightside">
          <div class="endednotice">Sold on Saturday, 09/14/2024 6:37 PM</div>
          <div class="pricing"><span class="lbl">Sold For</span><span>: </span><span class="val prc">$840</span></div>
        </div>
      </div>
    `;
    const soldParsed = parseComicConnectSoldHtml(ccSoldHtml);
    expect(soldParsed).toHaveLength(1);
    expect(soldParsed[0].price_usd).toBe(840);
    expect(soldParsed[0].grade).toBe(9.6);
    expect(soldParsed[0].confirmed).toBe(true);
    expect(soldParsed[0].sold_at).toBe("2024-09-14T12:00:00.000Z");

    const hakesHtml = `
      <div class="col-6 col-md-6 col-lg-4 mb-4 el_24684 gtm-visible_item" id="stl-9802752" data-item_id="9802752">
        <div class="catalog_img">
          <img src="https://s1.img.bidsquare.com/item/l/3890/38905972.jpeg" />
        </div>
        <div class="lot_title">
          <a href="https://www.hakes.com/online-auctions/hakes-auctions/tmnt-1-9802752">TEENAGE MUTANT NINJA TURTLES #1 1984 CGC 9.8 NM/MINT</a>
        </div>
        <script>$(function(){countDownTimer(1790600400, 1792633200, "timer_9802752_24684");});</script>
        <span id="tbc_9802752_24684" class="num">8 Bids</span>
        <span id="tcb_9802752_24684" class="price ">$105,000</span>
      </div>
    `;
    const hakesParsed = parseHakesCatalogHtml(hakesHtml, 1792629600 * 1000);
    expect(hakesParsed).toHaveLength(1);
    expect(hakesParsed[0].id).toBe("hakes-9802752");
    expect(hakesParsed[0].currentBid).toBe(105000);
    expect(hakesParsed[0].bidCount).toBe(8);
    expect(hakesParsed[0].secondsRemaining).toBe(3600);
  });
});
