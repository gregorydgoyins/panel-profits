'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { GitCompare } from 'lucide-react';
import { getEraColors } from '@/lib/design-system/colors';
import type { GradePrice, OtherPrinting, DetailResponse } from './types';
import { fmtDollars, variantTypeLabel } from './shared';
import Panel from './Panel';
import { GRADE_ORDER } from './shared';
import { buildEquityUrl } from '@/lib/urlBuilder';
import { proxyCoverUrl } from '@/lib/coverProxy';

const EDITION_PALETTE = ['#60a5fa', '#a78bfa', '#34d399', '#fb923c', '#f472b6'];

export default function VariantMatrixPanel({ currentVariant, otherPrintings, gradeLattice, eraColors }: {
  currentVariant: DetailResponse['variant'];
  otherPrintings: OtherPrinting[];
  gradeLattice: GradePrice[];
  eraColors: ReturnType<typeof getEraColors>;
}) {
  if (otherPrintings.length === 0) return null;

  const base98 = gradeLattice.find(g => g.grade === '9.8')?.priceUsd || 0;

  const isBaseIssue = (variantKey: string | null | undefined, artifactType?: string | null) =>
    artifactType === 'base_issue' || !variantKey || variantKey === 'standard' || variantKey === 'direct';

  const editions = useMemo(() => [
    {
      id: currentVariant.id,
      label: isBaseIssue(currentVariant.variantKey, currentVariant.artifactType)
        ? `${currentVariant.workName} #${currentVariant.issueNumber}`
        : (currentVariant.variantDescription || variantTypeLabel(currentVariant.variantKey) || currentVariant.variantKey || currentVariant.workName),
      isCurrent: true,
      fmv98: base98,
      coverImageUrl: currentVariant.coverImageUrl,
    },
    ...(otherPrintings || []).map(p => ({
      id: p.id,
      label: isBaseIssue(p.variantKey, p.artifactType)
        ? p.productName
        : (p.variantDescription || variantTypeLabel(p.variantKey, p.artifactType) || p.variantKey),
      isCurrent: false,
      fmv98: p.fmv98Usd || 0,
      coverImageUrl: p.coverImageUrl,
    })),
  ].slice(0, 5), [currentVariant, otherPrintings, base98]);

  const maxEditionPrice = editions.length > 0 ? Math.max(...editions.map(e => e.fmv98), 1) : 1;

  const gradeLadder = useMemo(() => {
    const priced = (gradeLattice || []).filter(g => g.priceUsd > 0);
    return [...priced].sort((a, b) => {
      const ai = GRADE_ORDER.indexOf(a.grade); const bi = GRADE_ORDER.indexOf(b.grade);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [gradeLattice]);

  const maxGradePrice = gradeLadder.length > 0 ? Math.max(...gradeLadder.map(g => g.priceUsd), 1) : 1;
  const editionColor = (idx: number, isCurrent: boolean) =>
    isCurrent ? eraColors.border : EDITION_PALETTE[idx % EDITION_PALETTE.length];

  return (
    <Panel title="Edition Comparison" icon={<GitCompare className="w-3.5 h-3.5" />} eraColors={eraColors}>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {editions.map((ed, i) => {
          const color = editionColor(i, ed.isCurrent);
          const premium = base98 > 0 && !ed.isCurrent && ed.fmv98 > 0 ? ((ed.fmv98 - base98) / base98) * 100 : null;
          const initials = ed.label.replace(/[^A-Za-z0-9 ]/g, '').trim().split(' ').map((w: string) => w[0] || '').join('').slice(0, 2).toUpperCase() || '??';
          return (
            <Link href={buildEquityUrl(ed.id)} key={ed.id} style={{ textDecoration: 'none', flexShrink: 0 }}>
              <div style={{ width: 76, borderRadius: 6, padding: '8px 6px 7px', border: `1px solid ${color}${ed.isCurrent ? '55' : '28'}`, backgroundColor: `${color}${ed.isCurrent ? '10' : '06'}`, transition: 'border-color 0.2s' }}>
                <div style={{ width: 64, height: 84, borderRadius: 3, overflow: 'hidden', margin: '0 auto 7px', backgroundColor: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {ed.coverImageUrl ? (
                    <img src={proxyCoverUrl(ed.coverImageUrl) || ed.coverImageUrl} alt={ed.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <span style={{ fontFamily: 'monospace', fontSize: 13, color: `${color}70` }}>{initials}</span>
                  )}
                </div>
                <p style={{ fontSize: 7.5, color, textTransform: 'uppercase', letterSpacing: '0.07em', lineHeight: 1.3, marginBottom: 3, textAlign: 'center' }}>{ed.label}</p>
                <p style={{ fontSize: 11, fontFamily: 'monospace', color: ed.isCurrent ? '#fff' : 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 1 }}>
                  {ed.fmv98 > 0 ? fmtDollars(ed.fmv98) : '—'}
                </p>
                {premium !== null ? (
                  <p style={{ fontSize: 8, fontFamily: 'monospace', textAlign: 'center', marginTop: 2, color: premium > 0 ? '#4ade80' : '#f87171' }}>
                    {premium > 0 ? '+' : ''}{premium.toFixed(0)}%
                  </p>
                ) : ed.isCurrent ? (
                  <p style={{ fontSize: 7, textAlign: 'center', marginTop: 2, color: `${color}60` }}>◀ viewing</p>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>

      <div style={{ marginTop: 14 }}>
        <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.76)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>FMV · CGC 9.8 Comparison</p>
        {editions.filter(e => e.fmv98 > 0).map((ed, i) => {
          const color = editionColor(i, ed.isCurrent);
          const barW = (ed.fmv98 / maxEditionPrice) * 100;
          const premium = base98 > 0 && !ed.isCurrent ? ((ed.fmv98 - base98) / base98) * 100 : null;
          return (
            <div key={ed.id} style={{ marginBottom: 9 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                <span style={{ fontSize: 9, color: ed.isCurrent ? '#fff' : 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{ed.label}</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  {premium !== null && <span style={{ fontSize: 8, fontFamily: 'monospace', color: premium > 0 ? '#4ade80' : '#f87171' }}>{premium > 0 ? '+' : ''}{premium.toFixed(0)}%</span>}
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: ed.isCurrent ? '#fff' : 'rgba(255,255,255,0.7)' }}>{fmtDollars(ed.fmv98)}</span>
                </div>
              </div>
              <div style={{ height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${barW}%`, backgroundColor: color, borderRadius: 3, opacity: ed.isCurrent ? 1 : 0.75 }} />
              </div>
            </div>
          );
        })}
      </div>

      {gradeLadder.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.76)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Grade Ladder · This Edition</p>
          {gradeLadder.map(g => {
            const is98 = g.grade === '9.8';
            const barW = (g.priceUsd / maxGradePrice) * 100;
            const color = is98 ? eraColors.border : `${eraColors.border}55`;
            return (
              <div key={g.grade} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 9, fontFamily: 'monospace', color: is98 ? eraColors.border : 'rgba(255,255,255,0.4)', width: 32, textAlign: 'right', flexShrink: 0 }}>{g.grade === 'RAW' ? 'RAW' : g.grade}</span>
                <div style={{ flex: 1, height: is98 ? 5 : 3, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${barW}%`, backgroundColor: color, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 9, fontFamily: 'monospace', color: is98 ? '#fff' : 'rgba(255,255,255,0.6)', width: 56, textAlign: 'right', flexShrink: 0 }}>{fmtDollars(g.priceUsd)}</span>
              </div>
            );
          })}
        </div>
      )}
      <p style={{ fontSize: 7.5, marginTop: 10, color: 'rgba(255,255,255,0.42)', letterSpacing: '0.04em' }}>
        % = premium or discount vs this edition at CGC 9.8
      </p>
    </Panel>
  );
}
