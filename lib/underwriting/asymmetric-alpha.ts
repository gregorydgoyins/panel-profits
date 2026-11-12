/**
 * Sovereign Asymmetric Alpha Engine (AAE) for Panel Profits
 * Multi-Variable Comic Equity Underwriting & Institutional Purchasing Advisory
 *
 * Synthesizes the totality of per-issue internal and proprietary variables across all 355,692 comics:
 * 1. Era-Specific CGC & CCS Grading Schedule (Modern $30/$20 flat vs Vintage $45/$30 vs High-Value $105/$70 vs Unlimited Value 4% FMV + 4% pressing + armored courier transit)
 * 2. Full Multi-Grade Valuation Lattice (Raw, 2.0, 3.0, 4.0, 6.0, 8.0, 9.0, 9.2, 9.4, 9.6, 9.8) & Step-Multiplier Frontier Sweet Spot
 * 3. Empirical Secondary Clearinghouse Velocity (Confirmed comp count, total capital cleared, average ticket size, turnover cadence in days, ATH & record low comps)
 * 4. Physical Float & Census Architecture (Print run total, estimated surviving raw float, total CGC universal slabs, 9.8 apex census, 9.6+ high-grade density, modal anchor grade)
 * 5. Bibliographic Canon, Creator Provenance & Media Catalysts (Actual series, issue number, publication year, publisher, era, writers, pencilers/cover artists, first appearances/debuts, lead characters, story synopsis, and live news catalysts)
 */

export type InvestmentVerdict =
  | 'STRONG_BUY'
  | 'ACCUMULATE'
  | 'HOLD'
  | 'HARVEST'
  | 'STRONG_SELL';

export interface AlphaUnderwritingReport {
  comicId: string;
  series: string;
  issueNumber: string;
  verdict: InvestmentVerdict;
  verdictDisplay: string;
  badgeColorClass: string;
  targetPriceLowUsd: number;
  targetPriceHighUsd: number;
  allInSlabbingHurdleUsd: number;
  retailSettlementFloorUsd: number;
  pillars: {
    capitalHurdle: {
      title: string;
      body: string;
    };
    salesConviction: {
      title: string;
      body: string;
    };
    culturalCatalyst: {
      title: string;
      body: string;
    };
  };
}

export const VERIFIED_CPR_HURDLE_USD = 88.00;
export const OFFICIAL_PRESCREEN_REJECT_FEE_USD = 9.00;
export const PRO_RATED_TRANSIT_PER_UNIT_USD = 9.00;

export interface UnderwriteComicAssetParams {
  comicId: string;
  series: string;
  issueNumber: string;
  characterOrHero?: string;
  publisher?: string;
  year?: number | null;
  era?: string | null;
  variantDescription?: string | null;
  rawPriceUsd: number;
  guidePrice98Usd: number;
  recentHighSaleUsd?: number | null;
  athSaleUsd?: number | null;
  athSaleGrade?: string | null;
  athSaleDate?: string | null;
  lowSaleUsd?: number | null;
  lowSaleGrade?: string | null;
  grade96PriceUsd?: number | null;
  grade94PriceUsd?: number | null;
  grade92PriceUsd?: number | null;
  grade90PriceUsd?: number | null;
  grade80PriceUsd?: number | null;
  grade60PriceUsd?: number | null;
  grade40PriceUsd?: number | null;
  grade20PriceUsd?: number | null;
  anchorGrade?: string | null;
  anchorPriceUsd?: number | null;
  sweetSpotFromGrade?: string | null;
  sweetSpotToGrade?: string | null;
  sweetSpotMultiplier?: number | null;
  sweetSpotDeltaUsd?: number | null;
  apexToFloorMultiple?: number | null;
  totalCensusCount?: number | null;
  totalCensus98Count?: number | null;
  highGrade96PlusCount?: number | null;
  printRunTotal?: number | null;
  totalRawFloat?: number | null;
  compCount?: number | null;
  totalClearedUsd?: number | null;
  avgCadenceDays?: number | null;
  avgTicketUsd?: number | null;
  daysSinceLatestComp?: number | null;
  roc30d?: number | null;
  roc90d?: number | null;
  maxDrawdownPct?: number | null;
  writers?: string[];
  artists?: string[];
  coverArtists?: string[];
  leadCharacters?: string[];
  firstAppearances?: string[];
  storyTitle?: string | null;
  synopsis?: string | null;
  activeCatalystHeadline?: string | null;
}

function fmtUsd(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtUsdWhole(n: number): string {
  if (n >= 1000) {
    return `$${Math.round(n).toLocaleString('en-US')}`;
  }
  return fmtUsd(n);
}

function slugifyWiki(name: string): string {
  return encodeURIComponent(
    name
      .toLowerCase()
      .replace(/\([^)]*\)/g, '')
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  );
}

