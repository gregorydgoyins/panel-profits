"use client";

import React, { useState } from "react";
import { ShieldCheck, ShieldAlert, Filter, CheckCircle2, AlertTriangle, Layers, Info, ExternalLink } from "lucide-react";
import type { SaleAuditRecord } from "@/lib/pricing/sold-listings";

interface SalesProvenanceAuditCardProps {
  audit: SaleAuditRecord;
  accentColor?: string;
  series: string;
  issueNumber: string;
  variantName?: string | null;
}

export function SalesProvenanceAuditCard({
  audit,
  accentColor = "#10b981",
  series,
  issueNumber,
  variantName,
}: SalesProvenanceAuditCardProps) {
  const [filterReason, setFilterReason] = useState<string | null>(null);
  const [showRejectedList, setShowRejectedList] = useState<boolean>(false);

  const displayedRejected = filterReason
    ? audit.rejectedSales.filter((s) => s.reason === filterReason)
    : audit.rejectedSales;

  return (
    <div className="rounded-xl bg-[#090d16] border border-white/10 p-5 shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-white font-sans">
              Transaction Comps &amp; Entity Isolation Ledger
            </h3>
          </div>
          <p className="text-xs text-slate-400 font-sans">
            Strict algorithmic segregation separating clean single-issue {variantName ? `"${variantName}"` : "Cover A"} sales from multi-issue lot bundles, retailer exclusives, and foreign variants.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
            {audit.acceptedCount} Clean Comps
          </span>
          <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300">
            {audit.rejectedCount} Filtered Out
          </span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-black/40 border border-white/10 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Total Analyzed</span>
          <div className="text-lg font-bold font-mono text-white">{audit.totalRaw}</div>
          <span className="text-[9px] text-slate-500">Market transactions</span>
        </div>
        <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">Accepted Clean Comps</span>
          <div className="text-lg font-bold font-mono text-emerald-300">{audit.acceptedCount}</div>
          <span className="text-[9px] text-emerald-400/80">Governing FMV / ATH</span>
        </div>
        <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400">Filtered Sales</span>
          <div className="text-lg font-bold font-mono text-rose-300">{audit.rejectedCount}</div>
          <span className="text-[9px] text-rose-400/80">Contamination purged</span>
        </div>
        <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/30 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">Signal Purity</span>
          <div className="text-lg font-bold font-mono text-cyan-300">
            {audit.totalRaw > 0 ? `${Math.round((audit.acceptedCount / audit.totalRaw) * 100)}%` : "100%"}
          </div>
          <span className="text-[9px] text-cyan-400/80">Zero noisy lots</span>
        </div>
      </div>

      {/* Rejection Breakdown Pills */}
      {audit.rejectedCount > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-300 font-sans flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              Contamination Breakdown By Rule
            </span>
            {filterReason && (
              <button
                type="button"
                onClick={() => setFilterReason(null)}
                className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
              >
                Clear filter (show all {audit.rejectedCount})
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(audit.rejectionBreakdown).map(([reason, count]) => {
              const active = filterReason === reason;
              return (
                <button
                  key={reason}
                  type="button"
                  onClick={() => {
                    setFilterReason(active ? null : reason);
                    setShowRejectedList(true);
                  }}
                  className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-2 ${
                    active
                      ? "bg-rose-500/30 text-rose-200 border-rose-400 shadow-md scale-[1.02]"
                      : "bg-black/40 text-slate-300 border-white/10 hover:border-rose-500/40 hover:bg-rose-950/20"
                  }`}
                >
                  <span className="truncate max-w-[220px]">{reason}</span>
                  <span className="px-1.5 py-0.2 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-[10px]">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Inspectable Excluded Transactions Table Toggle */}
      {audit.rejectedCount > 0 && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowRejectedList(!showRejectedList)}
            className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>{showRejectedList ? "▼ Hide" : "▶ Inspect"} {displayedRejected.length} Filtered Transactions</span>
            <span className="text-[10px] text-slate-500">
              (Excluded from ATH &amp; FMV calculation to prevent valuation distortion)
            </span>
          </button>

          {showRejectedList && (
            <div className="mt-3 rounded-lg border border-white/10 bg-black/60 overflow-hidden">
              <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
                {displayedRejected.map((sale, idx) => (
                  <div key={idx} className="p-2.5 hover:bg-white/5 transition-colors text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="text-slate-200 truncate font-sans text-xs" title={sale.title}>
                        {sale.title}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{sale.saleDate}</span>
                        {sale.venue && <span>• {sale.venue}</span>}
                        {sale.grade && <span className="text-cyan-400 font-bold">[{sale.grade}]</span>}
                      </div>
                    </div>
                    <div className="flex items-center sm:flex-col sm:items-end justify-between gap-1 flex-shrink-0">
                      <span className="font-bold text-white text-xs">
                        ${sale.priceUsd.toFixed(2)}
                      </span>
                      <span className="text-[9px] font-sans px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/30 text-rose-300">
                        {sale.reason}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
