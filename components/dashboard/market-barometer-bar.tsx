"use client";

import * as React from "react";
import Link from "next/link";
import { BarChart3, TrendingUp, TrendingDown, Clock, ShieldCheck, Activity } from "lucide-react";

import type { MarketIndexRecord } from "@/lib/market/indices";

export interface BarometerIndex {
  code: string;
  name: string;
  cadence: string;
  value: number | null;
  changePercent: number | null;
  description: string;
  href: string;
}

interface MarketBarometerBarProps {
  indices?: MarketIndexRecord[];
}

export function MarketBarometerBar({ indices = [] }: MarketBarometerBarProps) {
  const barometers = React.useMemo<BarometerIndex[]>(() => {
    const ce70 = indices.find((i) => i.indexCode === "CE70");
    const ppix100 = indices.find((i) => i.indexCode === "PPIX100");
    const cpi = indices.find((i) => i.indexCode.includes("CPI"));
    const comp = indices.find((i) => i.indexCode === "PPIX_COMPOSITE");

    return [
      {
        code: "CE70",
        name: "CE70 Sovereign Index",
        cadence: "Real-Time Blue Chip Barometer",
        value: ce70?.currentValue ?? null,
        changePercent: ce70?.percentChange ?? null,
        description: "Barometer of blue chip comic equity movement over time (70 sovereign seats). Value in index points.",
        href: "/equity/CE70",
      },
      {
        code: "PPIX 100",
        name: "PPIX 100 Multi-Era Benchmark",
        cadence: "100 Books Across Eras",
        value: ppix100?.currentValue ?? null,
        changePercent: ppix100?.percentChange ?? null,
        description: "Broader benchmark tracking 100 books across different eras measuring overall equity market health.",
        href: "/equity/PPIX100",
      },
      {
        code: "GC-CPI",
        name: "GoCollect CPI Index",
        cadence: "Checked Mon · Updated Wed",
        value: cpi?.currentValue ?? null,
        changePercent: cpi?.percentChange ?? null,
        description: "GoCollect Composite Price Index checked every Monday with official updates every Wednesday.",
        href: "/market",
      },
      {
        code: "PPIX-COMP",
        name: "PPIX Composite Index",
        cadence: "Comprehensive Health",
        value: comp?.currentValue ?? null,
        changePercent: comp?.percentChange ?? null,
        description: "Master composite index reflecting the total systemic health across all comic market tiers.",
        href: "/market",
      },
    ];
  }, [indices]);

  return (
    <section
      aria-label="Core Market Barometers and Health Indices"
      className="rounded-xl border border-slate-800 bg-[#090D18] p-5 shadow-2xl space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-emerald-400" />
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Market Barometers & Core Health Indices
            </h2>
            <p className="text-[11px] text-slate-400">
              Four canonical market gauges — CE70 blue-chip movement, broad PPIX 100 (100 books), GoCollect CPI, and PPIX Composite
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
          <Clock className="h-3 w-3 text-cyan-400" />
          <span>GoCollect CPI: Checked Mon / Updated Wed</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {barometers.map((baro) => {
          const isPositive = (baro.changePercent ?? 0) >= 0;

          return (
            <Link
              key={baro.code}
              href={baro.href}
              className="rounded-lg border border-slate-800/90 bg-[#060913] p-4 flex flex-col justify-between hover:border-emerald-500/40 hover:bg-[#0B0F20] transition-all group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 uppercase tracking-wider">
                    {baro.code}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">
                    {baro.cadence}
                  </span>
                </div>

                <h3 className="mt-2 text-xs font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors">
                  {baro.name}
                </h3>
                <p className="mt-1 text-[10px] text-slate-400 leading-snug line-clamp-2">
                  {baro.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-baseline justify-between font-mono">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block tracking-wider">
                    Index Level
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-slate-100">
                      {baro.value != null ? baro.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                    </span>
                    {baro.value != null && <span className="text-[10px] text-slate-500 font-normal">pts</span>}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] text-slate-500 uppercase block tracking-wider">
                    24h Delta
                  </span>
                  {baro.changePercent != null ? (
                    <div className={`flex items-center gap-0.5 text-xs font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      <span>{isPositive ? "+" : ""}{baro.changePercent.toFixed(2)}%</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600">—</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
