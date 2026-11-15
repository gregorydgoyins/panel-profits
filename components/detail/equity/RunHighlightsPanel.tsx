'use client';

import { useMemo, type CSSProperties } from 'react';
import Link from 'next/link';
import { Trophy, GitCompare } from 'lucide-react';
import { getEraColors } from '@/lib/design-system/colors';
import type { RelatedIssue, OtherPrinting } from './types';
import { fmt, fmtDollars, variantTypeLabel, proxyCoverUrl } from './shared';
import Panel from './Panel';
import { buildEquityUrl } from '@/lib/urlBuilder';

function deriveKeySignals(s: RelatedIssue, rank: number): Array<{ label: string; color: string }> {
  const out: Array<{ label: string; color: string }> = [];
  if (rank === 1) out.push({ label: 'Series Benchmark', color: '#fbbf24' });
  if (s.fmvRawUsd && s.fmv98Usd) {
    const lift = s.fmv98Usd / s.fmvRawUsd;
    if (lift >= 5) out.push({ label: 'Extreme Grade Sensitivity', color: '#f87171' });
    else if (lift >= 2.5) out.push({ label: 'High Grade Premium', color: '#fb923c' });
  }
  if (s.census98 !== null && s.census98 < 15) out.push({ label: 'Trophy Eligible', color: '#a78bfa' });
  if (s.censusTotal !== null && s.censusTotal < 50) out.push({ label: 'Scarce Population', color: '#60a5fa' });
  else if (s.censusTotal !== null && s.censusTotal < 200) out.push({ label: 'Limited Float', color: '#64748b' });
  if (s.fmv96Usd && s.fmv98Usd && s.fmv98Usd > s.fmv96Usd * 1.6) out.push({ label: 'Grade-Sensitive', color: '#34d399' });
  return out.slice(0, 3);
}

