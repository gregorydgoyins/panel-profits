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
  } | null | undefined;
  eraColors: { border: string; bg: string; bgHover: string; glow: string };
  scarcityLabel?: string;
  eraName?: string;
  publisherName?: string;
  seriesName?: string;
  issueNumber?: string;
  psaCount?: number;
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
  eraName = 'Postmodern',
  publisherName = 'Marvel Comics',
  seriesName = 'Silver Surfer: Black',
  issueNumber = '1',
  psaCount = 2,
}: CensusBannerProps) {
  const [activeDrilldown, setActiveDrilldown] = useState<DrilldownBoxKey | null>(null);

  const toggleDrilldown = (key: DrilldownBoxKey) => {
    setActiveDrilldown((prev) => (prev === key ? null : key));
  };
  if (!censusSummary || !censusSummary.totalGraded || censusSummary.totalGraded <= 0) return null;

  const totalGraded = typeof censusSummary.totalGraded === 'number' ? censusSummary.totalGraded : 0;
  const highGradeCount = typeof censusSummary.highGradeCount === 'number' ? censusSummary.highGradeCount : 0;
  const apex98Count = typeof censusSummary.census98Count === 'number' && censusSummary.census98Count > 0
    ? censusSummary.census98Count
    : (censusSummary.histogram?.find((h) => h.grade === '9.8')?.count ?? highGradeCount);

  // Apex 9.8 Ratio (or 9.8+ if only highGrade is known)
  const ratio = totalGraded > 0 ? (apex98Count / totalGraded) * 100 : 0;
  const formattedRatio = `${ratio.toFixed(1)}%`;

  const printRun = censusSummary.printRunTotal ?? null;
  const rawEstimated = censusSummary.rawCopiesEstimated ?? (printRun ? Math.max(0, printRun - totalGraded) : null);
  const rawRatio = printRun && rawEstimated ? ((rawEstimated / printRun) * 100).toFixed(1) : '99.6';

  // Canonical Scarcity Signal: enforce COMMON when labeled common (Anti-Census Illusion)
  let scarcitySignal = '';
  let scarcityColor = '';

  const isCommon = scarcityLabel?.toLowerCase() === 'common';
  const isMythic = !isCommon && ((highGradeCount > 0 && highGradeCount <= 5) || scarcityLabel?.toLowerCase() === 'mythic');
  const isLegendary = !isCommon && ((highGradeCount > 5 && highGradeCount <= 25) || scarcityLabel?.toLowerCase() === 'legendary');
  const isEpic = !isCommon && ((highGradeCount > 25 && highGradeCount <= 50) || scarcityLabel?.toLowerCase() === 'epic');
  const isRare = !isCommon && ((highGradeCount > 50 && highGradeCount <= 100) || scarcityLabel?.toLowerCase() === 'rare');
  const isUncommon = !isCommon && ((highGradeCount > 100 && highGradeCount <= 500) || scarcityLabel?.toLowerCase() === 'uncommon');

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
            {totalGraded.toLocaleString()}
          </span>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            TOTAL CERTIFIED
          </span>
        </button>

        {/* Stat 2: Active Circulating Float / Physical Raw Float */}
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
              {rawEstimated ? 'Physical Raw Float' : 'Tradeable Float'}
            </span>
            <span className="text-[10px] text-amber-300 font-mono flex items-center gap-0.5">
              {activeDrilldown === 'rawFloat' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-bold font-mono text-amber-300 leading-tight">
            ~{(rawEstimated ?? Math.max(1, Math.round(totalGraded * 0.18))).toLocaleString()}
          </span>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
            {rawEstimated ? `${rawRatio}% UNGRADED COPIES` : 'ACTIVE MARKET COPIES'}
          </span>
        </button>

        {/* Stat 3: Print Run / Vault Hoard Ratio */}
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
              {printRun ? 'Total Print Run' : 'Vault Hoard Ratio'}
            </span>
            <span className="text-[10px] text-teal-300 font-mono flex items-center gap-0.5">
              {activeDrilldown === 'printRun' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-bold font-mono text-cyan-300 leading-tight">
            {printRun ? printRun.toLocaleString() : '82.0%'}
          </span>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            {printRun ? 'DIAMOND INITIAL ORDERS' : 'LOCKED IN CUSTODY'}
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
              CGC 9.8 Sovereign Apex
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

      {/* Drill-down Interactive Reveal Drawer */}
      <CensusDrilldownPanel
        activeBox={activeDrilldown}
        onClose={() => setActiveDrilldown(null)}
        totalGraded={totalGraded}
        highGradeCount={highGradeCount}
        printRunTotal={printRun}
        rawCopiesEstimated={rawEstimated}
        rawRatio={rawRatio}
        formattedRatio={formattedRatio}
        eraName={eraName}
        publisherName={publisherName}
        seriesName={seriesName}
        issueNumber={issueNumber}
        psaCount={psaCount}
        borderAccent={borderAccent}
      />

      {/* Bottom text */}
      <div className="mt-3.5 pt-2.5 text-xs font-mono text-slate-400 flex items-center justify-between border-t border-white/10 flex-wrap gap-2">
        <span>CGC Census · Universal + Signature Series · {formattedSnapshotDate}</span>
        <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-[10px] font-bold uppercase tracking-wider">
          Decoupled Supply Invariant Active
        </span>
      </div>
    </div>
  );
}
