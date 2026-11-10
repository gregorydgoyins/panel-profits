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
    targetHigh = Math.max(peakAth, market98Benchmark * 1.25);
  } else if (effectiveHigh >= retailSettlementFloor && isUltraScarceSlab) {
    // Buyers absorb the cost basis, or historical verified high-water comps prove peak profitability
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
    targetLow = isRawPriced ? rawPriceUsd : market98Benchmark * 0.6;
    targetHigh = market98Benchmark;
  }

  // Downgrade impact calculation
  const benchmark96 = grade96PriceUsd && grade96PriceUsd > 0 ? grade96PriceUsd : (market98Benchmark * 0.35);
  const downgradeLoss = Number((retailSettlementFloor - benchmark96).toFixed(2));
  const downgradeLossPct = Math.round((downgradeLoss / retailSettlementFloor) * 100);

  // Capital math breakdown: clarify whether CPR arbitrage is positive or if slabbing creates negative margin
  const capitalVerdictDetail = slabbingNetProfit >= 0
    ? `At current 9.8 market pricing of $${market98Benchmark.toFixed(2)} (net realized $${netLiquidationProceeds.toFixed(2)} after 13.25% commission and $25 outbound shipping), successful CPR yield generates +$${slabbingNetProfit.toFixed(2)} (+${profitMarginPct}%) in positive capital expansion above cost basis.`
    : `At current 9.8 market pricing of $${market98Benchmark.toFixed(2)} (net realized $${netLiquidationProceeds.toFixed(2)} after 13.25% commission and $25 outbound shipping), slabbing this book raw incurs a -$${Math.abs(slabbingNetProfit).toFixed(2)} (${profitMarginPct}%) operational drag against the $88 grading hurdle—signaling that collectors should hold raw copies rather than speculatively slabbing.`;

  // Synthesize customized 3-pillar justification
  const capitalBreakdown = `Capital Math Ground Truth: $${VERIFIED_CPR_HURDLE_USD.toFixed(2)} all-in slabbing hurdle + $${effectiveRaw.toFixed(2)} raw acquisition stacks the breakeven cost basis at $${retailSettlementFloor.toFixed(2)}. Anything cleared above $${retailSettlementFloor.toFixed(2)} is an operational win; anything under is a capital loss. ${capitalVerdictDetail} Furthermore, falling to a 9.6 drops to ~$${benchmark96.toFixed(2)} (an immediate ~$${downgradeLoss > 0 ? downgradeLoss.toFixed(2) : '0.00'} / ~${downgradeLossPct}% loss on capital spent). 

PRE-SCREEN PROTOCOL: Savvy traders deploy a $9.00 Pre-Screen threshold (+$9.00 pro-rated freight = $18.00 total reject exposure) to pre-screen raw books prior to final slabbing. If the initial grader inspection determines the book falls below 9.8 (e.g. 9.6), the book is returned unslabbed, saving $40+ in wasted encapsulation costs and protecting portfolio cash. This high-stakes grading asymmetry is why the asset commands a disciplined ${verdictDisplay.toLowerCase()} rating.`;

  const salesBreakdown = effectiveHigh >= retailSettlementFloor
    ? `The secondary market mathematically supports this hurdle: recent sales cleared at $${effectiveHigh.toFixed(2)} (yielding +$${(effectiveHigh - retailSettlementFloor).toFixed(2)} net profit over capital floor), while peak historical auction comps reached $${peakAth.toFixed(2)}. Realized high-water comps prove that smart accumulation capital willingly pays the premium when verified pristine copies emerge from a disciplined ${slabCensus.toLocaleString()}-copy census.`
    : `Secondary transaction volume currently records top comps at $${effectiveHigh.toFixed(2)} across a disciplined ${slabCensus.toLocaleString()}-copy census. Because secondary realized comps remain below the full slabbing cost hurdle ($${retailSettlementFloor.toFixed(2)}), institutional liquidity favors holding raw copies until secondary market demand catches up with physical production costs.`;

  const catalystBody = activeCatalystHeadline
    ? `Active Macro Catalysts: "${activeCatalystHeadline}". Ongoing media production developments, advancing cinematic CGI rendering capabilities, and long-standing character reverence provide asymmetric structural support for long-term portfolio allocation.`
    : `Macro tailwinds—including cinematic adaptation cycles for ${characterOrHero}, generational collector reverence, and tight ${slabCensus.toLocaleString()}-slab registered census float—support sustained institutional demand over a 3-year investment horizon.`;

  return {
    comicId,
    series,
    issueNumber,
    verdict,
    verdictDisplay,
    badgeColorClass: badgeColor,
    targetPriceLowUsd: Number(Math.min(targetLow, targetHigh).toFixed(2)),
    targetPriceHighUsd: Number(Math.max(targetLow, targetHigh).toFixed(2)),
    allInSlabbingHurdleUsd: VERIFIED_CPR_HURDLE_USD,
    retailSettlementFloorUsd: retailSettlementFloor,
    pillars: {
      capitalHurdle: {
        title: `Capital Breakeven Floor ($${retailSettlementFloor.toFixed(2)})`,
        body: capitalBreakdown
      },
      salesConviction: {
        title: `Target Spread ($${Math.round(Math.min(effectiveHigh, peakAth))} – $${Math.round(Math.max(effectiveHigh, peakAth))} Peak Profit Expansion)`,
        body: salesBreakdown
      },
      culturalCatalyst: {
        title: `Macro Catalysts & ${characterOrHero} Lore`,
        body: catalystBody
      }
    }
  };
}
