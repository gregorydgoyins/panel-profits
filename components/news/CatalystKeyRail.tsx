"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, ShieldAlert, Sparkles, TrendingUp, BookOpen, Layers, Award, Zap } from "lucide-react";
import type { CatalystAnalysis } from "@/lib/news/catalyst";
import { EvidenceStrip, useBookEvidence } from "@/components/news/use-book-evidence";

interface CatalystKeyRailProps {
  analysis: CatalystAnalysis;
}

export function CatalystKeyRail({ analysis }: CatalystKeyRailProps) {
  const evidence = useBookEvidence(analysis.affectedComics.map((c) => c.title));
  const impactBadgeClass =
    analysis.marketImpact === "VOLATILITY"
      ? "bg-cyan-950/60 border-cyan-500/50 text-cyan-300"
      : "bg-slate-900 border-slate-700 text-slate-300";

  return (
    <div className="mt-6 border border-slate-800 bg-[#070A10] p-4 sm:p-5 rounded-lg shadow-inner">
      {/* Top Catalyst Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-300 font-semibold">
            Market Catalyst Intelligence
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded border text-[10px] font-mono font-semibold uppercase tracking-wider ${impactBadgeClass}`}>
            {analysis.marketImpact === "VOLATILITY" ? "Volatility catalyst" : "No market link"}
          </span>
          <span className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] font-mono text-slate-300 uppercase tracking-wider">
            {analysis.catalystLabel}
          </span>
        </div>
      </div>

      {/* Catalyst Reasoning */}
      <p className="mt-3 text-xs leading-relaxed text-slate-400">
        {analysis.reasoning}
      </p>

      {/* Linked Comic Equity Key Issues Rail */}
      {analysis.affectedComics.length > 0 && (
        <div className="mt-4 border-t border-slate-800/60 pt-3">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2.5">
            <Layers className="h-3 w-3 text-cyan-400" />
            <span>Target Comic Equities & Sovereign Key Issues:</span>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {analysis.affectedComics.map((comic) => (
              <div
                key={comic.title}
                className="group flex items-start justify-between gap-3 rounded border border-slate-800/80 bg-[#0B0F17] p-3 transition-colors hover:border-cyan-500/50 hover:bg-[#101622]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono font-bold text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
                      {comic.ticker}
                    </span>
                    <span className="font-semibold text-xs text-slate-200 group-hover:text-cyan-200 transition-colors truncate">
                      {comic.series} #{comic.issueNumber}
                    </span>
                  </div>

                  <p className="mt-1 text-[11px] text-slate-400 font-medium">
                    {comic.keySignificance}
                  </p>

                  <div className="mt-2">
                    <EvidenceStrip evidence={evidence[comic.title]} />
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  <Link
                    href={`/comics?q=${encodeURIComponent(comic.catalogQuery)}`}
                    className="flex items-center gap-1 rounded bg-cyan-950/40 border border-cyan-500/40 px-2 py-1 text-[10px] font-mono font-semibold text-cyan-300 hover:bg-cyan-900/60 transition-colors"
                    title="Trade on Autonomous Exchange"
                  >
                    <Zap className="h-3 w-3 text-cyan-400" />
                    <span>TRADE</span>
                  </Link>
                  <Link
                    href={`/comics?q=${encodeURIComponent(comic.catalogQuery)}`}
                    className="rounded p-1.5 text-slate-500 hover:text-cyan-300 hover:bg-slate-800/60 transition-colors"
                    title="Inspect in Master Catalog"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
