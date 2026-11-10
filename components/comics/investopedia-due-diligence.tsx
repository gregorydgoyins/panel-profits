import React from "react";

interface InvestopediaDueDiligenceProps {
  fmvPrice: number;
  series: string;
  issueNumber: string;
  publicationYear?: number | null;
  keyStatus?: string;
  storyTitle?: string;
  synopsis?: string;
  characters?: string;
  writer?: string;
  penciler?: string;
  inker?: string;
  colorist?: string;
  letterer?: string;
  editor?: string;
  genre?: string;
}

export function InvestopediaDueDiligence({
  fmvPrice,
  series,
  issueNumber,
  publicationYear,
  keyStatus,
  storyTitle,
  synopsis,
  characters,
  writer,
  penciler,
  inker,
  colorist,
  letterer,
  editor,
  genre = "Superhero",
}: InvestopediaDueDiligenceProps) {
  // Institutional financial mechanics modeled directly from FMV
  const wholesaleBidUsd = Number((fmvPrice * 0.72).toFixed(2));
  const retailAskUsd = Number((fmvPrice * 1.15).toFixed(2));
  const bidAskSpreadPercent = Math.round(((retailAskUsd - wholesaleBidUsd) / retailAskUsd) * 100);
  const downsideCushionPercent = Math.round(((fmvPrice - wholesaleBidUsd) / fmvPrice) * 100);

  // Dynamic Investopedia Term Selection
  const isHighValue = fmvPrice >= 500;
  const isMidValue = fmvPrice >= 100 && fmvPrice < 500;

  const concept = isHighValue
    ? {
        term: "Float Scarcity Premium & Capital Preservation Floor",
        category: "Microstructure & Sovereign Asset Allocation",
        definition:
          "In illiquid alternative asset markets, sovereign blue-chip holdings trade at an exponential multiple over mid-grade float due to institutional accumulation and inelastic seller reservation prices.",
        application: `At an FMV anchor of $${fmvPrice.toFixed(2)}, certified high-grade copies of ${series} #${issueNumber} exhibit institutional capital preservation characteristics. Dealer buy-lists support a $${wholesaleBidUsd.toFixed(2)} floor, establishing a ${downsideCushionPercent}% structural downside cushion.`,
      }
    : isMidValue
    ? {
        term: "Arbitrage Dislocation & Bid-Ask Spread Capture",
        category: "Relative Value & Market Microstructure",
        definition:
          "A pricing discrepancy between an auction listing and the prevailing cleared consensus value across organized exchanges, allowing rapid liquidity capture before market equilibrium reconverges.",
        application: `Dealer bids clear at $${wholesaleBidUsd.toFixed(2)} against a retail ask of $${retailAskUsd.toFixed(2)} (${bidAskSpreadPercent}% spread). Purchasing near or below the wholesale floor allows immediate liquidation into dealer networks or secondary exchange rails with minimal duration risk.`,
      }
    : {
        term: "Liquidity Discount Recovery & Slabbing Subsidy",
        category: "Cost Basis & Sunk Cost Arbitrage",
        definition:
          "The recovery of third-party encapsulation and grading expenditures when an asset is acquired at a discount below the physical cost of replacement grading fees, shipping, and insurance.",
        application: `Standard third-party slabbing fees and insurance average $45–$65 per book. At an entry valuation of $${fmvPrice.toFixed(2)}, the grading expense represents a substantial built-in subsidy, providing downside protection against raw comic volatility.`,
      };

  return (
    <div className="bg-[#070C18] border border-emerald-500/40 rounded-xl p-4 sm:p-5 space-y-4 shadow-xl font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-bold text-emerald-400 uppercase flex items-center gap-1.5">
            <span>💼</span> PURCHASER DUE DILIGENCE &amp; VALUATION FRAMEWORK
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
            {concept.category}
          </span>
        </div>
        <span className="text-[10px] text-slate-400">
          Institutional Asset Framework
        </span>
      </div>

      {/* Financial Concept Hero */}
      <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-300 uppercase">
            {concept.term}
          </span>
          <span className="text-[10px] text-emerald-400/80">
            Valuation Reference
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          {concept.definition}
        </p>
        <div className="border-t border-emerald-500/20 pt-2 text-xs text-emerald-200/90 font-sans leading-relaxed">
          <strong className="text-emerald-400 font-mono text-[11px] block uppercase mb-0.5">
            Direct Asset Application ({series} #{issueNumber}):
          </strong>
          {concept.application}
        </div>
      </div>

      {/* Quantitative Due Diligence Triad */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-center">
        <div className="bg-black/60 p-3 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase block font-bold">Modeled Dealer Bid</span>
          <strong className="text-white text-sm sm:text-base block my-0.5">
            ${wholesaleBidUsd.toFixed(2)}
          </strong>
          <span className="text-[9px] text-slate-500 block">Wholesale Buy-List Floor</span>
        </div>
        <div className="bg-black/60 p-3 rounded-lg border border-slate-800">
          <span className="text-[10px] text-emerald-400 uppercase block font-bold">Retail Ask Price</span>
          <strong className="text-emerald-300 text-sm sm:text-base block my-0.5">
            ${retailAskUsd.toFixed(2)}
          </strong>
          <span className="text-[9px] text-slate-500 block">Top Dealer Catalog Asking</span>
        </div>
        <div className="bg-black/60 p-3 rounded-lg border border-slate-800">
          <span className="text-[10px] text-amber-400 uppercase block font-bold">Bid-Ask Spread</span>
          <strong className="text-amber-300 text-sm sm:text-base block my-0.5">
            {bidAskSpreadPercent}%
          </strong>
          <span className="text-[9px] text-slate-500 block">Market Liquidity Margin</span>
        </div>
        <div className="bg-black/60 p-3 rounded-lg border border-slate-800">
          <span className="text-[10px] text-cyan-400 uppercase block font-bold">Downside Cushion</span>
          <strong className="text-cyan-300 text-sm sm:text-base block my-0.5">
            {downsideCushionPercent}%
          </strong>
          <span className="text-[9px] text-slate-500 block">Protection from Wholesale Floor</span>
        </div>
      </div>

      {/* GCD Bibliographic Lore & Creative Due Diligence */}
      <div className="bg-black/60 border border-slate-800 rounded-lg p-3.5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
          <span className="text-[11px] font-bold text-purple-300 uppercase flex items-center gap-1.5">
            <span>📚</span> GRAND COMICS DATABASE (GCD) BIBLIOGRAPHIC CANON &amp; CREATOR ROSTER
          </span>
          {keyStatus && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/40 font-bold uppercase">
              {keyStatus}
            </span>
          )}
        </div>

        {storyTitle && (
          <div className="text-xs text-slate-200">
            <span className="text-slate-400">Story Title: </span>
            <strong className="text-cyan-300 font-sans">"{storyTitle}"</strong>
          </div>
        )}

        {synopsis && (
          <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-3">
            {synopsis}
          </p>
        )}

        {characters && (
          <div className="text-[11px] text-slate-400 font-sans">
            <span className="font-mono text-slate-500 font-bold uppercase text-[10px]">Characters: </span>
            <span className="text-slate-300">{characters}</span>
          </div>
        )}

        {/* Creator Roster */}
        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
          {writer && (
            <div>
              <span className="text-[9px] uppercase text-slate-500 block">Writer</span>
              <strong className="text-white truncate block">{writer}</strong>
            </div>
          )}
          {penciler && (
            <div>
              <span className="text-[9px] uppercase text-slate-500 block">Penciler</span>
              <strong className="text-white truncate block">{penciler}</strong>
            </div>
          )}
          {inker && (
            <div>
              <span className="text-[9px] uppercase text-slate-500 block">Inker</span>
              <strong className="text-white truncate block">{inker}</strong>
            </div>
          )}
          {colorist && (
            <div>
              <span className="text-[9px] uppercase text-slate-500 block">Colorist</span>
              <strong className="text-white truncate block">{colorist}</strong>
            </div>
          )}
          {letterer && (
            <div>
              <span className="text-[9px] uppercase text-slate-500 block">Letterer</span>
              <strong className="text-white truncate block">{letterer}</strong>
            </div>
          )}
          {editor && (
            <div>
              <span className="text-[9px] uppercase text-slate-500 block">Editor</span>
              <strong className="text-white truncate block">{editor}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
