'use client';

import React, { useMemo, useState } from 'react';
import type { ChainLeg, OptionChain, OptionExpiryTenor } from '@/lib/assets/option-chain';

interface OptionChainTableProps {
  chain: OptionChain;
  title?: string;
}

function fmtUsd(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1000) return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${n.toFixed(2)}`;
}

const TENOR_STYLE: Record<OptionExpiryTenor, { badge: string; label: string }> = {
  MONTHLY: { badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40', label: 'Monthly' },
  QUARTERLY: { badge: 'bg-amber-500/15 text-amber-300 border-amber-500/40', label: 'Quarterly' },
  LEAPS: { badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40', label: 'LEAPS' },
};

export default function OptionChainTable({ chain, title }: OptionChainTableProps) {
  const expiries = useMemo(() => {
    const map = new Map<string, { expiryDate: string; expiryDays: number; turnsToExpiry: number; tenor: OptionExpiryTenor }>();
    for (const leg of chain.legs) {
      if (!map.has(leg.expiryDate)) {
        map.set(leg.expiryDate, {
          expiryDate: leg.expiryDate,
          expiryDays: leg.expiryDays,
          turnsToExpiry: leg.turnsToExpiry,
          tenor: leg.tenor || 'MONTHLY',
        });
      }
    }
    return [...map.values()].sort((a, b) => a.expiryDays - b.expiryDays);
  }, [chain.legs]);

  const [selectedExpiry, setSelectedExpiry] = useState<string>(() => expiries[0]?.expiryDate ?? '');
  const activeExpiry = expiries.find((e) => e.expiryDate === selectedExpiry) ?? expiries[0];

  const rows = useMemo(() => {
    if (!activeExpiry) return [];
    const byStrike = new Map<number, { strike: number; call: ChainLeg | null; put: ChainLeg | null }>();
    for (const leg of chain.legs) {
      if (leg.expiryDate !== activeExpiry.expiryDate) continue;
      const entry = byStrike.get(leg.strike) ?? { strike: leg.strike, call: null, put: null };
      if (leg.type === 'CALL') entry.call = leg;
      else entry.put = leg;
      byStrike.set(leg.strike, entry);
    }
    return [...byStrike.values()].sort((a, b) => a.strike - b.strike);
  }, [chain.legs, activeExpiry]);

  if (!activeExpiry || rows.length === 0) return null;

  const atmStrike = rows.reduce((best, r) =>
    Math.abs(r.strike - chain.S) < Math.abs(best - chain.S) ? r.strike : best,
    rows[0].strike,
  );

  return (
    <div className="mt-5 rounded-xl border border-cyan-500/25 bg-[#090f19]/95 p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-cyan-200">
              {title || `${chain.underlyingRoot} Option Chain — Monthlies, Quarterlies & LEAPS`}
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-emerald-300">
              1-COPY CONTRACTS · 3RD FRIDAYS
            </span>
          </div>
          <p className="mt-1 text-[11px] font-mono text-slate-400">
            Underlying: {chain.gradeBasis} · Spot {fmtUsd(chain.S)} · Front ATM IV {(chain.atmIv30 * 100).toFixed(1)}% ·
            Total OI {(chain.openInterestCalls + chain.openInterestPuts).toLocaleString()} (P/C {chain.putCallRatio != null ? chain.putCallRatio.toFixed(2) : '—'})
          </p>
        </div>
      </div>

      {/* Expiry Selector Tabs (Monthlies / Quarterlies / LEAPS) */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {expiries.map((exp) => {
          const isSelected = exp.expiryDate === activeExpiry.expiryDate;
          const style = TENOR_STYLE[exp.tenor] ?? TENOR_STYLE.MONTHLY;
          return (
            <button
              key={exp.expiryDate}
              type="button"
              onClick={() => setSelectedExpiry(exp.expiryDate)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono transition-all cursor-pointer border flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-cyan-500/25 border-cyan-400 text-white font-bold shadow-[0_0_12px_rgba(34,211,238,0.28)]'
                  : 'bg-slate-900/80 border-slate-700/80 text-slate-300 hover:border-cyan-500/50 hover:text-white'
              }`}
            >
              <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-wider ${style.badge}`}>
                {style.label}
              </span>
              <span>{exp.expiryDate}</span>
              <span className="text-slate-400">({exp.expiryDays}d / {exp.turnsToExpiry}t)</span>
            </button>
          );
        })}
      </div>

      {/* Institutional T-Board: CALLS | STRIKE | PUTS */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse font-mono text-[11px]">
          <thead>
            <tr className="border-b border-slate-700 text-[10px] uppercase tracking-wider text-slate-400">
              <th colSpan={5} className="py-1.5 px-2 text-center bg-emerald-950/35 text-emerald-300 border-r border-slate-800">
                Calls (Right to Buy 1 Copy)
              </th>
              <th className="py-1.5 px-2 text-center bg-slate-900 text-white">Strike</th>
              <th colSpan={5} className="py-1.5 px-2 text-center bg-rose-950/35 text-rose-300 border-l border-slate-800">
                Puts (Right to Sell 1 Copy)
              </th>
            </tr>
            <tr className="border-b border-slate-800 bg-slate-950/70 text-[10px] uppercase text-slate-400">
              <th className="py-1.5 px-2 text-left">OCC Contract</th>
              <th className="py-1.5 px-2 text-right">Premium</th>
              <th className="py-1.5 px-2 text-right">Intr / Time</th>
              <th className="py-1.5 px-2 text-right">IV · Δ</th>
              <th className="py-1.5 px-2 text-right border-r border-slate-800">Θ/d · OI</th>
              <th className="py-1.5 px-2 text-center bg-slate-900/90 text-cyan-200">Strike $</th>
              <th className="py-1.5 px-2 text-left border-l border-slate-800">OCC Contract</th>
              <th className="py-1.5 px-2 text-right">Premium</th>
              <th className="py-1.5 px-2 text-right">Intr / Time</th>
              <th className="py-1.5 px-2 text-right">IV · Δ</th>
              <th className="py-1.5 px-2 text-right">Θ/d · OI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {rows.map(({ strike, call, put }) => {
              const isAtm = strike === atmStrike;
              const callItm = strike < chain.S;
              const putItm = strike > chain.S;
              return (
                <tr key={strike} className={isAtm ? 'bg-cyan-950/30' : 'hover:bg-white/[0.03]'}>
                  {/* CALLS */}
                  <td className={`py-2 px-2 text-left whitespace-nowrap ${callItm ? 'bg-emerald-950/20 text-emerald-200' : 'text-slate-300'}`}>
                    {call?.optionSymbol ?? '—'}
                  </td>
                  <td className={`py-2 px-2 text-right font-bold whitespace-nowrap ${callItm ? 'bg-emerald-950/20 text-emerald-300' : 'text-white'}`}>
                    {call ? fmtUsd(call.premium) : '—'}
                  </td>
                  <td className={`py-2 px-2 text-right whitespace-nowrap text-[10px] text-slate-400 ${callItm ? 'bg-emerald-950/20' : ''}`}>
                    {call ? `${fmtUsd(call.intrinsicValue)} + ${fmtUsd(call.timeValue)}` : '—'}
                  </td>
                  <td className={`py-2 px-2 text-right whitespace-nowrap text-slate-300 ${callItm ? 'bg-emerald-950/20' : ''}`}>
                    {call ? `${(call.iv * 100).toFixed(1)}% · ${call.delta.toFixed(2)}` : '—'}
                  </td>
                  <td className={`py-2 px-2 text-right whitespace-nowrap text-[10px] text-slate-400 border-r border-slate-800 ${callItm ? 'bg-emerald-950/20' : ''}`}>
                    {call ? `${call.thetaPerDay.toFixed(2)} · ${call.openInterest}` : '—'}
                  </td>

                  {/* STRIKE */}
                  <td className="py-2 px-2.5 text-center font-extrabold whitespace-nowrap bg-slate-900/90 text-white">
                    <span>{fmtUsd(strike)}</span>
                    {isAtm && (
                      <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded bg-cyan-500/25 text-cyan-300 border border-cyan-400/40">
                        ATM
                      </span>
                    )}
                  </td>

                  {/* PUTS */}
                  <td className={`py-2 px-2 text-left whitespace-nowrap border-l border-slate-800 ${putItm ? 'bg-rose-950/20 text-rose-200' : 'text-slate-300'}`}>
                    {put?.optionSymbol ?? '—'}
                  </td>
                  <td className={`py-2 px-2 text-right font-bold whitespace-nowrap ${putItm ? 'bg-rose-950/20 text-rose-300' : 'text-white'}`}>
                    {put ? fmtUsd(put.premium) : '—'}
                  </td>
                  <td className={`py-2 px-2 text-right whitespace-nowrap text-[10px] text-slate-400 ${putItm ? 'bg-rose-950/20' : ''}`}>
                    {put ? `${fmtUsd(put.intrinsicValue)} + ${fmtUsd(put.timeValue)}` : '—'}
                  </td>
                  <td className={`py-2 px-2 text-right whitespace-nowrap text-slate-300 ${putItm ? 'bg-rose-950/20' : ''}`}>
                    {put ? `${(put.iv * 100).toFixed(1)}% · ${put.delta.toFixed(2)}` : '—'}
                  </td>
                  <td className={`py-2 px-2 text-right whitespace-nowrap text-[10px] text-slate-400 ${putItm ? 'bg-rose-950/20' : ''}`}>
                    {put ? `${put.thetaPerDay.toFixed(2)} · ${put.openInterest}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
