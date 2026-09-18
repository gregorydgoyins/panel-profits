import * as React from "react";
import { Database, ShieldCheck, DollarSign, Layers, BookOpen } from "lucide-react";
import { MarketUniverseMetrics, CANONICAL_MARKET_METRICS } from "@/lib/dashboard/queries";

interface MarketUniverseProps {
  metrics?: MarketUniverseMetrics;
}

export function MarketUniverse({ metrics = CANONICAL_MARKET_METRICS }: MarketUniverseProps) {
  return (
    <section className="rounded-xl border-2 border-purple-500/60 bg-[#0B0D14] p-6 shadow-xl transition-all dashboard-rimlight-hover">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4 mb-6">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-purple-400" />
          <h2 className="text-base sm:text-lg text-slate-100 tracking-wide uppercase">
            MARKET UNIVERSE COVERAGE
          </h2>
        </div>
        <span className="text-[11px] text-purple-300 rounded bg-purple-950/60 px-2.5 py-1 border border-purple-800/50 self-start sm:self-auto">
          AUTHORITATIVE DATABASE: PANEL PROFITS CLEAN
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Authoritative Comics */}
        <div className="rounded-lg border border-slate-800 bg-[#0F121C] p-3.5 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Layers className="h-3 w-3 text-purple-400" />
            <span>TOTAL CANONICAL</span>
          </div>
          <div className="text-xl sm:text-2xl text-slate-100">
            {metrics.totalAuthoritativeComics.toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-500">Authoritative records</p>
        </div>

        {/* Panel Profits Records */}
        <div className="rounded-lg border border-slate-800 bg-[#0F121C] p-3.5 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-purple-400" />
            <span>PANEL PROFITS</span>
          </div>
          <div className="text-xl sm:text-2xl text-purple-300">
            {metrics.panelProfitsIndexed}
          </div>
          <p className="text-[10px] text-slate-500">Valuation & identity links</p>
        </div>

        {/* ComicBase Entities */}
        <div className="rounded-lg border border-slate-800 bg-[#0F121C] p-3.5 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <BookOpen className="h-3 w-3 text-orange-400" />
            <span>COMICBASE</span>
          </div>
          <div className="text-xl sm:text-2xl text-orange-300">
            {metrics.comicbaseEntities}
          </div>
          <p className="text-[10px] text-slate-500">Catalog & current baseline</p>
        </div>

        {/* GCD Bibliographic */}
        <div className="rounded-lg border border-slate-800 bg-[#0F121C] p-3.5 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Layers className="h-3 w-3 text-pink-400" />
            <span>GCD METADATA</span>
          </div>
          <div className="text-xl sm:text-2xl text-pink-300">
            {metrics.gcdBibliographicRecords}
          </div>
          <p className="text-[10px] text-slate-500">Deep bibliographic records</p>
        </div>

        {/* Baseline Priced Records */}
        <div className="rounded-lg border border-slate-800 bg-[#0F121C] p-3.5 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-blue-400" />
            <span>BASELINE PRICED</span>
          </div>
          <div className="text-xl sm:text-2xl text-blue-300">
            {metrics.baselinePricedRecords}
          </div>
          <p className="text-[10px] text-slate-500">Blended 9.8 / CB baseline</p>
        </div>

        {/* Automated Cover Migration */}
        <div className="rounded-lg border border-slate-800 bg-[#0F121C] p-3.5 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            <span>COVER STORAGE</span>
          </div>
          <div className="text-xl sm:text-2xl text-emerald-300">
            ACTIVE
          </div>
          <p className="text-[10px] text-slate-500">Automated asset pipeline</p>
        </div>
      </div>
    </section>
  );
}
