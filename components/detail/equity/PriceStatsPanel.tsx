'use client';
import React from 'react';
import { BarChart2 } from 'lucide-react';
import type { HistoryEntry } from './types';
import { gradeStats } from '@/lib/comics/chart-model';
import { getEraColors } from '@/lib/design-system/colors';
import Panel from './Panel';

function usd(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function day(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)' }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', marginBottom: 6, letterSpacing: '.08em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: color || 'rgba(255,255,255,.92)', fontFamily: 'monospace' }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/**
 * Statistics of the dated prices on file for the grade with the most of them.
 * Only figures that can be computed from those prices are shown; with none the panel does not render.
 */
export default function PriceStatsPanel({ history, eraColors }: { history?: HistoryEntry[]; eraColors?: ReturnType<typeof getEraColors>; issueReferencePoints?: unknown }) {
  const s = gradeStats(history ?? []);
  if (!s) return null;
  const label = s.grade === 'RAW' ? 'Raw' : `CGC ${s.grade}`;
  const colors = eraColors ?? getEraColors('modern');

  return (
    <Panel title="52-Week & Historical Price Stats" icon={<BarChart2 className="w-3.5 h-3.5" />} eraColors={colors}>
      <div className="grid grid-cols-2 gap-2.5 w-full">
        <StatCard label={`Latest ${label}`} value={usd(s.latest.priceUsd)} sub={day(s.latest.date)} />
        {s.change30dPct != null ? (
          <StatCard
            label="Change vs 30+ days"
            value={`${s.change30dPct >= 0 ? '+' : ''}${s.change30dPct.toFixed(2)}%`}
            color={s.change30dPct >= 0 ? '#4ade80' : '#f87171'}
            sub="Trailing momentum"
          />
        ) : (
          <StatCard
            label="First Observation"
            value={day(s.first)}
            sub={`Initial ${label} entry`}
          />
        )}
        <StatCard label="Low / high on file" value={`${usd(s.low)} / ${usd(s.high)}`} sub={`since ${day(s.first)}`} />
        <StatCard label="Dated prices" value={String(s.count)} sub={`${label} observations`} />
      </div>
    </Panel>
  );
}
