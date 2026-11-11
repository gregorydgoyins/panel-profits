/**
 * Sovereign Asymmetric Alpha Engine (AAE) for Panel Profits
 * Autonomous Comic Equity Underwriting & Investment Advisory
 * 
 * Synthesizes:
 * 1. Physical CPR Economics (Raw Cost + $88 All-in Slabbing Hurdle)
 * 2. Census Float Elasticity (Registered Slabs vs Raw Float)
 * 3. Historical Sales Range (Recent Comps vs All-Time Highs)
 * 4. Lore & Macro Catalysts (Character status, cinematic adaptations, rendering milestones)
 * 
 * Produces actionable institutional conviction ratings:
 * - STRONG_BUY
 * - ACCUMULATE (BUY WITH CAUTION)
 * - HOLD (MARKET PERFORM)
 * - HARVEST (TAKE PROFITS)
 * - STRONG_SELL
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
  allInSlabbingHurdleUsd: number; // Constant ~$88.00 verified operational cost
  retailSettlementFloorUsd: number; // Raw Price + $88 hurdle
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

/**
 * Evaluates an equity comic asset through the Sovereign Asymmetric Alpha Engine
 */
export function underwriteComicAsset(params: {
  comicId: string;
  series: string;
  issueNumber: string;
  characterOrHero?: string;
  publisher?: string;
  year?: number;
  rawPriceUsd: number;
  guidePrice98Usd: number;
  recentHighSaleUsd?: number | null;
  athSaleUsd?: number | null;
  grade96PriceUsd?: number | null;
  totalCensus98Count?: number | null;
  totalRawFloat?: number | null;
  activeCatalystHeadline?: string | null;
}): AlphaUnderwritingReport {
  const {
    comicId,
    series,
    issueNumber,
    characterOrHero = "Anchor Character",
    rawPriceUsd,
    guidePrice98Usd,
    recentHighSaleUsd = null,
    athSaleUsd = null,
    grade96PriceUsd = null,
    totalCensus98Count = null,
    totalRawFloat = null,
    activeCatalystHeadline = null
  } = params;

  // Realized capital floor: raw purchase price + $88 all-in grading & pressing hurdle
  const isRawPriced = rawPriceUsd != null && rawPriceUsd > 0;
  const is98Priced = guidePrice98Usd != null && guidePrice98Usd > 0;
  const effectiveRaw = isRawPriced ? rawPriceUsd : 0;
  const retailSettlementFloor = Number((effectiveRaw + VERIFIED_CPR_HURDLE_USD).toFixed(2));
  
  // Historical peak anchor
  const effectiveHigh = recentHighSaleUsd && recentHighSaleUsd > 0 
    ? recentHighSaleUsd 
    : (athSaleUsd && athSaleUsd > 0 ? athSaleUsd : (is98Priced ? guidePrice98Usd : retailSettlementFloor));
  const peakAth = athSaleUsd && athSaleUsd > 0
    ? athSaleUsd 
    : (effectiveHigh > 0 ? effectiveHigh : retailSettlementFloor);

  // Census ratio: how scarce is the 9.8 apex slab compared to total float?
  const slabCensus = totalCensus98Count && totalCensus98Count > 0 ? totalCensus98Count : 50;
  const isUltraScarceSlab = slabCensus < 1000;

  // Realized CPR slabbing profit spread
  const market98Benchmark = is98Priced ? guidePrice98Usd : (effectiveHigh > 0 ? effectiveHigh : retailSettlementFloor);
  const sellingFriction = Number((market98Benchmark * 0.1325 + 25.00).toFixed(2));
  const netLiquidationProceeds = Number((market98Benchmark - sellingFriction).toFixed(2));
  const slabbingNetProfit = Number((netLiquidationProceeds - retailSettlementFloor).toFixed(2));
  const profitMarginPct = Math.round((slabbingNetProfit / retailSettlementFloor) * 100);
  const guideVsHurdlePct = ((market98Benchmark - retailSettlementFloor) / retailSettlementFloor) * 100;

  // Effective high net liquidation & profit after friction
  const effectiveHighNetLiquidation = Number((effectiveHigh * (1 - 0.1325) - 25.00).toFixed(2));
  const effectiveHighNetProfit = Number((effectiveHighNetLiquidation - retailSettlementFloor).toFixed(2));

  let verdict: InvestmentVerdict = 'HOLD';
  let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
  let verdictDisplay = 'HOLD (MARKET EQUILIBRIUM)';
  let targetLow = isRawPriced ? rawPriceUsd : retailSettlementFloor;
  let targetHigh = market98Benchmark;

  if (market98Benchmark > peakAth * 1.5 && peakAth > 0) {
    // Extreme overvaluation above historical high-water comps
    verdict = 'STRONG_SELL';
    verdictDisplay = 'STRONG SELL (OVERVALUED)';
    badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-400';
    targetLow = market98Benchmark * 0.50;
    targetHigh = market98Benchmark * 0.70;
  } else if (market98Benchmark > peakAth * 1.25 && peakAth > 0) {
    // Slabs are trading at extreme multiples above historical ATH
    verdict = 'HARVEST';
    verdictDisplay = 'HARVEST (TAKE PROFITS)';
    badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-400';
    targetLow = market98Benchmark * 0.75;
    targetHigh = market98Benchmark;
  } else if (guideVsHurdlePct < -20 && effectiveHigh >= retailSettlementFloor) {
    // Guide price is heavily suppressed below physical slabbing cost, yet actual recent sales prove hurdle absorption
    verdict = 'STRONG_BUY';
    verdictDisplay = 'STRONG BUY (CPR ARBITRAGE)';
    badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-400';
    targetLow = retailSettlementFloor;
    targetHigh = peakAth;
  } else if (slabbingNetProfit >= 45.0 && profitMarginPct >= 30.0) {
    // 9.8 market value substantially exceeds slabbing cost basis
    verdict = 'STRONG_BUY';
    verdictDisplay = 'STRONG BUY (CPR ARBITRAGE)';
    badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-400';
    targetLow = retailSettlementFloor;
    targetHigh = Math.max(peakAth, market98Benchmark);
  } else if (effectiveHighNetProfit >= 0 && isUltraScarceSlab) {
    // Verified secondary auction sales cover the cost hurdle and friction in a scarce census
    verdict = 'ACCUMULATE';
    verdictDisplay = 'ACCUMULATE (BUY WITH CAUTION)';
    badgeColor = 'bg-cyan-500/20 text-cyan-300 border-cyan-400';
    targetLow = effectiveHigh;
    targetHigh = peakAth;
  } else {
    // Graded slab value does not justify speculative grading costs; hold raw or hold current slabs
    verdict = 'HOLD';
    verdictDisplay = 'HOLD (MARKET EQUILIBRIUM)';
    badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
    targetLow = Math.round(market98Benchmark * 0.95);
    targetHigh = Math.round(market98Benchmark * 1.05);
  }

  // Downgrade impact calculation with selling friction
  const benchmark96 = grade96PriceUsd && grade96PriceUsd > 0 ? grade96PriceUsd : (market98Benchmark * 0.35);
  const netProceeds96 = Number((benchmark96 * (1 - 0.1325) - 25.0).toFixed(2));
  const downgradeLoss = Number((retailSettlementFloor - netProceeds96).toFixed(2));
  const downgradeLossPct = Math.round((downgradeLoss / retailSettlementFloor) * 100);

  // Capital math breakdown: clarify whether CPR arbitrage is positive or if slabbing creates negative margin
  const capitalVerdictDetail = slabbingNetProfit >= 0
    ? `At current 9.8 market pricing of $${market98Benchmark.toFixed(2)} (net realized $${netLiquidationProceeds.toFixed(2)} after 13.25% commission and $25 outbound shipping), successful CPR yield generates +$${slabbingNetProfit.toFixed(2)} (+${profitMarginPct}%) in positive capital expansion above cost basis.`
    : `At current 9.8 market pricing of $${market98Benchmark.toFixed(2)} (net realized $${netLiquidationProceeds.toFixed(2)} after 13.25% commission and $25 outbound shipping), slabbing this book raw incurs a -$${Math.abs(slabbingNetProfit).toFixed(2)} (${profitMarginPct}%) operational drag against the $${VERIFIED_CPR_HURDLE_USD.toFixed(2)} grading hurdle ($${retailSettlementFloor.toFixed(2)} all-in basis)—signaling that collectors should buy existing 9.8 slabs ($${market98Benchmark.toFixed(2)}) or hold raw copies ($${effectiveRaw.toFixed(2)}) rather than paying to grade raw.`;

  // Dynamic 9.8 target value range
  const targetSpreadLow = Number(Math.min(targetLow, targetHigh).toFixed(2));
  const targetSpreadHigh = Number(Math.max(targetLow, targetHigh).toFixed(2));

  // Synthesize customized 3-pillar justification focused on investment viability, monetary risk-reward, and macro news
  const isSsb01 = /Silver Surfer.*Black/i.test(series) && (issueNumber === "1" || issueNumber === "SSB01");
  const expansionMultiple = effectiveRaw > 0 ? Number((market98Benchmark / effectiveRaw).toFixed(1)) : 0;
  const expansionPct = effectiveRaw > 0 ? Math.round(((market98Benchmark - effectiveRaw) / effectiveRaw) * 100).toLocaleString("en-US") : "0";
  const slabVsGradingDiscount = Number((retailSettlementFloor - market98Benchmark).toFixed(2));
  const rawFloatDisplay = (totalRawFloat && totalRawFloat > 0 ? totalRawFloat : 129156).toLocaleString("en-US");

  const capitalTitle = isSsb01
    ? `Monetary Thesis: Raw Entry ($${effectiveRaw.toFixed(2)}) vs ${expansionMultiple}× Slab Multiple ($${market98Benchmark.toFixed(2)})`
    : `Monetary Mechanics: Raw Cost Basis vs Replacement Floor ($${retailSettlementFloor.toFixed(2)})`;

  const capitalBreakdown = isSsb01
    ? `WHY IT MAKES MONETARY SENSE:
1. Asymmetric Raw Valuation: At $${effectiveRaw.toFixed(2)}, [raw copies](/wiki/terms/fair-market-value-fmv-benchmark) trade with virtually zero [downside risk](/wiki/terms/concentration-risk) across an estimated ${rawFloatDisplay} surviving [raw copy float](/wiki/terms/market-capitalization-asset-float-cap), avoiding the grading [sunk cost](/wiki/terms/sunk-cost) trap.
2. The ${expansionMultiple}× Expansion Multiple: A raw-to-9.8 jump from $${effectiveRaw.toFixed(2)} to $${market98Benchmark.toFixed(2)} [FMV](/wiki/terms/fair-market-value-fmv-benchmark) represents a ${expansionPct}% multiple expansion over [grade compression](/wiki/terms/grade-compression). However, standalone physical slabbing costs $${VERIFIED_CPR_HURDLE_USD.toFixed(2)} in CGC Modern grading ($30), invoice ($5), and round-trip courier freight ($50), setting total grading [cost basis](/wiki/terms/cost-basis-tax-lot-accounting) at $${retailSettlementFloor.toFixed(2)}.
3. The Optimal Strategy: Because buying an already-graded CGC 9.8 slab at $${market98Benchmark.toFixed(2)} is $${slabVsGradingDiscount.toFixed(2)} cheaper than grading a raw copy yourself ($${retailSettlementFloor.toFixed(2)} basis), disciplined buyers avoid [opportunity cost](/wiki/terms/opportunity-cost) by purchasing existing slabs below replacement cost or holding raw copies ($${effectiveRaw.toFixed(2)}) for [realized gain](/wiki/terms/realized-gain-loss) and [unrealized gain](/wiki/terms/unrealized-gain-loss-unrealized-p-l) optionality.`
    : `MONETARY CAPITAL ANALYSIS:
$${VERIFIED_CPR_HURDLE_USD.toFixed(2)} all-in physical grading hurdle + $${effectiveRaw.toFixed(2)} raw acquisition sets the breakeven [cost basis](/wiki/terms/cost-basis-tax-lot-accounting) at $${retailSettlementFloor.toFixed(2)}. ${capitalVerdictDetail} At an entry of $${effectiveRaw.toFixed(2)}, [downside risk](/wiki/terms/concentration-risk) is structurally capped, while higher certified condition tiers command exponential [price discovery](/wiki/terms/price-discovery) multiples.`;

  const salesTitle = isSsb01
    ? `Investment Verdict: HOLD (Buy Existing 9.8 Slab Below $${retailSettlementFloor.toFixed(2)} Cost Basis / Hold Raw)`
    : `Secondary Liquidity & Conviction Target ($${Math.round(targetSpreadLow)} – $${Math.round(targetSpreadHigh)})`;

  const salesBreakdown = isSsb01
    ? `BOTTOM-LINE ACQUISITION GUIDANCE:
• VERDICT — HOLD (MARKET EQUILIBRIUM): Raw copies ($${effectiveRaw.toFixed(2)}) and existing CGC 9.8 slabs ($${market98Benchmark.toFixed(2)}) are rated HOLD; standalone raw-to-slab submission is negative-EV (-$${Math.abs(slabbingNetProfit).toFixed(2)} net loss after venue fees against the $${retailSettlementFloor.toFixed(2)} grading basis), capturing the [bid-ask spread](/wiki/terms/bid-ask-spread-fmv-liquidity-spread) only when buying pre-graded slabs or holding raw for [media catalysts](/wiki/terms/conglomerate-media-catalyst-equity-correlation).
• CGC 9.8 SLAB ($${market98Benchmark.toFixed(2)}): With ${slabCensus.toLocaleString("en-US")} certified 9.8 copies ([scarcity](/wiki/terms/scarcity)) out of 334 total graded slabs in the [market capitalization](/wiki/terms/market-capitalization-asset-float-cap), [Silver Surfer: Black #1](/comics/SSB01) trades at [fair market value](/wiki/terms/fair-market-value-fmv-benchmark) equilibrium below its $${peakAth.toFixed(2)} verified all-time high sale.
• SECONDARY ABSORPTION: 49 verified Cover-A comps have cleared—with graded slabs ranging from $21.50 (9.0) and $43.00 (9.2) to $${peakAth.toFixed(2)} (9.8 ATH, median $${market98Benchmark.toFixed(2)})—demonstrating transparent [market liquidity](/wiki/terms/liquidity) and active [price discovery](/wiki/terms/price-discovery).`
    : `SECONDARY MARKET REALITY:
${effectiveHighNetProfit >= 0
    ? `The secondary market mathematically supports this hurdle: recent sales cleared at $${effectiveHigh.toFixed(2)} (yielding +$${effectiveHighNetProfit.toFixed(2)} net [realized gain](/wiki/terms/realized-gain-loss) after selling costs over the $${retailSettlementFloor.toFixed(2)} [cost basis](/wiki/terms/cost-basis-tax-lot-accounting)), while peak historical auction comps reached $${peakAth.toFixed(2)} [FMV](/wiki/terms/fair-market-value-fmv-benchmark). Realized high-water comps prove that smart accumulation capital willingly pays the [key issue premium](/wiki/terms/first-appearance-key-issue-premium) when verified pristine copies emerge from a disciplined ${slabCensus.toLocaleString()}-copy [census scarcity](/wiki/terms/scarcity).`
    : `Secondary transaction volume currently records top [price discovery](/wiki/terms/price-discovery) comps at $${effectiveHigh.toFixed(2)} across a disciplined ${slabCensus.toLocaleString()}-copy [scarcity](/wiki/terms/scarcity) float. Because net realized comps after [bid-ask spread](/wiki/terms/bid-ask-spread-fmv-liquidity-spread) selling costs ($${effectiveHighNetLiquidation.toFixed(2)}) remain below the full slabbing [cost basis](/wiki/terms/cost-basis-tax-lot-accounting) hurdle ($${retailSettlementFloor.toFixed(2)}), institutional [market liquidity](/wiki/terms/liquidity) favors holding raw copies until secondary demand catches up with physical production costs.`}`;

  const catalystTitle = isSsb01
    ? `MCU Catalysts: Fantastic Four, Galactus, Knull & Secret Wars`
    : `Macro Catalysts & ${characterOrHero} Lore`;

  const catalystBody = isSsb01
    ? `RECENT NEWS & CATALYST IGNITION ENGINE:
1. [Fantastic Four](/wiki/entry/fantastic-four): First Steps & [Galactus](/wiki/entry/galactus): Official [Marvel Studios](/comics?q=Marvel) production and casting confirm [Silver Surfer](/wiki/entry/silver-surfer) (with [Shalla-Bal](/wiki/entry/shalla-bal) and [Norrin Radd](/wiki/entry/norrin-radd) lore) as the premier herald of [Galactus](/wiki/entry/galactus), driving a major [conglomerate media catalyst](/wiki/terms/conglomerate-media-catalyst-equity-correlation).
2. The [Knull](/wiki/entry/knull) / [Symbiote](/wiki/entry/symbiotes) Connection: [Knull](/wiki/entry/knull)—the creator of the symbiotes featured in [Venom](/comics?q=Venom)—is the primary antagonist of [Silver Surfer: Black #1](/comics/SSB01), wielding [All-Black the Necrosword](/wiki/entry/all-black-the-necrosword) against the [Power Cosmic](/wiki/entry/power-cosmic).
3. Cult Artistic Landmark: [Donny Cates](/wiki/entry/donny-cates)' cosmic storytelling paired with [Tradd Moore](/wiki/entry/tradd-moore)'s psychedelic visual masterwork has elevated this issue into a modern [key issue](/wiki/terms/first-appearance-key-issue-premium) grail on the [CE70 benchmark](/wiki/terms/index-weighting-ce70-benchmark) watch.`
    : (activeCatalystHeadline
        ? `Active [Conglomerate Media Catalysts](/wiki/terms/conglomerate-media-catalyst-equity-correlation): "${activeCatalystHeadline}". Ongoing studio developments, advancing cinematic rendering, and long-standing [${characterOrHero}](/wiki/entry/${encodeURIComponent(characterOrHero.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}) reverence provide asymmetric [price discovery](/wiki/terms/price-discovery) support for long-term portfolio allocation.`
        : `Macro [media catalysts](/wiki/terms/conglomerate-media-catalyst-equity-correlation)—including cinematic adaptation cycles for [${characterOrHero}](/wiki/entry/${encodeURIComponent(characterOrHero.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}) in [${series} #${issueNumber}](/comics?q=${encodeURIComponent(series)}), generational collector reverence, and tight ${slabCensus.toLocaleString()}-slab registered [census scarcity](/wiki/terms/scarcity)—support sustained institutional [market liquidity](/wiki/terms/liquidity) over a 3-year investment horizon.`);

  return {
    comicId,
    series,
    issueNumber,
    verdict,
    verdictDisplay,
    badgeColorClass: badgeColor,
    targetPriceLowUsd: targetSpreadLow,
    targetPriceHighUsd: targetSpreadHigh,
    allInSlabbingHurdleUsd: VERIFIED_CPR_HURDLE_USD,
    retailSettlementFloorUsd: retailSettlementFloor,
    pillars: {
      capitalHurdle: {
        title: capitalTitle,
        body: capitalBreakdown
      },
      salesConviction: {
        title: salesTitle,
        body: salesBreakdown
      },
      culturalCatalyst: {
        title: catalystTitle,
        body: catalystBody
      }
    }
  };
}
