'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import { getEraColors } from '@/lib/design-system/colors';
import type { DetailResponse, CulturalVideo } from './types';
import { fmt, fmtDate, ERA_LABELS, ERA_CONTEXT, GRADE_ORDER } from './shared';
import Panel from './Panel';
import AISectionBlock from './AISectionBlock';

interface IssueMeta {
  story_title?: string | null; story_arc?: string | null; story_synopsis?: string | null;
  key_issue_reason?: string | null; first_appearances?: string[] | null; key_events?: string[] | null;
  crossover_event?: string | null; collector_notes?: string | null; print_run_notes?: string | null;
}
interface SeriesMeta { series_overview?: string | null; key_storylines?: string | null; }
interface CulturalApiResponse { relatedAnalysis?: { videos?: CulturalVideo[] } | null; videos?: CulturalVideo[] | null; }

const VIDEO_MIN_SCORE_DEFAULT = 0.25;

export default function IssueContextPanel({ variant, keyPrices, series, eraColors, anchorGradeRationale }: {
  variant: DetailResponse['variant'];
  keyPrices: DetailResponse['keyPrices'];
  series: DetailResponse['series'];
  eraColors: ReturnType<typeof getEraColors>;
  anchorGradeRationale?: string | null;
}) {
  const [videoPlaying, setVideoPlaying] = useState(false);

  const issueMeta = null as IssueMeta | null;
  const seriesMeta = null as SeriesMeta | null;
  const culturalData = null as CulturalApiResponse | null;
  const hasRichMeta = Boolean(issueMeta && (
    issueMeta.story_synopsis || issueMeta.key_issue_reason ||
    ((issueMeta.first_appearances?.length ?? 0) > 0) || ((issueMeta.key_events?.length ?? 0) > 0)
  ));

  const rawTo98Premium = keyPrices.fmvRawUsd != null && keyPrices.fmvRawUsd > 0 && keyPrices.fmv98Usd > 0
    ? Math.round(((keyPrices.fmv98Usd - keyPrices.fmvRawUsd) / keyPrices.fmvRawUsd) * 100) : null;
  const to10Premium = keyPrices.fmv10Usd != null && keyPrices.fmv10Usd > 0 && keyPrices.fmv98Usd > 0
    ? Math.round(((keyPrices.fmv10Usd - keyPrices.fmv98Usd) / keyPrices.fmv98Usd) * 100) : null;
  const eraText = ERA_CONTEXT[variant.era] || null;

  const videoMinScore = (() => {
    try {
      const param = new URLSearchParams(window.location.search).get('videoMinScore');
      if (param !== null) { const parsed = parseFloat(param); if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) return parsed; }
    } catch (_) {}
    return VIDEO_MIN_SCORE_DEFAULT;
  })();

  const issueVideo = (() => {
    const videos: CulturalVideo[] = culturalData?.relatedAnalysis?.videos ?? culturalData?.videos ?? [];
    return videos.find(v => (v.score ?? v.weightedScore ?? 0) >= videoMinScore) ?? null;
  })();

  return (
    <Panel title="Issue Context" icon={<BookOpen className="w-3.5 h-3.5" />} eraColors={eraColors}>
      <div className="space-y-4">
        {issueMeta?.key_issue_reason && (
          <div className="rounded-sm px-3 py-3" style={{ backgroundColor: `${eraColors.border}16`, borderLeft: `3px solid ${eraColors.border}`, borderTop: `1px solid ${eraColors.border}28`, borderRight: `1px solid ${eraColors.border}14`, borderBottom: `1px solid ${eraColors.border}14` }}>
            <p className="text-[8px] uppercase tracking-wider mb-1.5" style={{ color: `${eraColors.border}cc`, letterSpacing: '0.12em' }}>Key Issue</p>
            <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.92)', fontFamily: 'Hind, sans-serif' }}>{issueMeta.key_issue_reason}</p>
          </div>
        )}

        {(issueMeta?.story_title || issueMeta?.story_arc || issueMeta?.story_synopsis) && (
          <div style={issueMeta?.key_issue_reason ? { borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.875rem' } : {}}>
            {(issueMeta.story_title || issueMeta.story_arc) && (
              <div className="mb-1.5">
                {issueMeta.story_title && <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.72)', fontStyle: 'italic', fontFamily: 'Hind, sans-serif' }}>"{issueMeta.story_title}"</p>}
                {issueMeta.story_arc && <p className="text-[9px] mt-0.5" style={{ color: `${eraColors.border}80` }}>Arc: {issueMeta.story_arc}</p>}
              </div>
            )}
            {issueMeta.story_synopsis && <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)', fontFamily: 'Hind, sans-serif' }}>{issueMeta.story_synopsis}</p>}
          </div>
        )}

        {Boolean(issueMeta && (((issueMeta.first_appearances?.length ?? 0) > 0) || ((issueMeta.key_events?.length ?? 0) > 0) || issueMeta.crossover_event)) && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.875rem' }}>
            {issueMeta && (issueMeta.first_appearances?.length ?? 0) > 0 && (
              <div className="mb-3">
                <p className="text-[8px] uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.28)', letterSpacing: '0.12em' }}>First Appearances</p>
                <div className="flex flex-wrap gap-2">
                  {issueMeta.first_appearances?.map((name: string, i: number) => (
                    <div key={i} className="rounded px-2.5 py-2" style={{ backgroundColor: '#fbbf2410', border: '1px solid #fbbf2438', minWidth: '80px' }}>
                      <div className="text-[7px] uppercase tracking-wider mb-0.5" style={{ color: '#fbbf2499', letterSpacing: '0.12em' }}>1st Appearance</div>
                      <div className="text-[11px]" style={{ color: '#fbbf24', fontFamily: 'Hind, sans-serif' }}>{name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {issueMeta && (issueMeta.key_events?.length ?? 0) > 0 && (
              <div className="mb-2.5">
                <p className="text-[8px] uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.28)' }}>Key Events</p>
                <div className="flex flex-wrap gap-1.5">
                  {issueMeta.key_events?.map((ev: string, i: number) => (
                    <span key={i} className="text-[9px] px-2 py-0.5 rounded-sm" style={{ backgroundColor: '#38bdf815', color: '#38bdf8', border: '1px solid #38bdf830' }}>{ev}</span>
                  ))}
                </div>
              </div>
            )}
            {issueMeta?.crossover_event && (
              <div>
                <p className="text-[8px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.28)' }}>Crossover Event</p>
                <span className="text-[9px] px-2 py-0.5 rounded-sm" style={{ backgroundColor: '#a78bfa15', color: '#a78bfa', border: '1px solid #a78bfa30' }}>{issueMeta.crossover_event}</span>
              </div>
            )}
          </div>
        )}

        {(issueMeta?.collector_notes || issueMeta?.print_run_notes) && (
          <div className="rounded px-3 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {issueMeta.collector_notes && <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'Hind, sans-serif' }}>{issueMeta.collector_notes}</p>}
            {issueMeta.print_run_notes && <p className="text-[10px] mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.32)', fontFamily: 'Hind, sans-serif', fontStyle: 'italic' }}>{issueMeta.print_run_notes}</p>}
          </div>
        )}

        {seriesMeta && (seriesMeta.series_overview || seriesMeta.key_storylines) && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.875rem' }}>
            <p className="text-[9px] uppercase tracking-wider mb-2" style={{ color: `${eraColors.border}90` }}>Series Context</p>
            {seriesMeta.series_overview && <p className="text-[11px] leading-relaxed mb-2" style={{ color: 'rgba(255,255,255,0.48)', fontFamily: 'Hind, sans-serif' }}>{seriesMeta.series_overview}</p>}
            {seriesMeta.key_storylines && <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.36)', fontFamily: 'Hind, sans-serif', fontStyle: 'italic' }}>{seriesMeta.key_storylines}</p>}
          </div>
        )}

        {!hasRichMeta && eraText && (
          <div>
            <p className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: `${eraColors.border}90` }}>{ERA_LABELS[variant.era] || variant.era} — Era Context</p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{eraText}</p>
          </div>
        )}

        {(rawTo98Premium !== null || to10Premium !== null) && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
            <p className="text-[9px] uppercase tracking-wider mb-2" style={{ color: `${eraColors.border}90` }}>Grade Premium</p>
            <div className="space-y-2">
              {rawTo98Premium !== null && keyPrices.fmvRawUsd != null && (
                <div className="flex items-center justify-between rounded px-3 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.025)', border: 'rgba(255,255,255,0.06) solid 1px' }}>
                  <div>
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.6)' }}>RAW → CGC 9.8</p>
                    <p className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{fmt(keyPrices.fmvRawUsd)} → {fmt(keyPrices.fmv98Usd)}</p>
                  </div>
                  <span className="text-lg" style={{ color: rawTo98Premium > 200 ? '#fbbf24' : '#4ade80', fontFamily: 'monospace' }}>+{rawTo98Premium}%</span>
                </div>
              )}
              {to10Premium !== null && keyPrices.fmv10Usd != null && (
                <div className="flex items-center justify-between rounded px-3 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.025)', border: 'rgba(255,255,255,0.06) solid 1px' }}>
                  <div>
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.6)' }}>CGC 9.8 → CGC 10.0</p>
                    <p className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{fmt(keyPrices.fmv98Usd)} → {fmt(keyPrices.fmv10Usd)}</p>
                  </div>
                  <span className="text-lg" style={{ color: to10Premium > 100 ? '#a78bfa' : '#4ade80', fontFamily: 'monospace' }}>+{to10Premium}%</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
          <p className="text-[9px] uppercase tracking-wider mb-2" style={{ color: `${eraColors.border}90` }}>Market Position</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Scarcity Tier', val: variant.scarcityTier.charAt(0).toUpperCase() + variant.scarcityTier.slice(1) },
              { label: 'Grades Priced', val: `${keyPrices.gradeCount} of ${GRADE_ORDER.length}` },
              { label: 'Run Coverage', val: series.totalPriced > 0 ? `${series.totalPriced} issues` : '—' },
              { label: 'Data Age', val: keyPrices.observedAt ? fmtDate(keyPrices.observedAt) : '—' },
            ].map(({ label, val }) => (
              <div key={label} className="rounded px-2.5 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: 'rgba(255,255,255,0.05) solid 1px' }}>
                <p className="text-[8px] uppercase tracking-wider mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</p>
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.7)' }}>{val}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: 'rgba(255,255,255,0.06) solid 1px', paddingTop: '1rem' }}>
          <p className="text-[9px] uppercase tracking-wider mb-2" style={{ color: `${eraColors.border}90` }}>Issue Coverage</p>
          {issueVideo ? (
            <div className="flex items-center justify-between mb-2">
              <span />
              <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${eraColors.border}15`, border: `1px solid ${eraColors.border}35`, color: `${eraColors.border}cc`, letterSpacing: '0.3px' }}>
                {issueVideo.matchReason || 'Relevant'}
              </span>
            </div>
          ) : culturalData ? (
            <div className="rounded px-3 py-3 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.32)', fontFamily: 'Hind, sans-serif' }}>No videos found for this issue</p>
              <p className="text-[9px] mt-1" style={{ color: 'rgba(255,255,255,0.18)', fontFamily: 'monospace' }}>Video coverage may be available in the Cultural Archive below</p>
            </div>
          ) : null}
          {issueVideo && (
            <>
              <div className="rounded overflow-hidden" style={{ border: `1px solid ${eraColors.border}30`, backgroundColor: 'rgba(0,0,0,0.5)', position: 'relative' }}>
                {videoPlaying ? (
                  <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                    <iframe src={`https://www.youtube.com/embed/${issueVideo.videoId}?autoplay=1&rel=0&modestbranding=1`} title={issueVideo.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} />
                  </div>
                ) : (
                  <button onClick={() => setVideoPlaying(true)} className="w-full group" style={{ display: 'block', position: 'relative', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
                    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
                      <img src={`https://img.youtube.com/vi/${issueVideo.videoId}/hqdefault.jpg`} alt={issueVideo.title}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.65)', transition: 'filter 200ms ease' }}
                        className="pp-hover-dim" />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(255,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.6)' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="white" style={{ marginLeft: '3px' }}><polygon points="5,3 19,12 5,21" /></svg>
                        </div>
                      </div>
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.75) 0%, transparent 100%)', padding: '16px 10px 8px' }}>
                        <p className="text-[10px] text-left" style={{ color: 'rgba(255,255,255,0.9)', lineHeight: 1.3, fontFamily: 'Hind, sans-serif' }}>{issueVideo.title}</p>
                      </div>
                    </div>
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.62)', fontFamily: 'Hind, sans-serif' }}>{issueVideo.channel}</span>
                <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>relevance {Math.round((issueVideo.score ?? issueVideo.weightedScore ?? 0) * 100)}%</span>
              </div>
            </>
          )}
        </div>
      </div>
      <AISectionBlock text={anchorGradeRationale} accentColor="#38bdf8" label="Anchor Grade Rationale" />
    </Panel>
  );
}
