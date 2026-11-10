'use client';
import React, { useMemo } from 'react';
import Panel from './Panel';
import { getEraColors } from '@/lib/design-system/colors';
import { Anchor, TrendingUp } from 'lucide-react';

export interface PriceAnchorCardProps {
  keyPrices: {
    fmv98Usd: number;
    fmv10Usd: number;
    fmvRawUsd: number;
    sovPriceUsd: number;
    sovGrade: string | null;
    anchor9_8: number;
  };
  gradeLattice: Array<{ grade: string; priceUsd: number; salesVolume: number | null }>;
  priceHistory: Array<{ priceUsd: number; observedAt: string; grade: string }>;
  eraColors: { border: string; bg: string; bgHover: string; glow: string };
}

const GRADE_RANKS: Record<string, number> = {
  '10.0': 1000,
  '10': 1000,
  '9.9': 990,
  '9.8': 980,
  '9.6': 960,
  '9.4': 940,
  '9.2': 920,
  '9.0': 900,
  '9': 900,
  '8.5': 850,
  '8.0': 800,
  '8': 800,
  '7.5': 750,
  '7.0': 700,
  '7': 700,
  '6.5': 650,
  '6.0': 600,
  '6': 600,
  '5.5': 550,
  '5.0': 500,
  '5': 500,
  '4.5': 450,
  '4.0': 400,
  '4': 400,
  '3.5': 350,
  '3.0': 300,
  '3': 300,
  '2.5': 250,
  '2.0': 200,
  '2': 200,
  '1.8': 180,
  '1.5': 150,
  '1.0': 100,
  '1': 100,
  '0.5': 50,
  'RAW': 0,
};

function getGradeWeight(grade: string | null | undefined): number {
  if (!grade) return -1;
  const clean = grade.trim().toUpperCase();
  if (clean in GRADE_RANKS) {
    return GRADE_RANKS[clean];
  }
  const parsed = parseFloat(clean);
  if (!isNaN(parsed)) {
    return Math.round(parsed * 100);
  }
  return -1;
}

