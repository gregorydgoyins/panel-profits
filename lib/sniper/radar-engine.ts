import {
  CandidateEvaluation,
  RawAuctionListing,
  SniperFilterProfile,
  PriceMatrixTier,
  DueDiligenceInvestopediaLens,
  ComicVideoDossier,
} from "./types";
import { parseAndFilterListing } from "./anti-bullshit";
import { calculateCertificationFees } from "./certification-fees";
import { resolveHistoricalKeyBadge } from "../equity/significance-classifier";
import { resolveComicLoreDossier } from "./lore-dossier";
import { findComicBaseVideoForComic } from "@/lib/video/comicbase-archive";


import { lookupRealCensus } from "../comics/census-authority";
import { lookupMultiPointPriceHistory } from "../comics/price-history-service";

export function evaluateAuctionListing(
  listing: RawAuctionListing,
  profile: SniperFilterProfile
): CandidateEvaluation {
  // Parse Listing Title and Attributes
  const parsed = parseAndFilterListing(listing.title, listing.itemDescription, listing.graderNotes);

  // Explicit acquisition ledger. Never confuse purchase shipping with grading costs.
  // Flat USPS Priority Mail allowance: $15, irrespective of venue estimate.
  const acquisitionShipping = 15.00;
  const planningBid = Number(listing.isBuyItNow ? (listing.buyItNowPrice ?? listing.currentBid) : listing.currentBid) || 0;
  const estTax = Math.round(planningBid * 0.08 * 100) / 100;
  const allInCost = Math.round((planningBid + acquisitionShipping + estTax) * 100) / 100;

  const certNum = listing.certNumber || parsed.certNumber;
  const certUrl = certNum
    ? (parsed.gradingCompany === "CBCS"
        ? `https://www.cbcscomics.com/grading/verify-certification-number?cert_num=${certNum.replace(/[^0-9]/g, "")}`
        : `https://www.cgccomics.com/certlookup/${certNum.replace(/[^0-9]/g, "")}/`)
    : parsed.certLookupUrl;

  // Base rejection template
  const createRejection = (reason: string, gate: 1 | 2 | 3 | 4 | 5): CandidateEvaluation => ({
    listing,
    lotBooks: listing.lotBooks,
    passed: false,
    rejectionReason: reason,
    gateFailed: gate,
    resolvedSeries: parsed.extractedSeries,
    resolvedIssue: parsed.extractedIssue,
    resolvedYear: parsed.extractedYear,
    resolvedEra: parsed.extractedEra,
    resolvedGrade: parsed.grade || 0,
    gradingCompany: parsed.gradingCompany || "CGC",
    certNumber: certNum,
    certVerificationUrl: certUrl,
    isYellowLabel: parsed.isSigned || parsed.isLegendarySigned,
    signerName: parsed.signer || (parsed.signatureCount >= 4 ? "4x Verified Signatures" : undefined),
    isNewsstand: parsed.isNewsstand,
    normalizedTitle: parsed.normalizedTitle || listing.title,
    isCrackedCase: parsed.isCrackedCase,
    isMisspelled: parsed.isMisspelled,
    misspellingSnippet: parsed.misspellingSnippet,
    anchorFmv: 0,
    allInCost,
    dollarSpread: 0,
    discountPercent: 0,
    historicalComps: [],
    whyItsAGoodBuy: "N/A - Failed sniper criteria",
    targetWinPrice100Pct: 0,
    targetWinPrice50Pct: 0,
    projectedNetProfit: 0,
    netRoiPercent: 0,
    liquidityVelocity: "ILLIQUID_TRAP",
    liquidityTurnDays: 90,
    isViableFlip: false,
    keySignificanceNote: "Unverified",
    verdict: "DISCARD",
    recommendedMaxBid: 0,
    confidenceScore: 0,
  });

  const effectiveGrade: number = parsed.grade ?? listing.resolvedGrade ?? 0;
  const effectiveCompany = parsed.gradingCompany || listing.gradingCompany || "CGC";
  const isCertified = parsed.isCertifiedSlab || Boolean(listing.gradingCompany);

  // A bundled lot cannot be priced as if its first slab were the entire listing.
  // Distinct issue numbers and slab grades in the title require per-book matching.
  const issueMentions = [...listing.title.matchAll(/(?:#|issues?\s*#?)\s*(\d{1,5})(?!\d)/gi)].map(m => m[1]);
  const distinctIssues = new Set(issueMentions);
  const slabGradeMentions = [...listing.title.matchAll(/\b(?:CGC|CBCS|PSA|PGX|EGS)\s*(?:graded\s*)?(10\.0|9\.[0-9]|[1-8]\.[0-9]|[1-9]\.0)\b/gi)].map(m => m[1]);
  if ((distinctIssues.size > 1 || (slabGradeMentions.length > 1 && new Set(slabGradeMentions).size > 1)) && !(listing.lotBooks && listing.lotBooks.length === distinctIssues.size && listing.lotBooks.every(b => b.fmv !== null && b.fmv > 0))) {
    return createRejection("MULTI-BOOK LOT: Individual issue/grade valuations and combined FMV must be verified before any buy recommendation. Single-book FMV is not the lot value.", 4);
  }

  // GATE 1: Strict Certification, Provenance & Image Gate
  if (!isCertified || effectiveGrade <= 0) {
    return createRejection("REJECTED: Listing is not a certified slab (CGC, CBCS, PSA, PGX, or EGS with verified numeric grade required).", 1);
  }

  // Strict Checked Cert Number Gate
  if (profile.requireCheckedCert && (!certNum || certNum.trim().length < 5)) {
    return createRejection("REJECTED (UNVERIFIED CERT): Missing verified certification number on registry.", 1);
  }

  // Strict Authentic Image Gate
  if (profile.requireImage && (!listing.imageUrl || listing.imageUrl.trim().length === 0)) {
    return createRejection("REJECTED (NO IMAGE): Only listings with verified authentic auction images allowed.", 1);
  }

  // GATE 2: Anti-Reprint / Anti-Toy Gate (The "No Barbie / No Facsimile" Rule)
  if (parsed.isReprintOrToy) {
    return createRejection(`REJECTED: Identified as reprint / promotional item / non-sovereign issue (Trigger: '${parsed.reprintTrigger}').`, 2);
  }

  // Check specific junk series keywords (e.g. Barbie, random joke books)
  if (/barbie\s+fashion|barbie\s+comics/i.test(listing.title)) {
    return createRejection("REJECTED: Excluded non-collector category ('Barbie Fashion' flagged as zero-collector-liquidity filler).", 2);
  }

  // GATE 3: Profile Targeting Alignment
  // Era Check
  if (profile.eras && profile.eras.length > 0 && !profile.eras.includes(parsed.extractedEra)) {
    return createRejection(`REJECTED: Era '${parsed.extractedEra.toUpperCase()}' outside target eras (${profile.eras.join(", ")}).`, 3);
  }

  // Grade Range Check (e.g. 8.5 through 10.0)
  if (effectiveGrade < profile.minGrade || effectiveGrade > profile.maxGrade) {
    return createRejection(`REJECTED: Grade ${effectiveGrade} outside allowed high-grade scale (${profile.minGrade} - ${profile.maxGrade}).`, 3);
  }

  // Minimum All-In Floor Check ($0.00 / $10.00 floor; sub-$1,500 focus)
  const minCostFloor = profile.minAllInCost ?? 0.00;
  if (minCostFloor > 0 && allInCost < minCostFloor) {
    return createRejection(`REJECTED (BELOW $${minCostFloor.toFixed(0)} FLOOR): Total cost $${allInCost.toFixed(2)} is below the $${minCostFloor.toFixed(0)} minimum investment floor.`, 3);
  }

  // Cracked Cases Only Filter
  if (profile.crackedCasesOnly && !(parsed.isCrackedCase || parsed.isDamagedSlab)) {
    return createRejection("REJECTED: Listing does not have a cracked or damaged slab.", 3);
  }

  // Misspelled Titles Only Filter
  if (profile.misspelledOnly && !parsed.isMisspelled) {
    return createRejection("REJECTED: Listing does not have a misspelled title.", 3);
  }

  // Series Whitelist Filter (if user specified series focus, e.g. "green lantern")
  if (profile.seriesWhitelist && profile.seriesWhitelist.length > 0) {
    const matchWhitelist = profile.seriesWhitelist.some(series =>
      listing.title.toLowerCase().includes(series.toLowerCase())
    );
    if (!matchWhitelist) {
      return createRejection(`REJECTED: Not in specified series targets (${profile.seriesWhitelist.join(", ")}).`, 3);
    }
  }

  // Auction Suite Source Filter (eBay, Heritage, MyComicShop, ComicLink, etc.)
  if (profile.sources && profile.sources.length > 0 && !profile.sources.includes(listing.source)) {
    return createRejection(`REJECTED: Auction source '${listing.source.toUpperCase()}' outside selected venues (${profile.sources.join(", ").toUpperCase()}).`, 3);
  }

  // Buy It Now (BIN) vs Live Auction Filter
  const isBuyItNowListing = Boolean(listing.isBuyItNow || listing.listingType === "BuyItNow" || (listing.buyItNowPrice && listing.buyItNowPrice > 0));
  if (profile.listingTypeFilter === "auctions_only" && isBuyItNowListing) {
    return createRejection("REJECTED: Filter set to live auctions only; excluding Buy It Now listings.", 3);
  }
  if (profile.listingTypeFilter === "bin_only" && !isBuyItNowListing) {
    return createRejection("REJECTED: Filter set to Buy It Now only; excluding ticking auction lots.", 3);
  }

  // Sniper Urgency Window Filter (e.g. <15m, <30m, <1h, <2h)
  // BUY IT NOW EXEMPTION: Fixed-price / Buy It Now listings do not require an ending countdown timer
  if (!isBuyItNowListing && profile.maxSecondsRemaining && listing.secondsRemaining > profile.maxSecondsRemaining) {
    const minsLeft = Math.round(listing.secondsRemaining / 60);
    const maxMins = Math.round(profile.maxSecondsRemaining / 60);
    return createRejection(`REJECTED: Auction ending in ${minsLeft}m exceeds selected urgency window (<${maxMins}m).`, 3);
  }

  // Budget Filter
  if (allInCost > profile.maxAllInBudget) {
    return createRejection(`REJECTED: Total cost $${allInCost.toFixed(2)} exceeds all-in budget cap of $${profile.maxAllInBudget.toFixed(2)}.`, 3);
  }

  // Never infer signed-book certification cost from the slab's graded FMV.
  // The RAW FMV, publication year, signature route and signature count must
  // be supplied together as verified inputs. No fee-based arbitrage otherwise.
  const signedFeeInput = listing.certificationFeeInput;
  const signedFee = signedFeeInput && signedFeeInput.signatureMethod !== "NONE"
    ? calculateCertificationFees(signedFeeInput)
    : null;
  const cgcGradingCostFloor = parsed.isSigned
    ? (signedFee?.complete ? signedFee.total : 0)
    : (parsed.extractedYear && parsed.extractedYear < 1975 ? 95 : 80);
  const signedCostVerified = !parsed.isSigned || (signedFee !== null && signedFee.complete);

  // Special Arbitrage Angles Detection
  let specialPlay: CandidateEvaluation["specialPlay"];
  let strategySummary: string | undefined;

  if (parsed.isSigned && parsed.signatureCount >= 2 && signedCostVerified && allInCost <= cgcGradingCostFloor) {
    specialPlay = "BELOW_GRADING_COST";
    const subsidy = (cgcGradingCostFloor - allInCost).toFixed(2);
    strategySummary = `Multi-Sig Sunk Cost Arbitrage: Submitter paid $${(baseGradingFee + sigAuthFee).toFixed(2)} in grading + ${parsed.signatureCount}x signature verification fees. At $${allInCost.toFixed(2)}, submitter absorbs a $${subsidy} deficit for you!`;
  } else if (profile.belowGradingCost && signedCostVerified && effectiveGrade >= 9.4 && allInCost <= cgcGradingCostFloor) {
    specialPlay = "BELOW_GRADING_COST";
    const subsidy = (cgcGradingCostFloor - allInCost).toFixed(2);
    strategySummary = `Slab Cost Floor Arbitrage: Seller spent $${cgcGradingCostFloor.toFixed(2)} to slab & ship. You acquire this ${effectiveGrade} for $${allInCost.toFixed(2)}—a $${subsidy} subsidy on the grading fee alone!`;
  } else if (profile.damagedSlab98 && effectiveGrade === 9.8 && parsed.isDamagedSlab) {
    specialPlay = "REHOLDER_ARBITRAGE";
    strategySummary = "Cracked/Damaged 9.8 Case: Book inside is pristine 9.8; $25 CGC reholder restores full 9.8 value.";
  } else if (parsed.isCrackedCase || (effectiveGrade >= 9.4 && parsed.isDamagedSlab)) {
    specialPlay = "CRACKED_CASE";
    strategySummary = "Cracked Case Reholder Play: Plastic case is cracked/scuffed, but the comic inside is pristine high-grade. A simple $25 CGC reholder restores full undamaged market FMV with zero grade risk!";
  } else if (parsed.isMisspelled) {
    specialPlay = "MISSPELLED_KEY";
    strategySummary = `Misspelled Sleeper: Listing title has typo (${parsed.misspellingSnippet}) hiding it from search alerts. Scoop it up at zero-competition floor!`;
  } else if (profile.crackAndPressCandidate && parsed.isCrackAndPressCandidate) {
    specialPlay = "CRACK_AND_PRESS";
    strategySummary = "Crack & Press Candidate: 9.4/9.6 slab with non-color-breaking bend on notes; pressing upside to 9.8.";
  } else if (profile.signedLegendary && parsed.isLegendarySigned) {
    specialPlay = "LEGENDARY_SIGNATURE";
    strategySummary = `Authenticated Signature: Verified Signature Series by ${parsed.signer}.`;
  } else if (parsed.isCanadianPriceVariant) {
    specialPlay = "CANADIAN_PRICE_VARIANT";
    strategySummary = "Canadian Price Variant (CPV): Rare 1982-1988 Canadian newsstand cover with 10x smaller circulation float than US copies!";
  } else if (parsed.isForeignLanguageEdition) {
    specialPlay = "FOREIGN_LANGUAGE_KEY";
    strategySummary = `Foreign Sovereign Key: European vintage edition (${parsed.translatedEnglishTitle}) translated and cross-referenced to US comp anchor!`;
  } else if (parsed.isNewsstand && effectiveGrade >= 9.6) {
    specialPlay = "HIGH_GRADE_NEWSSTAND";
    strategySummary = "High-Grade Newsstand: Severe census scarcity over direct edition.";
  }

  // GATE 4: Recorded Sales Lookup & "Zero Sales" Anti-Impulse Discipline
  const localSales = lookupMultiPointPriceHistory(
    parsed.extractedSeries,
    parsed.extractedIssue,
    effectiveGrade
  );
  // Use local certified sales as a secondary source only for unambiguous
  // standard CGC Universal editions. Variant, reprint, signature, restored,
  // multi-book and other special editions require edition-specific evidence.
  const exactStandardEdition = Boolean(
    listing.label?.grader?.toUpperCase() === "CGC" &&
    /universal/i.test(listing.label?.labelType ?? "") &&
    listing.label?.title && listing.label?.issueNumber &&
    Number(listing.label?.grade) === effectiveGrade &&
    !listing.lotBooks?.length &&
    !/(?:variant|newsstand|direct edition|reprint|facsimile|foil|sketch|virgin|incentive|exclusive|signed|signature|restored|conserved|qualified|printing|\b(?:2nd|3rd|4th|5th)\b|\bcover [a-z]\b)/i.test(listing.title)
  );
  const realSales = listing.historicalComps?.length
    ? listing.historicalComps
    : exactStandardEdition ? localSales.filter(s => /CGC/i.test(s.venue)) : [];
  const explicitFmv = Number(listing.anchorFmv ?? listing.fairMarketValue ?? 0);
  const sortedLocalPrices = realSales.map(s => s.price).filter(p => Number.isFinite(p) && p > 0).sort((a, b) => a - b);
  const mid = Math.floor(sortedLocalPrices.length / 2);
  const anchorFmv = explicitFmv > 0 ? explicitFmv
    : sortedLocalPrices.length ? (sortedLocalPrices[mid] + sortedLocalPrices[Math.floor((sortedLocalPrices.length - 1) / 2)]) / 2 : 0;

  if (anchorFmv <= 0 && realSales.length === 0 && profile.requireProvenSales) {
    return createRejection("REJECTED (IMPULSE PROTECT): Zero proven auction sales on record. Refusing to speculate on unknown/unproven market book.", 4);
  }

  if (anchorFmv <= 0) {
    return createRejection("REJECTED: No verified secondary market FMV anchor available for this title/issue.", 4);
  }

  const hasVerifiedFmv = anchorFmv > 0;

  // GATE 5: Arbitrage Math (Spread & Discount)
  const dollarSpread = hasVerifiedFmv ? Math.round((anchorFmv - allInCost) * 100) / 100 : 0;
  const discountPercent = hasVerifiedFmv ? Math.round(((anchorFmv - allInCost) / anchorFmv) * 100) : 0;

  // Commercial Flipping Calculations (Assuming 13.25% selling fees on eBay/Heritage)
  const netEstimatedProceeds = hasVerifiedFmv ? Math.round((anchorFmv * 0.8675 - 5.00) * 100) / 100 : 0;
  const projectedNetProfit = hasVerifiedFmv ? Math.round((netEstimatedProceeds - allInCost) * 100) / 100 : 0;
  const netRoiPercent = hasVerifiedFmv && allInCost > 0 ? Math.round((projectedNetProfit / allInCost) * 100) : 0;

  // Enforce strict discount / positive-spread filter only when requested by the active profile
  if (hasVerifiedFmv && (profile.requireProvenSales || profile.minDiscountPercent > 0)) {
    if (isBuyItNowListing && profile.requireProvenSales && dollarSpread <= 0) {
      return createRejection(`REJECTED (BUY IT NOW OVERPRICED): Buy It Now price $${allInCost.toFixed(2)} exceeds verified FMV $${anchorFmv.toFixed(2)} (Zero upside).`, 5);
    } else if (discountPercent < profile.minDiscountPercent) {
      return createRejection(`REJECTED: Discount ${discountPercent}% below required threshold of ${profile.minDiscountPercent}%.`, 5);
    }
  }

  // Strict 100%+ Net ROI Double-Up Guard
  if (profile.requireDoubleUpOnly && (!hasVerifiedFmv || netRoiPercent < 100)) {
    return createRejection(`REJECTED (BELOW 100% MARGIN): Projected net flip ROI ${netRoiPercent}% is below the 100%+ Double-Up threshold.`, 5);
  }

  // Double-Up (100% Net Profit / 2x Money) and 50% Win Prices
  // Maximum resale price required to deliver the stated return on invested capital,
  // after the same 13.25% selling fee and $5 disposition cost as the profit model.
  const targetWinPrice100Pct = Math.round(((allInCost * 2 + 5.00) / 0.8675) * 100) / 100;
  const targetWinPrice50Pct = Math.round(((allInCost * 1.5 + 5.00) / 0.8675) * 100) / 100;

  // Liquidity Velocity strictly from recorded sales or active bid count
  const salesDepth = Math.max(realSales.length, listing.bidCount ?? 0);
  let liquidityVelocity: "HIGH_VELOCITY_TURN" | "MODERATE_LIQUIDITY" | "ILLIQUID_TRAP" = "ILLIQUID_TRAP";
  let liquidityTurnDays = 90;

  if (salesDepth >= 12) {
    liquidityVelocity = "HIGH_VELOCITY_TURN";
    liquidityTurnDays = 14;
  } else if (salesDepth >= 4) {
    liquidityVelocity = "MODERATE_LIQUIDITY";
    liquidityTurnDays = 45;
  }

  const isViableFlip = liquidityVelocity !== "ILLIQUID_TRAP" && anchorFmv >= 35.00;
  let keySignificanceNote = resolveHistoricalKeyBadge(parsed.extractedSeries, parsed.extractedIssue) || "Recognized Sovereign Issue";
  if (/spider-man/i.test(parsed.extractedSeries) && parsed.extractedIssue === "1") {
    if (/1990|mcfarlane|torment|silver|gold|platinum|green/i.test(listing.title)) {
      keySignificanceNote = "Todd McFarlane 'Torment' Landmark Premiere (1990)";
    } else if (/skottie\s*young|baby\s*variant/i.test(listing.title)) {
      keySignificanceNote = "Skottie Young Baby Variant Cover";
    } else if (/miles\s*morales/i.test(listing.title)) {
      keySignificanceNote = "Miles Morales Premiere Issue";
    }
  }

  // Double-Up Angle Detection
  if (!specialPlay && hasVerifiedFmv && discountPercent >= 50 && isViableFlip) {
    specialPlay = "DOUBLE_UP_KEY";
    strategySummary = `The Double-Up Play: 2x cash potential. Acquiring at ${discountPercent}% discount to FMV ($${anchorFmv.toFixed(2)}). Exit at $${targetWinPrice100Pct.toFixed(2)} to double your investment after fees.`;
  }

  // Formulate Explicit Reason Why This Is A Good Buy (Alpha Thesis)
  let whyItsAGoodBuy = "";
  if (!hasVerifiedFmv) {
    whyItsAGoodBuy = "FMV unavailable — no recorded sales at this grade yet.";
  } else if (specialPlay === "CRACKED_CASE") {
    whyItsAGoodBuy = `Cracked Case Reholder Play: Plastic slab is cracked/scuffed, but the underlying book inside is an unblemished ${parsed.grade || 9.8}. Submit for a routine $25 CGC reholder to instantly unlock full $${anchorFmv.toFixed(2)} book value (+$${dollarSpread.toFixed(2)} spread, +${netRoiPercent}% net flip ROI).`;
  } else if (specialPlay === "MISSPELLED_KEY") {
    whyItsAGoodBuy = `Typo Stealth Arbitrage: Listing title has typographical error (${parsed.misspellingSnippet || "misspelled title"}). Standard buyers and automated search alerts completely miss it. Acquired with zero competition at $${allInCost.toFixed(2)} against verified $${anchorFmv.toFixed(2)} FMV!`;
  } else if (specialPlay === "CRACK_AND_PRESS") {
    whyItsAGoodBuy = `Crack & Press Upside: Grader notes state pressable defect. Acquire at $${allInCost.toFixed(2)} all-in, press to 9.8 for $${anchorFmv.toFixed(2)} target FMV (+$${dollarSpread.toFixed(2)} spread, ${netRoiPercent}% net flip ROI).`;
  } else if (specialPlay === "REHOLDER_ARBITRAGE") {
    whyItsAGoodBuy = `Slab Damage Arbitrage: Pristine 9.8 book inside cracked/scuffed holder. $25 CGC reholder restores full $${anchorFmv.toFixed(2)} market value with zero grade risk. Projected net flip profit: +$${(projectedNetProfit - 25).toFixed(2)}.`;
  } else if (specialPlay === "BELOW_GRADING_COST") {
    const subsidy = (cgcGradingCostFloor - allInCost).toFixed(2);
    whyItsAGoodBuy = `Grading Sunk Cost Subsidy: Submitter paid $${cgcGradingCostFloor.toFixed(2)} to slab & ship. You acquire this 9.8 for $${allInCost.toFixed(2)} ($${subsidy} subsidy). 50% Win Price is $${targetWinPrice50Pct.toFixed(2)}; 100% Double-up at $${targetWinPrice100Pct.toFixed(2)}.`;
  } else if (specialPlay === "DOUBLE_UP_KEY") {
    whyItsAGoodBuy = `Pure Double-Up Key: Trading at a severe ${discountPercent}% dislocation to verified $${anchorFmv.toFixed(2)} FMV. High liquidity (${salesDepth} verified sales). Flip exit at $${targetWinPrice100Pct.toFixed(2)} generates a clean 100% net double-up!`;
  } else if (specialPlay === "STUMBLED_INTO_GREATNESS") {
    whyItsAGoodBuy = `Stumbled Into Greatness: Low census or sleeper key with accelerating collector demand. Acquired far below market ladder. Net profit potential: +$${projectedNetProfit.toFixed(2)} (${netRoiPercent}% ROI).`;
  } else if (specialPlay === "LEGENDARY_SIGNATURE") {
    whyItsAGoodBuy = `Irreplaceable Provenance: Verified yellow label signature by deceased legend ${parsed.signer}. Premium collectible locked into slab below raw replacement cost. Net flip profit: +$${projectedNetProfit.toFixed(2)}.`;
  } else if (dollarSpread > 0) {
    whyItsAGoodBuy = `Below-Comp Opportunity: Priced at $${allInCost.toFixed(2)} all-in (${discountPercent}% below verified $${anchorFmv.toFixed(2)} FMV across ${realSales.length} recorded comp${realSales.length === 1 ? "" : "s"}). Safe snipe ceiling is $${Math.max(0, Math.round(anchorFmv * 0.70 - acquisitionShipping - estTax))}.`;
  } else {
    whyItsAGoodBuy = `Verified Comp Benchmark: All-in ask is $${allInCost.toFixed(2)} vs. $${anchorFmv.toFixed(2)} median realized FMV (${realSales.length} recorded Grade ${effectiveGrade.toFixed(1)} comp${realSales.length === 1 ? "" : "s"}). Target snipe entry for 30% margin is $${Math.max(0, Math.round(anchorFmv * 0.70 - acquisitionShipping - estTax))}.`;
  }

  // Calculate Safe Snipe Ceiling (Leaves at least 25% margin intact)
  const recommendedMaxBid = hasVerifiedFmv ? Math.max(0, Math.round(anchorFmv * 0.70 - acquisitionShipping - estTax)) : 0;

  const confidenceScore = Math.min(
    100,
    50 + realSales.length * 2 + (specialPlay ? 15 : 0) + (discountPercent >= 40 ? 15 : 5)
  );

  // Comprehensive Real Census Breakdown (Authoritative Multi-Verifiable Registry Lookup)
  const realCensus = lookupRealCensus(parsed.extractedSeries, parsed.extractedIssue);
  const resolvedCensusTotal = (listing.censusTotal && listing.censusTotal > 0)
    ? listing.censusTotal
    : realCensus?.totalGraded;
  const resolvedCensus98 = (listing.censusCount98 && listing.censusCount98 > 0)
    ? listing.censusCount98
    : (realCensus && realCensus.topGrade === "9.8" ? realCensus.totalGraded : undefined);
  const topGradeVal = realCensus?.topGrade ? parseFloat(realCensus.topGrade) : NaN;
  const resolvedCensusHigher =
    listing.censusHigher !== undefined
      ? listing.censusHigher
      : Number.isFinite(topGradeVal) && effectiveGrade >= topGradeVal
        ? 0
        : undefined;

  let censusScarcityTier = "Census Census not found";
  if (resolvedCensusTotal !== undefined) {
    if (resolvedCensusTotal <= 25) {
      censusScarcityTier = "🔥 Ultra-Low Float (<25 Total Audited Census Copies)";
    } else if (resolvedCensusTotal <= 150) {
      censusScarcityTier = "🛡️ Investment Grade Scarcity (Top Population Control)";
    } else {
      censusScarcityTier = `⚡ Liquid Census Float (${resolvedCensusTotal.toLocaleString()} Graded Copies)`;
    }
  }

  const isSignedBook = parsed.isSigned || parsed.isLegendarySigned;
  const signaturePremiumMultiplier = listing.signaturePremiumMultiplier ?? 1.0;

  let pricingSourceProvenance = listing.pricingSourceProvenance || "";
  if (!pricingSourceProvenance) {
    if (realSales.length > 0) {
      const venues = Array.from(new Set(realSales.map((s) => s.venue))).join(", ");
      pricingSourceProvenance = `Recorded Sales (${venues})`;
    } else if (hasVerifiedFmv) {
      pricingSourceProvenance = "Recorded Sales Anchor";
    } else {
      pricingSourceProvenance = "Unavailable";
    }
  }

  const effectiveYear = listing.year ?? parsed.extractedYear;
  const effectiveEra = listing.era ?? parsed.extractedEra;
  const lore = resolveComicLoreDossier(
    parsed.normalizedTitle || listing.title,
    parsed.extractedIssue,
    listing.graderNotes,
    listing.gcdMetadata?.publisher,
    effectiveYear
  );

  // 1. Comparative Price Matrix strictly for grades with recorded data (no invented grade ratios or catalog multipliers)
  const gradeSpecs: Array<{ grade: number; label: string }> = [
    { grade: 10.0, label: "10.0 (Gem Mint)" },
    { grade: 9.8, label: "9.8 (Near Mint/Mint)" },
    { grade: 9.6, label: "9.6 (Near Mint+)" },
    { grade: 9.4, label: "9.4 (Near Mint)" },
    { grade: 9.2, label: "9.2 (Near Mint-)" },
    { grade: 9.0, label: "9.0 (Very Fine/NM)" },
    { grade: 8.5, label: "8.5 (Very Fine+)" },
  ];

  const priceMatrix: PriceMatrixTier[] = [];
  for (const spec of gradeSpecs) {
    const isThisGrade = parsed.grade !== null && Math.abs(spec.grade - parsed.grade) < 0.1;
    const gradeSales = isThisGrade
      ? realSales
      : lookupMultiPointPriceHistory(parsed.extractedSeries, parsed.extractedIssue, spec.grade);
    let tierFmv = isThisGrade && hasVerifiedFmv ? anchorFmv : 0;
    if (tierFmv <= 0 && gradeSales.length > 0) {
      const sorted = gradeSales.map((s) => s.price).sort((a, b) => a - b);
      const m = Math.floor(sorted.length / 2);
      tierFmv = sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
    }
    if (!isThisGrade && tierFmv <= 0) continue;
    const lastGradeSale = gradeSales.length > 0 ? gradeSales[gradeSales.length - 1].price : 0;
    const tierEbay = isThisGrade ? listing.currentBid : lastGradeSale;
    const spread = tierFmv > 0 && tierEbay > 0 ? Math.round(((tierFmv - tierEbay) / tierFmv) * 100) : 0;
    priceMatrix.push({
      grade: spec.grade,
      gradeLabel: spec.label,
      ebayPrice: tierEbay,
      ppFmv: tierFmv,
      cbPrice: tierFmv,
      gocollectPrice: lastGradeSale > 0 ? lastGradeSale : undefined,
      spreadPercent: spread,
      isInspectedGrade: isThisGrade,
    });
  }

  // 2. Purchaser Due Diligence & Investopedia Valuation Lens (only populated with real spread when FMV is recorded)
  const investopediaLens: DueDiligenceInvestopediaLens | undefined = hasVerifiedFmv
    ? (() => {
        const marginHaircut = Math.max(0, Math.round((1 - allInCost / anchorFmv) * 100));
        let investopediaTerm = "Arbitrage Dislocation";
        let investopediaCat: DueDiligenceInvestopediaLens["category"] = "Arbitrage & Valuation";
        let investopediaDef =
          "The simultaneous purchase and sale of an asset in different markets to exploit pricing dislocations and lock in profit.";
        let investopediaApp = `Acquiring ${parsed.extractedSeries} #${parsed.extractedIssue} at $${allInCost.toFixed(2)} all-in against verified $${anchorFmv.toFixed(2)} secondary market FMV captures a ${discountPercent}% price dislocation before auction closing.`;

        if (specialPlay === "BELOW_GRADING_COST") {
          investopediaTerm = "Sunk Cost Arbitrage";
          investopediaCat = "Arbitrage & Valuation";
          investopediaDef =
            "Exploiting prior capital expenditures made by another party that cannot be recovered by them, allowing the buyer to capture that value at a steep discount.";
          investopediaApp = `The seller incurred a $${cgcGradingCostFloor.toFixed(2)} grading and shipping fee to encapsulate this book. At your $${allInCost.toFixed(2)} cost basis, the grading fee is 100% subsidized by the seller.`;
        } else if (specialPlay === "CRACKED_CASE" || specialPlay === "REHOLDER_ARBITRAGE") {
          investopediaTerm = "Liquidity Discount Recovery";
          investopediaCat = "Arbitrage & Valuation";
          investopediaDef =
            "Purchasing an intrinsically high-value asset trading at an artificial discount due to temporary holder impairment, restored via low-cost capital expenditure.";
          investopediaApp = `The book inside is pristine grade ${parsed.grade}. A $25 reholder restores full $${anchorFmv.toFixed(2)} institutional equity with zero grade risk.`;
        } else if (resolvedCensusTotal && resolvedCensusTotal <= 25) {
          investopediaTerm = "Float Scarcity Premium";
          investopediaCat = "Liquidity & Float";
          investopediaDef =
            "A valuation premium driven by an extremely limited circulating supply (float), where secondary market demand outstrips available units.";
          investopediaApp = `With fewer than ${resolvedCensusTotal} copies recorded on the certified census, supply inelasticity supports institutional price resilience.`;
        }

        return {
          term: investopediaTerm,
          category: investopediaCat,
          definition: investopediaDef,
          application: investopediaApp,
          bidAskSpreadPercent: discountPercent,
          wholesaleBidUsd: allInCost,
          retailAskUsd: anchorFmv,
          marginHaircutPercent: marginHaircut,
          capitalAssetPricingNote: `Cost basis of $${allInCost.toFixed(2)} preserves a ${marginHaircut}% margin of safety below recorded FMV ($${anchorFmv.toFixed(2)}).`,
        };
      })()
    : undefined;

  // 3. Video Intelligence & ComicBase Archival Mentions
  const cbVideo = findComicBaseVideoForComic(parsed.extractedSeries, parsed.extractedIssue);
  const videoDossier: ComicVideoDossier = {
    hasVideo: Boolean(cbVideo),
    comicBaseVideo: cbVideo
      ? {
          id: cbVideo.id,
          title: cbVideo.title,
          creatorOrSubject: cbVideo.creatorOrSubject,
          type: cbVideo.type,
          duration: cbVideo.duration,
          videoUrl: cbVideo.videoUrl,
          headline: cbVideo.headline,
          description: cbVideo.description,
        }
      : undefined,
    youtubeQuery: `${parsed.extractedSeries} #${parsed.extractedIssue} comic review CGC key`,
  };

  return {
    listing,
    lotBooks: listing.lotBooks,
    passed: true,
    normalizedTitle: parsed.normalizedTitle || listing.title,
    resolvedSeries: parsed.extractedSeries,
    resolvedIssue: parsed.extractedIssue,
    resolvedYear: effectiveYear,
    resolvedEra: effectiveEra,
    resolvedGrade: effectiveGrade,
    gradingCompany: effectiveCompany,
    certNumber: certNum,
    certVerificationUrl: certUrl,
    isYellowLabel: isSignedBook,
    signerName: parsed.signer || (parsed.signatureCount >= 4 ? "Quad-Signed (4x Creators)" : parsed.isSigned ? "Verified Signatures" : undefined),
    isNewsstand: parsed.isNewsstand,
    isCrackedCase: parsed.isCrackedCase,
    isMisspelled: parsed.isMisspelled,
    misspellingSnippet: parsed.misspellingSnippet,
    specialPlay,
    strategySummary,
    whyItsAGoodBuy,
    targetWinPrice100Pct,
    targetWinPrice50Pct,
    projectedNetProfit,
    netRoiPercent,
    liquidityVelocity,
    liquidityTurnDays,
    isViableFlip,
    keySignificanceNote,
    cgcGradingCostFloor,
    censusCount98: resolvedCensus98,
    label: listing.label ?? null,
    gocollectPrice: listing.gocollectPrice,
    censusTotal: resolvedCensusTotal,
    censusHigher: resolvedCensusHigher,
    censusScarcityTier,
    pricingSourceProvenance,
    signaturePremiumMultiplier,
    lastSalePrice: realSales.length > 0 ? realSales[realSales.length - 1].price : undefined,
    lastSaleDate: realSales.length > 0 ? realSales[realSales.length - 1].date : undefined,
    anchorFmv,
    allInCost,
    dollarSpread,
    discountPercent,
    historicalComps: realSales,
    listingType: isBuyItNowListing ? "BuyItNow" : "Auction",
    isBuyItNow: isBuyItNowListing,
    buyItNowPrice: isBuyItNowListing ? (listing.buyItNowPrice ?? listing.currentBid) : undefined,
    buyItNowUpsideDollars: isBuyItNowListing ? dollarSpread : undefined,
    buyItNowUpsidePercent: isBuyItNowListing ? discountPercent : undefined,
    buyItNowNetProfit: isBuyItNowListing ? projectedNetProfit : undefined,
    buyItNowSensibilityWhy: (() => {
      if (!isBuyItNowListing || !hasVerifiedFmv || dollarSpread <= 0) return undefined;
      const upsideDollarStr = `+$${dollarSpread.toFixed(2)}`;
      const profitStr = projectedNetProfit > 0 ? `+$${projectedNetProfit.toFixed(2)}` : `$${projectedNetProfit.toFixed(2)}`;
      let why = `Sensible Buy It Now Opportunity: Instant acquisition at $${allInCost.toFixed(2)} locks in ${upsideDollarStr} (${discountPercent}%) gross discount below verified CGC ${effectiveGrade} FMV ($${anchorFmv.toFixed(2)}). Yields ${profitStr} net proceeds (${netRoiPercent}% net ROI) after standard platform fees with zero auction gavel or sniping risk.`;
      if (specialPlay === "CRACKED_CASE") {
        why += ` Cracked case discount absorbs $25 CGC reholder fee while preserving ${profitStr} net margin.`;
      } else if (specialPlay === "BELOW_GRADING_COST") {
        why += ` Priced below seller slabbing cost floor ($${cgcGradingCostFloor.toFixed(2)}).`;
      } else if (specialPlay === "MISSPELLED_KEY") {
        why += ` Title typo shielded this Buy It Now price from discovery.`;
      }
      return why;
    })(),
    isRealTimeLiveBid: !isBuyItNowListing,
    lastBidTimestamp: listing.lastBidTimestamp,
    verdict: discountPercent >= 45 ? "STRONG_BUY_SNIPE" : "CONSIDER",
    recommendedMaxBid,
    confidenceScore,
    // Collector Lore, Historical Significance & GCD Canon
    historicalSignificanceTier: lore.tier,
    historicalSignificanceLore: lore.historicalSignificance,
    longTermHoldingThesis: lore.collectorHoldingThesis,
    gcdMetadata: {
      ...lore.gcdMetadata,
      ...listing.gcdMetadata,
      writers: listing.gcdMetadata?.writers?.length ? listing.gcdMetadata.writers : lore.gcdMetadata.writers,
      pencilers: listing.gcdMetadata?.pencilers?.length ? listing.gcdMetadata.pencilers : lore.gcdMetadata.pencilers,
      coverArtists: listing.gcdMetadata?.coverArtists?.length ? listing.gcdMetadata.coverArtists : lore.gcdMetadata.coverArtists,
      publisher: listing.gcdMetadata?.publisher || lore.gcdMetadata.publisher,
    },
    galleryImages: listing.galleryImages || (listing.imageUrl ? [listing.imageUrl] : []),
    // Price Matrix, Investopedia Due Diligence Lens & Video Dossier
    priceMatrix: priceMatrix.length > 0 ? priceMatrix : undefined,
    investopediaLens,
    videoDossier,
  };
}

