'use client';
import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import CensusDrilldownPanel, { DrilldownBoxKey } from './CensusDrilldownPanel';

export interface CensusBannerProps {
  censusSummary: {
    totalGraded: number;
    highGradeCount: number;
    census98Count?: number | null;
    snapshotDate: string;
    histogram: { grade: string; count: number }[];
    printRunTotal?: number | null;
    rawCopiesEstimated?: number | null;
    printBasis?: string | null;
    floatConfidence?: string | null;
    survivors?: number | null;
    survivorsLow?: number | null;
    survivorsHigh?: number | null;
    activeFloat?: number | null;
    vaultHoard?: number | null;
    sales12m?: number | null;
    labelBreakdown?: {
      universal: number;
      signatureSeries: number;
      cgcJsa: number;
      qualified: number;
      conserved: number;
      restored: number;
      total: number;
    } | null;
  } | null | undefined;
  eraColors: { border: string; bg: string; bgHover: string; glow: string };
  scarcityLabel?: string;
  eraName?: string;
  publicationYear?: number | null;
  publisherName?: string;
  seriesName?: string;
  issueNumber?: string;
  sovereignGrade?: string | null;
}

function formatSnapshotDate(dateStr?: string | null): string {
  if (!dateStr) return 'Latest';
  try {
    const parts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    let d: Date;
    if (parts) {
      d = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
    } else {
      d = new Date(dateStr);
    }
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
}

export default function CensusBanner({
  censusSummary,
  eraColors,
  scarcityLabel,
  eraName = '',
  publicationYear = null,
  publisherName = '',
  seriesName = '',
  issueNumber = '',
  sovereignGrade = null,
}: CensusBannerProps) {
  const [activeDrilldown, setActiveDrilldown] = useState<DrilldownBoxKey | null>(null);

  const toggleDrilldown = (key: DrilldownBoxKey) => {
    setActiveDrilldown((prev) => (prev === key ? null : key));
  };
  if (!censusSummary || !censusSummary.totalGraded || censusSummary.totalGraded <= 0) return null;

  const totalGraded = typeof censusSummary.totalGraded === 'number' ? censusSummary.totalGraded : 0;
  const totalAllLabels = censusSummary.labelBreakdown?.total && censusSummary.labelBreakdown.total > 0
    ? censusSummary.labelBreakdown.total
    : totalGraded;
  const universalGraded = totalGraded;
  const highGradeCount = typeof censusSummary.highGradeCount === 'number' ? censusSummary.highGradeCount : 0;
  const exact98Count = typeof censusSummary.census98Count === 'number'
    ? censusSummary.census98Count
    : (censusSummary.histogram?.find((h) => h.grade === '9.8')?.count ?? 0);
  const usingHighGradeFallback = exact98Count === 0 && highGradeCount > 0;
  const highestHistGrade = censusSummary.histogram?.find((h) => h.count > 0)?.grade ?? null;
  const fallbackApexGrade = !usingHighGradeFallback && exact98Count === 0
    ? (sovereignGrade && sovereignGrade !== 'RAW' && sovereignGrade !== '9.8' ? sovereignGrade : highestHistGrade)
    : null;
  const fallbackApexNum = fallbackApexGrade ? parseFloat(fallbackApexGrade) : NaN;
  const fallbackApexCount = Number.isFinite(fallbackApexNum) && censusSummary.histogram?.length
    ? censusSummary.histogram
        .filter((h) => parseFloat(h.grade) >= fallbackApexNum - 0.001)
        .reduce((sum, h) => sum + (Number(h.count) || 0), 0)
    : 0;
  const apex98Count = exact98Count > 0
    ? exact98Count
    : usingHighGradeFallback
    ? highGradeCount
    : fallbackApexCount;
  const apexCardLabel = exact98Count > 0
    ? 'CGC 9.8 Sovereign Apex'
    : usingHighGradeFallback
    ? 'CGC 9.6+ High-Grade Apex'
    : fallbackApexGrade
    ? `CGC ${fallbackApexGrade}+ Sovereign Apex`
    : 'CGC 9.8 Sovereign Apex';

  // Apex 9.8 Ratio (or 9.8+ if only highGrade is known)
  const ratio = universalGraded > 0 ? (apex98Count / universalGraded) * 100 : 0;
  const formattedRatio = ratio > 0 && ratio < 0.1 ? `${ratio.toFixed(2)}%` : `${ratio.toFixed(1)}%`;

  const printRun = censusSummary.printRunTotal ?? null;
  const rawEstimated = censusSummary.rawCopiesEstimated ?? (printRun ? Math.max(0, printRun - totalGraded) : null);
  const survivingTotal = censusSummary.survivors ?? (rawEstimated != null ? rawEstimated + totalGraded : null);
  const rawRatio = printRun && rawEstimated
    ? ((rawEstimated / printRun) * 100).toFixed(1)
    : survivingTotal && survivingTotal > 0 && rawEstimated != null
    ? ((rawEstimated / survivingTotal) * 100).toFixed(1)
    : null;
  const basis = censusSummary.printBasis ?? null;
  const basisLabel = !basis
    ? null
    : /^documented/i.test(basis) ? 'DOCUMENTED'
    : /issue chart/i.test(basis) ? 'DIAMOND CHART (COMICHRON)'
    : /^postal/i.test(basis) ? 'POSTAL STATEMENT (TITLE-YEAR)'
    : /industry avg/i.test(basis) ? basis.toUpperCase()
    : 'MODEL ESTIMATE';
  const fmtN = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString());
  const supplyRows: Array<{ label: string; value: string; note: string }> = censusSummary.survivors != null
    ? [
        { label: 'Printed', value: fmtN(printRun), note: basisLabel ?? 'ESTIMATE' },
        { label: 'Surviving (est.)', value: fmtN(censusSummary.survivors), note: censusSummary.survivorsLow != null ? `${fmtN(censusSummary.survivorsLow)} – ${fmtN(censusSummary.survivorsHigh)}` : 'RANGE N/A' },
        { label: 'CGC graded', value: fmtN(totalGraded), note: 'CENSUS' },
        { label: 'Raw survivors (est.)', value: fmtN(rawEstimated), note: 'SURVIVING − GRADED' },
        { label: 'Active float', value: fmtN(censusSummary.activeFloat), note: censusSummary.sales12m != null ? `${fmtN(censusSummary.sales12m)} SALES / 12M` : 'NO SALES MEASURED' },
        { label: 'Vault hoard', value: fmtN(censusSummary.vaultHoard), note: 'GRADED, NOT TRADING' },
      ]
    : [];

  // Single unified scarcity tier passed from resolveUnifiedScarcityTier so Hero badge and CensusBanner never disagree.
  const normalizedTier = (scarcityLabel || '').toLowerCase().trim();
  const isMythic = normalizedTier === 'mythic';
  const isLegendary = normalizedTier === 'legendary';
  const isEpic = normalizedTier === 'epic';
  const isRare = normalizedTier === 'rare';
  const isUncommon = normalizedTier === 'uncommon';

  let scarcitySignal = '';
  let scarcityColor = '';

  if (isMythic) {
    scarcitySignal = '👑 MYTHIC (UNICORN)';
    scarcityColor = '#c084fc';
  } else if (isLegendary) {
    scarcitySignal = '💎 LEGENDARY';
    scarcityColor = '#f59e0b';
  } else if (isEpic) {
    scarcitySignal = '🛡 EPIC';
    scarcityColor = '#ec4899';
  } else if (isRare) {
    scarcitySignal = '🔥 RARE';
    scarcityColor = '#38bdf8';
  } else if (isUncommon) {
    scarcitySignal = '📦 UNCOMMON';
    scarcityColor = '#10b981';
  } else {
    scarcitySignal = '📋 COMMON FLOAT';
    scarcityColor = '#38bdf8';
  }

  const borderAccent = eraColors?.border || '#C9A227';
  const borderOpacity20 = borderAccent.startsWith('#')
    ? `${borderAccent}33`
    : 'rgba(255,255,255,0.2)';

  const formattedSnapshotDate = formatSnapshotDate(censusSummary.snapshotDate);

  return (
    <div
      className="mb-6 rounded-xl p-4 sm:p-5 w-full relative overflow-hidden bg-[#0a0f1d]/85 backdrop-blur-md border border-white/10 shadow-lg"
      style={{
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* Top Laser Accent */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, ${borderAccent}00, ${borderAccent}, ${borderAccent}00)`,
        }}
      />

      {/* Section Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-4 rounded-sm" style={{ backgroundColor: borderAccent }} />
          <span
            className="text-xs uppercase tracking-widest font-semibold font-sans text-slate-200"
            style={{ letterSpacing: '0.12em' }}
          >
            📊 CGC Census &amp; Active Circulating Float
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300">
          Anti-Census Illusion Protocol
        </span>
      </div>

      {/* 5 Stat Blocks Grid: Responsive with Interactive Rim-Light Drilldowns */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Stat 1: Total Graded Census */}
        <button
          type="button"
          onClick={() => toggleDrilldown('census')}
          className={`p-3.5 rounded-lg text-left flex flex-col justify-between gap-1.5 transition-all cursor-pointer border ${
            activeDrilldown === 'census'
              ? 'bg-[#0e172a] border-cyan-400 shadow-[0_0_16px_rgba(56,189,248,0.35)] ring-1 ring-cyan-400'
              : 'bg-white/[0.03] border-white/10 hover:border-cyan-500/50 hover:bg-white/[0.05]'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span
              className="text-xs uppercase tracking-widest font-semibold text-slate-300 font-sans"
              style={{ letterSpacing: '0.1em' }}
            >
              Registered Census
            </span>
            <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-0.5">
              {activeDrilldown === 'census' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-bold font-mono text-white leading-tight">
            {totalAllLabels.toLocaleString()}
          </span>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            {censusSummary.labelBreakdown ? 'ALL CGC LABELS' : 'TOTAL CERTIFIED'}
          </span>
        </button>

        {/* Stat 2: Universal (Blue Label) or Physical Raw Float */}
        <button
          type="button"
          onClick={() => toggleDrilldown('rawFloat')}
          className={`p-3.5 rounded-lg text-left flex flex-col justify-between gap-1.5 transition-all cursor-pointer border ${
            activeDrilldown === 'rawFloat'
              ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.35)] ring-1 ring-amber-400'
              : 'bg-amber-500/10 border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/20'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span
              className="text-xs uppercase tracking-widest font-semibold text-amber-300 font-sans"
              style={{ letterSpacing: '0.1em' }}
            >
              {censusSummary.labelBreakdown ? 'Universal (Blue)' : rawEstimated ? 'Physical Raw Float' : 'Universal Slabs'}
            </span>
            <span className="text-[10px] text-amber-300 font-mono flex items-center gap-0.5">
              {activeDrilldown === 'rawFloat' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-bold font-mono text-amber-300 leading-tight">
            {censusSummary.labelBreakdown
              ? universalGraded.toLocaleString()
              : rawEstimated
              ? `~${rawEstimated.toLocaleString()}`
              : totalGraded.toLocaleString()}
          </span>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
            {censusSummary.labelBreakdown
              ? `${((universalGraded / Math.max(1, totalAllLabels)) * 100).toFixed(1)}% BLUE LABEL`
              : rawEstimated && rawRatio != null
              ? `${rawRatio}% UNGRADED COPIES`
              : 'CERTIFIED POPULATION'}
          </span>
        </button>

        {/* Stat 3: Print Run or Signature + Restored Breakdown */}
        <button
          type="button"
          onClick={() => toggleDrilldown('printRun')}
          className={`p-3.5 rounded-lg text-left flex flex-col justify-between gap-1.5 transition-all cursor-pointer border ${
            activeDrilldown === 'printRun'
              ? 'bg-[#091b24] border-teal-400 shadow-[0_0_16px_rgba(20,184,166,0.35)] ring-1 ring-teal-400'
              : 'bg-white/[0.03] border-white/10 hover:border-teal-400/50 hover:bg-white/[0.05]'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span
              className="text-xs uppercase tracking-widest font-semibold text-slate-300 font-sans"
              style={{ letterSpacing: '0.1em' }}
            >
              {printRun ? 'Total Print Run' : censusSummary.labelBreakdown ? 'Signature & JSA' : 'Print Run'}
            </span>
            <span className="text-[10px] text-teal-300 font-mono flex items-center gap-0.5">
              {activeDrilldown === 'printRun' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-bold font-mono text-cyan-300 leading-tight">
            {printRun
              ? printRun.toLocaleString()
              : censusSummary.labelBreakdown
              ? `${censusSummary.labelBreakdown.signatureSeries.toLocaleString()} + ${censusSummary.labelBreakdown.cgcJsa}`
              : 'Unrecorded'}
          </span>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            {printRun
              ? (basisLabel ?? (censusSummary.labelBreakdown ? 'POSTAL STATEMENT EST.' : 'DIAMOND INITIAL ORDERS'))
              : censusSummary.labelBreakdown
              ? `RESTORED: ${censusSummary.labelBreakdown.restored.toLocaleString()} · QUAL: ${censusSummary.labelBreakdown.qualified}`
              : 'PRE-DIAMOND ERA'}
          </span>
        </button>

        {/* Stat 4: 9.8+ High Grade Apex */}
        <button
          type="button"
          onClick={() => toggleDrilldown('apex')}
          className={`p-3.5 rounded-lg text-left flex flex-col justify-between gap-1.5 transition-all cursor-pointer border ${
            activeDrilldown === 'apex'
              ? 'bg-[#1a0f2e] border-purple-400 shadow-[0_0_16px_rgba(192,132,252,0.35)] ring-1 ring-purple-400'
              : 'bg-white/[0.03] border-white/10 hover:border-purple-400/50 hover:bg-white/[0.05]'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span
              className="text-xs uppercase tracking-widest font-semibold text-slate-300 font-sans"
              style={{ letterSpacing: '0.1em' }}
            >
              {apexCardLabel}
            </span>
            <span className="text-[10px] text-purple-300 font-mono flex items-center gap-0.5">
              {activeDrilldown === 'apex' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </span>
          </div>
          <span
            className="text-xl sm:text-2xl font-bold font-mono leading-tight"
            style={{ color: borderAccent }}
          >
            {apex98Count.toLocaleString()}
          </span>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            {formattedRatio} OF TOTAL
          </span>
        </button>

        {/* Stat 5: Scarcity Signal */}
        <button
          type="button"
          onClick={() => toggleDrilldown('scarcity')}
          className={`p-3.5 rounded-lg text-left flex flex-col justify-between gap-1.5 col-span-2 lg:col-span-1 transition-all cursor-pointer border ${
            activeDrilldown === 'scarcity'
              ? 'bg-[#0f2420] border-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.35)] ring-1 ring-emerald-400'
              : 'bg-white/[0.03] border-white/10 hover:border-emerald-400/50 hover:bg-white/[0.05]'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span
              className="text-xs uppercase tracking-widest font-semibold text-slate-300 font-sans"
              style={{ letterSpacing: '0.1em' }}
            >
              Scarcity Signal
            </span>
            <span className="text-[10px] text-emerald-300 font-mono flex items-center gap-0.5">
              {activeDrilldown === 'scarcity' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </span>
          </div>
          <span
            className="text-base sm:text-lg font-bold font-mono leading-tight"
            style={{ color: scarcityColor }}
          >
            {scarcitySignal}
          </span>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            {isMythic && highGradeCount > 0
              ? `APEX CENSUS (${highGradeCount} COPIES)`
              : scarcityLabel?.toUpperCase() || 'CENSUS REGIME'}
          </span>
        </button>
      </div>

      {supplyRows.length > 0 && (
        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
            <span className="text-xs uppercase tracking-widest font-semibold text-slate-300">Supply &amp; Float</span>
            {censusSummary.floatConfidence && (
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Confidence {censusSummary.floatConfidence}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {supplyRows.map((r) => (
              <div key={r.label} className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-wider text-slate-400">{r.label}</span>
                <span className="text-base font-bold font-mono text-slate-100">{r.value}</span>
                <span className="text-[10px] font-mono uppercase text-slate-500">{r.note}</span>
              </div>
            ))}
          </div>
          {basis && <p className="mt-2 text-[10px] text-slate-500 leading-snug">Print basis: {basis}</p>}
        </div>
      )}

      {/* Drill-down Interactive Reveal Drawer */}
      <CensusDrilldownPanel
        activeBox={activeDrilldown}
        onClose={() => setActiveDrilldown(null)}
        totalGraded={totalGraded}
        totalAllLabels={totalAllLabels}
        highGradeCount={apex98Count}
        apexGradeLabel={usingHighGradeFallback ? 'CGC 9.6+' : 'CGC 9.8'}
        printRunTotal={printRun}
        printBasis={basis}
        rawCopiesEstimated={rawEstimated}
        formattedRatio={formattedRatio}
        eraName={eraName}
        publicationYear={publicationYear}
        publisherName={publisherName}
        seriesName={seriesName}
        issueNumber={issueNumber}
        scarcitySignal={scarcitySignal}
        labelBreakdown={censusSummary.labelBreakdown}
      />

      {/* Bottom text */}
      <div className="mt-3.5 pt-2.5 text-xs font-mono text-slate-400 flex items-center justify-between border-t border-white/10 flex-wrap gap-2">
        <span>CGC Census · Universal: {totalGraded.toLocaleString()} · {formattedSnapshotDate}</span>
        <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-[10px] font-bold uppercase tracking-wider">
          Decoupled Supply Invariant Active
        </span>
      </div>
    </div>
  );
}
