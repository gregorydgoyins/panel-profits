'use client';

import React from 'react';
import {
  Building2,
  Layers,
  Sparkles,
  Info,
  Scale,
} from 'lucide-react';

export type DrilldownBoxKey = 'census' | 'rawFloat' | 'printRun' | 'apex' | 'scarcity';

export interface CensusDrilldownPanelProps {
  activeBox: DrilldownBoxKey | null;
  onClose: () => void;
  totalGraded: number;
  totalAllLabels: number;
  highGradeCount: number;
  apexGradeLabel: string;
  printRunTotal: number | null;
  printBasis: string | null;
  rawCopiesEstimated: number | null;
  formattedRatio: string;
  eraName: string;
  publicationYear: number | null;
  publisherName: string;
  seriesName: string;
  issueNumber: string;
  scarcitySignal: string;
  labelBreakdown?: {
    universal: number;
    signatureSeries: number;
    cgcJsa: number;
    qualified: number;
    conserved: number;
    restored: number;
    total: number;
  } | null;
}

export default function CensusDrilldownPanel({
  activeBox,
  onClose,
  totalGraded,
  totalAllLabels,
  highGradeCount,
  apexGradeLabel,
  printRunTotal,
  printBasis,
  rawCopiesEstimated,
  formattedRatio,
  eraName,
  publicationYear,
  publisherName,
  seriesName,
  issueNumber,
  scarcitySignal,
  labelBreakdown,
}: CensusDrilldownPanelProps) {
  if (!activeBox) return null;

  const isModernEra =
    (publicationYear != null && publicationYear >= 1990) ||
    eraName.toLowerCase().includes('postmodern') ||
    eraName.toLowerCase().includes('modern');

  const rawEst =
    rawCopiesEstimated ??
    (printRunTotal != null ? Math.max(0, printRunTotal - totalAllLabels) : null);

  const universalPct =
    totalAllLabels > 0 ? ((totalGraded / totalAllLabels) * 100).toFixed(1) : '100.0';

  const signedCount =
    (labelBreakdown?.signatureSeries ?? 0) + (labelBreakdown?.cgcJsa ?? 0);
  const nonUniversalCount = Math.max(0, totalAllLabels - totalGraded);

  const eraHeading = publicationYear
    ? `${eraName || 'Unknown Era'} (${publicationYear})`
    : eraName || 'Unknown Era';

  return (
    <div className="mt-3 p-4 sm:p-5 rounded-xl border border-cyan-500/30 bg-[#070c18]/95 backdrop-blur-md shadow-2xl space-y-4 animate-fadeIn transition-all">
      {/* Top Header & Close Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Info className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-200">
            {activeBox === 'census' && 'Deep Dive: Registered CGC Census & Label Isolation'}
            {activeBox === 'rawFloat' && 'Deep Dive: Blue Label Universal Census & Ungraded Float'}
            {activeBox === 'printRun' && 'Deep Dive: Print Run Benchmark & Supply Basis'}
            {activeBox === 'apex' && `Deep Dive: ${apexGradeLabel} High-Grade Concentration`}
            {activeBox === 'scarcity' && 'Deep Dive: Scarcity Classification & Census Signal'}
          </span>
        </div>
        <button
          onClick={onClose}
          type="button"
          className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-cyan-400/50 cursor-pointer transition-colors"
        >
          ✕ Close
        </button>
      </div>

      {/* ── 1. WHAT THIS MEANS IN PANEL PROFITS ── */}
      <div className="p-3.5 rounded-lg bg-black/40 border border-white/10 space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>What this means in Panel Profits</span>
        </div>
        <p className="text-xs text-slate-300 font-sans leading-relaxed">
          {activeBox === 'census' && (
            <>
              CGC has graded <strong>{totalAllLabels.toLocaleString()} total copies</strong> of{' '}
              <strong>{seriesName} #{issueNumber}</strong> across all label types, of which{' '}
              <strong>{totalGraded.toLocaleString()} ({universalPct}%)</strong> are unrestored{' '}
              <strong>Universal Blue Label</strong> slabs. Panel Profits isolates Blue Label Universal
              copies for pricing and liquidity benchmarks so restored, conserved, qualified, and signed
              slabs never distort direct market pricing.
            </>
          )}
          {activeBox === 'rawFloat' && (
            <>
              <strong>{totalGraded.toLocaleString()} Universal Blue Label slabs</strong> form the
              certified direct-market census for {seriesName} #{issueNumber}.
              {printRunTotal != null && rawEst != null ? (
                <>
                  {' '}
                  Subtracting all {totalAllLabels.toLocaleString()} CGC-graded copies (every label) from
                  the ~{printRunTotal.toLocaleString()} estimated print run leaves{' '}
                  <strong>{rawEst.toLocaleString()} ungraded copies</strong> not recorded in the CGC
                  census.
                </>
              ) : (
                <> No verified print run benchmark is recorded for this issue yet.</>
              )}
            </>
          )}
          {activeBox === 'printRun' && (
            <>
              {printRunTotal != null ? (
                <>
                  This issue carries an estimated print run of{' '}
                  <strong>~{printRunTotal.toLocaleString()} copies</strong>
                  {printBasis ? <> ({printBasis})</> : null}. Out of that print run,{' '}
                  <strong>{totalAllLabels.toLocaleString()}</strong> copies have been submitted to CGC
                  across all label classes ({totalGraded.toLocaleString()} Universal Blue Label).
                </>
              ) : (
                <>
                  No issue-specific or era print run benchmark is currently recorded for{' '}
                  {seriesName} #{issueNumber}. Supply analysis relies solely on the live CGC certified
                  census ({totalGraded.toLocaleString()} Universal Blue Label slabs).
                </>
              )}
            </>
          )}
          {activeBox === 'apex' && (
            <>
              Only <strong>{highGradeCount.toLocaleString()} Universal Blue Label {highGradeCount === 1 ? 'copy' : 'copies'}</strong>{' '}
              of {seriesName} #{issueNumber} sit in the <strong>{apexGradeLabel}</strong> apex tier (
              <strong>{formattedRatio}</strong> of the {totalGraded.toLocaleString()}-slab Universal
              census). Tight top-grade concentration drives wider spreads and higher multiples over raw
              copies.
            </>
          )}
          {activeBox === 'scarcity' && (
            <>
              {isModernEra ? (
                <>
                  <strong>{seriesName} #{issueNumber}</strong> ({eraHeading}) is evaluated under the{' '}
                  <strong>Anti-Census Illusion Protocol</strong>: modern comics can show small CGC
                  counts simply because low raw values discourage grading submissions. Panel Profits
                  weighs census grade distribution, apex population ({highGradeCount.toLocaleString()} at{' '}
                  {apexGradeLabel}), and print run together to classify this issue as{' '}
                  <strong>{scarcitySignal}</strong>.
                </>
              ) : (
                <>
                  <strong>{seriesName} #{issueNumber}</strong> ({eraHeading}) is classified as{' '}
                  <strong>{scarcitySignal}</strong> based on its certified Universal Blue Label census (
                  <strong>{totalGraded.toLocaleString()} total Universal slabs</strong>, with only{' '}
                  <strong>{highGradeCount.toLocaleString()}</strong> at <strong>{apexGradeLabel}</strong>
                  {' — '}
                  <strong>{formattedRatio}</strong> of the graded population) and its grade distribution
                  relative to the {seriesName} series.
                </>
              )}
            </>
          )}
        </p>
      </div>

      {/* ── 2. FACTUAL CONTEXT CARDS (NO HARDCODED DEMO DATA) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
        {/* Card 1: By Era & Year */}
        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="uppercase tracking-wider text-[10px]">By Era &amp; Year</span>
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="space-y-1">
            <div className="text-slate-200 font-bold text-sm">{eraHeading}</div>
            <p className="text-[11px] text-slate-400 leading-normal font-sans">
              {isModernEra
                ? 'Modern archival paper stock and collector bagging produce higher 9.8 survival rates across submitted copies.'
                : `Vintage ${eraName || 'archival'} newsprint stock results in scarce high-grade survival, concentrating institutional demand at the top of the Universal census.`}
            </p>
          </div>
        </div>

        {/* Card 2: CGC Label Breakdown */}
        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="uppercase tracking-wider text-[10px]">CGC Label Breakdown</span>
            <Scale className="w-3.5 h-3.5 text-amber-400" />
          </div>
          {labelBreakdown ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-cyan-300 font-bold">
                  Universal: {totalGraded.toLocaleString()} ({universalPct}%)
                </span>
                <span className="text-amber-300 font-bold">
                  Other: {nonUniversalCount.toLocaleString()}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden flex">
                <div style={{ width: `${universalPct}%` }} className="h-full bg-cyan-400" />
              </div>
              <p className="text-[10px] text-slate-400 font-sans leading-normal">
                Signed (SS/JSA): {signedCount.toLocaleString()} · Qualified:{' '}
                {labelBreakdown.qualified.toLocaleString()} · Conserved:{' '}
                {labelBreakdown.conserved.toLocaleString()} · Restored:{' '}
                {labelBreakdown.restored.toLocaleString()}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-slate-200 font-bold text-sm">
                {totalGraded.toLocaleString()} Universal Slabs
              </div>
              <p className="text-[11px] text-slate-400 leading-normal font-sans">
                {highGradeCount.toLocaleString()} copies in the {apexGradeLabel} apex band (
                {formattedRatio} of certified Universal supply).
              </p>
            </div>
          )}
        </div>

        {/* Card 3: Publisher & Issue */}
        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="uppercase tracking-wider text-[10px]">Publisher &amp; Issue</span>
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <div className="text-slate-200 font-bold text-sm">
              {publisherName} · {seriesName} #{issueNumber}
            </div>
            <p className="text-[11px] text-slate-400 leading-normal font-sans">
              {printRunTotal != null && rawEst != null
                ? `~${printRunTotal.toLocaleString()} printed${printBasis ? ` (${printBasis})` : ''} · ${totalAllLabels.toLocaleString()} CGC graded · ${rawEst.toLocaleString()} ungraded.`
                : `${totalGraded.toLocaleString()} certified Universal slabs logged on CGC census (${highGradeCount.toLocaleString()} at ${apexGradeLabel}).`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
