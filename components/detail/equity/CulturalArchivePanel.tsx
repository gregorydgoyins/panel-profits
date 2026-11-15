'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { getEraColors } from '@/lib/design-system/colors';
import type { CulturalIntelligence } from './types';

const CA = '#d4a04a';

const SLOT_CONFIGS: {}[] = [
  {},
  {},
  {},
];

export default function CulturalArchivePanel({ data, eraColors }: {
  data: CulturalIntelligence;
  eraColors: ReturnType<typeof getEraColors>;
}) {
  const { canonicalSignificance: cs, relatedAnalysis: ra, archiveSlots, narrative } = data;

  const sigColor = (label: string) => {
    if (label === 'Landmark Issue') return '#f59e0b';
    if (label === 'High Historical Significance') return '#d97706';
    if (label === 'Notable Historical Artifact') return '#b45309';
    if (label === 'Collector Artifact') return '#6b7280';
    return '#4b5563';
  };

  const sigC = sigColor(cs.significanceLabel);
  const scorePct = Math.round(cs.keyIssueScore * 100);
  const extraFlags = cs.flags.filter(f => f.toLowerCase() !== cs.era.toLowerCase());

  const radarAxes = [
    { label: 'Narrative Impact',       score: Math.min(1, cs.keyIssueScore * 1.1) },
    { label: 'Media Crossover',        score: ra.culturalDensity ? Math.min(1, (ra.culturalDensity.matchCount ?? 0) / 20) : 0.1 },
    { label: 'Character Significance', score: cs.isFirstIssue ? 0.95 : Math.min(1, cs.keyIssueScore * 0.85) },
    { label: 'Collector Premium',      score: Math.min(1, (cs.premiumRatio ?? 1) / 30) },
    { label: 'Census Rarity',          score: 0.5 },
  ];
  const R = 52, CX = 70, CY = 62;
  const n = radarAxes.length;
  const pts = radarAxes.map((ax, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { ax, angle, x: CX + Math.cos(angle) * R * ax.score, y: CY + Math.sin(angle) * R * ax.score };
  });
  const outerPts = radarAxes.map((_, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: CX + Math.cos(angle) * R, y: CY + Math.sin(angle) * R };
  });
  const polyPoints = pts.map(p => `${p.x},${p.y}`).join(' ');
  const labelPts = radarAxes.map((ax, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const lR = R + 14;
    return { label: ax.label, x: CX + Math.cos(angle) * lR, y: CY + Math.sin(angle) * lR };
  });

  return (
    <>
      <style>{`
        @keyframes ca-fadein { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .ca-slot { transition: transform 0.14s ease, box-shadow 0.14s ease; }
        .ca-slot:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.45); }
        .ca-play { opacity: 0; transition: opacity 0.14s ease; }
        .ca-slot:hover .ca-play { opacity: 1; }
        .ca-thumb { transition: opacity 0.14s ease; }
        .ca-slot:hover .ca-thumb { opacity: 1 !important; }
      `}</style>

      <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${CA}22`, backgroundColor: 'rgba(212,160,74,0.014)', animation: 'ca-fadein 140ms ease-out both' }}>

        {/* HEADER */}
        <div className="px-4 py-2.5 flex items-center gap-3" style={{ backgroundColor: `${CA}08`, borderBottom: `1px solid ${CA}18` }}>
          <BookOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: CA, opacity: 0.85 }} />
          <span className="text-[10px] font-semibold flex-1" style={{ color: CA, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Cultural Archive</span>
          {ra.culturalDensity ? (
            <div className="flex items-center gap-2">
              <span style={{ color: CA, fontFamily: 'monospace', fontSize: '12px', fontWeight: 500 }}>{ra.culturalDensity.cdiPercentile}</span>
              <span className="rounded px-1.5 py-0.5" style={{ backgroundColor: `${CA}14`, border: `1px solid ${CA}28`, color: `${CA}bb`, fontFamily: 'monospace', fontSize: '7px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>CDI</span>
              <span style={{ color: 'rgba(255,255,255,0.42)', fontFamily: 'monospace', fontSize: '8px' }}>{ra.culturalDensity.matchCount} source{ra.culturalDensity.matchCount !== 1 ? 's' : ''}</span>
            </div>
          ) : (
            <span style={{ color: 'rgba(255,255,255,0.40)', fontFamily: 'monospace', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{cs.publisher} · {cs.era}</span>
          )}
        </div>

        {/* CANONICAL WEIGHT BAND */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-start gap-5">
            <div className="flex-1 min-w-0">
              <div className="text-[8px] uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.42)', letterSpacing: '0.16em' }}>Canonical Weight</div>
              <div className="flex items-baseline gap-3 mb-2">
                <span style={{ color: sigC, fontFamily: 'monospace', fontSize: '14px' }}>{cs.significanceLabel}</span>
                <span style={{ color: sigC, fontFamily: 'monospace', fontSize: '10px', opacity: 0.55 }}>{scorePct}</span>
              </div>
              <div className="relative rounded-full overflow-hidden" style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                <div className="absolute top-0 left-0 h-full rounded-full" style={{ width: `${scorePct}%`, backgroundColor: sigC, boxShadow: `0 0 8px ${sigC}80` }} />
              </div>
              {cs.premiumRatio > 1 && (
                <div className="mt-1.5" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', fontSize: '8px' }}>Grade premium {cs.premiumRatio.toFixed(1)}× · raw → 9.8</div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <span className="rounded-sm" style={{ backgroundColor: `${cs.eraColor}14`, border: `1px solid ${cs.eraColor}34`, color: cs.eraColor, fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 6px', fontWeight: 500 }}>{cs.era}</span>
                <span className="rounded-sm" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.76)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 6px' }}>{cs.publisher}</span>
                {cs.isFirstIssue && <span className="rounded-sm" style={{ backgroundColor: `${CA}10`, border: `1px solid ${CA}28`, color: CA, fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 6px', fontWeight: 500 }}>#1</span>}
              </div>
              {extraFlags.map(f => <span key={f} style={{ color: 'rgba(255,255,255,0.54)', fontFamily: 'monospace', fontSize: '8px' }}>· {f}</span>)}
            </div>
          </div>
        </div>

        {/* CULTURAL RESONANCE RADAR */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ flexShrink: 0 }}>
            <div className="text-[7px] uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.14em' }}>Cultural Resonance</div>
            <svg viewBox="0 0 140 130" width={140} height={130} style={{ overflow: 'visible' }}>
              {[0.25, 0.5, 0.75, 1].map(frac => (
                <polygon key={frac} points={outerPts.map(p => `${CX + (p.x - CX) * frac},${CY + (p.y - CY) * frac}`).join(' ')} fill="none" stroke={`${CA}18`} strokeWidth="0.5" />
              ))}
              {outerPts.map((p, i) => <line  x1={CX} y1={CY} x2={p.x} y2={p.y} stroke={`${CA}14`} strokeWidth="0.5" />)}
              <polygon points={polyPoints} fill={`${sigC}22`} stroke={sigC} strokeWidth="1.2" strokeOpacity="0.7" />
              {pts.map((p, i) => <circle  cx={p.x} cy={p.y} r="2.5" fill={sigC} opacity="0.8" />)}
              <circle cx={CX} cy={CY} r="2" fill={`${CA}50`} />
              {labelPts.map((l, i) => (
                <text  x={l.x} y={l.y + 1} fontSize="5.5" fill={`${CA}99`} textAnchor={l.x < CX - 5 ? 'end' : l.x > CX + 5 ? 'start' : 'middle'} dominantBaseline="middle" style={{ fontFamily: 'monospace' }}>{l.label}</text>
              ))}
            </svg>
          </div>
          <div className="flex-1 space-y-1.5 pt-5">
            {radarAxes.map(ax => (
              <div key={ax.label}>
                <div className="flex items-center justify-between mb-0.5">
                  <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{ax.label}</span>
                  <span style={{ fontSize: '7px', color: sigC, fontFamily: 'monospace' }}>{Math.round(ax.score * 100)}</span>
                </div>
                <div className="rounded-full overflow-hidden" style={{ height: '3px', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  <div style={{ width: `${ax.score * 100}%`, height: '100%', backgroundColor: sigC, opacity: 0.7, borderRadius: '9999px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* THREE-SLOT VIDEO ARCHIVE */}
        {(archiveSlots?.left || archiveSlots?.center || archiveSlots?.right) && (
          <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[8px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.42)', letterSpacing: '0.16em' }}>Video Archive</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
              <span style={{ color: 'rgba(255,255,255,0.1)', fontFamily: 'monospace', fontSize: '7px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>CMI · 3-slot</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {SLOT_CONFIGS.map((slotCfg: any) => { const { key, label, isFocal } = slotCfg;
                const slot = (archiveSlots as any)?.[key] ?? null;
                const focalColor = '#f59e0b';
                const slotColor = isFocal ? focalColor : CA;
                if (!slot) {
                  return (
                    <div key={key} style={{ position: 'relative', aspectRatio: '16/9', border: `1px dashed ${slotColor}18`, borderRadius: '4px', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.01)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '6px 8px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)' }}>
                        <span style={{ color: `${slotColor}50`, fontSize: '7px', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'monospace' }}>{label}</span>
                      </div>
                      <span style={{ color: 'rgba(255,255,255,0.1)', fontFamily: 'monospace', fontSize: '8px' }}>No video available</span>
                    </div>
                  );
                }
                return (
                  <Link key={key} href={`/video-archive?v=${encodeURIComponent(slot.videoId)}`} className="ca-slot"
                    style={{ display: 'block', textDecoration: 'none', border: `1px solid ${isFocal ? focalColor + '30' : 'rgba(255,255,255,0.07)'}`, borderRadius: '4px', overflow: 'hidden', backgroundColor: '#111' }}>
                    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
                      <img src={`https://img.youtube.com/vi/${slot.videoId}/mqdefault.jpg`} alt="" className="ca-thumb"
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.88 }}
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          if (!img.src.includes('hqdefault')) img.src = `https://img.youtube.com/vi/${slot.videoId}/hqdefault.jpg`;
                          else if (!img.src.includes('/0.jpg')) img.src = `https://img.youtube.com/vi/${slot.videoId}/0.jpg`;
                          else img.style.display = 'none';
                        }} />
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '6px 8px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ color: `${slotColor}cc`, fontSize: '7px', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'monospace' }}>{label}</span>
                        {isFocal && <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: focalColor, opacity: 0.9, flexShrink: 0, display: 'inline-block' }} />}
                      </div>
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '18px 8px 6px', background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' }}>
                        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '8px', lineHeight: 1.25, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{slot.title}</div>
                        <div style={{ color: `${CA}88`, fontFamily: 'monospace', fontSize: '7px', marginTop: '2px' }}>{slot.channel}</div>
                      </div>
                      <div className="ca-play" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: isFocal ? 38 : 28, height: isFocal ? 38 : 28, borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.45)', border: `1px solid ${isFocal ? focalColor + '60' : 'rgba(255,255,255,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
                          <span style={{ color: 'rgba(255,255,255,0.92)', fontSize: isFocal ? 13 : 10, marginLeft: '2px' }}>▶</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ISSUE NARRATIVE + STORY ARC */}
        {narrative && (
          <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[8px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.42)', letterSpacing: '0.16em' }}>Issue Dossier</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
              <span style={{ color: `${CA}40`, fontFamily: 'monospace', fontSize: '7px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>AI · OpenRouter</span>
            </div>
            <div style={{ position: 'relative', padding: '14px 16px 14px 24px', backgroundColor: `${CA}07`, border: `1px solid ${CA}22`, borderLeft: `3px solid ${CA}70`, borderRadius: '4px', marginBottom: '10px' }}>
              <div style={{ position: 'absolute', top: '6px', left: '8px', color: CA, fontSize: '40px', lineHeight: 1, opacity: 0.18, fontFamily: 'Georgia, serif', pointerEvents: 'none', userSelect: 'none' }}>"</div>
              <div style={{ color: CA, fontFamily: 'monospace', fontSize: '7px', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '8px', opacity: 0.75 }}>Issue Narrative</div>
              <div style={{ color: 'rgba(255,255,255,0.76)', fontSize: '12px', lineHeight: '1.75', fontStyle: 'italic', fontFamily: 'Hind, sans-serif' }}>{narrative.issueNarrative}</div>
            </div>
            <div style={{ padding: '14px 16px', backgroundColor: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.18)', borderLeft: '3px solid rgba(99,102,241,0.5)', borderRadius: '4px', marginBottom: '10px' }}>
              <div style={{ color: '#818cf8', fontFamily: 'monospace', fontSize: '7px', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '8px', opacity: 0.85 }}>Story Arc</div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '10px', lineHeight: '1.6' }}>{narrative.storyArc}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: narrative.collectorIntel ? '8px' : 0 }}>
              {[{ label: 'Series History', text: narrative.seriesHistory }, { label: 'Historical Context', text: narrative.historicalContext }].map(({ label, text }) => (
                <div key={label} style={{ padding: '10px 12px', backgroundColor: `${CA}04`, border: `1px solid ${CA}10`, borderRadius: '4px' }}>
                  <div style={{ color: `${CA}70`, fontFamily: 'monospace', fontSize: '7px', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '5px' }}>{label}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', lineHeight: '1.55' }}>{text}</div>
                </div>
              ))}
            </div>
            {(narrative.collectorIntel || narrative.marketSignal) && (
              <div style={{ display: 'grid', gridTemplateColumns: narrative.collectorIntel && narrative.marketSignal ? '1fr 1fr' : '1fr', gap: '8px' }}>
                {narrative.collectorIntel && (
                  <div style={{ padding: '10px 12px', backgroundColor: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)', borderRadius: '4px' }}>
                    <div style={{ color: 'rgba(245,158,11,0.65)', fontFamily: 'monospace', fontSize: '7px', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '5px' }}>Collector Intel</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', lineHeight: '1.55' }}>{narrative.collectorIntel}</div>
                  </div>
                )}
                {narrative.marketSignal && (
                  <div style={{ padding: '10px 12px', backgroundColor: 'rgba(74,222,128,0.03)', border: '1px solid rgba(74,222,128,0.1)', borderRadius: '4px' }}>
                    <div style={{ color: 'rgba(74,222,128,0.6)', fontFamily: 'monospace', fontSize: '7px', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '5px' }}>Market Signal</div>
                    <div style={{ color: 'rgba(74,222,128,0.75)', fontSize: '9px', lineHeight: '1.5', fontStyle: 'italic' }}>{narrative.marketSignal}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* DEEP ARCHIVE */}
        {narrative && (narrative.historicalSeries || narrative.keyFacts || narrative.assetMetadata) && (
          <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[8px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.42)', letterSpacing: '0.16em' }}>Deep Archive</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
              <span style={{ color: `${CA}40`, fontFamily: 'monospace', fontSize: '7px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>AI · OpenRouter</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div style={{ padding: '12px 14px', backgroundColor: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.14)', borderLeft: '3px solid rgba(139,92,246,0.45)', borderRadius: '4px' }}>
                <div style={{ color: 'rgba(139,92,246,0.75)', fontFamily: 'monospace', fontSize: '7px', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '8px' }}>Historical Series</div>
                <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: '9.5px', lineHeight: '1.62' }}>{narrative.historicalSeries || '—'}</div>
              </div>
              <div style={{ padding: '12px 14px', backgroundColor: `${CA}05`, border: `1px solid ${CA}18`, borderLeft: `3px solid ${CA}55`, borderRadius: '4px' }}>
                <div style={{ color: `${CA}80`, fontFamily: 'monospace', fontSize: '7px', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '8px' }}>Key Facts</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {(narrative.keyFacts || '').split(' · ').filter(Boolean).map((fact: string, i: number) => (
                    <div  style={{ display: 'flex', gap: '7px', alignItems: 'flex-start' }}>
                      <span style={{ color: `${CA}60`, fontFamily: 'monospace', fontSize: '8px', flexShrink: 0, marginTop: '1px' }}>·</span>
                      <span style={{ color: 'rgba(255,255,255,0.48)', fontSize: '9px', lineHeight: '1.5' }}>{fact.trim()}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding: '12px 14px', backgroundColor: 'rgba(56,189,248,0.03)', border: '1px solid rgba(56,189,248,0.12)', borderLeft: '3px solid rgba(56,189,248,0.4)', borderRadius: '4px' }}>
                <div style={{ color: 'rgba(56,189,248,0.7)', fontFamily: 'monospace', fontSize: '7px', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '8px' }}>Asset Metadata</div>
                <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: '9.5px', lineHeight: '1.62' }}>{narrative.assetMetadata || '—'}</div>
              </div>
            </div>
          </div>
        )}

        {/* DOSSIER FOOTER */}
        <div className="px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-[7px] uppercase tracking-wider mb-0.5" style={{ color: 'rgba(255,255,255,0.1)', letterSpacing: '0.14em' }}>Filed Query</div>
            <div className="text-[8px] italic" style={{ color: 'rgba(255,255,255,0.42)', fontFamily: 'monospace', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{ra.semanticQuery}</div>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.1)', fontFamily: 'monospace', fontSize: '7px', letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>CMI · {ra.pineconeOk ? 'Live' : 'Archive'}</span>
        </div>

      </div>
    </>
  );
}
