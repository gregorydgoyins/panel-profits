import * as React from "react";
import { DollarSign, ShieldAlert, CheckCircle2, HelpCircle } from "lucide-react";

export function PriceIntelligenceCoverage() {
  return (
    <section className="rounded-xl border-2 border-blue-500/60 bg-[#0B0D14] p-6 shadow-xl transition-all trading-rimlight-hover">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4 mb-6">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-blue-400" />
          <h2 className="text-base sm:text-lg text-slate-100 tracking-wide uppercase">
            PRICE INTELLIGENCE ARCHITECTURE
          </h2>
        </div>
        <span className="text-[11px] text-blue-300 rounded bg-blue-950/60 px-2.5 py-1 border border-blue-800/50 self-start sm:self-auto">
          TRANSPARENT VALUATION METHODOLOGY
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Tier 1: Panel Profits 9.8 */}
        <div className="rounded-lg border border-slate-800 bg-[#0F121C] p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-400 uppercase tracking-wider">TIER 1 · PRIMARY BENCHMARK</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/50">CGC 9.8</span>
          </div>
          <h3 className="text-sm text-slate-100">Panel Profits Certified 9.8 Price</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Historical and promoted grade 9.8 market observations specific to high-grade certified copies across tracked major issues.
          </p>
          <div className="pt-2 border-t border-slate-800/70 text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            <span>Highest precision high-grade baseline</span>
          </div>
        </div>

        {/* Tier 2: ComicBase Baseline */}
        <div className="rounded-lg border border-slate-800 bg-[#0F121C] p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-400 uppercase tracking-wider">TIER 2 · BROAD CATALOG</span>
            <span className="text-[10px] text-blue-300 bg-blue-950/50 px-2 py-0.5 rounded border border-blue-800/50">CATALOG BASELINE</span>
          </div>
          <h3 className="text-sm text-slate-100">ComicBase Reference Pricing</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Broad baseline guide valuation covering over 1.2M catalog entries, providing foundational market reference for uncertified copies.
          </p>
          <div className="pt-2 border-t border-slate-800/70 text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-blue-400" />
            <span>Comprehensive catalog breadth</span>
          </div>
        </div>

        {/* Tier 3: Honest Disclosures */}
        <div className="rounded-lg border border-slate-800 bg-[#0F121C] p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-400 uppercase tracking-wider">INTEGRITY & DISCLOSURE</span>
            <span className="text-[10px] text-amber-300 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/50">HONEST LABELS</span>
          </div>
          <h3 className="text-sm text-slate-100">Zero Synthetic Extrapolation</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Unpriced issues are honestly marked &ldquo;Unpriced&rdquo; rather than assigned fake zeroes. Grade 9.8 values are never conflated with raw or lower-grade comics.
          </p>
          <div className="pt-2 border-t border-slate-800/70 text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldAlert className="h-3 w-3 text-amber-400" />
            <span>No fake charts or simulated volume</span>
          </div>
        </div>
      </div>
    </section>
  );
}
