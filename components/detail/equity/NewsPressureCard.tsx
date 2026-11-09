'use client';
import React from 'react';
import type { ComicNewsPressure } from '@/lib/assets/comic-pressure';
import { PRESSURE_CAP } from '@/lib/assets/outcomes';
import { fmt } from './shared';

export interface NewsPressureCardProps {
  /** Real 9.8 FMV (PriceCharting). Shown unchanged; the simulated price is derived from it, never written back. */
  baseFmv: number | null | undefined;
  /** Comic news pressure, or null when the book maps to no tracked entity. */
  newsPressure: ComicNewsPressure | null;
  eraColors: { border: string };
  /** Clock for relative times (server render time). */
  now?: number;
}

const NODE_LABEL = (id: string) => id.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

function relTime(iso: string | null, now: number): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const m = Math.max(0, Math.round((now - t) / 60_000));
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const pct = (x: number, digits = 2) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x).toFixed(digits)}%`;

/**
 * Real 9.8 FMV → simulated news-adjusted price. The left number is the real PriceCharting FMV, untouched; the right is
 * a clearly labelled simulation (FMV × e^pressure) driven only by matched, dated news stories. No matched news → no number.
 */
export default function NewsPressureCard({ baseFmv, newsPressure, eraColors, now = Date.now() }: NewsPressureCardProps) {
  const base = Number(baseFmv);
  if (!Number.isFinite(base) || base <= 0) return null;
  const accent = eraColors?.border || '#C9A227';
  const p = newsPressure?.pressure ?? 0;
  const active = !!newsPressure && p !== 0;

  const shell = 'mb-6 rounded-xl w-full relative overflow-hidden bg-[#0a0f1d]/85 backdrop-blur-md border border-white/10 shadow-lg';
  const laser = (
    <div
      aria-hidden
      className="absolute inset-x-0 top-0 h-[2px]"
      style={{ background: `linear-gradient(90deg, ${accent}00, ${accent}, ${accent}00)` }}
    />
  );
  const title = (
    <div className="flex items-center gap-2.5">
      <span className="w-2 h-4 rounded-sm" style={{ backgroundColor: accent }} />
      <span className="text-xs uppercase font-semibold font-sans text-slate-200" style={{ letterSpacing: '0.12em' }}>
        News Pressure
      </span>
      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
        SIM
      </span>
    </div>
  );

  if (!active) {
    return (
      <div className={`${shell} px-4 py-3`}>
        {laser}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {title}
          <span className="text-xs font-mono text-slate-400">No matched news in the last 30 days</span>
        </div>
      </div>
    );
  }

  const sim = base * newsPressure!.factor;
  const deltaPct = (newsPressure!.factor - 1) * 100;
  const up = p > 0;
  const tone = up ? 'text-emerald-300' : 'text-rose-300';
  const barColor = up ? '#34d399' : '#fb7185';
  // pressure within ±cap, drawn from the centre line
  const frac = Math.min(1, Math.abs(p) / PRESSURE_CAP) * 50;

  return (
    <div className={`${shell} p-4 sm:p-5`} style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      {laser}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10 flex-wrap gap-2">
        {title}
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
          Simulated · real FMV unchanged
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 sm:gap-6">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 font-sans">Real 9.8 FMV</span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-white leading-tight truncate">{fmt(base)}</span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">PriceCharting</span>
        </div>
        <span aria-hidden className="pb-6 text-slate-600 font-mono">→</span>
        <div className="flex flex-col gap-1 items-end min-w-0 text-right">
          <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 font-sans">News-adjusted (sim)</span>
          <span className={`text-xl sm:text-2xl font-bold font-mono leading-tight truncate ${tone}`}>{fmt(sim)}</span>
          <span className={`text-[11px] font-mono font-bold ${tone}`}>{pct(deltaPct)}</span>
        </div>
      </div>

      {/* pressure gauge within ±cap */}
      <div className="mt-4">
        <div className="relative h-1 rounded-full bg-white/[0.06]" role="img" aria-label={`News pressure ${pct(deltaPct)} of a ±${(PRESSURE_CAP * 100).toFixed(0)}% range`}>
          <div className="absolute top-[-3px] bottom-[-3px] left-1/2 w-px bg-white/25" />
          <div
            className="absolute top-0 bottom-0 rounded-full"
            style={{ backgroundColor: barColor, width: `${frac}%`, left: up ? '50%' : `${50 - frac}%`, boxShadow: `0 0 8px ${barColor}66` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[9px] font-mono text-slate-600">
          <span>−{(PRESSURE_CAP * 100).toFixed(0)}%</span>
          <span>0</span>
          <span>+{(PRESSURE_CAP * 100).toFixed(0)}%</span>
        </div>
      </div>

      {newsPressure!.trails.length > 0 && (
        <ul className="mt-4 divide-y divide-white/5 border-t border-white/10">
          {newsPressure!.trails.map((t) => {
            const tUp = t.effectPct > 0;
            return (
              <li key={t.eventId} className="py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {t.url ? (
                    <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-[13px] text-slate-200 hover:text-white hover:underline underline-offset-2 line-clamp-2">
                      {t.headline}
                    </a>
                  ) : (
                    <span className="text-[13px] text-slate-200 line-clamp-2">{t.headline}</span>
                  )}
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    {t.publishedAt && <span className="text-[10px] font-mono text-slate-500">{relTime(t.publishedAt, now)}</span>}
                    {t.path.map((id, i) => (
                      <React.Fragment key={`${id}-${i}`}>
                        {i > 0 && <span className="text-[9px] text-slate-600">›</span>}
                        <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-px rounded bg-white/[0.04] border border-white/10 text-slate-400">
                          {NODE_LABEL(id)}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <span className={`shrink-0 text-xs font-mono font-bold ${tUp ? 'text-emerald-300' : 'text-rose-300'}`}>{pct(t.effectPct)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
