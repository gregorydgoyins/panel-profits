"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CandlestickChart,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Layers,
  Activity,
  FileText,
  CheckCircle,
} from "lucide-react";
import type { EquityContract, EquityObservation, EquityConstituent } from "@/lib/equity/queries";
import { EquityCandlestickChart } from "./equity-candlestick-chart";

interface IndexDossierViewProps {
  contract: EquityContract;
  observations: EquityObservation[];
  constituents: EquityConstituent[];
}

export function IndexDossierView({
  contract,
  observations,
  constituents,
}: IndexDossierViewProps) {
  const latestObs = observations[0];
  const currentValue = latestObs?.index_value ?? null;
  const delta = latestObs?.percent_change ?? null;
  const isPositive = delta !== null ? delta >= 0 : true;

  // Convert observations to chart data points strictly from verified records
  const chartPoints = observations
    .filter((obs) => obs.index_value !== null && obs.index_value !== undefined)
    .slice(0, 30)
    .reverse()
    .map((obs, idx) => ({
      date: obs.observation_time ? obs.observation_time.slice(0, 10) : `T-${idx}`,
      value: obs.index_value!,
      volume: obs.valid_constituent_count || contract.expected_constituent_count || 1,
    }));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Top Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <Link
          href="/equities"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.16em] text-emerald-300 hover:text-emerald-200 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Equities Trading Floor
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 rounded bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-wider">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            BENCHMARK CONTRACT · {contract.index_code}
          </span>
          <span className="rounded bg-slate-900 border border-slate-800 px-2.5 py-1 text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
            {contract.production_status}
          </span>
        </div>
      </div>

      {/* Hero Index Card */}
      <div className="rounded-xl border border-slate-800 bg-[#070A11] p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <CandlestickChart className="h-5 w-5 text-emerald-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-emerald-300">
                {contract.index_code} INDEX CONTRACT
              </span>
            </div>
            <h1 className="mt-2 text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
              {contract.display_name}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
              {contract.notes || "Official Panel Profits comic equity benchmark index contract."}
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-[#0A0E18] p-5 lg:text-right shrink-0">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">
              Continuous Index Level
            </span>
            <div className="mt-1 flex items-baseline lg:justify-end gap-3">
              <span className="text-3xl sm:text-4xl font-mono font-black text-slate-100">
                {currentValue != null ? `$${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
              </span>
              {delta != null && (
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-mono font-bold ${
                    isPositive ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {isPositive ? `+${delta}%` : `${delta}%`}
                </span>
              )}
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-1 block">
              Version: {contract.methodology_version} · Status: {contract.historical_status}
            </span>
          </div>
        </div>

        {/* Quick Index Metrics */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-4 border-t border-slate-800/80">
          <div className="rounded bg-[#0B0F1A] border border-slate-800/80 p-3">
            <span className="text-[10px] uppercase text-slate-500">Constituent Seats</span>
            <p className="mt-1 text-base font-bold text-slate-100">
              {contract.expected_constituent_count.toLocaleString()}
            </p>
          </div>
          <div className="rounded bg-[#0B0F1A] border border-slate-800/80 p-3">
            <span className="text-[10px] uppercase text-slate-500">Observations Logged</span>
            <p className="mt-1 text-base font-bold text-cyan-300">
              {contract.observation_count.toLocaleString()}
            </p>
          </div>
          <div className="rounded bg-[#0B0F1A] border border-slate-800/80 p-3">
            <span className="text-[10px] uppercase text-slate-500">Price Basis</span>
            <p className="mt-1 text-sm font-bold text-slate-200 truncate">
              {contract.price_basis}
            </p>
          </div>
          <div className="rounded bg-[#0B0F1A] border border-slate-800/80 p-3">
            <span className="text-[10px] uppercase text-slate-500">Rebalance Cycle</span>
            <p className="mt-1 text-sm font-bold text-slate-200 truncate">
              {contract.rebalance_rule || "Continuous Anchor"}
            </p>
          </div>
        </div>
      </div>

      {/* Candlestick & Performance Chart */}
      <EquityCandlestickChart
        ticker={contract.index_code}
        currentPrice={currentValue ?? 0}
        deltaPercent={delta ?? 0}
        dataPoints={chartPoints}
      />

      {/* Methodology Specifications */}
      <div className="rounded-lg border border-slate-800 bg-[#070A11] p-6 shadow-2xl">
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3 mb-4">
          <FileText className="h-4 w-4 text-emerald-400" />
          <h2 className="text-base font-bold text-slate-100">
            Constitution & Governing Methodology
          </h2>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
          <div className="rounded bg-[#0A0E18] border border-slate-800/80 p-3">
            <dt className="text-[10px] font-mono uppercase text-slate-500">Selection Rule</dt>
            <dd className="mt-1 font-sans text-slate-300 leading-relaxed">{contract.selection_rule}</dd>
          </div>
          <div className="rounded bg-[#0A0E18] border border-slate-800/80 p-3">
            <dt className="text-[10px] font-mono uppercase text-slate-500">Grade Basis</dt>
            <dd className="mt-1 font-mono text-slate-200 font-bold">{contract.grade_basis || "CGC 9.8 / Historical Specimen"}</dd>
          </div>
          <div className="rounded bg-[#0A0E18] border border-slate-800/80 p-3">
            <dt className="text-[10px] font-mono uppercase text-slate-500">Weighting Rule</dt>
            <dd className="mt-1 font-mono text-slate-200">{contract.weighting_rule || "Market Cap / Specimen Scarcity Weighted"}</dd>
          </div>
        </dl>
      </div>

      {/* Constituent Seat Register */}
      <div className="rounded-lg border border-slate-800 bg-[#070A11] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-cyan-400" />
            <h2 className="text-base font-bold text-slate-100">
              Constitutional Seat Register ({constituents.length} Seats)
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Active Sovereign Members
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
              <tr>
                <th className="py-2.5 px-3">Seat</th>
                <th className="py-2.5 px-3">Historical Title & Issue</th>
                <th className="py-2.5 px-3">PPCF Entity Link</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {constituents.map((c, i) => {
                let parsedNotes: Record<string, unknown> | null = null;
                if (typeof c.notes === "string") {
                  try { parsedNotes = JSON.parse(c.notes); } catch { parsedNotes = null; }
                } else if (c.notes && typeof c.notes === "object") {
                  parsedNotes = c.notes;
                }
                const titleStr = String(parsedNotes?.title_issue || c.historical_identity);
                return (
                  <tr key={c.historical_identity || i} className="hover:bg-[#0B0F1A] transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-200">
                      #{c.seat_number ?? i + 1}
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-sans font-medium">
                      {titleStr}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {c.ppcf_id ? (
                        <Link
                          href={`/wiki/${c.ppcf_id}`}
                          className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                        >
                          {c.ppcf_id}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="rounded bg-emerald-950/50 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] text-emerald-300">
                        {c.match_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/equity/seat-${c.seat_number ?? i + 1}`}
                        className="text-emerald-400 hover:text-emerald-300 font-bold"
                      >
                        Dossier →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
