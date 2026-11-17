'use client';
import React, { useState } from 'react';
import type { GradeArbitrage, GradePeer } from '@/lib/pricing/grade-arbitrage';

const POS = '#3b82f6'; // profit (blue)
const NEG = '#d97706'; // loss (orange)
const SELF = '#22d3ee';
const PEER = '#64748b';

const usd = (n: number) => `${n < 0 ? '−' : ''}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
const pct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`;

function Stat({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'pos' | 'neg' }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
      <span className="text-[10px] uppercase tracking-wider text-slate-400">{label}</span>
      <span className="text-lg font-bold font-mono text-slate-100 flex items-center gap-1.5">
        {tone && <span className="inline-block w-2 h-2 rounded-full" style={{ background: tone === 'pos' ? POS : NEG }} />}
        {value}
      </span>
      {note && <span className="text-[10px] font-mono text-slate-500">{note}</span>}
    </div>
  );
}

/** Scatter: 9.8 share (x) vs 9.8÷9.6 price multiple (y) for the era's most-graded books. */
function ScarcityScatter({ peers, a, title }: { peers: GradePeer[]; a: GradeArbitrage; title: string }) {
  const [hover, setHover] = useState<GradePeer | null>(null);
  const pts = peers.filter((p) => p.mult98_96 != null);
  if (pts.length < 3) return null;
  const W = 520, H = 260, L = 44, R = 12, T = 12, B = 34;
  const xMax = Math.max(...pts.map((p) => p.share98), a.eraMedianShare98 ?? 0) * 1.1 || 1;
  const ys = pts.map((p) => p.mult98_96 as number);
  const yMin = Math.max(0, Math.min(...ys) * 0.9), yMax = Math.max(...ys, a.eraMedianMult98_96 ?? 0) * 1.08;
  const x = (v: number) => L + (v / xMax) * (W - L - R);
  const y = (v: number) => T + (1 - (v - yMin) / (yMax - yMin)) * (H - T - B);
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * xMax);
  const yTicks = [0, 0.5, 1].map((f) => yMin + f * (yMax - yMin));
  const self = pts.find((p) => p.isSelf);
  return (
    <div className="rounded-lg border border-white/10 bg-[#0c1322] p-3">
      <div className="text-xs font-semibold text-slate-200">Scarcer 9.8s → bigger 9.8 premium</div>
      <div className="text-[10px] text-slate-400 mb-2">
        {a.eraMedianShare98 != null ? `${pts.length} most-graded books of the era · dashed lines = era medians` : `${pts.length} most-graded books of the era`}
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`9.8 share versus 9.8 to 9.6 price multiple; ${title} highlighted`}>
          {yTicks.map((t) => (
            <g key={`y${t}`}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#ffffff" strokeOpacity={0.06} />
              <text x={L - 6} y={y(t) + 3} textAnchor="end" fontSize={10} fill="#94a3b8">{t.toFixed(1)}×</text>
            </g>
          ))}
          {xTicks.map((t) => (
            <text key={`x${t}`} x={x(t)} y={H - B + 14} textAnchor="middle" fontSize={10} fill="#94a3b8">{pct(t, 0)}</text>
          ))}
          <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" fontSize={10} fill="#64748b">share of CGC slabs at 9.8</text>
          {a.eraMedianShare98 != null && (
            <line x1={x(a.eraMedianShare98)} x2={x(a.eraMedianShare98)} y1={T} y2={H - B} stroke="#94a3b8" strokeOpacity={0.5} strokeDasharray="4 4" />
          )}
          {a.eraMedianMult98_96 != null && (
            <line x1={L} x2={W - R} y1={y(a.eraMedianMult98_96)} y2={y(a.eraMedianMult98_96)} stroke="#94a3b8" strokeOpacity={0.5} strokeDasharray="4 4" />
          )}
          {pts.filter((p) => !p.isSelf).map((p) => (
            <circle key={p.assetId} cx={x(p.share98)} cy={y(p.mult98_96 as number)} r={5} fill={PEER} stroke="#0c1322" strokeWidth={2}
              onMouseEnter={() => setHover(p)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }} />
          ))}
          {self && (
            <g>
              <circle cx={x(self.share98)} cy={y(self.mult98_96 as number)} r={8} fill={SELF} stroke="#0c1322" strokeWidth={2}
                onMouseEnter={() => setHover(self)} onMouseLeave={() => setHover(null)} />
              <text x={x(self.share98) + 12} y={y(self.mult98_96 as number) + 4} fontSize={11} fontWeight={700} fill="#e2e8f0">This book</text>
            </g>
          )}
        </svg>
        {hover && (
          <div className="pointer-events-none absolute top-1 right-1 rounded border border-white/15 bg-[#0b1020]/95 px-2 py-1 text-[10px] font-mono text-slate-200">
            <div className="font-semibold">{hover.title}</div>
            <div>9.8 share {pct(hover.share98)} · 9.8÷9.6 {hover.mult98_96?.toFixed(2)}× · {hover.total.toLocaleString()} slabs</div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Bars: profit or loss per copy by the grade it comes back, with the pre-screen floor. */
function GradeOutcomeBars({ a }: { a: GradeArbitrage }) {
  const [hover, setHover] = useState<number | null>(null);
  const rows = a.rows.filter((r) => r.share >= 0.002);
  if (!rows.length) return null;
  const rejectNet = a.rawNetUsd - a.fees.preScreenRejectUsd;
  const vals = rows.map((r) => (r.slab ? r.netSlabUsd : rejectNet) - a.rawUsd);
  const W = 520, H = 260, L = 50, R = 8, T = 12, B = 40;
  const vMax = Math.max(0, ...vals), vMin = Math.min(0, ...vals);
  const span = vMax - vMin || 1;
  const y = (v: number) => T + ((vMax - v) / span) * (H - T - B);
  const bw = (W - L - R) / rows.length;
  const floorIdx = a.floorGrade != null ? rows.findIndex((r) => r.grade === a.floorGrade) : -1;
  return (
    <div className="rounded-lg border border-white/10 bg-[#0c1322] p-3">
      <div className="text-xs font-semibold text-slate-200">Profit per raw copy, by the grade it comes back</div>
      <div className="text-[10px] text-slate-400 mb-2">
        After CGC fees, shipping and eBay fees · below the {a.floorGrade ?? '—'} pre-screen floor a copy returns raw · label = share of census
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Profit or loss per copy by returned grade">
          {[vMax, 0, vMin].filter((v, i, arr) => arr.indexOf(v) === i).map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#ffffff" strokeOpacity={t === 0 ? 0.35 : 0.06} />
              <text x={L - 6} y={y(t) + 3} textAnchor="end" fontSize={10} fill="#94a3b8">{usd(t)}</text>
            </g>
          ))}
          {rows.map((r, i) => {
            const v = vals[i];
            const top = y(Math.max(v, 0)), bot = y(Math.min(v, 0));
            const h = Math.max(1, bot - top);
            const xx = L + i * bw + 1;
            return (
              <g key={r.grade} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}>
                <rect x={L + i * bw} y={T} width={bw} height={H - T - B} fill="transparent" />
                <rect x={xx} y={top} width={Math.max(1, bw - 2)} height={h} rx={3} fill={v >= 0 ? POS : NEG} fillOpacity={r.slab ? 1 : 0.45} />
                <text x={xx + (bw - 2) / 2} y={H - B + 13} textAnchor="middle" fontSize={9} fill="#cbd5e1">{r.grade}</text>
                <text x={xx + (bw - 2) / 2} y={H - B + 25} textAnchor="middle" fontSize={8} fill="#64748b">{pct(r.share, 0)}</text>
              </g>
            );
          })}
          {floorIdx >= 0 && (
            <g>
              <line x1={L + (floorIdx + 1) * bw} x2={L + (floorIdx + 1) * bw} y1={T} y2={H - B} stroke="#e2e8f0" strokeOpacity={0.6} strokeDasharray="3 3" />
              <text x={L + (floorIdx + 1) * bw + 4} y={T + 10} fontSize={10} fill="#e2e8f0">← slab · return raw →</text>
            </g>
          )}
        </svg>
        {hover != null && (
          <div className="pointer-events-none absolute top-1 right-1 rounded border border-white/15 bg-[#0b1020]/95 px-2 py-1 text-[10px] font-mono text-slate-200">
            <div className="font-semibold">CGC {rows[hover].grade} · {pct(rows[hover].share)} of census</div>
            <div>
              {rows[hover].slab
                ? `Sells ${usd(rows[hover].priceUsd)} (${rows[hover].priced === 'sales' ? 'sale median' : rows[hover].priced}) → nets ${usd(rows[hover].netSlabUsd)}`
                : `Returned raw, resold ${usd(a.rawNetUsd)} less ${usd(a.fees.preScreenRejectUsd)} pre-screen`}
            </div>
            <div>Per copy: {usd(vals[hover])}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GradeArbitrageCharts({ a, peers, title }: { a: GradeArbitrage; peers: GradePeer[]; title: string }) {
  return (
    <section className="rounded-xl border border-cyan-500/30 bg-[#090e1a] p-4 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Raw → Slab Arbitrage</h3>
        <span className="text-[10px] font-mono uppercase text-slate-400">
          Census grade mix × 12-month completed-sale medians · CGC Pre-Screen
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        <Stat label="Raw cost" value={usd(a.rawUsd)} note={a.rawPricedLike ? `≈ CGC ${a.rawPricedLike} slab` : undefined} />
        <Stat label="Expected slab" value={usd(a.expectedSlabUsd)} note="census grade mix" />
        <Stat label={`Net / copy${a.floorGrade ? ` (floor ${a.floorGrade})` : ''}`} value={usd(a.withFloor.netPerCopy)} note={`${pct(a.withFloor.netPerCopy / a.rawUsd, 0)} on raw cost`} tone={a.withFloor.netPerCopy >= 0 ? 'pos' : 'neg'} />
        <Stat label="Worst case" value={usd(a.withFloor.worstCase)} note={`vs ${usd(a.noFloor.worstCase)} without floor`} tone={a.withFloor.worstCase >= 0 ? 'pos' : 'neg'} />
        <Stat label="9.8 scarcity" value={a.scarcityMultiple != null ? `${a.scarcityMultiple.toFixed(1)}×` : pct(a.share98)} note={a.eraMedianShare98 != null ? `${pct(a.share98)} vs era ${pct(a.eraMedianShare98)}` : 'no era benchmark'} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <GradeOutcomeBars a={a} />
        <ScarcityScatter peers={peers} a={a} title={title} />
      </div>
      <p className="text-[10px] text-slate-500 leading-snug">
        Assumes raw copies grade like the copies already in the CGC census (which skews to copies owners chose to submit). Fees: {a.fees.gradingNote}; pre-screen reject {usd(a.fees.preScreenRejectUsd)}; eBay {pct(a.fees.sellRate, 2)}. Not financial advice.
      </p>
    </section>
  );
}

/** Fundamentals tab, beside the replacement-cost console: why raw → pre-screen → slab works for this book, in numbers. */
export function GradeStrategyExplainer({ a }: { a: GradeArbitrage }) {
  const good = a.withFloor.netPerCopy > 0;
  const points: Array<{ head: string; body: string }> = [
    {
      head: 'Raw is mispriced against the grade it usually becomes',
      body: `A raw copy sells for ${usd(a.rawUsd)}, about the price of a CGC ${a.rawPricedLike ?? '—'} slab. ${a.breakevenGrade ? `Grading breaks even at ${a.breakevenGrade}, and ${pct(a.shareAtOrAboveBreakeven, 0)} of census copies grade at or above it.` : 'No grade breaks even after fees.'}`,
    },
    {
      head: 'The market pays for top-grade scarcity',
      body: a.mult98_96 != null
        ? `9.8s are ${pct(a.share98)} of slabs${a.eraMedianShare98 != null ? ` (era median ${pct(a.eraMedianShare98)})` : ''}, and sell for ${a.mult98_96.toFixed(2)}× the 9.6 price${a.eraMedianMult98_96 != null ? ` (era median ${a.eraMedianMult98_96.toFixed(2)}×)` : ''}. Each high-grade hit carries the return.`
        : `9.8s are ${pct(a.share98)} of slabs. Not enough 9.6 and 9.8 sales to measure the premium.`,
    },
    {
      head: 'Pre-Screen turns the downside into a fixed fee',
      body: a.floorGrade
        ? `With a ${a.floorGrade} minimum, ${pct(a.withFloor.rejectShare, 0)} of copies come back raw for ${usd(a.fees.preScreenRejectUsd)} instead of being slabbed at a loss. Worst case moves from ${usd(a.noFloor.worstCase)} to ${usd(a.withFloor.worstCase)} per copy; expected result ${usd(a.withFloor.netPerCopy)}.`
        : 'No grade is worth slabbing over returning raw, so Pre-Screen has nothing to protect.',
    },
    {
      head: 'Where it breaks',
      body: 'Census copies skew to books owners chose to submit, so blind raw buys grade worse than this mix: inspect or press before you buy. Every 9.8 you create adds to the 9.8 supply, which caps how far the 9.8 price can run.',
    },
  ];
  return (
    <div className="rounded-xl border border-cyan-500/30 bg-[#090e1a] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-200 font-mono">Why raw → Pre-Screen → slab {good ? 'works here' : "doesn't pay here"}</h4>
        <span className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: good ? POS : NEG }} />
          {usd(a.withFloor.netPerCopy)} / copy · {a.verdict}
        </span>
      </div>
      <ol className="space-y-2.5">
        {points.map((pt, i) => (
          <li key={pt.head} className="text-[11px] leading-relaxed text-slate-300">
            <span className="font-semibold text-slate-100">{i + 1}. {pt.head}.</span> {pt.body}
          </li>
        ))}
      </ol>
    </div>
  );
}