function formatPrice(val: number | null | undefined): string {
  if (val == null || isNaN(val) || typeof val !== 'number') {
    return '—';
  }
  return '$' + val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PriceAnchorCard({
  keyPrices,
  gradeLattice = [],
  priceHistory = [],
  eraColors,
}: PriceAnchorCardProps) {
  const colors = eraColors ?? getEraColors('modern');
  const sovPrice = keyPrices?.sovPriceUsd ?? 0;

  const sovGradeLabel = keyPrices?.sovGrade
    ? `SOVEREIGN (${keyPrices.sovGrade} CGC)`
    : 'SOVEREIGN (9.8 CGC)';

  const ladderRows = useMemo(() => {
    const rows = [];
    if (keyPrices?.fmv98Usd != null && keyPrices.fmv98Usd > 0) {
      rows.push({ label: 'Sovereign 9.8', price: keyPrices.fmv98Usd });
    }
    if (keyPrices?.anchor9_8 != null && keyPrices.anchor9_8 > 0 && keyPrices.anchor9_8 !== keyPrices.fmv98Usd) {
      rows.push({ label: 'Anchor 9.8', price: keyPrices.anchor9_8 });
    }
    if (keyPrices?.fmvRawUsd != null && keyPrices.fmvRawUsd > 0) {
      rows.push({ label: 'Raw', price: keyPrices.fmvRawUsd });
    }
    return rows;
  }, [keyPrices]);

  const topGrades = useMemo(() => {
    if (!gradeLattice || !Array.isArray(gradeLattice)) return [];
    const uniqueGrades: typeof gradeLattice = [];
    const seen = new Set<string>();

    for (const item of gradeLattice) {
      if (!item || !item.grade || typeof item.priceUsd !== 'number' || isNaN(item.priceUsd) || item.priceUsd <= 0) {
        continue;
      }
      const key = item.grade.trim().toUpperCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueGrades.push(item);
      }
    }

    return uniqueGrades
      .sort((a, b) => getGradeWeight(b.grade) - getGradeWeight(a.grade))
      .slice(0, 4);
  }, [gradeLattice]);

  const { floorPrice, ceilingPrice } = useMemo(() => {
    const latticePrices = (gradeLattice || [])
      .map((g) => g?.priceUsd)
      .filter((p): p is number => typeof p === 'number' && !isNaN(p) && p > 0);

    const floorCandidates = [...latticePrices];
    if (keyPrices?.fmvRawUsd != null && !isNaN(keyPrices.fmvRawUsd) && keyPrices.fmvRawUsd > 0) {
      floorCandidates.push(keyPrices.fmvRawUsd);
    }

    const ceilingCandidates = [...latticePrices];
    if (keyPrices?.sovPriceUsd != null && !isNaN(keyPrices.sovPriceUsd) && keyPrices.sovPriceUsd > 0) {
      ceilingCandidates.push(keyPrices.sovPriceUsd);
    }
    if (keyPrices?.anchor9_8 != null && !isNaN(keyPrices.anchor9_8) && keyPrices.anchor9_8 > 0) {
      ceilingCandidates.push(keyPrices.anchor9_8);
    }
    if (keyPrices?.fmv10Usd != null && !isNaN(keyPrices.fmv10Usd) && keyPrices.fmv10Usd > 0) {
      ceilingCandidates.push(keyPrices.fmv10Usd);
    }

    const floor = floorCandidates.length > 0 ? Math.min(...floorCandidates) : (keyPrices?.fmvRawUsd ?? null);
    const ceiling = ceilingCandidates.length > 0 ? Math.max(...ceilingCandidates) : (keyPrices?.sovPriceUsd ?? null);

    return { floorPrice: floor, ceilingPrice: ceiling };
  }, [gradeLattice, keyPrices]);

  return (
    <Panel
      title="Price Anchors"
      icon={<Anchor className="w-3.5 h-3.5" />}
      eraColors={colors as ReturnType<typeof getEraColors>}
    >
      <div className="space-y-3">
        {/* Sovereign Price */}
        <div>
          <div
            className="text-[9px] uppercase tracking-wider font-semibold mb-1"
            style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', letterSpacing: '0.12em' }}
          >
            {sovGradeLabel}
          </div>
          <div
            className="text-2xl font-bold tracking-tight"
            style={{ color: colors.border, fontFamily: 'monospace' }}
          >
            {formatPrice(keyPrices?.sovPriceUsd)}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full" style={{ backgroundColor: `${colors.border}20` }} />

        {/* Price Ladder */}
        <div>
          <div
            className="text-[9px] uppercase tracking-wider font-semibold mb-2"
            style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', letterSpacing: '0.12em' }}
          >
            PRICE LADDER
          </div>
          <div className="flex flex-col gap-1.5">
            {ladderRows.map((row) => {
              const pct = sovPrice > 0 && typeof row.price === 'number' && row.price > 0
                ? Math.min(100, Math.max(0, (row.price / sovPrice) * 100))
                : 0;

              return (
                <div key={row.label} className="flex items-center gap-2 py-0.5">
                  <span
                    className="text-[9px] uppercase font-semibold shrink-0"
                    style={{
                      color: 'rgba(255,255,255,0.4)',
                      fontFamily: 'monospace',
                      letterSpacing: '0.06em',
                      width: '74px',
                    }}
                  >
                    {row.label}
                  </span>
                  <div
                    className="flex-1 relative h-1 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 rounded-full transition-all duration-300"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: colors.border,
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-medium shrink-0 text-right"
                    style={{
                      color: '#ffffff',
                      fontFamily: 'monospace',
                      minWidth: '68px',
                    }}
                  >
                    {formatPrice(row.price)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full" style={{ backgroundColor: `${colors.border}20` }} />

        {/* Premium Stack */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3 h-3 shrink-0" style={{ color: colors.border }} />
            <span
              className="text-[9px] uppercase tracking-wider font-semibold"
              style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', letterSpacing: '0.12em' }}
            >
              PREMIUM STACK (VS 9.8)
            </span>
          </div>
          {topGrades.length > 0 ? (
            <div className="flex flex-col gap-1">
              {topGrades.map((item) => {
                const premium = sovPrice > 0 ? ((item.priceUsd - sovPrice) / sovPrice) * 100 : null;
                const isPositive = premium != null && premium > 0.001;
                const isNegative = premium != null && premium < -0.001;
                const isZero = premium != null && !isPositive && !isNegative;

                const badgeText = premium == null
                  ? '—'
                  : isZero
                  ? '0.0%'
                  : isPositive
                  ? `+${premium.toFixed(1)}%`
                  : `${premium.toFixed(1)}%`;

                const badgeColor = premium == null || isZero
                  ? 'rgba(255,255,255,0.6)'
                  : isPositive
                  ? '#4ade80'
                  : '#f87171';

                const badgeBg = premium == null || isZero
                  ? 'rgba(255,255,255,0.06)'
                  : isPositive
                  ? 'rgba(74, 222, 128, 0.12)'
                  : 'rgba(248, 113, 113, 0.12)';

                const badgeBorder = premium == null || isZero
                  ? 'rgba(255,255,255,0.12)'
                  : isPositive
                  ? 'rgba(74, 222, 128, 0.25)'
                  : 'rgba(248, 113, 113, 0.25)';

                return (
                  <div key={item.grade} className="flex items-center justify-between py-0.5">
                    <span
                      className="text-xs font-semibold shrink-0"
                      style={{
                        color: item.grade === '9.8' ? colors.border : 'rgba(255,255,255,0.85)',
                        fontFamily: 'monospace',
                        width: '40px',
                      }}
                    >
                      {item.grade}
                    </span>
                    <span
                      className="text-xs font-medium flex-1 text-right pr-3"
                      style={{ color: '#ffffff', fontFamily: 'monospace' }}
                    >
                      {formatPrice(item.priceUsd)}
                    </span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium shrink-0 text-right"
                      style={{
                        backgroundColor: badgeBg,
                        color: badgeColor,
                        border: `1px solid ${badgeBorder}`,
                        minWidth: '58px',
                      }}
                    >
                      {badgeText}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="text-xs py-1"
              style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'Hind, sans-serif' }}
            >
              No lattice data available
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px w-full" style={{ backgroundColor: `${colors.border}20` }} />

        {/* Floor / Ceiling */}
        <div className="grid grid-cols-2 gap-2">
          <div
            className="p-2.5 rounded flex flex-col justify-between"
            style={{
              backgroundColor: 'rgba(255,255,255,0.018)',
              border: `1px solid ${colors.border}20`,
            }}
          >
            <div
              className="text-[8px] uppercase tracking-wider font-semibold mb-1"
              style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', letterSpacing: '0.12em' }}
            >
              Floor
            </div>
            <div
              className="text-sm font-semibold tracking-tight"
              style={{ color: '#ffffff', fontFamily: 'monospace' }}
            >
              {formatPrice(floorPrice)}
            </div>
          </div>

          <div
            className="p-2.5 rounded flex flex-col justify-between"
            style={{
              backgroundColor: 'rgba(255,255,255,0.018)',
              border: `1px solid ${colors.border}20`,
            }}
          >
            <div
              className="text-[8px] uppercase tracking-wider font-semibold mb-1"
              style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', letterSpacing: '0.12em' }}
            >
              Ceiling
            </div>
            <div
              className="text-sm font-semibold tracking-tight"
              style={{ color: colors.border, fontFamily: 'monospace' }}
            >
              {formatPrice(ceilingPrice)}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
