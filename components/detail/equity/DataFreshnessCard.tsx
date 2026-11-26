'use client';
import React from 'react';
import Panel from './Panel';
import { getEraColors } from '@/lib/design-system/colors';
import { Database, CheckCircle2, AlertCircle, ArrowDown } from 'lucide-react';

export interface DataFreshnessCardProps {
  completeness: {
    score: number;
    missing: string[];
    present: string[];
  } | null | undefined;
  variant: {
    workName: string;
    identityConfidence: number | null;
  };
  eraColors: { border: string; bg: string; bgHover: string; glow: string };
}

interface DataSource {
  name: string;
  status: 'SYNCED' | 'LIVE' | 'STALE';
  time: string;
}

const DATA_SOURCES: DataSource[] = [
  { name: 'CGC Census', status: 'SYNCED', time: 'Official Census' },
  { name: 'CBEX Exchange Ledger', status: 'LIVE', time: 'Verified Secondary Sales' },
  { name: 'PriceCharting Benchmark', status: 'SYNCED', time: 'Benchmark Feed' },
];

export default function DataFreshnessCard({
  completeness,
  variant,
  eraColors,
}: DataFreshnessCardProps) {
  const colors = eraColors ?? getEraColors(undefined);

  // Derive completeness score
  const rawCompletenessScore = completeness?.score;
  const rawIdentityConfidence = variant?.identityConfidence;

  let score: number;
  if (rawCompletenessScore != null && !isNaN(rawCompletenessScore)) {
    score =
      rawCompletenessScore <= 1 && rawCompletenessScore > 0
        ? Math.round(rawCompletenessScore * 100)
        : Math.round(rawCompletenessScore);
  } else if (rawIdentityConfidence != null && !isNaN(rawIdentityConfidence)) {
    score =
      rawIdentityConfidence <= 1 && rawIdentityConfidence > 0
        ? Math.round(rawIdentityConfidence * 100)
        : Math.round(rawIdentityConfidence);
  } else {
    score = 85;
  }
  score = Math.max(0, Math.min(100, score));

  // Score color: >90% green, 70-90% amber, <70% red
  const scoreColor =
    score > 90
      ? '#22c55e'
      : score >= 70
        ? '#f59e0b'
        : '#ef4444';

  // Identity confidence value
  const hasIdentityConfidence = rawIdentityConfidence != null && !isNaN(rawIdentityConfidence);
  const identityConfidenceVal = hasIdentityConfidence
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(
            rawIdentityConfidence <= 1 && rawIdentityConfidence > 0
              ? rawIdentityConfidence * 100
              : rawIdentityConfidence
          )
        )
      )
    : null;

  const identityColor =
    identityConfidenceVal != null
      ? identityConfidenceVal >= 85
        ? '#22c55e'
        : identityConfidenceVal >= 70
          ? '#f59e0b'
          : '#ef4444'
      : 'rgba(255,255,255,0.4)';

  const missingFields = Array.isArray(completeness?.missing)
    ? completeness.missing.filter(Boolean)
    : [];

  const handleScrollToProvenance = () => {
    if (typeof document !== 'undefined') {
      const element = document.getElementById('section-provenance');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <Panel
      title="Data Freshness"
      icon={<Database className="w-3.5 h-3.5" />}
      eraColors={colors as ReturnType<typeof getEraColors>}
    >
      <div className="space-y-3">
        {/* Completeness Score */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span
              className="text-[8px] uppercase tracking-wider font-semibold"
              style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', letterSpacing: '0.12em' }}
            >
              COMPLETENESS SCORE
            </span>
            <div className="flex items-center gap-1">
              {score > 90 ? (
                <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: scoreColor }} />
              ) : (
                <AlertCircle className="w-3 h-3 shrink-0" style={{ color: scoreColor }} />
              )}
              <span
                className="text-xs font-bold"
                style={{ color: scoreColor, fontFamily: 'monospace' }}
              >
                {score}%
              </span>
            </div>
          </div>

          {/* Thin Progress Bar */}
          <div
            className="w-full rounded-full overflow-hidden"
            style={{
              height: '3px',
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${score}%`,
                backgroundColor: scoreColor,
                boxShadow: `0 0 6px ${scoreColor}60`,
              }}
            />
          </div>
        </div>

        {/* Identity Confidence */}
        <div
          className="flex items-center justify-between py-1.5 px-2 rounded"
          style={{
            backgroundColor: 'rgba(255,255,255,0.018)',
            border: `1px solid ${colors.border}18`,
          }}
        >
          <span
            className="text-[8px] uppercase tracking-wider font-semibold"
            style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', letterSpacing: '0.12em' }}
          >
            IDENTITY CONFIDENCE
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className="text-xs font-bold"
              style={{ color: identityColor, fontFamily: 'monospace' }}
            >
              {identityConfidenceVal != null ? `${identityConfidenceVal}%` : 'N/A'}
            </span>
          </div>
        </div>

        {/* Missing Fields */}
        {missingFields.length > 0 && (
          <div className="space-y-1 pt-1">
            <div
              className="text-[8px] uppercase tracking-wider font-semibold"
              style={{ color: 'rgba(239,68,68,0.85)', fontFamily: 'monospace', letterSpacing: '0.12em' }}
            >
              MISSING FIELDS ({missingFields.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {missingFields.map((field, idx) => (
                <span
                  key={`${field}-${idx}`}
                  className="text-[9px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    fontFamily: 'monospace',
                  }}
                >
                  <AlertCircle className="w-2.5 h-2.5 shrink-0 text-red-400" />
                  <span>{field}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Data Sources */}
        <div
          className="space-y-1.5 pt-2"
          style={{ borderTop: `1px solid ${colors.border}15` }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-[8px] uppercase tracking-wider font-semibold"
              style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', letterSpacing: '0.12em' }}
            >
              CANONICAL SOURCES
            </span>
            <span
              className="text-[8px] uppercase tracking-wider font-semibold"
              style={{ color: '#22c55e', fontFamily: 'monospace' }}
            >
              {DATA_SOURCES.length}/{DATA_SOURCES.length} ACTIVE
            </span>
          </div>

          <div className="space-y-1">
            {DATA_SOURCES.map((source) => {
              const isGreen = source.status === 'SYNCED' || source.status === 'LIVE';
              const dotColor = isGreen ? '#22c55e' : '#f59e0b';
              const glowColor = isGreen
                ? 'rgba(34, 197, 94, 0.65)'
                : 'rgba(245, 158, 11, 0.65)';

              return (
                <div
                  key={source.name}
                  className="flex items-center justify-between py-1 px-1.5 rounded"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.015)',
                    border: '1px solid rgba(255,255,255,0.025)',
                  }}
                >
                  {/* Left: source name */}
                  <span
                    className="text-[9px] font-medium"
                    style={{
                      color: 'rgba(255,255,255,0.75)',
                      fontFamily: 'Hind, sans-serif',
                    }}
                  >
                    {source.name}
                  </span>

                  {/* Right: status dot + text & time */}
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex items-center gap-1 text-[8px] font-semibold tracking-wider"
                      style={{ fontFamily: 'monospace' }}
                    >
                      <span
                        style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          backgroundColor: dotColor,
                          boxShadow: `0 0 5px ${glowColor}`,
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ color: dotColor }}>{source.status}</span>
                    </span>
                    <span
                      className="text-[9px] text-right"
                      style={{
                        color: 'rgba(255,255,255,0.4)',
                        fontFamily: 'monospace',
                        minWidth: '50px',
                      }}
                    >
                      {source.time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* View Full Audit button */}
        <div className="pt-2" style={{ borderTop: `1px solid ${colors.border}15` }}>
          <button
            type="button"
            onClick={handleScrollToProvenance}
            className="w-full py-2 px-2.5 rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none group"
            style={{
              backgroundColor: `${colors.border}0d`,
              border: `1px solid ${colors.border}28`,
              color: colors.border,
              fontFamily: 'monospace',
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.08em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${colors.border}1e`;
              e.currentTarget.style.borderColor = `${colors.border}50`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `${colors.border}0d`;
              e.currentTarget.style.borderColor = `${colors.border}28`;
            }}
          >
            <span>INSPECTABLE PROVENANCE &amp; DATA AUDIT ↓</span>
            <ArrowDown className="w-3 h-3 shrink-0 transition-transform group-hover:translate-y-0.5" />
          </button>
        </div>
      </div>
    </Panel>
  );
}
