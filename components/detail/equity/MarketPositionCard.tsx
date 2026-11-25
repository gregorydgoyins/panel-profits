'use client';
import React, { useMemo } from 'react';
import Panel from './Panel';
import { Crosshair, Star, Trophy, Flame, Activity } from 'lucide-react';
import { getEraColors } from '@/lib/design-system/colors';

export interface MarketPositionCardProps {
  variant: {
    era?: string;
    publisher?: string;
    issueNumber?: number | string;
    title?: string;
    scarcityTier?: string;
    keyStatus?: string;
    firstAppearance?: string;
  };
  series?: {
    name?: string;
    totalIssues?: number;
    startYear?: number;
    endYear?: number;
  } | null;
  keyPrices?: {
    sovPriceUsd?: number;
    fmvRawUsd?: number;
    fmv98Usd?: number;
    delta24h?: number;
  } | null;
  censusSummary?: {
    totalGraded?: number;
    highGradeCount?: number;
  } | null;
  eraColors: { border: string; bg: string; bgHover: string; glow: string };
}

export default function MarketPositionCard({
  variant,
  series,
  keyPrices,
  censusSummary: _censusSummary,
  eraColors,
}: MarketPositionCardProps) {
  const colors = eraColors ?? getEraColors(variant?.era);
  const accent = colors.border;

  // 1. Key Issue Badge computation
  const keyBadge = useMemo(() => {
    if (variant?.firstAppearance) {
      return {
        label: '⚡ FIRST APPEARANCE',
        color: '#fbbf24',
        border: '1px solid #fbbf24',
        bg: 'rgba(251, 191, 36, 0.1)',
        detail: variant.firstAppearance,
      };
    }
    if (variant?.keyStatus) {
      return {
        label: variant.keyStatus.toUpperCase(),
        color: accent,
        border: `1px solid ${accent}50`,
        bg: `${accent}18`,
        detail: variant.title || (variant.scarcityTier ? `${variant.scarcityTier} Key Issue` : 'Cataloged Key Issue'),
      };
    }
    if (String(variant?.issueNumber || '').replace(/^#/, '').trim() === '1') {
      return {
        label: '🔑 PREMIERE ISSUE #1',
        color: '#fbbf24',
        border: '1px solid rgba(251, 191, 36, 0.5)',
        bg: 'rgba(251, 191, 36, 0.1)',
        detail: variant?.title || 'First issue of series',
      };
    }
    return {
      label: 'STANDARD ISSUE',
      color: 'rgba(255, 255, 255, 0.45)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      bg: 'rgba(255, 255, 255, 0.03)',
      detail: variant?.title || 'Regular series run',
    };
  }, [variant?.firstAppearance, variant?.keyStatus, variant?.title, variant?.scarcityTier, accent]);

  // 2. Price Tier Classification computation
  const sovPriceUsd = keyPrices?.sovPriceUsd;
  const priceTier = useMemo(() => {
    if (typeof sovPriceUsd === 'number' && !isNaN(sovPriceUsd)) {
      if (sovPriceUsd > 50000) {
        return {
          label: '🏛️ MUSEUM GRADE',
          color: '#3b82f6',
          border: 'rgba(59, 130, 246, 0.35)',
          bg: 'rgba(59, 130, 246, 0.12)',
        };
      }
      if (sovPriceUsd > 10000) {
        return {
          label: '💎 INVESTMENT GRADE',
          color: '#22d3ee',
          border: 'rgba(34, 211, 238, 0.35)',
          bg: 'rgba(34, 211, 238, 0.12)',
        };
      }
      if (sovPriceUsd > 2000) {
        return {
          label: '📊 COLLECTOR GRADE',
          color: '#4ade80',
          border: 'rgba(74, 222, 128, 0.35)',
          bg: 'rgba(74, 222, 128, 0.12)',
        };
      }
      if (sovPriceUsd > 500) {
        return {
          label: '📈 MID-MARKET',
          color: '#fbbf24',
          border: 'rgba(251, 191, 36, 0.35)',
          bg: 'rgba(251, 191, 36, 0.12)',
        };
      }
      if (sovPriceUsd > 100) {
        return {
          label: '🎯 ENTRY LEVEL',
          color: '#94a3b8',
          border: 'rgba(148, 163, 184, 0.35)',
          bg: 'rgba(148, 163, 184, 0.12)',
        };
      }
    }
    return {
      label: '🔍 BUDGET TIER',
      color: '#9ca3af',
      border: 'rgba(156, 163, 175, 0.35)',
      bg: 'rgba(156, 163, 175, 0.12)',
    };
  }, [sovPriceUsd]);

  // 3. Market Momentum computation
  const momentum = useMemo(() => {
    const delta = keyPrices?.delta24h;
    if (typeof delta !== 'number' || isNaN(delta) || delta === 0) {
      return {
        label: '➡️ FLAT',
        color: '#9ca3af',
        border: 'rgba(156, 163, 175, 0.3)',
        bg: 'rgba(156, 163, 175, 0.12)',
        showActivity: false,
        deltaFormatted: delta === 0 ? '0.00%' : '—',
      };
    }
    if (delta > 5) {
      return {
        label: '🚀 SURGING',
        color: '#4ade80',
        border: 'rgba(74, 222, 128, 0.35)',
        bg: 'rgba(74, 222, 128, 0.12)',
        showActivity: true,
        deltaFormatted: `+${delta.toFixed(2)}%`,
      };
    }
    if (delta > 0) {
      return {
        label: '📈 POSITIVE',
        color: '#4ade80',
        border: 'rgba(74, 222, 128, 0.35)',
        bg: 'rgba(74, 222, 128, 0.12)',
        showActivity: false,
        deltaFormatted: `+${delta.toFixed(2)}%`,
      };
    }
    if (delta > -5) {
      return {
        label: '📉 DECLINING',
        color: '#fbbf24',
        border: 'rgba(251, 191, 36, 0.35)',
        bg: 'rgba(251, 191, 36, 0.12)',
        showActivity: false,
        deltaFormatted: `${delta.toFixed(2)}%`,
      };
    }
    return {
      label: '🔻 SELLING PRESSURE',
      color: '#f87171',
      border: 'rgba(248, 113, 113, 0.35)',
      bg: 'rgba(248, 113, 113, 0.12)',
      showActivity: false,
      deltaFormatted: `${delta.toFixed(2)}%`,
    };
  }, [keyPrices?.delta24h]);

  // 4. Series Context Line
  const seriesContextLine = useMemo(() => {
    const issueNum = variant?.issueNumber != null ? String(variant.issueNumber) : '—';
    const totalPart = series?.totalIssues != null ? ` of ${series.totalIssues} issues` : '';
    const pubPart = (variant?.publisher || 'UNKNOWN').toUpperCase();
    const yearPart = series?.startYear ?? (series?.endYear ?? '—');
    return `Issue #${issueNum}${totalPart} · ${pubPart} · ${yearPart}`;
  }, [variant?.issueNumber, variant?.publisher, series?.totalIssues, series?.startYear, series?.endYear]);

  return (
    <Panel
      title="Market Position"
      icon={<Crosshair className="w-3.5 h-3.5" />}
      eraColors={colors as ReturnType<typeof getEraColors>}
    >
      <div className="flex flex-col">
        {/* ── Section 1: Key Issue Badge ── */}
        <div
          className="pb-2.5"
          style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Star className="w-3 h-3" style={{ color: accent, opacity: 0.7 }} />
            <span
              className="text-[8px] uppercase tracking-wider font-mono font-semibold select-none"
              style={{ color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.1em' }}
            >
              Key Issue Status
            </span>
          </div>
          <div>
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider font-mono select-none"
              style={{
                color: keyBadge.color,
                border: keyBadge.border,
                backgroundColor: keyBadge.bg,
              }}
            >
              {keyBadge.label}
            </span>
          </div>
          {keyBadge.detail && (
            <div
              className="text-[9px] mt-1.5 leading-relaxed font-normal"
              style={{ color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'Hind, sans-serif' }}
            >
              {keyBadge.detail}
            </div>
          )}
        </div>

        {/* ── Section 2: Price Tier Classification ── */}
        <div
          className="py-2.5"
          style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Trophy className="w-3 h-3" style={{ color: accent, opacity: 0.7 }} />
            <span
              className="text-[8px] uppercase tracking-wider font-mono font-semibold select-none"
              style={{ color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.1em' }}
            >
              Price Tier
            </span>
          </div>
          <div>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider font-mono select-none"
              style={{
                color: priceTier.color,
                border: `1px solid ${priceTier.border}`,
                backgroundColor: priceTier.bg,
              }}
            >
              {priceTier.label}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1.5 font-mono">
            <span
              className="text-xs font-semibold"
              style={{ color: 'rgba(255, 255, 255, 0.9)' }}
            >
              {typeof sovPriceUsd === 'number' && !isNaN(sovPriceUsd)
                ? `$${sovPriceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '—'}
            </span>
            <span
              className="text-[9px] opacity-40 uppercase tracking-wider select-none font-mono"
            >
              SOV PRICE
            </span>
          </div>
        </div>

        {/* ── Section 3: Market Momentum ── */}
        <div
          className="py-2.5"
          style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Flame className="w-3 h-3" style={{ color: accent, opacity: 0.7 }} />
            <span
              className="text-[8px] uppercase tracking-wider font-mono font-semibold select-none"
              style={{ color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.1em' }}
            >
              Market Momentum
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider font-mono select-none"
              style={{
                backgroundColor: momentum.bg,
                color: momentum.color,
                border: `1px solid ${momentum.border}`,
              }}
            >
              <span>{momentum.label}</span>
              {momentum.showActivity && (
                <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
              )}
            </span>
            <span
              className="text-xs font-mono font-medium"
              style={{ color: momentum.color }}
            >
              {momentum.deltaFormatted}
            </span>
          </div>
        </div>

        {/* ── Section 4: Series Context Line ── */}
        <div className="pt-2.5">
          <div
            className="text-[9px] font-mono select-none truncate"
            style={{
              color: 'rgba(255, 255, 255, 0.5)',
              letterSpacing: '0.04em',
            }}
            title={seriesContextLine}
          >
            {seriesContextLine}
          </div>
        </div>
      </div>
    </Panel>
  );
}
