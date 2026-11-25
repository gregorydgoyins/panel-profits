'use client';
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { getEraColors } from '@/lib/design-system/colors';
import type { RelatedIssue } from './types';
import Panel from './Panel';
import AISectionBlock from './AISectionBlock';
import { fmt, proxyCoverUrl, ERA_CONTEXT, ERA_LABELS } from './shared';
import { buildEquityUrl } from '@/lib/urlBuilder';

const RANK_MEDAL = ['#fbbf24', '#94a3b8', '#c97c3a', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0.25)', 'rgba(255,255,255,0.2)', 'rgba(255,255,255,0.15)', 'rgba(255,255,255,0.12)'];
const RANK_LABEL_TEXT = ['APEX', 'NEAR-APEX', 'BLUE CHIP', 'MID-TIER', 'ENTRY'];

function CoverFilmstrip({ issues, currentId, eraColors }: { issues: RelatedIssue[]; currentId: string; eraColors: ReturnType<typeof getEraColors> }) {
  const bp = (s: RelatedIssue) => s.sovPriceUsd || s.fmv98Usd || 0;
  const top10 = issues.slice(0, 10);
  if (top10.length < 2) return null;
  const maxP = bp(top10[0]) || 1;
  const MIN_W = 38, MAX_W = 76;
  return (
    <div className="mb-4">
      <div className="text-[7px] uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.18)', letterSpacing: '0.12em' }}>Value Leaders · Best Grade · Top {top10.length}</div>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {top10.map((s, i) => {
          const isCurrent = s.id === currentId, isPeak = i === 0;
          const frac = bp(s) / maxP;
          const w = Math.round(MIN_W + frac * (MAX_W - MIN_W)), h = Math.round(w * 1.52);
          const coverUrl = proxyCoverUrl(s.coverImageUrl);
          const borderCol = isCurrent ? eraColors.border : isPeak ? '#fbbf24' : 'rgba(255,255,255,0.08)';
          const shadow = isCurrent ? `0 0 10px ${eraColors.border}66, 0 0 20px ${eraColors.border}22` : isPeak ? '0 0 8px #fbbf2444' : 'none';
          return (
            <Link key={s.id} href={buildEquityUrl(s.id)} style={{ textDecoration: 'none', flexShrink: 0 }}>
              <div style={{ width: `${w}px` }}>
                <div className="relative rounded overflow-hidden" style={{ width: `${w}px`, height: `${h}px`, border: `1.5px solid ${borderCol}`, boxShadow: shadow, backgroundColor: `${eraColors.border}10` }}>
                  {coverUrl ? (
                    <img src={coverUrl} alt={`#${s.issueNumber}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${eraColors.border}18, ${eraColors.border}06)` }}>
                      <span style={{ fontSize: '8px', color: `${eraColors.border}55`, fontFamily: 'monospace' }}>#{s.issueNumber}</span>
                    </div>
                  )}
                  {isPeak && <div className="absolute top-0.5 left-0.5 px-1 rounded-sm" style={{ backgroundColor: '#fbbf24ee', fontSize: '6px', color: '#000', fontFamily: 'monospace', lineHeight: '12px' }}>#1</div>}
                  {isCurrent && <div className="absolute bottom-0 left-0 right-0 text-center py-0.5" style={{ backgroundColor: `${eraColors.border}dd`, fontSize: '6px', color: '#000', fontFamily: 'monospace', letterSpacing: '0.05em' }}>VIEWING</div>}
                  {!isPeak && !isCurrent && <div className="absolute top-0.5 left-0.5 px-0.5 rounded-sm" style={{ backgroundColor: 'rgba(0,0,0,0.6)', fontSize: '6px', color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace', lineHeight: '11px' }}>{i + 1}</div>}
                </div>
                <div className="mt-0.5 text-center">
                  <div style={{ fontSize: '7px', color: isCurrent ? eraColors.border : 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>#{s.issueNumber}</div>
                  <div style={{ fontSize: '7px', color: isPeak ? '#fbbf24' : isCurrent ? eraColors.border : 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{bp(s) > 0 ? fmt(bp(s)) : '—'}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function ValueSkylineChart({ issues, currentId, eraColors }: { issues: RelatedIssue[]; currentId: string; eraColors: ReturnType<typeof getEraColors> }) {
  const bp = (s: RelatedIssue) => s.sovPriceUsd || s.fmv98Usd || 0;
  const SOV_FLOOR = 45;
  const sorted = useMemo(() => [...issues].filter(s => bp(s) > 0).sort((a, b) => (parseFloat(a.issueNumber) || 0) - (parseFloat(b.issueNumber) || 0)), [issues]);
  if (sorted.length < 2) return null;
  const maxP = Math.max(...sorted.map(bp));
  const peakId = [...sorted].sort((a, b) => bp(b) - bp(a))[0]?.id;
  const SVG_W = 400, SVG_H = 120, PAD_L = 2, PAD_R = 2, PAD_T = 20, PAD_B = 4;
  const chartW = SVG_W - PAD_L - PAD_R, chartH = SVG_H - PAD_T - PAD_B;
  const n = sorted.length, barW = Math.max(2, Math.min(6, Math.floor(chartW / n) - 1));
  const gap = Math.max(1, Math.floor(chartW / n) - barW), totalSlotW = barW + gap;
  const sovY = PAD_T + chartH - (SOV_FLOOR / maxP) * chartH;
  return (
    <div className="mb-4 rounded" style={{ border: `1px solid ${eraColors.border}14`, backgroundColor: 'rgba(0,0,0,0.25)', padding: '8px 10px 6px' }}>
      <div className="text-[7px] uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.18)', letterSpacing: '0.12em' }}>Value Topology · Best Available Grade · Chronological</div>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%" height={SVG_H} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <filter id="skyline-glow-current"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="skyline-glow-peak"><feGaussianBlur stdDeviation="1.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {maxP > SOV_FLOOR && <>
          <line x1={PAD_L} y1={sovY} x2={SVG_W - PAD_R} y2={sovY} stroke="#fbbf244d" strokeWidth="0.5" strokeDasharray="3 4" />
          <text x={PAD_L + 2} y={sovY - 2} fontSize="5.5" fill="#fbbf2473" style={{ fontFamily: 'monospace' }}>$45 SOV</text>
        </>}
        {sorted.map((s, i) => {
          const isCurrent = s.id === currentId, isPeak = s.id === peakId;
          const barH = Math.max(2, (bp(s) / maxP) * chartH);
          const x = PAD_L + i * totalSlotW + (totalSlotW - barW) / 2, y = PAD_T + chartH - barH;
          const valuePct = bp(s) / maxP;
          const col = isCurrent ? eraColors.border : isPeak ? '#fbbf24e6' : valuePct >= 0.8 ? `${eraColors.border}d9` : valuePct >= 0.5 ? `${eraColors.border}63` : `${eraColors.border}28`;
          return (
            <g key={s.id}>
              <rect x={x} y={y} width={barW} height={barH} fill={col} filter={isCurrent ? 'url(#skyline-glow-current)' : isPeak ? 'url(#skyline-glow-peak)' : undefined} rx="0.5" />
              {isCurrent && <rect x={x - 1} y={y} width={barW + 2} height={2} fill={`${eraColors.border}e6`} rx="0.5" />}
              {isCurrent && <text x={x + barW / 2} y={y - 4} fontSize="6" fill={`${eraColors.border}f2`} textAnchor="middle" style={{ fontFamily: 'monospace' }}>▲</text>}
              {isPeak && !isCurrent && <text x={x + barW / 2} y={y - 3} fontSize="5.5" fill="#fbbf24cc" textAnchor="middle" style={{ fontFamily: 'monospace' }}>PEAK</text>}
            </g>
          );
        })}
        <line x1={PAD_L} y1={PAD_T + chartH} x2={SVG_W - PAD_R} y2={PAD_T + chartH} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      </svg>
      <div className="flex justify-between mt-1">
        <span style={{ fontSize: '6px', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>#{sorted[0]?.issueNumber}</span>
        <span style={{ fontSize: '6px', color: 'rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>{sorted.length} issues · value by issue number</span>
        <span style={{ fontSize: '6px', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>#{sorted[sorted.length - 1]?.issueNumber}</span>
      </div>
    </div>
  );
}

function CensusValueScatter({ issues, currentId, eraColors }: { issues: RelatedIssue[]; currentId: string; eraColors: ReturnType<typeof getEraColors> }) {
  const _bp = (s: RelatedIssue) => s.sovPriceUsd || s.fmv98Usd || 0;
  const plotIssues = useMemo(() => issues.filter(s => (s.censusTotal ?? 0) > 0 && _bp(s) > 0), [issues]);
  if (plotIssues.length < 2) return null;
  const SVG_W = 200, SVG_H = 120, PAD_L = 14, PAD_R = 8, PAD_T = 10, PAD_B = 14;
  const cW = SVG_W - PAD_L - PAD_R, cH = SVG_H - PAD_T - PAD_B;
  const maxFmv = Math.max(...plotIssues.map(_bp));
  const censuses = plotIssues.map(s => s.censusTotal!);
  const minC = Math.min(...censuses), maxC = Math.max(...censuses);
  const logMin = Math.log(Math.max(1, minC)), logMax = Math.log(Math.max(2, maxC));
  const toX = (c: number) => PAD_L + ((Math.log(Math.max(1, c)) - logMin) / Math.max(logMax - logMin, 1)) * cW;
  const toY = (fmv: number) => PAD_T + cH - (fmv / maxFmv) * cH;
  const midX = PAD_L + cW / 2, midY = PAD_T + cH / 2;
  return (
    <div className="rounded" style={{ border: `1px solid ${eraColors.border}14`, backgroundColor: 'rgba(0,0,0,0.25)', padding: '8px 10px 6px' }}>
      <div className="text-[7px] uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.18)', letterSpacing: '0.12em' }}>Supply vs. Demand</div>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%" height={SVG_H} style={{ display: 'block', overflow: 'visible' }}>
        <defs><filter id="scatter-glow"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
        <rect x={PAD_L} y={PAD_T} width={cW / 2} height={cH / 2} fill="#4ade8008" />
        <rect x={midX} y={PAD_T} width={cW / 2} height={cH / 2} fill="#fbbf2408" />
        <rect x={PAD_L} y={midY} width={cW / 2} height={cH / 2} fill="#60a5fa08" />
        <rect x={midX} y={midY} width={cW / 2} height={cH / 2} fill="#f8717108" />
        <line x1={midX} y1={PAD_T} x2={midX} y2={PAD_T + cH} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        <line x1={PAD_L} y1={midY} x2={PAD_L + cW} y2={midY} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        <text x={PAD_L + 3} y={PAD_T + 8} fontSize="4.5" fill="#4ade8080" style={{ fontFamily: 'monospace' }}>SCARCE</text>
        <text x={PAD_L + 3} y={PAD_T + 13} fontSize="4.5" fill="#4ade8080" style={{ fontFamily: 'monospace' }}>+VALUE</text>
        <text x={midX + 3} y={PAD_T + 8} fontSize="4.5" fill="#fbbf2480" style={{ fontFamily: 'monospace' }}>ABUNDANT</text>
        <text x={midX + 3} y={PAD_T + 13} fontSize="4.5" fill="#fbbf2480" style={{ fontFamily: 'monospace' }}>+VALUE</text>
        <text x={PAD_L + 3} y={midY + 14} fontSize="4.5" fill="#60a5fa80" style={{ fontFamily: 'monospace' }}>SCARCE</text>
        <text x={PAD_L + 3} y={midY + 19} fontSize="4.5" fill="#60a5fa80" style={{ fontFamily: 'monospace' }}>+CHEAP</text>
        <text x={midX + 3} y={midY + 14} fontSize="4.5" fill="#f8717173" style={{ fontFamily: 'monospace' }}>MASS</text>
        <text x={midX + 3} y={midY + 19} fontSize="4.5" fill="#f8717173" style={{ fontFamily: 'monospace' }}>MARKET</text>
        {plotIssues.map(s => {
          const isCurrent = s.id === currentId;
          const cx = toX(s.censusTotal!), cy = toY(_bp(s));
          return (
            <g key={s.id}>
              {isCurrent && <circle cx={cx} cy={cy} r="8" fill={`${eraColors.border}1f`} filter="url(#scatter-glow)" />}
              <circle cx={cx} cy={cy} r={isCurrent ? 4.5 : 2.5} fill={isCurrent ? eraColors.border : `${eraColors.border}33`} filter={isCurrent ? 'url(#scatter-glow)' : undefined} />
            </g>
          );
        })}
        <text x={PAD_L} y={SVG_H - 2} fontSize="4.5" fill="rgba(255,255,255,0.2)" style={{ fontFamily: 'monospace' }}>RARE</text>
        <text x={PAD_L + cW - 14} y={SVG_H - 2} fontSize="4.5" fill="rgba(255,255,255,0.2)" style={{ fontFamily: 'monospace' }}>COMMON</text>
        <text x={2} y={PAD_T + 3} fontSize="4.5" fill="rgba(255,255,255,0.2)" style={{ fontFamily: 'monospace' }}>HI</text>
        <text x={2} y={PAD_T + cH - 3} fontSize="4.5" fill="rgba(255,255,255,0.2)" style={{ fontFamily: 'monospace' }}>LO</text>
      </svg>
      <div className="mt-0.5" style={{ fontSize: '6px', color: 'rgba(255,255,255,0.15)', fontFamily: 'monospace', textAlign: 'center' }}>X: census pop · Y: 9.8 FMV · {plotIssues.length} issues</div>
    </div>
  );
}

function GradeCompressionChart({ currentIssue, peakIssue, eraColors }: { currentIssue: RelatedIssue; peakIssue: RelatedIssue; eraColors: ReturnType<typeof getEraColors> }) {
  const grades = [
    { label: 'RAW', currentUsd: currentIssue.fmvRawUsd, peakUsd: peakIssue.fmvRawUsd },
    { label: '9.4', currentUsd: currentIssue.fmv94Usd,  peakUsd: peakIssue.fmv94Usd  },
    { label: '9.6', currentUsd: currentIssue.fmv96Usd,  peakUsd: peakIssue.fmv96Usd  },
    { label: '9.8', currentUsd: currentIssue.fmv98Usd,  peakUsd: peakIssue.fmv98Usd  },
  ];
  const nonNullCurrent = grades.filter(g => g.currentUsd && g.currentUsd > 0).length;
  if (nonNullCurrent < 2) return null;
  const isPeakSelf = currentIssue.id === peakIssue.id;
  const maxVal = Math.max(...grades.map(g => Math.max(g.currentUsd || 0, g.peakUsd || 0)));
  const currentLift = currentIssue.fmv98Usd && currentIssue.fmvRawUsd && currentIssue.fmvRawUsd > 0 ? (currentIssue.fmv98Usd / currentIssue.fmvRawUsd).toFixed(1) : null;
  const peakLift = peakIssue.fmv98Usd && peakIssue.fmvRawUsd && peakIssue.fmvRawUsd > 0 ? (peakIssue.fmv98Usd / peakIssue.fmvRawUsd).toFixed(1) : null;
  return (
    <div className="rounded" style={{ border: `1px solid ${eraColors.border}14`, backgroundColor: 'rgba(0,0,0,0.25)', padding: '8px 10px 6px' }}>
      <div className="text-[7px] uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.18)', letterSpacing: '0.12em' }}>Grade Compression</div>
      {!isPeakSelf && (
        <div className="flex gap-3 mb-2">
          <div className="flex items-center gap-1"><div className="w-2 h-1.5 rounded-sm" style={{ backgroundColor: eraColors.border }} /><span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>This issue</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-1.5 rounded-sm" style={{ backgroundColor: '#fbbf2460' }} /><span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>Series peak</span></div>
        </div>
      )}
      <div className="space-y-1.5">
        {grades.map(({ label, currentUsd, peakUsd }) => {
          const cW = currentUsd && maxVal > 0 ? (currentUsd / maxVal) * 100 : 0;
          const pW = peakUsd && maxVal > 0 ? (peakUsd / maxVal) * 100 : 0;
          return (
            <div key={label}>
              <div className="flex items-center justify-between mb-0.5">
                <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', width: '22px' }}>{label}</span>
                <div className="flex-1 mx-1.5">
                  <div className="rounded-sm mb-0.5 overflow-hidden" style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    <div style={{ width: `${cW}%`, height: '100%', backgroundColor: eraColors.border, borderRadius: '2px' }} />
                  </div>
                  {!isPeakSelf && (
                    <div className="rounded-sm overflow-hidden" style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                      <div style={{ width: `${pW}%`, height: '100%', backgroundColor: '#fbbf24', borderRadius: '2px', opacity: 0.72 }} />
                    </div>
                  )}
                </div>
                <div className="text-right" style={{ minWidth: '42px' }}>
                  <div style={{ fontSize: '7px', color: currentUsd ? eraColors.border : 'rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>{currentUsd ? fmt(currentUsd) : '—'}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 mt-2 pt-2" style={{ borderTop: 'rgba(255,255,255,0.05) 1px solid' }}>
        {currentLift && <div><div style={{ fontSize: '6px', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>THIS ISSUE LIFT</div><div style={{ fontSize: '11px', color: eraColors.border, fontFamily: 'monospace' }}>{currentLift}×</div></div>}
        {peakLift && !isPeakSelf && <div><div style={{ fontSize: '6px', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>PEAK LIFT</div><div style={{ fontSize: '11px', color: '#fbbf24', fontFamily: 'monospace' }}>{peakLift}×</div></div>}
        {!currentLift && !peakLift && <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>RAW data unavailable for lift calc</div>}
      </div>
    </div>
  );
}

export default function SeriesRankPanel({ seriesIssues, currentId, eraColors, seriesName = '', currentEra = '', headerAction }: {
  seriesIssues: RelatedIssue[]; currentId: string; eraColors: ReturnType<typeof getEraColors>;
  seriesName?: string; currentEra?: string; headerAction?: React.ReactNode;
}) {
  const bestPrice = (s: RelatedIssue) => s.sovPriceUsd || s.fmv98Usd || 0;

  const ranked = useMemo(() => [...seriesIssues].filter(s => bestPrice(s) > 0).sort((a, b) => bestPrice(b) - bestPrice(a)), [seriesIssues]);
  if (ranked.length === 0) return null;

  const maxPrice = bestPrice(ranked[0]);
  const currentRank = ranked.findIndex(s => s.id === currentId);
  const currentIssue = ranked.find(s => s.id === currentId);
  const peakIssue = ranked[0];
  const currentPrice = currentIssue ? bestPrice(currentIssue) : 0;
  const deltaFromPeak = currentRank === 0 ? 0 : currentPrice > 0 ? maxPrice - currentPrice : null;
  const shareOfPeak = currentPrice > 0 ? Math.round((currentPrice / maxPrice) * 100) : null;
  const rankFraction = currentRank >= 0 ? currentRank / Math.max(ranked.length - 1, 1) : 0.5;
  const rankColor = currentRank < 0 ? 'rgba(255,255,255,0.3)' : rankFraction <= 0.25 ? '#4ade80' : rankFraction <= 0.5 ? eraColors.border : rankFraction <= 0.75 ? '#fbbf24' : '#f87171';
  const beatsPct = currentRank >= 0 ? Math.round(((ranked.length - 1 - currentRank) / Math.max(ranked.length - 1, 1)) * 100) : null;
  const tierIndex = rankFraction <= 0.2 ? 0 : rankFraction <= 0.4 ? 1 : rankFraction <= 0.6 ? 2 : rankFraction <= 0.8 ? 3 : 4;
  const tierLabel = RANK_LABEL_TEXT[tierIndex] || 'ENTRY';
  const totalMarketCap = ranked.reduce((sum, s) => sum + bestPrice(s), 0);
  const dominancePct = totalMarketCap > 0 && currentPrice > 0 ? Math.round((currentPrice / totalMarketCap) * 100) : null;
  const DONUT_R = 28, DONUT_CX = 32, DONUT_CY = 32, DONUT_STROKE = 6;
  const circumference = 2 * Math.PI * DONUT_R;
  const dominanceArc = dominancePct !== null ? (dominancePct / 100) * circumference : 0;
  const top8 = ranked.slice(0, 8);
  const showCurrentOutside = currentRank >= 8 && currentIssue;
  const eraBlurb = ERA_CONTEXT[currentEra] || null;
  const beatsAccent  = beatsPct !== null && beatsPct >= 75 ? '#4ade80' : beatsPct !== null && beatsPct >= 50 ? eraColors.border : '#fbbf24';
  const peakAccent   = deltaFromPeak === 0 ? '#fbbf24' : eraColors.border;
  const shareAccent  = shareOfPeak !== null && shareOfPeak >= 75 ? '#4ade80' : shareOfPeak !== null && shareOfPeak >= 50 ? eraColors.border : '#fbbf24';

  const narrativeData = undefined as { narrative: string | null } | undefined;

  return (
    <Panel title="Series Position" icon={<Trophy className="w-3.5 h-3.5" />} eraColors={eraColors} action={headerAction}>

      <CoverFilmstrip issues={ranked} currentId={currentId} eraColors={eraColors} />

      {/* Rank + Donut + Stats */}
      <div className="flex items-center gap-4 mb-4 pb-4" style={{ borderBottom: `1px solid ${eraColors.border}12` }}>
        <div className="shrink-0 text-center" style={{ minWidth: '64px' }}>
          <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: '2px' }}>RANK</div>
          <div style={{ fontSize: '36px', lineHeight: 1, color: rankColor, fontFamily: 'monospace', fontWeight: 500 }}>{currentRank >= 0 ? `#${currentRank + 1}` : '—'}</div>
          <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginTop: '2px' }}>of {ranked.length}</div>
          <div className="inline-block mt-1.5 px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: `${rankColor}18`, color: rankColor, border: `1px solid ${rankColor}35`, fontSize: '6px', fontFamily: 'monospace', letterSpacing: '0.08em' }}>{tierLabel}</div>
        </div>

        {dominancePct !== null && (
          <div className="shrink-0 flex flex-col items-center">
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx={DONUT_CX} cy={DONUT_CY} r={DONUT_R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={DONUT_STROKE} />
              <circle cx={DONUT_CX} cy={DONUT_CY} r={DONUT_R} fill="none" stroke={rankColor} strokeWidth={DONUT_STROKE}
                strokeDasharray={`${dominanceArc.toFixed(1)} ${circumference.toFixed(1)}`}
                strokeDashoffset={circumference / 4} strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 3px ${rankColor}66)` }} />
              <text x={DONUT_CX} y={DONUT_CY + 1} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill={rankColor} style={{ fontFamily: 'monospace', fontWeight: 500 }}>{dominancePct}%</text>
              <text x={DONUT_CX} y={DONUT_CY + 12} textAnchor="middle" fontSize="5" fill="rgba(255,255,255,0.2)" style={{ fontFamily: 'monospace' }}>of series</text>
            </svg>
            <div style={{ fontSize: '6px', color: 'rgba(255,255,255,0.18)', fontFamily: 'monospace', marginTop: '-4px', textAlign: 'center' }}>mkt dominance</div>
          </div>
        )}

        <div className="flex-1 flex flex-col gap-1.5">
          {[
            { label: 'Beats', value: beatsPct !== null ? `${beatsPct}% of series` : '—', accent: beatsAccent, valueColor: beatsPct !== null && beatsPct >= 50 ? beatsAccent : 'rgba(255,255,255,0.5)' },
            { label: 'vs. Series Peak', value: deltaFromPeak === null ? '—' : deltaFromPeak === 0 ? 'AT PEAK ▲' : `−${fmt(deltaFromPeak)}`, accent: peakAccent, valueColor: deltaFromPeak === 0 ? '#fbbf24' : 'rgba(255,255,255,0.5)' },
            { label: 'Share of Peak', value: shareOfPeak !== null ? `${shareOfPeak}%` : '—', accent: shareAccent, valueColor: shareOfPeak !== null && shareOfPeak >= 75 ? shareAccent : 'rgba(255,255,255,0.5)' },
          ].map(({ label, value, accent, valueColor }) => (
            <div key={label} className="flex items-center justify-between px-2 py-1.5 rounded relative overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ backgroundColor: accent }} />
              <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', paddingLeft: '4px' }}>{label}</span>
              <span style={{ fontSize: '11px', color: valueColor, fontFamily: 'monospace' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <ValueSkylineChart issues={ranked} currentId={currentId} eraColors={eraColors} />

      {currentIssue && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <CensusValueScatter issues={ranked} currentId={currentId} eraColors={eraColors} />
          <GradeCompressionChart currentIssue={currentIssue} peakIssue={peakIssue} eraColors={eraColors} />
        </div>
      )}

      {/* Leaderboard */}
      <div className="mb-3">
        <div className="text-[7px] uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.18)', letterSpacing: '0.12em' }}>Top Issues · Best Available Grade</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {top8.map((s, i) => {
            const isCurrent = s.id === currentId, isApex = i === 0;
            const pctOfPeak = Math.round((bestPrice(s) / maxPrice) * 100);
            const medalColor = RANK_MEDAL[i] || 'rgba(255,255,255,0.12)';
            const rowBg = isCurrent ? `${eraColors.border}0c` : isApex ? '#fbbf2405' : 'transparent';
            const rowBorder = isCurrent ? `${eraColors.border}45` : isApex ? '#fbbf2420' : 'rgba(255,255,255,0.05)';
            const coverUrl = proxyCoverUrl(s.coverImageUrl);
            return (
              <Link key={s.id} href={buildEquityUrl(s.id)} className="block rounded px-1.5 py-1 group" style={{ border: `1px solid ${rowBorder}`, backgroundColor: rowBg, textDecoration: 'none' }}>
                <div className="flex items-center gap-1.5">
                  <span style={{ fontSize: '10px', color: medalColor, fontFamily: 'monospace', minWidth: '14px', textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
                  <div className="rounded overflow-hidden shrink-0" style={{ width: '22px', height: '30px', backgroundColor: `${eraColors.border}10`, border: `1px solid ${isCurrent ? eraColors.border : 'rgba(255,255,255,0.06)'}` }}>
                    {coverUrl ? <img src={coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <div style={{ width: '100%', height: '100%', background: `${eraColors.border}10` }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span style={{ fontSize: '9px', color: isCurrent ? '#fff' : 'rgba(255,255,255,0.65)', fontFamily: 'monospace' }}>#{s.issueNumber}</span>
                      {s.year > 0 && <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>'{String(s.year).slice(2)}</span>}
                      {isCurrent && <span style={{ fontSize: '5.5px', padding: '0 3px', borderRadius: '2px', backgroundColor: `${eraColors.border}20`, color: eraColors.border, border: `1px solid ${eraColors.border}35`, fontFamily: 'monospace' }}>▶</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <div style={{ fontSize: '8px', color: isCurrent ? eraColors.border : isApex ? '#fbbf24' : 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{bestPrice(s) > 0 ? fmt(bestPrice(s)) : '—'}</div>
                      {s.delta24h != null && (
                        <span style={{ fontSize: '6px', color: s.delta24h >= 0 ? '#4ade80' : '#f87171', fontFamily: 'monospace' }}>
                          {s.delta24h >= 0 ? '+' : ''}{s.delta24h.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                  {!isApex && <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', flexShrink: 0 }}>{pctOfPeak}%</div>}
                </div>
                <div className="mt-1 rounded-full overflow-hidden" style={{ height: '2px', backgroundColor: 'rgba(255,255,255,0.04)' }}>
                  <div style={{ width: `${pctOfPeak}%`, height: '100%', borderRadius: '1px', background: isCurrent ? `linear-gradient(to right, ${eraColors.border}bb, ${eraColors.border}44)` : isApex ? 'linear-gradient(to right, #fbbf24aa, #fbbf2433)' : `linear-gradient(to right, ${medalColor}, transparent)` }} />
                </div>
              </Link>
            );
          })}
        </div>

        {showCurrentOutside && (
          <div className="mt-2">
            <div style={{ fontSize: '7px', textAlign: 'center', padding: '4px', color: 'rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>· · ·</div>
            <Link href={buildEquityUrl(currentIssue.id)} className="block rounded px-1.5 py-1" style={{ border: `1px solid ${eraColors.border}45`, backgroundColor: `${eraColors.border}0c`, textDecoration: 'none' }}>
              <div className="flex items-center gap-1.5">
                <span style={{ fontSize: '10px', color: eraColors.border, fontFamily: 'monospace', minWidth: '14px', textAlign: 'center' }}>{currentRank + 1}</span>
                <div className="rounded overflow-hidden shrink-0" style={{ width: '22px', height: '30px', border: `1px solid ${eraColors.border}`, backgroundColor: `${eraColors.border}10` }}>
                  {proxyCoverUrl(currentIssue.coverImageUrl) ? <img src={proxyCoverUrl(currentIssue.coverImageUrl)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <div style={{ width: '100%', height: '100%', background: `${eraColors.border}10` }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span style={{ fontSize: '9px', color: '#fff', fontFamily: 'monospace' }}>#{currentIssue.issueNumber}</span>
                    <span style={{ fontSize: '5.5px', padding: '0 3px', borderRadius: '2px', backgroundColor: `${eraColors.border}20`, color: eraColors.border, border: `1px solid ${eraColors.border}35`, fontFamily: 'monospace' }}>VIEWING</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div style={{ fontSize: '8px', color: eraColors.border, fontFamily: 'monospace' }}>{currentIssue.fmv98Usd ? fmt(currentIssue.fmv98Usd) : '—'}</div>
                    {currentIssue.delta24h != null && (
                      <span style={{ fontSize: '6px', color: currentIssue.delta24h >= 0 ? '#4ade80' : '#f87171', fontFamily: 'monospace' }}>
                        {currentIssue.delta24h >= 0 ? '+' : ''}{currentIssue.delta24h.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                {shareOfPeak !== null && <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', flexShrink: 0 }}>{shareOfPeak}%</div>}
              </div>
              <div className="mt-1 rounded-full overflow-hidden" style={{ height: '2px', backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <div style={{ width: `${shareOfPeak || 0}%`, height: '100%', background: `linear-gradient(to right, ${eraColors.border}bb, ${eraColors.border}33)`, borderRadius: '1px' }} />
              </div>
            </Link>
          </div>
        )}
      </div>

      {/* Era blurb + AI narrative */}
      {eraBlurb && (
        <div className="mt-2 pt-3" style={{ borderTop: `1px solid ${eraColors.border}12` }}>
          <div style={{ fontSize: '7px', color: `${eraColors.border}80`, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '4px' }}>{ERA_LABELS[currentEra] || currentEra} Context</div>
          <p style={{ fontSize: '8px', lineHeight: '1.6', color: 'rgba(255,255,255,0.65)' }}>{eraBlurb}</p>
        </div>
      )}
      <AISectionBlock text={narrativeData?.narrative ?? null} accentColor={eraColors.border} label="Series Value Intelligence" />

    </Panel>
  );
}