export default function RunHighlightsPanel({ workName, seriesIssues, otherPrintings, currentId, currentIssueNumber, eraColors }: {
  workName: string;
  seriesIssues: RelatedIssue[];
  otherPrintings: OtherPrinting[];
  currentId: string;
  currentIssueNumber: string;
  eraColors: ReturnType<typeof getEraColors>;
}) {
  const _bestP = (s: RelatedIssue) => s.sovPriceUsd || s.fmv98Usd || 0;
  const keyIssues = useMemo(() => {
    return [...seriesIssues].filter(s => _bestP(s) > 0).sort((a, b) => _bestP(b) - _bestP(a)).slice(0, 5);
  }, [seriesIssues]);

  const maxPrice = keyIssues[0] ? _bestP(keyIssues[0]) : 1;
  const ERA_SHORT: Record<string, string> = {
    platinum: 'Platinum', golden: 'Golden', atomic: 'Atomic',
    silver: 'Silver', bronze: 'Bronze', copper: 'Copper',
    modern: 'Modern', independent: 'Indie', postmodern: 'Post-Mod',
  };

  return (
    <Panel
      title={`${workName} — Key Issues`}
      icon={<Trophy className="w-3.5 h-3.5" />}
      eraColors={eraColors}
      action={<span className="text-[8px] px-2 py-0.5 rounded uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.04)' }}>Ranked by 9.8 FMV</span>}
    >
      {keyIssues.length === 0 ? (
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>No priced issues on record for this series.</p>
      ) : (
        <div className="space-y-3">
          {keyIssues.map((s, i) => {
            const isCurrent = s.id === currentId;
            const barW = Math.round(((s.fmv98Usd || 0) / maxPrice) * 100);
            const signals = deriveKeySignals(s, i + 1);
            const rankColors = ['#fbbf24', '#94a3b8', '#cd7f32', 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0.2)'];
            const rankColor = rankColors[i] || 'rgba(255,255,255,0.2)';
            const liftPct = s.fmvRawUsd && s.fmv98Usd && s.fmvRawUsd > 0
              ? Math.round(((s.fmv98Usd - s.fmvRawUsd) / s.fmvRawUsd) * 100) : null;
            return (
              <Link key={s.id} href={buildEquityUrl(s.id)}
                className={`block rounded group transition-all${!isCurrent ? ' pp-hover-var-bg-border' : ''}`}
                style={{ border: `1px solid ${isCurrent ? eraColors.border + '80' : 'rgba(255,255,255,0.07)'}`, backgroundColor: isCurrent ? `${eraColors.border}0d` : 'rgba(255,255,255,0.01)', boxShadow: isCurrent ? `0 0 16px ${eraColors.border}18, inset 0 0 0 1px ${eraColors.border}20` : 'none', textDecoration: 'none', ...(!isCurrent ? { ['--pp-hover-bg' as string]: `${eraColors.border}07`, ['--pp-hover-border' as string]: `${eraColors.border}35` } : {}) } as CSSProperties}>
                {i === 0 && <div style={{ height: '2px', background: `linear-gradient(90deg, ${eraColors.border}00, ${rankColor}, ${eraColors.border}00)`, borderRadius: '2px 2px 0 0' }} />}
                <div className="flex gap-3 p-3">
                  <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
                    <div className="rounded overflow-hidden flex items-center justify-center"
                      style={{ width: '60px', height: '84px', backgroundColor: 'rgba(0,0,0,0.5)', border: `1px solid ${isCurrent ? eraColors.border + '60' : rankColor + '40'}`, boxShadow: isCurrent ? `0 0 10px ${eraColors.border}20` : 'none' }}>
                      {proxyCoverUrl(s.coverImageUrl) ? (
                        <img src={proxyCoverUrl(s.coverImageUrl)!} alt={`${workName} #${s.issueNumber}`} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <span style={{ fontSize: '16px', color: `${eraColors.border}50`, fontFamily: 'Hind, sans-serif' }}>#{s.issueNumber}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-center rounded" style={{ width: '60px', padding: '2px 0', backgroundColor: `${rankColor}18`, border: `1px solid ${rankColor}50` }}>
                      <span style={{ fontSize: '8px', fontFamily: 'Hind, sans-serif', fontWeight: 500, color: rankColor, letterSpacing: '0.5px' }}>#{i + 1} RANK</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="truncate" style={{ fontSize: '12px', fontWeight: 500, color: isCurrent ? '#fff' : 'rgba(255,255,255,0.85)', lineHeight: 1.2, fontFamily: 'Hind, sans-serif' }} title={s.productName}>
                            {s.productName || `${workName} #${s.issueNumber}`}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span style={{ fontSize: '10px', color: isCurrent ? eraColors.border : 'rgba(255,255,255,0.45)', fontFamily: 'Hind, sans-serif' }}>
                              Issue #{s.issueNumber}{s.year ? ` · ${s.year}` : ''}
                            </span>
                            {s.publicationEra && <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{ERA_SHORT[s.publicationEra] || s.publicationEra}</span>}
                          </div>
                        </div>
                        {isCurrent && <span className="flex-shrink-0 text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider" style={{ backgroundColor: `${eraColors.border}25`, color: eraColors.border, border: `1px solid ${eraColors.border}45` }}>Viewing</span>}
                      </div>
                    </div>
                    <div className="rounded px-2.5 py-2" style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="grid grid-cols-4 gap-1">
                        {[{ label: '9.8', val: s.fmv98Usd, anchor: true }, { label: '9.6', val: s.fmv96Usd, anchor: false }, { label: '9.4', val: s.fmv94Usd, anchor: false }, { label: 'RAW', val: s.fmvRawUsd, anchor: false }].map(({ label, val, anchor }) => (
                          <div key={label} className="text-center">
                            <p style={{ fontSize: '8px', color: anchor ? eraColors.border : 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.4px', fontFamily: 'Hind, sans-serif' }}>{label}</p>
                            <p style={{ fontSize: '10px', fontFamily: 'monospace', color: anchor ? (isCurrent ? eraColors.border : '#fff') : (val ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.2)'), marginTop: '1px' }}>{val ? fmtDollars(val) : '—'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {liftPct !== null && (
                        <div className="flex items-center gap-1">
                          <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', fontFamily: 'Hind, sans-serif' }}>Raw→9.8</span>
                          <span style={{ fontSize: '10px', fontFamily: 'monospace', color: liftPct > 300 ? '#fbbf24' : '#4ade80' }}>+{liftPct}%</span>
                        </div>
                      )}
                      {s.censusTotal !== null ? (
                        <div className="flex items-center gap-1">
                          <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', fontFamily: 'Hind, sans-serif' }}>Graded</span>
                          <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)' }}>{s.censusTotal.toLocaleString()}</span>
                          {s.census98 !== null && <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.76)', fontFamily: 'Hind, sans-serif' }}>· {s.census98} @9.8</span>}
                        </div>
                      ) : (
                        <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)', fontFamily: 'Hind, sans-serif' }}>Census —</span>
                      )}
                    </div>
                    {signals.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {signals.map(sig => (
                          <span key={sig.label} style={{ fontSize: '8px', padding: '1px 5px', borderRadius: '3px', backgroundColor: `${sig.color}14`, border: `1px solid ${sig.color}40`, color: sig.color, fontFamily: 'Hind, sans-serif', letterSpacing: '0.2px', whiteSpace: 'nowrap' }}>{sig.label}</span>
                        ))}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.2)', fontFamily: 'Hind, sans-serif', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Series Value Index</span>
                        <span style={{ fontSize: '8px', color: isCurrent ? eraColors.border : rankColor, fontFamily: 'monospace' }}>{barW}%</span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${barW}%`, background: isCurrent ? `linear-gradient(90deg, ${eraColors.border}80, ${eraColors.border})` : `linear-gradient(90deg, ${rankColor}40, ${rankColor}80)` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {otherPrintings.length > 0 && (
        <div className="mt-4 pt-4" style={{ borderTop: 'rgba(255,255,255,0.06) solid 1px' }}>
          <p className="text-[9px] uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Editions · Issue #{currentIssueNumber}
            {otherPrintings.length > 5 && <span className="ml-1 opacity-50">(top 5 of {otherPrintings.length})</span>}
          </p>
          <div className="space-y-1.5">
            {[...otherPrintings].sort((a, b) => (b.fmv98Usd || 0) - (a.fmv98Usd || 0)).slice(0, 5).map(p => (
              <Link key={p.id} href={buildEquityUrl(p.id)}
                className="flex items-center gap-2 rounded px-2 py-1.5 group transition-all pp-hover-era-row"
                style={{ border: `1px solid ${eraColors.border}18`, backgroundColor: 'rgba(255,255,255,0.015)', ['--pp-hover-bg' as string]: `${eraColors.border}07`, ['--pp-hover-icon' as string]: `${eraColors.border}99` } as CSSProperties}>
                <div className="rounded flex-shrink-0 overflow-hidden flex items-center justify-center"
                  style={{ width: '28px', height: '38px', backgroundColor: 'rgba(0,0,0,0.35)', border: `1px solid ${eraColors.border}25` }}>
                  {proxyCoverUrl(p.coverImageUrl) ? (
                    <img src={proxyCoverUrl(p.coverImageUrl)!} alt={p.productName} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <span className="text-[8px] font-medium" style={{ color: `${eraColors.border}55` }}>{(p.variantKey || 'V').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {(p.artifactType === 'base_issue' || p.variantKey === 'standard' || p.variantKey === 'direct') ? p.productName : (p.variantDescription || variantTypeLabel(p.variantKey) || p.variantKey)}
                  </p>
                  {p.fmv98Usd && p.fmv98Usd > 0 && (
                    <p className="text-[9px] font-semibold" style={{ color: eraColors.border, fontFamily: 'monospace' }}>{fmt(p.fmv98Usd)}</p>
                  )}
                </div>
                <GitCompare
                  className="era-compare-icon w-3 h-3 flex-shrink-0"
                  style={{ color: `${eraColors.border}00`, transition: 'color 150ms ease' }}
                />
              </Link>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
