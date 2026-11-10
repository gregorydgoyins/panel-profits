'use client';
import { useState, type ReactNode } from 'react';
import type React from 'react';
import { getEraColors } from '@/lib/design-system/colors';
import type { MarketMathData } from './types';

export type { MarketMathData };

interface MarketMathPanelProps {
  data: MarketMathData | null | undefined;
  isLoading?: boolean;
  eraColors: ReturnType<typeof getEraColors>;
}

function fmtPct(v: number | null, plusSign = true): string {
  if (v == null) return '—';
  const s = Math.abs(v).toFixed(1) + '%';
  if (v > 0) return plusSign ? '+' + s : s;
  if (v < 0) return '−' + s;
  return s;
}

function fmtUsd(v: number | null): string {
  if (v == null) return '—';
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const DIRECTION_ARROW: Record<string, string> = {
  STRONG_UP: '▲▲', UP: '▲', FLAT: '─', DOWN: '▼', STRONG_DOWN: '▼▼',
};

const LABEL_DISPLAY: Record<string, string> = {
  STRONG_UP: 'STRONG UP', UP: 'UP', FLAT: 'FLAT', DOWN: 'DOWN', STRONG_DOWN: 'STRONG DOWN',
  EXTENDED: 'EXTENDED', UPPER: 'UPPER', NEUTRAL: 'NEUTRAL', LOWER: 'LOWER', COMPRESSED: 'COMPRESSED',
  WIDE: 'WIDE', NORMAL: 'NORMAL',
  CONCENTRATED: 'CONCENTRATED', MIXED: 'MIXED', DISPERSED: 'DISPERSED',
  PRESSURE: 'PRESSURE', BALANCED: 'BALANCED', SUPPLY_HEAVY: 'SUPPLY HEAVY',
  VOLATILE: 'VOLATILE', ACTIVE: 'ACTIVE', STABLE: 'STABLE',
};

function signalStrength(label: string | null): 'high' | 'mid' | 'low' {
  if (!label) return 'low';
  if (['STRONG_UP', 'PRESSURE', 'WIDE', 'EXTENDED', 'VOLATILE', 'CONCENTRATED'].includes(label)) return 'high';
  if (['UP', 'UPPER', 'ACTIVE', 'NORMAL', 'MIXED'].includes(label)) return 'mid';
  return 'low';
}

function Cell({
  title, subtitle, value, valueSmall, label, labelRaw, extra, eraColors, loading,
}: {
  title: string;
  subtitle: string;
  value: string;
  valueSmall?: string;
  label: string | null;
  labelRaw: string | null;
  extra?: React.ReactNode;
  eraColors: ReturnType<typeof getEraColors>;
  loading?: boolean;
}) {
  const strength = signalStrength(labelRaw);
  const arrow = labelRaw ? (DIRECTION_ARROW[labelRaw] ?? '') : '';

  const labelBg =
    strength === 'high' ? `${eraColors.border}28` :
    strength === 'mid'  ? `${eraColors.border}16` :
    'rgba(255,255,255,0.05)';

  const labelColor =
    strength === 'high' ? eraColors.border :
    strength === 'mid'  ? `${eraColors.border}CC` :
    'rgba(255,255,255,0.38)';

  return (
    <div
      className="flex flex-col gap-1.5 p-3 rounded"
      style={{
        backgroundColor: 'rgba(255,255,255,0.022)',
        border: `1px solid ${eraColors.border}18`,
        minHeight: 88,
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <div>
          <div
            className="uppercase tracking-widest"
            style={{ fontSize: 8, color: 'rgba(255,255,255,0.28)', fontFamily: 'monospace', letterSpacing: '0.14em' }}
          >
            {title}
          </div>
          <div
            className="uppercase tracking-wider mt-0.5"
            style={{ fontSize: 7, color: `${eraColors.border}88`, fontFamily: 'monospace', letterSpacing: '0.10em' }}
          >
            {subtitle}
          </div>
        </div>
        {label && labelRaw && (
          <div
            className="shrink-0 px-1.5 py-0.5 rounded-sm flex items-center gap-1"
            style={{ backgroundColor: labelBg, border: `1px solid ${eraColors.border}22` }}
          >
            {arrow && (
              <span style={{ fontSize: 7, color: labelColor, fontFamily: 'monospace' }}>{arrow}</span>
            )}
            <span style={{ fontSize: 7.5, color: labelColor, fontFamily: 'monospace', letterSpacing: '0.06em' }}>
              {label}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-end">
          <div className="h-4 rounded animate-pulse" style={{ width: '60%', backgroundColor: 'rgba(255,255,255,0.05)' }} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-end gap-0.5">
          <div
            style={{
              fontSize: value === '—' || value.startsWith('No') ? 10 : 13,
              color: value === '—' || value.startsWith('No') ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.88)',
              fontFamily: 'monospace',
              fontWeight: value === '—' ? 300 : 500,
              lineHeight: 1.2,
            }}
          >
            {value}
          </div>
          {valueSmall && (
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', fontFamily: 'monospace' }}>
              {valueSmall}
            </div>
          )}
          {extra}
        </div>
      )}
    </div>
  );
}

export default function MarketMathPanel({
  data, isLoading = false, eraColors,
}: MarketMathPanelProps) {
  const [open, setOpen] = useState(true);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: `1px solid ${eraColors.border}20`, backgroundColor: 'rgba(255,255,255,0.018)' }}
    >
      <div
        className="px-4 py-2 flex items-center gap-2 cursor-pointer select-none"
        style={{
          backgroundColor: open ? `${eraColors.border}09` : `${eraColors.border}05`,
          borderBottom: open ? `1px solid ${eraColors.border}18` : 'none',
          transition: 'background-color 150ms ease',
        }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ color: `${eraColors.border}d9`, fontSize: 12 }}>◈</span>
        <span
          className="text-xs uppercase tracking-wider font-semibold flex-1"
          style={{ color: eraColors.border, letterSpacing: '0.14em' }}
        >
          Market Math
        </span>
        <span
          className="text-[8px] px-1 rounded"
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.4)',
            fontFamily: 'monospace',
            fontSize: 8,
          }}
        >
          CONFIRMED SALES ONLY
        </span>
        {data?.partial && !isLoading && (
          <span
            className="text-[7px] px-1 rounded"
            style={{ backgroundColor: `${eraColors.border}18`, color: `${eraColors.border}AA`, fontFamily: 'monospace' }}
          >
            PARTIAL
          </span>
        )}
        <span
          className="text-[8px] px-1 rounded ml-1"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.76)', fontFamily: 'monospace' }}
        >
          {open ? '▲' : '▼'}
        </span>
      </div>

      {open && (
        <div className="p-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Cell
              title={`Momentum · ROC (${data?.momentum?.grade ? (data.momentum.grade.toUpperCase() === 'RAW' ? 'Raw' : `CGC ${data.momentum.grade}`) : 'ROC'})`}
              subtitle="Rate of Change"
              eraColors={eraColors}
              loading={isLoading}
              label={data?.momentum?.direction ? (LABEL_DISPLAY[data.momentum.direction] ?? data.momentum.direction) : null}
              labelRaw={data?.momentum?.direction ?? null}
              value={
                data?.momentum
                  ? fmtPct(data.momentum.roc90d)
                  : isLoading ? '' : 'Insufficient data'
              }
              valueSmall={
                data?.momentum
                  ? `30d ${fmtPct(data.momentum.roc30d)} · 120d ${fmtPct(data.momentum.roc120d)}`
                  : undefined
              }
            />

            <Cell
              title={`Velocity Bands · 90D (${data?.momentum?.grade ? (data.momentum.grade.toUpperCase() === 'RAW' ? 'Raw' : `CGC ${data.momentum.grade}`) : '90D'})`}
              subtitle="Bollinger equivalent"
              eraColors={eraColors}
              loading={isLoading}
              label={data?.velocityBands?.position ? (LABEL_DISPLAY[data.velocityBands.position] ?? data.velocityBands.position) : null}
              labelRaw={data?.velocityBands?.position ?? null}
              value={
                data?.velocityBands
                  ? fmtUsd(data.velocityBands.currentPrice)
                  : isLoading ? '' : 'Insufficient data'
              }
              valueSmall={
                data?.velocityBands
                  ? `μ ${fmtUsd(data.velocityBands.mu)} ± ${fmtUsd(data.velocityBands.sigma)}`
                  : undefined
              }
              extra={
                data?.velocityBands ? (
                  <div className="mt-1 flex gap-1 items-center" style={{ fontSize: 8, color: 'rgba(255,255,255,0.28)', fontFamily: 'monospace' }}>
                    <span>{fmtUsd(data.velocityBands.lower2)}</span>
                    <span style={{ flex: 1, borderTop: `1px solid ${eraColors.border}30` }} />
                    <span>{fmtUsd(data.velocityBands.upper2)}</span>
                  </div>
                ) : undefined
              }
            />

            <Cell
              title="Grade Arbitrage"
              subtitle="Max adjacent spread"
              eraColors={eraColors}
              loading={isLoading}
              label={data?.gradeArbitrageIndex?.label ? (LABEL_DISPLAY[data.gradeArbitrageIndex.label] ?? data.gradeArbitrageIndex.label) : null}
              labelRaw={data?.gradeArbitrageIndex?.label ?? null}
              value={
                data?.gradeArbitrageIndex
                  ? fmtPct(data.gradeArbitrageIndex.maxSpreadPct, false)
                  : isLoading ? '' : 'Insufficient data'
              }
              valueSmall={
                data?.gradeArbitrageIndex && data.gradeArbitrageIndex.highGrade && data.gradeArbitrageIndex.lowGrade
                  ? `${data.gradeArbitrageIndex.highGrade.toUpperCase() === 'RAW' ? 'Raw' : `CGC ${data.gradeArbitrageIndex.highGrade}`} → ${data.gradeArbitrageIndex.lowGrade.toUpperCase() === 'RAW' ? 'Raw' : `CGC ${data.gradeArbitrageIndex.lowGrade}`} · ${data.gradeArbitrageIndex.confirmedGradeCount} grades`
                  : undefined
              }
            />

            <Cell
              title="Liquidity Conc. · HHI"
              subtitle="Herfindahl-Hirschman"
              eraColors={eraColors}
              loading={isLoading}
              label={data?.liquidityConcentration?.label ? (LABEL_DISPLAY[data.liquidityConcentration.label] ?? data.liquidityConcentration.label) : null}
              labelRaw={data?.liquidityConcentration?.label ?? null}
              value={
                data?.liquidityConcentration
                  ? data.liquidityConcentration.hhi.toFixed(3)
                  : isLoading ? '' : 'Insufficient data'
              }
              valueSmall={
                data?.liquidityConcentration
                  ? `${data.liquidityConcentration.totalVolume.toLocaleString()} confirmed sales · ${data.liquidityConcentration.gradeCount} grades`
                  : undefined
              }
            />

            <Cell
              title="Census Pressure · CPR"
              subtitle="Pop. vs sales volume"
              eraColors={eraColors}
              loading={isLoading}
              label={data?.censusPressure?.label ? (LABEL_DISPLAY[data.censusPressure.label] ?? data.censusPressure.label) : null}
              labelRaw={data?.censusPressure?.label ?? null}
              value={
                data?.censusPressure
                  ? data.censusPressure.cpr.toFixed(3)
                  : isLoading ? '' : 'Insufficient data'
              }
              valueSmall={
                data?.censusPressure
                  ? `${data.censusPressure.populationAtOrAboveSov.toLocaleString()} pop ÷ ${data.censusPressure.totalSalesVol.toLocaleString()} vol · ≥ CGC ${data.censusPressure.sovereignGrade}`
                  : undefined
              }
            />

            <Cell
              title="Price Efficiency · 90D"
              subtitle="High/Low range ratio"
              eraColors={eraColors}
              loading={isLoading}
              label={data?.priceEfficiency?.label ? (LABEL_DISPLAY[data.priceEfficiency.label] ?? data.priceEfficiency.label) : null}
              labelRaw={data?.priceEfficiency?.label ?? null}
              value={
                data?.priceEfficiency
                  ? fmtPct(data.priceEfficiency.efficiencyPct, false)
                  : isLoading ? '' : 'Insufficient data'
              }
              valueSmall={
                data?.priceEfficiency
                  ? `${fmtUsd(data.priceEfficiency.low90d)} → ${fmtUsd(data.priceEfficiency.high90d)} · ${data.priceEfficiency.dataPoints}pt`
                  : undefined
              }
            />
          </div>

          <div
            className="mt-3 text-right"
            style={{ fontSize: 8, color: 'rgba(255,255,255,0.18)', fontFamily: 'monospace', letterSpacing: '0.06em' }}
          >
            CONFIRMED SALES ONLY · NO AI · NO CATALOG ESTIMATES
            {data?.sovereignGrade && (
              <span style={{ color: `${eraColors.border}66` }}>
                {' · '}{data.isSovereign === true ? 'SOV CGC' : 'PEAK CGC'} {data.sovereignGrade}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
