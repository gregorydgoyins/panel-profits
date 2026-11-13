'use client';
import type { ComicSignal } from "@/lib/signals/comic-signal";
import React, { useMemo } from 'react';
import { Gauge } from 'lucide-react';
import Panel from './Panel';
import { getEraColors } from '@/lib/design-system/colors';

export interface MarketSentimentCardProps {
  keyPrices: {
    fmv98Usd: number;
    sovPriceUsd: number;
    premiumPct: number | null;
    gradeCount: number;
    delta24h?: number | null;
  };
  censusSummary: {
    totalGraded: number;
    highGradeCount: number;
  } | null | undefined;
  priceHistory: Array<{ priceUsd: number; observedAt: string; grade: string }>;
  gradeLattice: Array<{ grade: string; priceUsd: number; salesVolume: number | null }>;
  eraColors: { border: string; bg: string; bgHover: string; glow: string };
  /** The page's one rating (lib/signals/comic-signal). */
  signal?: ComicSignal | null;
}

export default function MarketSentimentCard({
  keyPrices,
  censusSummary,
  priceHistory = [],
  gradeLattice = [],
  eraColors,
  signal = null,
}: MarketSentimentCardProps) {
  const colors = eraColors ?? getEraColors(undefined);

  // 1. Demand Signal calculation
  // Derive from census high-grade ratio + price momentum.
  // If highGradeCount/totalGraded < 0.05 AND price trending up → '🟢 STRONG BUY'
  // If ratio < 0.15 → '🟡 ACCUMULATE'
  // Otherwise → '🔵 HOLD'
  const isPriceTrendingUp = useMemo(() => {
    if (typeof keyPrices?.delta24h === 'number' && !isNaN(keyPrices.delta24h)) {
      if (keyPrices.delta24h > 0) return true;
      if (keyPrices.delta24h < 0) return false;
    }
    const validHistory = (priceHistory ?? []).filter(
      (h) => typeof h?.priceUsd === 'number' && !isNaN(h.priceUsd) && h.priceUsd > 0
    );
    if (validHistory.length >= 2) {
      const sorted = [...validHistory].sort((a, b) =>
        (a.observedAt || '').localeCompare(b.observedAt || '')
      );
      const mid = Math.floor(sorted.length / 2);
      const older = sorted.slice(0, mid);
      const recent = sorted.slice(mid);
      const olderAvg = older.reduce((sum, h) => sum + h.priceUsd, 0) / (older.length || 1);
      const recentAvg = recent.reduce((sum, h) => sum + h.priceUsd, 0) / (recent.length || 1);
      return recentAvg > olderAvg;
    }
    return false;
  }, [keyPrices?.delta24h, priceHistory]);

  // Demand signal = the page's one rating; this card never computes its own call.
  const demandSignal = useMemo(() => {
    const r = signal?.rating ?? "NOT_RATED";
    const palette: Record<string, [string, string, string]> = {
      pos: ['#4ade80', 'rgba(74, 222, 128, 0.12)', 'rgba(74, 222, 128, 0.3)'],
      hold: ['#60a5fa', 'rgba(96, 165, 250, 0.12)', 'rgba(96, 165, 250, 0.3)'],
      neg: ['#f87171', 'rgba(248, 113, 113, 0.12)', 'rgba(248, 113, 113, 0.3)'],
      none: ['#94a3b8', 'rgba(148, 163, 184, 0.10)', 'rgba(148, 163, 184, 0.3)'],
    };
    const tone = r === "NOT_RATED" ? 'none'
      : ["STRONG_BUY", "BUY", "ACCUMULATE", "OUTPERFORM"].includes(r) ? 'pos'
      : r === "HOLD" ? 'hold' : 'neg';
    const [color, bg, border] = palette[tone];
    return { text: (signal?.label ?? "Not Rated").toUpperCase(), color, bg, border };
  }, [signal]);

  // 2. Holder Conviction calculation
  // Based on price history volatility (stddev of prices / mean).
  // Low volatility (<15%) → 'DIAMOND HANDS 💎' in cyan
  // Medium (15-30%) → 'STEADY HOLD' in amber
  // High (>30%) → 'ACTIVE TRADING' in red
  const conviction = useMemo(() => {
    const prices = (priceHistory ?? [])
      .map((h) => h?.priceUsd)
      .filter((p): p is number => typeof p === 'number' && !isNaN(p) && p > 0);

    if (prices.length === 0) {
      return {
        text: 'STEADY HOLD',
        color: '#fbbf24',
        bg: 'rgba(251, 191, 36, 0.12)',
        border: 'rgba(251, 191, 36, 0.3)',
        volatilityPct: null,
      };
    }

    const n = prices.length;
    const mean = prices.reduce((sum, p) => sum + p, 0) / n;
    if (mean <= 0) {
      return {
        text: 'STEADY HOLD',
        color: '#fbbf24',
        bg: 'rgba(251, 191, 36, 0.12)',
        border: 'rgba(251, 191, 36, 0.3)',
        volatilityPct: null,
      };
    }

    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean;
    const volPct = cv * 100;

    if (cv < 0.15) {
      return {
        text: 'DIAMOND HANDS 💎',
        color: '#22d3ee',
        bg: 'rgba(34, 211, 238, 0.12)',
        border: 'rgba(34, 211, 238, 0.3)',
        volatilityPct: volPct,
      };
    }
    if (cv <= 0.30) {
      return {
        text: 'STEADY HOLD',
        color: '#fbbf24',
        bg: 'rgba(251, 191, 36, 0.12)',
        border: 'rgba(251, 191, 36, 0.3)',
        volatilityPct: volPct,
      };
    }
    return {
      text: 'ACTIVE TRADING',
      color: '#f87171',
      bg: 'rgba(248, 113, 113, 0.12)',
      border: 'rgba(248, 113, 113, 0.3)',
      volatilityPct: volPct,
    };
  }, [priceHistory]);

  // 3. Liquidity Grade calculation
  // Based on gradeCount (number of grades with prices).
  // 6+ grades → 'A' (green)
  // 4-5 → 'B' (amber)
  // 2-3 → 'C' (orange)
  // 1 → 'D' (red)
  const effectiveGradeCount = useMemo(() => {
    if (typeof keyPrices?.gradeCount === 'number' && keyPrices.gradeCount > 0) {
      return keyPrices.gradeCount;
    }
    if (Array.isArray(gradeLattice)) {
      return gradeLattice.filter((g) => g && typeof g.priceUsd === 'number' && g.priceUsd > 0).length;
    }
    return 0;
  }, [keyPrices?.gradeCount, gradeLattice]);

  const liquidity = useMemo(() => {
    if (effectiveGradeCount >= 6) {
      return {
        letter: 'A',
        color: '#4ade80',
        bg: 'rgba(74, 222, 128, 0.15)',
        border: 'rgba(74, 222, 128, 0.35)',
      };
    }
    if (effectiveGradeCount >= 4) {
      return {
        letter: 'B',
        color: '#fbbf24',
        bg: 'rgba(251, 191, 36, 0.15)',
        border: 'rgba(251, 191, 36, 0.35)',
      };
    }
    if (effectiveGradeCount >= 2) {
      return {
        letter: 'C',
        color: '#fb923c',
        bg: 'rgba(251, 146, 60, 0.15)',
        border: 'rgba(251, 146, 60, 0.35)',
      };
    }
    return {
      letter: 'D',
      color: '#f87171',
      bg: 'rgba(248, 113, 113, 0.15)',
      border: 'rgba(248, 113, 113, 0.35)',
    };
  }, [effectiveGradeCount]);

  // 4. 24h Momentum calculation
  // Show delta24h percentage with up/down arrow, colored green/red
  const momentum = useMemo(() => {
    const delta = keyPrices?.delta24h;
    if (typeof delta !== 'number' || isNaN(delta)) {
      return {
        arrow: '',
        text: '—',
        color: 'rgba(255, 255, 255, 0.35)',
        hasValue: false,
      };
    }
    if (delta > 0) {
      return {
        arrow: '↑',
        text: `+${delta.toFixed(2)}%`,
        color: '#4ade80',
        hasValue: true,
      };
    }
    if (delta < 0) {
      return {
        arrow: '↓',
        text: `${delta.toFixed(2)}%`,
        color: '#f87171',
        hasValue: true,
      };
    }
    return {
      arrow: '→',
      text: '0.00%',
      color: 'rgba(255, 255, 255, 0.45)',
      hasValue: true,
    };
  }, [keyPrices?.delta24h]);

  const rows = [
    {
      id: 'demand-signal',
      label: 'Demand Signal',
      content: (
        <span
          className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider font-mono inline-flex items-center"
          style={{
            backgroundColor: demandSignal.bg,
            color: demandSignal.color,
            border: `1px solid ${demandSignal.border}`,
          }}
        >
          {demandSignal.text}
        </span>
      ),
    },
    {
      id: 'holder-conviction',
      label: 'Holder Conviction',
      content: (
        <span
          className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider font-mono inline-flex items-center"
          style={{
            backgroundColor: conviction.bg,
            color: conviction.color,
            border: `1px solid ${conviction.border}`,
          }}
          title={
            conviction.volatilityPct !== null
              ? `Volatility: ${conviction.volatilityPct.toFixed(1)}%`
              : undefined
          }
        >
          {conviction.text}
        </span>
      ),
    },
    {
      id: 'liquidity-grade',
      label: 'Liquidity Grade',
      content: (
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold font-mono"
          style={{
            backgroundColor: liquidity.bg,
            color: liquidity.color,
            border: `1px solid ${liquidity.border}`,
          }}
          title={`${effectiveGradeCount} active pricing ${
            effectiveGradeCount === 1 ? 'grade' : 'grades'
          }`}
        >
          {liquidity.letter}
        </span>
      ),
    },
    {
      id: 'momentum-24h',
      label: '24h Momentum',
      content: (
        <span
          className="text-xs font-semibold font-mono inline-flex items-center gap-1"
          style={{ color: momentum.color }}
        >
          {momentum.hasValue && (
            <span className="text-[11px] leading-none font-bold">{momentum.arrow}</span>
          )}
          <span>{momentum.text}</span>
        </span>
      ),
    },
  ];

  return (
    <Panel
      title="Market Sentiment"
      icon={<Gauge className="w-3.5 h-3.5" />}
      eraColors={colors as ReturnType<typeof getEraColors>}
    >
      <div className="flex flex-col">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
            style={{
              borderBottom:
                index < rows.length - 1 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
            }}
          >
            <span
              className="text-[9px] uppercase tracking-wider font-semibold"
              style={{
                color: 'rgba(255, 255, 255, 0.4)',
                fontFamily: 'Hind, sans-serif',
                letterSpacing: '0.08em',
              }}
            >
              {row.label}
            </span>
            <div className="flex items-center">{row.content}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