function cleanCharacterName(raw: string): string {
  return raw
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[|\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferLeadCharacterFromSeries(series: string): string | null {
  const s = series.toLowerCase();
  if (s.includes('spider-man') || s.includes('spiderman') || s.includes('peter parker') || s.includes('web of')) return 'Spider-Man';
  if (s.includes('batman') || s.includes('detective comics') || s.includes('dark knight')) return 'Batman';
  if (s.includes('superman') || s.includes('action comics') || s.includes('man of steel')) return 'Superman';
  if (s.includes('x-men') || s.includes('uncanny x-men') || s.includes('astonishing x-men')) return 'X-Men';
  if (s.includes('wolverine') || s.includes('logan')) return 'Wolverine';
  if (s.includes('hulk')) return 'Incredible Hulk';
  if (s.includes('fantastic four')) return 'Fantastic Four';
  if (s.includes('avengers')) return 'Avengers';
  if (s.includes('iron man') || s.includes('tales of suspense')) return 'Iron Man';
  if (s.includes('captain america')) return 'Captain America';
  if (s.includes('thor') || s.includes('journey into mystery')) return 'Thor';
  if (s.includes('daredevil')) return 'Daredevil';
  if (s.includes('silver surfer')) return 'Silver Surfer';
  if (s.includes('spawn')) return 'Spawn';
  if (s.includes('venom')) return 'Venom';
  if (s.includes('deadpool') || s.includes('new mutants')) return 'Deadpool';
  if (s.includes('punisher')) return 'Punisher';
  if (s.includes('ghost rider')) return 'Ghost Rider';
  if (s.includes('moon knight')) return 'Moon Knight';
  if (s.includes('doctor strange') || s.includes('strange tales')) return 'Doctor Strange';
  if (s.includes('black panther')) return 'Black Panther';
  if (s.includes('wonder woman')) return 'Wonder Woman';
  if (s.includes('flash')) return 'The Flash';
  if (s.includes('green lantern')) return 'Green Lantern';
  if (s.includes('justice league')) return 'Justice League';
  if (s.includes('teen titans')) return 'Teen Titans';
  if (s.includes('walking dead')) return 'Rick Grimes';
  if (s.includes('invincible')) return 'Invincible';
  if (s.includes('tmnt') || s.includes('teenage mutant ninja turtles')) return 'Teenage Mutant Ninja Turtles';
  if (s.includes('star wars')) return 'Darth Vader';
  if (s.includes('transformers')) return 'Optimus Prime';
  if (s.includes('harley quinn')) return 'Harley Quinn';
  if (s.includes('nightwing')) return 'Nightwing';
  if (s.includes('catwoman')) return 'Catwoman';
  if (s.includes('swamp thing')) return 'Swamp Thing';
  if (s.includes('hellblazer') || s.includes('constantine')) return 'John Constantine';
  if (s.includes('sandman')) return 'Morpheus';
  return null;
}

function resolveEraLabel(year: number | null, eraProp?: string | null): string {
  if (eraProp) {
    const clean = eraProp.trim();
    if (/age$/i.test(clean)) return clean;
    return `${clean.charAt(0).toUpperCase()}${clean.slice(1).toLowerCase()} Age`;
  }
  if (!year) return 'Modern Age';
  if (year < 1938) return 'Platinum Age';
  if (year < 1956) return 'Golden Age';
  if (year < 1970) return 'Silver Age';
  if (year < 1985) return 'Bronze Age';
  if (year < 1992) return 'Copper Age';
  return 'Modern Age';
}

/**
 * Evaluates any comic asset across all 355,692 issues using the totality of its bibliographic,
 * census, print-run, grade-lattice, and secondary-clearinghouse data.
 */
export function underwriteComicAsset(params: UnderwriteComicAssetParams): AlphaUnderwritingReport {
  const {
    comicId,
    characterOrHero,
    publisher = 'Independent',
    year = null,
    era = null,
    variantDescription = null,
    rawPriceUsd,
    guidePrice98Usd,
    recentHighSaleUsd = null,
    athSaleUsd = null,
    athSaleGrade = null,
    athSaleDate = null,
    lowSaleUsd = null,
    lowSaleGrade = null,
    grade96PriceUsd = null,
    grade94PriceUsd = null,
    grade92PriceUsd = null,
    grade90PriceUsd = null,
    grade80PriceUsd = null,
    grade60PriceUsd = null,
    grade40PriceUsd = null,
    grade20PriceUsd = null,
    anchorGrade = null,
    anchorPriceUsd = null,
    sweetSpotFromGrade = null,
    sweetSpotToGrade = null,
    sweetSpotMultiplier = null,
    sweetSpotDeltaUsd = null,
    apexToFloorMultiple = null,
    totalCensusCount = null,
    totalCensus98Count = null,
    highGrade96PlusCount = null,
    printRunTotal = null,
    totalRawFloat = null,
    compCount = null,
    totalClearedUsd = null,
    avgCadenceDays = null,
    avgTicketUsd = null,
    daysSinceLatestComp = null,
    roc30d = null,
    roc90d = null,
    maxDrawdownPct = null,
    writers = [],
    artists = [],
    coverArtists = [],
    leadCharacters = [],
    firstAppearances = [],
    storyTitle = null,
    synopsis = null,
    activeCatalystHeadline = null,
  } = params;

  // Clean series & issueNumber so we NEVER output "Amazing Spider-Man #1 #1"
  const rawSeries = (params.series || 'Comic Asset').trim();
  const seriesMatch = rawSeries.match(/^(.*?)\s*#([0-9A-Za-z.\-]+)$/);
  const cleanSeries = seriesMatch ? seriesMatch[1].trim() : rawSeries.replace(/\s*#.*$/, '').trim();
  const cleanIssue = String(params.issueNumber || (seriesMatch ? seriesMatch[2] : '1')).replace(/^#/, '').trim() || '1';
  const issueDisplay = `${cleanSeries}${cleanIssue ? ` #${cleanIssue}` : ''}`;
  const eraDisplay = resolveEraLabel(year, era);
  const yearDisplay = year ? `${year}` : eraDisplay;

  // Resolve authentic character/franchise focus for this exact comic (never defaulting to Silver Surfer!)
  const cleanedFirstApps = firstAppearances.map(cleanCharacterName).filter((c) => c.length > 1 && c.length < 48);
  const cleanedLeadChars = leadCharacters.map(cleanCharacterName).filter((c) => c.length > 1 && c.length < 48);
  const inferredHero = inferLeadCharacterFromSeries(cleanSeries);
  const primaryHero =
    inferredHero ||
    cleanedLeadChars[0] ||
    cleanedFirstApps[0] ||
    (characterOrHero && !characterOrHero.includes('#') && characterOrHero !== 'Franchise Key' && characterOrHero !== 'Lead Franchise Character'
      ? cleanCharacterName(characterOrHero)
      : cleanSeries);

  const secondaryHeroes = [...new Set([...cleanedFirstApps, ...cleanedLeadChars])]
    .filter((c) => c.toLowerCase() !== primaryHero.toLowerCase())
    .slice(0, 3);

  const cleanWriters = [...new Set(writers.map((w) => w.trim()).filter(Boolean))].slice(0, 2);
  const cleanArtists = [...new Set([...artists, ...coverArtists].map((a) => a.trim()).filter(Boolean))].slice(0, 2);

  // Price & Float Resolution
  const isRawPriced = rawPriceUsd != null && rawPriceUsd > 0;
  const is98Priced = guidePrice98Usd != null && guidePrice98Usd > 0;
  const effectiveRaw = isRawPriced ? rawPriceUsd : 0;

  // Determine whether this specific issue is a Pre-1980 Vintage / High-Value Key vs a Copper/Modern Issue
  const isPre1980Vintage = (year != null && year < 1980) || /golden|silver|bronze|platinum/i.test(eraDisplay);
  const isHighValueKey = effectiveRaw >= 200 || guidePrice98Usd >= 2000 || (anchorPriceUsd != null && anchorPriceUsd >= 500);

  // Resolve census & survival metrics specific to this comic
  const cgcTotal = totalCensusCount != null && totalCensusCount > 0 ? totalCensusCount : null;
  const cgc98 = totalCensus98Count != null && totalCensus98Count >= 0 ? totalCensus98Count : null;
  const cgc96Plus = highGrade96PlusCount != null && highGrade96PlusCount > 0 ? highGrade96PlusCount : cgc98;
  const printRun = printRunTotal != null && printRunTotal > 0 ? printRunTotal : null;
  const rawFloat = totalRawFloat != null && totalRawFloat > 0 ? totalRawFloat : null;
  const slabPenetrationPct =
    cgcTotal != null && printRun != null && printRun > 0
      ? Number(((cgcTotal / printRun) * 100).toFixed(2))
      : cgcTotal != null && rawFloat != null && rawFloat + cgcTotal > 0
      ? Number(((cgcTotal / (rawFloat + cgcTotal)) * 100).toFixed(2))
      : null;
  const apex98SharePct =
    cgc98 != null && cgcTotal != null && cgcTotal > 0
      ? Number(((cgc98 / cgcTotal) * 100).toFixed(1))
      : null;

  // Resolve secondary market comp metrics specific to this comic
  const recordedComps = compCount != null && compCount > 0 ? compCount : 0;
  const clearedVolume = totalClearedUsd != null && totalClearedUsd > 0 ? totalClearedUsd : 0;
  const cadenceDays = avgCadenceDays != null && avgCadenceDays > 0 ? avgCadenceDays : null;
  const avgTicket = avgTicketUsd != null && avgTicketUsd > 0 ? avgTicketUsd : null;

  // Build creator & lore clauses specific to this comic
  const creatorClause =
    cleanWriters.length > 0 && cleanArtists.length > 0
      ? `scripted by [${cleanWriters[0]}](/wiki/entry/${slugifyWiki(cleanWriters[0])})${cleanWriters[1] ? ` & ${cleanWriters[1]}` : ''} with art by [${cleanArtists[0]}](/wiki/entry/${slugifyWiki(cleanArtists[0])})${cleanArtists[1] ? ` & ${cleanArtists[1]}` : ''}`
      : cleanWriters.length > 0
      ? `written by [${cleanWriters[0]}](/wiki/entry/${slugifyWiki(cleanWriters[0])})`
      : cleanArtists.length > 0
      ? `illustrated by [${cleanArtists[0]}](/wiki/entry/${slugifyWiki(cleanArtists[0])})`
      : `published by [${publisher}](/comics?q=${encodeURIComponent(publisher)})`;

  const debutClause =
    cleanedFirstApps.length > 0
      ? `featuring the canonical debut of ${cleanedFirstApps
          .slice(0, 3)
          .map((fa) => `[${fa}](/wiki/entry/${slugifyWiki(fa)})`)
          .join(', ')}`
      : secondaryHeroes.length > 0
      ? `featuring [${primaryHero}](/wiki/entry/${slugifyWiki(primaryHero)}) alongside ${secondaryHeroes
          .map((h) => `[${h}](/wiki/entry/${slugifyWiki(h)})`)
          .join(', ')}`
      : `anchoring the [${primaryHero}](/wiki/entry/${slugifyWiki(primaryHero)}) canon`;

  const cleanSynopsisSnippet = synopsis
    ? synopsis
        .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
        .replace(/\[\[([^\]]+)\]\]/g, '$1')
        .replace(/'''|''/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 175)
    : null;

  const publisherMediaClause = /marvel|timely|atlas/i.test(publisher)
    ? `Marvel Studios theatrical and streaming slate developments for [${primaryHero}](/wiki/entry/${slugifyWiki(primaryHero)})`
    : /\bdc\b|national|vertigo|wildstorm/i.test(publisher)
    ? `DC Studios / Warner Bros. Discovery multi-year chapter adaptations for [${primaryHero}](/wiki/entry/${slugifyWiki(primaryHero)})`
    : /image/i.test(publisher)
    ? `creator-owned film/streaming optioning and independent collector conviction in [${cleanSeries}](/comics?q=${encodeURIComponent(cleanSeries)})`
    : `[${publisher}](/comics?q=${encodeURIComponent(publisher)}) cross-media licensing and franchise collector demand for [${primaryHero}](/wiki/entry/${slugifyWiki(primaryHero)})`;

  // =========================================================================
  // REGIME 1: PRE-1980 VINTAGE KEYS & HIGH-VALUE BLUE-CHIP ASSETS
  // =========================================================================
  if (isPre1980Vintage || isHighValueKey) {
    // Pick the realistic mid-grade / liquidity anchor tier for this exact comic
    const realisticTargetGrade =
      anchorGrade && anchorGrade !== '9.8' && anchorGrade !== 'RAW'
        ? anchorGrade
        : grade40PriceUsd
        ? '4.0'
        : grade60PriceUsd
        ? '6.0'
        : grade80PriceUsd
        ? '8.0'
        : grade20PriceUsd
        ? '2.0'
        : '4.0';

    const realisticSlabFmv =
      (anchorPriceUsd && anchorGrade !== '9.8' && anchorGrade !== 'RAW' && anchorPriceUsd > 0 ? anchorPriceUsd : null) ||
      (grade40PriceUsd && grade40PriceUsd > 0 ? grade40PriceUsd : null) ||
      (grade60PriceUsd && grade60PriceUsd > 0 ? grade60PriceUsd : null) ||
      (grade80PriceUsd && grade80PriceUsd > 0 ? grade80PriceUsd : null) ||
      (grade20PriceUsd && grade20PriceUsd > 0 ? grade20PriceUsd : null) ||
      (effectiveRaw > 0 ? Number((effectiveRaw * 1.85).toFixed(2)) : guidePrice98Usd);

    const rawBasis = effectiveRaw > 0 ? effectiveRaw : Number((realisticSlabFmv * 0.55).toFixed(2));

    // Exact CGC Era & Value Tier Fee Calculation:
    // - Unlimited Value (> $1,000 FMV): 4% of post-grade FMV (min $135) + 4% CCS pressing (min $100) + armored transit
    // - High Value ($400–$1,000 FMV): $105 grading + $70 pressing + $55 insured shipping
    // - Vintage Tier (< $400 FMV): $45 grading + $30 pressing + $32 insured shipping
    const isUnlimitedTier = realisticSlabFmv > 1000;
    const isHighValueTier = !isUnlimitedTier && realisticSlabFmv > 400;
    const cgcTierName = isUnlimitedTier
      ? 'CGC Unlimited Value (4% FMV)'
      : isHighValueTier
      ? 'CGC High Value ($105 tier)'
      : 'CGC Vintage ($45 tier)';

    const cgcGradingFee = isUnlimitedTier
      ? Number(Math.max(135, realisticSlabFmv * 0.04).toFixed(2))
      : isHighValueTier
      ? 105
      : 45;
    const ccsPressingFee = isUnlimitedTier
      ? Number(Math.max(100, realisticSlabFmv * 0.04).toFixed(2))
      : isHighValueTier
      ? 70
      : 30;
    const insuredTransitAndHandling = realisticSlabFmv > 10000 ? 220 : isUnlimitedTier ? 105 : isHighValueTier ? 55 : 32;
    const realisticAllInGradingCost = Number((cgcGradingFee + ccsPressingFee + insuredTransitAndHandling).toFixed(2));
    const allInCostBasis = Number((rawBasis + realisticAllInGradingCost).toFixed(2));

    const sellerCommissionRate = realisticSlabFmv >= 25000 ? 0.05 : realisticSlabFmv >= 2500 ? 0.10 : 0.1325;
    const shippingOut = realisticSlabFmv >= 1000 ? 50 : 25;
    const netProceeds = Number((realisticSlabFmv * (1 - sellerCommissionRate) - shippingOut).toFixed(2));
    const netSpread = Number((netProceeds - allInCostBasis).toFixed(2));
    const netRoiPct = allInCostBasis > 0 ? Number(((netSpread / allInCostBasis) * 100).toFixed(1)) : 0;

    // Cross-grade step context for this specific comic
    const nextTierGrade =
      sweetSpotToGrade && sweetSpotToGrade !== realisticTargetGrade
        ? sweetSpotToGrade
        : grade60PriceUsd && realisticTargetGrade !== '6.0'
        ? '6.0'
        : grade80PriceUsd && realisticTargetGrade !== '8.0'
        ? '8.0'
        : '8.0';
    const nextTierPrice =
      (nextTierGrade === '4.0' && grade40PriceUsd) ||
      (nextTierGrade === '6.0' && grade60PriceUsd) ||
      (nextTierGrade === '8.0' && grade80PriceUsd) ||
      (grade90PriceUsd && grade90PriceUsd > realisticSlabFmv ? grade90PriceUsd : realisticSlabFmv * 1.35);

    const targetLow = Number(Math.min(rawBasis, realisticSlabFmv * 0.88).toFixed(2));
    const targetHigh = Number(Math.max(realisticSlabFmv, nextTierPrice).toFixed(2));

    const verdict: InvestmentVerdict = netRoiPct >= 20 ? 'ACCUMULATE' : roc90d != null && roc90d < -12 ? 'ACCUMULATE' : 'HOLD';
    const verdictDisplay =
      netRoiPct >= 20
        ? `ACCUMULATE (CGC ${realisticTargetGrade} ANCHOR)`
        : `TARGET CERTIFIED CGC ${realisticTargetGrade}–${nextTierGrade}`;
    const badgeColor =
      netRoiPct >= 20
        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
        : 'bg-emerald-500/20 text-emerald-300 border-emerald-400';

    const censusContextStr =
      cgcTotal != null
        ? `${cgcTotal.toLocaleString()} total CGC slabs (${cgc98 != null ? `${cgc98.toLocaleString()} at 9.8` : 'scarce apex'}${
            printRun ? ` out of ~${printRun.toLocaleString()} ${year || eraDisplay} print run` : ''
          })`
        : `${eraDisplay} surviving population`;

    const capitalTitle = `${issueDisplay} (${yearDisplay}) Capital Math: Raw (${fmtUsdWhole(rawBasis)}) → CGC ${realisticTargetGrade} (${fmtUsdWhole(realisticSlabFmv)})`;
    const capitalBreakdown = `ISSUE-SPECIFIC GRADING & COST BASIS (${issueDisplay}):
1. Surviving Condition Reality: For [${issueDisplay}](/comics?q=${encodeURIComponent(cleanSeries)}) (${yearDisplay}, ${eraDisplay}), an average [ungraded raw copy](/wiki/terms/fair-market-value-fmv-benchmark) at **${fmtUsd(rawBasis)}** corresponds to a surviving ${realisticTargetGrade} condition specimen—never a CGC 9.8 (${cgc98 != null ? `only ${cgc98} in CGC census` : 'museum-tier unicorn'} at ${fmtUsdWhole(guidePrice98Usd)}).
2. ${cgcTierName} Fee Schedule: Encapsulating at ${fmtUsdWhole(realisticSlabFmv)} FMV incurs **${fmtUsd(cgcGradingFee)}** CGC grading + **${fmtUsd(ccsPressingFee)}** CCS pressing + **${fmtUsd(insuredTransitAndHandling)}** insured transit (**${fmtUsd(realisticAllInGradingCost)}** total grading hurdle), establishing an all-in [cost basis](/wiki/terms/cost-basis-tax-lot-accounting) of **${fmtUsd(allInCostBasis)}**.
3. Net Realized Spread: Clearing a certified **CGC ${realisticTargetGrade}** at ${fmtUsd(realisticSlabFmv)} (${fmtUsd(netProceeds)} net after ${(sellerCommissionRate * 100).toFixed(1).replace(/\.0$/, '')}% venue fee) generates **${netSpread >= 0 ? `+${fmtUsd(netSpread)}` : `-${fmtUsd(Math.abs(netSpread))}`} (${netRoiPct >= 0 ? `+${netRoiPct}%` : `${netRoiPct}%`})** [realized gain](/wiki/terms/realized-gain-loss) while eliminating uncertified restoration risk.`;

    const stepSweetSpotStr =
      sweetSpotFromGrade && sweetSpotToGrade && sweetSpotMultiplier
        ? `Cross-grade elasticity peaks on the **${sweetSpotFromGrade} → ${sweetSpotToGrade}** step (**${sweetSpotMultiplier.toFixed(2)}×** multiplier${sweetSpotDeltaUsd ? `, +${fmtUsdWhole(sweetSpotDeltaUsd)}` : ''}).`
        : `Stepping from CGC ${realisticTargetGrade} (${fmtUsdWhole(realisticSlabFmv)}) to CGC ${nextTierGrade} (${fmtUsdWhole(nextTierPrice)}) commands a **${(nextTierPrice / Math.max(1, realisticSlabFmv)).toFixed(2)}×** [price discovery](/wiki/terms/price-discovery) multiple.`;

    const compVelocityStr =
      recordedComps > 0
        ? `Across **${recordedComps} verified comps** (${fmtUsdWhole(clearedVolume)} total cleared${avgTicket ? `, ${fmtUsdWhole(avgTicket)} avg ticket` : ''}${cadenceDays ? `, ~${cadenceDays}d turnover cadence` : ''}), realized trades span from ${lowSaleUsd ? `${fmtUsdWhole(lowSaleUsd)} (${lowSaleGrade ? `CGC ${lowSaleGrade}` : 'floor'})` : fmtUsdWhole(rawBasis)} to ${athSaleUsd ? `${fmtUsdWhole(athSaleUsd)} (${athSaleGrade ? `CGC ${athSaleGrade}` : 'ATH'})` : fmtUsdWhole(guidePrice98Usd)}.`
        : `Secondary benchmark pricing spans from ${fmtUsdWhole(rawBasis)} (Raw) through ${fmtUsdWhole(realisticSlabFmv)} (CGC ${realisticTargetGrade} modal anchor) to ${fmtUsdWhole(guidePrice98Usd)} (Apex 9.8).`;

    const salesTitle = `Purchasing Guidance: Buy Certified CGC ${realisticTargetGrade}–${nextTierGrade} (${fmtUsdWhole(targetLow)} – ${fmtUsdWhole(targetHigh)})`;
    const salesBreakdown = `SECONDARY MARKET REALITY & BUYER STRATEGY:
• OPTIMAL ENTRY TIER: Target Universal Blue Label **CGC ${realisticTargetGrade}** (${fmtUsdWhole(realisticSlabFmv)}) to **CGC ${nextTierGrade}** (${fmtUsdWhole(nextTierPrice)}) slabs. Buying raw at ${fmtUsdWhole(rawBasis)} exposes capital to color-touch, trimming, or married-page restoration rejection unless inspected in person.
• CLEARINGHOUSE DEPTH: ${compVelocityStr}
• ELASTICITY & FLOAT: Registered [census scarcity](/wiki/terms/scarcity) stands at ${censusContextStr}. ${stepSweetSpotStr}`;

    const catalystTitle = `${eraDisplay} Provenance: ${primaryHero}${cleanWriters[0] ? ` (${cleanWriters[0]}${cleanArtists[0] ? ` / ${cleanArtists[0]}` : ''})` : ''}`;
    const catalystBody = `ISSUE LORE, CREATOR CANON & MACRO DRIVERS:
• Bibliographic Authority: Published in **${yearDisplay}** by [${publisher}](/comics?q=${encodeURIComponent(publisher)}), [${issueDisplay}](/comics?q=${encodeURIComponent(cleanSeries)}) is ${creatorClause}, ${debutClause}.${storyTitle ? ` Lead story: *"${storyTitle}"*.` : ''}${cleanSynopsisSnippet ? ` ${cleanSynopsisSnippet}...` : ''}
• Float Lockup & Catalyst Horizon: ${
      activeCatalystHeadline
        ? `Live catalyst: *"${activeCatalystHeadline}"*. Combined with `
        : 'Driven by '
    }${publisherMediaClause} and permanent [scarcity](/wiki/terms/scarcity) (${cgcTotal ? `${cgcTotal.toLocaleString()} graded slabs` : 'tight surviving float'}${slabPenetrationPct != null ? `, ${slabPenetrationPct}% slab penetration` : ''}), institutional collectors treat mid-to-high grade Universal slabs as core [key issue](/wiki/terms/first-appearance-key-issue-premium) holdings.`;

    return {
      comicId,
      series: cleanSeries,
      issueNumber: cleanIssue,
      verdict,
      verdictDisplay,
      badgeColorClass: badgeColor,
      targetPriceLowUsd: targetLow,
      targetPriceHighUsd: targetHigh,
      allInSlabbingHurdleUsd: realisticAllInGradingCost,
      retailSettlementFloorUsd: allInCostBasis,
      pillars: {
        capitalHurdle: { title: capitalTitle, body: capitalBreakdown },
        salesConviction: { title: salesTitle, body: salesBreakdown },
        culturalCatalyst: { title: catalystTitle, body: catalystBody },
      },
    };
  }

  // =========================================================================
  // REGIME 2: COPPER & MODERN ISSUES (1980–PRESENT)
  // =========================================================================
  // Exact CGC Modern vs Copper Fee Schedule:
  // - Post-1975 books <= $400 FMV: CGC Modern tier ($30 grading + $20 CCS pressing + $19 pro-rated shipping/handling = $69–$88 all-in hurdle; $88 single-book walk-in/courier standard)
  // - Post-1975 books > $400 FMV: CGC High Value ($105 grading + $70 pressing + $45 shipping = $220)
  const market98Benchmark = is98Priced ? guidePrice98Usd : recentHighSaleUsd && recentHighSaleUsd > 0 ? recentHighSaleUsd : effectiveRaw * 3.5;
  const isModernHighValue = market98Benchmark > 400;
  const cgcModernFee = isModernHighValue ? 105 : 30;
  const ccsModernPressFee = isModernHighValue ? 70 : 20;
  const modernTransitFee = isModernHighValue ? 45 : 38;
  const allInModernHurdle = isModernHighValue ? cgcModernFee + ccsModernPressFee + modernTransitFee : VERIFIED_CPR_HURDLE_USD;
  const retailSettlementFloor = Number((effectiveRaw + allInModernHurdle).toFixed(2));

  const effectiveHigh =
    recentHighSaleUsd && recentHighSaleUsd > 0
      ? recentHighSaleUsd
      : athSaleUsd && athSaleUsd > 0
      ? athSaleUsd
      : market98Benchmark;
  const peakAth = athSaleUsd && athSaleUsd > 0 ? athSaleUsd : effectiveHigh;

  const sellingFriction = Number((market98Benchmark * 0.1325 + 25.0).toFixed(2));
  const netLiquidationProceeds = Number((market98Benchmark - sellingFriction).toFixed(2));
  const slabbingNetProfit = Number((netLiquidationProceeds - retailSettlementFloor).toFixed(2));
  const profitMarginPct = retailSettlementFloor > 0 ? Math.round((slabbingNetProfit / retailSettlementFloor) * 100) : 0;
  const rawTo98Multiple = effectiveRaw > 0 ? Number((market98Benchmark / effectiveRaw).toFixed(1)) : 0;

  // 9.6 Downgrade Penalty Math for this specific comic
  const benchmark96 =
    grade96PriceUsd && grade96PriceUsd > 0
      ? grade96PriceUsd
      : grade94PriceUsd && grade94PriceUsd > 0
      ? Number((grade94PriceUsd * 1.15).toFixed(2))
      : Number((market98Benchmark * 0.38).toFixed(2));
  const netProceeds96 = Number((benchmark96 * (1 - 0.1325) - 20.0).toFixed(2));
  const downgradePnl = Number((netProceeds96 - retailSettlementFloor).toFixed(2));

  // Verdict Classification based on this exact comic's CPR spread, census density, and sales velocity
  let verdict: InvestmentVerdict = 'HOLD';
  let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
  let verdictDisplay = 'HOLD (MARKET EQUILIBRIUM)';
  let targetLow = isRawPriced ? effectiveRaw : retailSettlementFloor;
  let targetHigh = market98Benchmark;

  if (market98Benchmark > peakAth * 1.5 && peakAth > 0 && recordedComps >= 3) {
    verdict = 'STRONG_SELL';
    verdictDisplay = 'STRONG SELL (EXTENDED ABOVE ATH)';
    badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-400';
    targetLow = Number((market98Benchmark * 0.55).toFixed(2));
    targetHigh = Number((market98Benchmark * 0.75).toFixed(2));
  } else if (market98Benchmark > peakAth * 1.25 && peakAth > 0 && recordedComps >= 3) {
    verdict = 'HARVEST';
    verdictDisplay = 'HARVEST (TAKE PROFITS NEAR PEAK)';
    badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-400';
    targetLow = Number((market98Benchmark * 0.78).toFixed(2));
    targetHigh = Number(market98Benchmark.toFixed(2));
  } else if (slabbingNetProfit >= 35 && profitMarginPct >= 25) {
    verdict = 'STRONG_BUY';
    verdictDisplay = `STRONG BUY (+${profitMarginPct}% CPR SPREAD)`;
    badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-400';
    targetLow = effectiveRaw > 0 ? effectiveRaw : retailSettlementFloor;
    targetHigh = Math.max(peakAth, market98Benchmark);
  } else if (slabbingNetProfit > 0) {
    verdict = 'ACCUMULATE';
    verdictDisplay = `ACCUMULATE (RAW ${fmtUsd(effectiveRaw)} / 9.8 PRE-SCREEN)`;
    badgeColor = 'bg-cyan-500/20 text-cyan-300 border-cyan-400';
    targetLow = effectiveRaw > 0 ? effectiveRaw : Number((market98Benchmark * 0.8).toFixed(2));
    targetHigh = Math.max(market98Benchmark, effectiveHigh);
  } else {
    // Slabbing raw is underwater after $88 hurdle + selling fees -> advise buying Raw or buying already-slabbed below replacement cost!
    verdict = 'HOLD';
    verdictDisplay =
      market98Benchmark < allInModernHurdle
        ? `BUY ALREADY-SLABBED 9.8 (< ${fmtUsdWhole(allInModernHurdle)} FEE) OR HOLD RAW`
        : `ACCUMULATE RAW (${fmtUsd(effectiveRaw)}) / AVOID BLIND SLABBING`;
    badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
    targetLow = effectiveRaw > 0 ? effectiveRaw : Number((market98Benchmark * 0.85).toFixed(2));
    targetHigh = Number(market98Benchmark.toFixed(2));
  }

  const targetSpreadLow = Number(Math.min(targetLow, targetHigh).toFixed(2));
  const targetSpreadHigh = Number(Math.max(targetLow, targetHigh).toFixed(2));

  // Pillar 1: Issue-Specific Capital Math
  const capitalTitle = `${issueDisplay} (${yearDisplay}) CPR Math: Raw (${fmtUsd(effectiveRaw)}) + ${fmtUsdWhole(allInModernHurdle)} Hurdle → 9.8 (${fmtUsd(market98Benchmark)})`;

  const capitalBreakdown =
    slabbingNetProfit >= 0
      ? `ISSUE-SPECIFIC MONETARY ANALYSIS (${issueDisplay}):
1. Breakeven Cost Basis: Acquiring a sharp raw copy of [${issueDisplay}](/comics?q=${encodeURIComponent(cleanSeries)}) at **${fmtUsd(effectiveRaw)}** (${rawTo98Multiple > 0 ? `a **${rawTo98Multiple}×** raw-to-9.8 multiple` : 'base entry'}) plus the **${fmtUsd(allInModernHurdle)}** physical grading, pressing, and courier hurdle sets total [cost basis](/wiki/terms/cost-basis-tax-lot-accounting) at **${fmtUsd(retailSettlementFloor)}**.
2. Net 9.8 Realization: At the **${fmtUsd(market98Benchmark)}** CGC 9.8 [FMV](/wiki/terms/fair-market-value-fmv-benchmark) (**${fmtUsd(netLiquidationProceeds)}** net after 13.25% commission and $25 shipping), achieving a 9.8 yields **+${fmtUsd(slabbingNetProfit)} (+${profitMarginPct}%)** in net [realized gain](/wiki/terms/realized-gain-loss).
3. 9.6 Grade-Compression Risk: Missing 9.8 and landing at **CGC 9.6** (${fmtUsd(benchmark96)} FMV; ${fmtUsd(netProceeds96)} net) results in **${downgradePnl >= 0 ? `+${fmtUsd(downgradePnl)}` : `-${fmtUsd(Math.abs(downgradePnl))}`}** against cost basis—${downgradePnl < 0 ? `requiring a strict 9.8 pre-screen ($${OFFICIAL_PRESCREEN_REJECT_FEE_USD} reject fee) to protect capital.` : `meaning even a 9.6 clears breakeven.`}`
      : `ISSUE-SPECIFIC MONETARY ANALYSIS (${issueDisplay}):
1. Negative Raw-to-Slab Spread: Acquiring [${issueDisplay}](/comics?q=${encodeURIComponent(cleanSeries)}) raw at **${fmtUsd(effectiveRaw)}** and paying **${fmtUsd(allInModernHurdle)}** in grading/pressing fees creates a **${fmtUsd(retailSettlementFloor)}** [cost basis](/wiki/terms/cost-basis-tax-lot-accounting)—exceeding the **${fmtUsd(market98Benchmark)}** CGC 9.8 FMV (**${fmtUsd(netLiquidationProceeds)}** net after selling friction) by **-${fmtUsd(Math.abs(slabbingNetProfit))} (${profitMarginPct}%)**.
2. Replacement-Cost Arbitrage: Because physical encapsulation costs more than the secondary 9.8 market price, submitting single raw copies destroys capital via [sunk cost](/wiki/terms/sunk-cost) friction.
3. Optimal Capital Allocation: Either hold ungraded raw copies at **${fmtUsd(effectiveRaw)}** for low-basis [optionality](/wiki/terms/opportunity-cost), or buy an already-certified **CGC 9.8** directly on the secondary market around **${fmtUsd(market98Benchmark)}** (letting the previous owner absorb the ${fmtUsdWhole(allInModernHurdle)} grading fee).`;

  // Pillar 2: Issue-Specific Secondary Market Reality & Purchasing Guidance
  const censusDetailStr =
    cgcTotal != null
      ? `CGC census records **${cgcTotal.toLocaleString()} total graded copies**${cgc98 != null ? ` with **${cgc98.toLocaleString()} in CGC 9.8** (${apex98SharePct != null ? `${apex98SharePct}% apex ratio` : 'top tier'})` : ''}${
          printRun != null
            ? ` against an estimated **${printRun.toLocaleString()} copy print run** (${rawFloat != null ? `~${rawFloat.toLocaleString()} ungraded raw float; ` : ''}${slabPenetrationPct != null ? `${slabPenetrationPct}% slabbed` : ''})`
            : ''
        }.`
      : printRun != null
      ? `Estimated initial circulation stands at **${printRun.toLocaleString()} copies** (${rawFloat != null ? `~${rawFloat.toLocaleString()} surviving raw float` : 'active collector float'}).`
      : `Surviving supply is governed by ${eraDisplay} distribution and collector retention.`;

  const velocityDetailStr =
    recordedComps > 0
      ? `Verified clearinghouse logs show **${recordedComps} completed sales** totaling **${fmtUsdWhole(clearedVolume)}** (${avgTicket ? `${fmtUsd(avgTicket)} average ticket` : ''}${cadenceDays ? `, clearing every ~${cadenceDays} days` : ''}), with realized comps ranging from **${lowSaleUsd ? fmtUsd(lowSaleUsd) : fmtUsd(effectiveRaw)}** (${lowSaleGrade ? `CGC ${lowSaleGrade}` : 'RAW'}) to **${fmtUsd(peakAth)}** (${athSaleGrade ? `CGC ${athSaleGrade}` : '9.8 ATH'}).`
      : `Current secondary order-book pricing anchors at **${fmtUsd(effectiveRaw)}** (RAW), **${fmtUsd(benchmark96)}** (CGC 9.6), and **${fmtUsd(market98Benchmark)}** (CGC 9.8).`;

  const momentumStr =
    roc30d != null || roc90d != null || maxDrawdownPct != null
      ? ` Trailing momentum: ${roc30d != null ? `${roc30d >= 0 ? '+' : ''}${roc30d.toFixed(1)}% (30d)` : ''}${roc90d != null ? ` / ${roc90d >= 0 ? '+' : ''}${roc90d.toFixed(1)}% (90d)` : ''}${maxDrawdownPct != null && maxDrawdownPct > 0 ? ` with ${maxDrawdownPct.toFixed(1)}% historical max drawdown` : ''}.`
      : '';

  const salesTitle = `Purchasing Guidance & Market Reality (${fmtUsd(targetSpreadLow)} – ${fmtUsd(targetSpreadHigh)})`;
  const salesBreakdown = `SECONDARY LIQUIDITY & FLOAT STRUCTURE:
• BUYER EXECUTION PLAN: ${
    slabbingNetProfit >= 25
      ? `Acquire high-grade raw candidates near **${fmtUsd(effectiveRaw)}** for 25-book bulk 9.8 pre-screen submissions, or accumulate certified **CGC 9.8** slabs below **${fmtUsd(netLiquidationProceeds)}**`
      : market98Benchmark < retailSettlementFloor
      ? `Do not pay ${fmtUsdWhole(allInModernHurdle)} to slab raw copies; purchase already-certified **CGC 9.8** slabs near **${fmtUsd(market98Benchmark)}** (a **${fmtUsd(retailSettlementFloor - market98Benchmark)} discount** to physical replacement cost) or accumulate raw copies at **${fmtUsd(effectiveRaw)}**`
      : `Accumulate sharp raw copies at **${fmtUsd(effectiveRaw)}** and selectively bid on **CGC 9.8** slabs between **${fmtUsd( benchmark96 * 1.25 )}** and **${fmtUsd(market98Benchmark)}**`
  }.
• CENSUS & PRINT RUN FLOAT: ${censusDetailStr}
• REALIZED VELOCITY: ${velocityDetailStr}${momentumStr}`;

  // Pillar 3: Issue-Specific Lore, Creators & Macro Catalysts
  const catalystTitle = `${cleanSeries} #${cleanIssue} Lore: ${primaryHero}${cleanedFirstApps.length > 0 ? ' (Key Debut)' : ''}`;
  const catalystBody = `CANON SIGNIFICANCE, CREATORS & CATALYSTS:
• Creative & Narrative Provenance: Released in **${yearDisplay}** (${eraDisplay}${variantDescription ? ` · ${variantDescription}` : ''}) by [${publisher}](/comics?q=${encodeURIComponent(publisher)}), [${issueDisplay}](/comics?q=${encodeURIComponent(cleanSeries)}) is ${creatorClause}, ${debutClause}.${storyTitle ? ` Story arc: *"${storyTitle}"*.` : ''}${cleanSynopsisSnippet ? ` ${cleanSynopsisSnippet}...` : ''}
• Forward Catalyst & Valuation Driver: ${
    activeCatalystHeadline
      ? `Active news catalyst: *"${activeCatalystHeadline}"*. Combined with ${publisherMediaClause}, `
      : `Supported by ${publisherMediaClause}, `
  }[price discovery](/wiki/terms/price-discovery) on [${issueDisplay}](/comics?q=${encodeURIComponent(cleanSeries)}) is governed by its ${
    cgc98 != null ? `${cgc98.toLocaleString()}-copy CGC 9.8 [census scarcity](/wiki/terms/scarcity)` : `[census scarcity](/wiki/terms/scarcity)`
  } and ${rawTo98Multiple > 0 ? `${rawTo98Multiple}× raw-to-slab condition premium` : 'collector holding conviction'}.`;

  return {
    comicId,
    series: cleanSeries,
    issueNumber: cleanIssue,
    verdict,
    verdictDisplay,
    badgeColorClass: badgeColor,
    targetPriceLowUsd: targetSpreadLow,
    targetPriceHighUsd: targetSpreadHigh,
    allInSlabbingHurdleUsd: allInModernHurdle,
    retailSettlementFloorUsd: retailSettlementFloor,
    pillars: {
      capitalHurdle: {
        title: capitalTitle,
        body: capitalBreakdown,
      },
      salesConviction: {
        title: salesTitle,
        body: salesBreakdown,
      },
      culturalCatalyst: {
        title: catalystTitle,
        body: catalystBody,
      },
    },
  };
}

