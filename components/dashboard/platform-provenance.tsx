import * as React from "react";
import { ShieldCheck, BookOpen, Layers, ExternalLink } from "lucide-react";

export function PlatformProvenance() {
  return (
    <section className="rounded-xl border-2 border-pink-500/60 bg-[#0B0D14] p-6 shadow-xl transition-all research-rimlight-hover">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4 mb-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-pink-400" />
          <h2 className="text-base sm:text-lg text-slate-100 tracking-wide uppercase">
            CATALOG PROVENANCE & ARCHITECTURE
          </h2>
        </div>
        <span className="text-[11px] text-pink-300 rounded bg-pink-950/60 px-2.5 py-1 border border-pink-800/50 self-start sm:self-auto">
          THREE-TIER HARMONIZED SYSTEM
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Source 1: Panel Profits Clean */}
        <div className="rounded-lg border border-slate-800 bg-[#0F121C] p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-purple-400 uppercase tracking-wider">RECOVERED INTELLIGENCE</span>
            <span className="text-[10px] text-purple-300 bg-purple-950/50 px-2 py-0.5 rounded border border-purple-800/50">PROPRIETARY</span>
          </div>
          <h3 className="text-sm text-slate-100">Panel Profits Canonical Core</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Authoritative issue identity normalization, CGC 9.8 certified reference observations, and verified cover asset checksums.
          </p>
          <div className="pt-2 border-t border-slate-800/70 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Role: Valuation & Identity Authority</span>
          </div>
        </div>

        {/* Source 2: ComicBase */}
        <div className="rounded-lg border border-slate-800 bg-[#0F121C] p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-orange-400 uppercase tracking-wider">CATALOG & GUIDE BASELINE</span>
            <span className="text-[10px] text-orange-300 bg-orange-950/50 px-2 py-0.5 rounded border border-orange-800/50">1.2M ENTITIES</span>
          </div>
          <h3 className="text-sm text-slate-100">ComicBase Catalog Dataset</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Comprehensive comic title cataloging, release indexing, and broad current guide baseline pricing across modern and back issues.
          </p>
          <div className="pt-2 border-t border-slate-800/70 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Role: Guide Baseline & Catalog Breadth</span>
          </div>
        </div>

        {/* Source 3: Grand Comics Database */}
        <div className="rounded-lg border border-slate-800 bg-[#0F121C] p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-pink-400 uppercase tracking-wider">BIBLIOGRAPHIC ARCHIVE</span>
            <span className="text-[10px] text-pink-300 bg-pink-950/50 px-2 py-0.5 rounded border border-pink-800/50">3.4M RECORDS</span>
          </div>
          <h3 className="text-sm text-slate-100">Grand Comics Database (GCD)</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Deep academic-grade bibliographic metadata, exact publication dates, UPC identifiers, volume history, and series taxonomy.
          </p>
          <div className="pt-2 border-t border-slate-800/70 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Role: Deep Bibliographic Metadata</span>
          </div>
        </div>
      </div>
    </section>
  );
}
