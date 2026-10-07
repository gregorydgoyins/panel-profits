"use client";

import { useState, useEffect, useTransition, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Crown, Gem, Shield, Zap, Flame, Clock, type LucideIcon } from 'lucide-react';
import { proxyCoverUrl as proxyHeroCoverUrl } from '@/lib/coverProxy';
import { fmt, fmtDate, variantTypeLabel, ERA_LABELS, ERA_CONTEXT } from './shared';
import type {
  CompletenessData, InstrumentIntelligence, EquityTruthLayer, Creator, DetailResponse,
  SpreadAnchor, SpreadStateData, GradePrice,
} from './types';
import { OraclePriceSparkline } from '@/components/ui/OraclePriceSparkline';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { resolvePriceTier } from '@/lib/pricing/market-tiers';

type EraColors = { border: string; bg: string; bgHover: string; glow: string; };
type ScarcityColors = { border: string; bgGradient?: string; bg?: string; label: string; [key: string]: any; };

const SCARCITY_ICONS: Record<string, LucideIcon> = {
  mythic: Crown, legendary: Gem, epic: Shield, rare: Zap, uncommon: Flame, common: Clock,
};

const ASSET_CLASS_HERO_CONFIG: Record<string, { label: string; color: string; glowColor: string; desc: string }> = {
  PREMIUM: { label: 'PREMIUM', color: '#eab308', glowColor: '#eab30880', desc: 'Premium class ($45.00 to infinity). High-value asset exceeding standard market thresholds. Represents top-tier confirmed sales.' },
  SOV:     { label: 'SOV',     color: '#3b82f6', glowColor: '#3b82f680', desc: 'Sovereign class. Direct universal bluelabel 9.8 comic. Primary order flow anchor.' },
  VARIANT: { label: 'VARIANT', color: '#a78bfa', glowColor: '#a78bfa60', desc: 'Variant class. Scarcity-driven instrument — newsstand, price variant, retailer incentive, or insert edition with confirmed $30+ market price.' },
  STD:     { label: 'STD',     color: '#94a3b8', glowColor: '#94a3b830', desc: 'Standard class ($25.00 to $44.99). Confirmed market with verified sales volume on standard exchange floor.' },
  OTC:     { label: 'OTC',     color: '#fb923c', glowColor: '#fb923c50', desc: 'Over-the-counter (less than $25.00). Bilateral dealer desks / off-exchange.' },
  RAW:     { label: 'RAW',     color: '#94a3b8', glowColor: '#94a3b830', desc: 'Raw/Ungraded. Artifact has not been third-party certified. Pricing reflects average raw condition.' },
};

const GRADE_COLORS: Record<string, string> = { A: '#22c55e', B: '#86efac', C: '#fde68a', D: '#f59e0b', F: '#ef4444' };
const ERA_MAP: Record<string, string> = { platinum: 'Platinum', golden: 'Golden', atomic: 'Atomic', silver: 'Silver', bronze: 'Bronze', copper: 'Copper', modern: 'Modern', independent: 'Indie', postmodern: 'Post-Mod' };
const TIER_COLOR = ['#4ade80', '#86efac', '#fde68a', '#f59e0b', '#fb923c', '#f87171', '#dc2626'];
const REGIME_RING: Record<string, string> = { CALM: 'transparent', NORMAL: 'transparent', ELEVATED: 'rgba(245,158,11,0.20)', PANIC: 'rgba(248,113,113,0.28)' };

import type { GcdRelationalData } from '@/lib/comics/gcd-relational-service';

interface HeroPanelProps {
  variantId: string;
  variant: DetailResponse['variant'];
  completeness: CompletenessData | undefined;
  keyPrices: DetailResponse['keyPrices'];
  instrumentStates: DetailResponse['instrumentStates'];
  instrumentIntelligence: InstrumentIntelligence;
  censusSummary: DetailResponse['censusSummary'];
  gradeLattice?: GradePrice[];
  wikiSummary: string | null;
  latestSaleImageUrl: string | null;
  eraColors: EraColors;
  scarcityColors: ScarcityColors;
  heroCreatorsData: { data: Creator[] } | undefined;
  truthLayerData: { found: boolean; data: EquityTruthLayer | null } | undefined;
  spreadData: { found: boolean; data: SpreadStateData | null } | undefined;
  relationalData?: GcdRelationalData | null;
  onOpenExecModal: (action: 'buy' | 'sell') => void;
  onBrokenImageReport?: (params: { url: string | null; variantId: string; stage: number }) => void;
}

export default function HeroPanel({
  variantId, variant, completeness, keyPrices, instrumentStates, instrumentIntelligence,
  censusSummary, gradeLattice = [], wikiSummary, latestSaleImageUrl, eraColors, scarcityColors,
  heroCreatorsData, truthLayerData, spreadData, relationalData, onOpenExecModal, onBrokenImageReport,
}: HeroPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [showCoverLightbox, setShowCoverLightbox] = useState(false);
  const [heroImgFailStage, setHeroImgFailStage] = useState(0);
  const [coverVerifyState, setCoverVerifyState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [coverUnverifyState, setCoverUnverifyState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [hoveredCensusGrade, setHoveredCensusGrade] = useState<string | null>(null);
  const { isAdmin } = useAdminGuard();
  useEffect(() => { setHeroImgFailStage(0); setCoverVerifyState('idle'); setCoverUnverifyState('idle'); }, [variantId]);

  async function handleVerifyCover() {
    setCoverVerifyState('loading');
    try {
      const resolvedId = variant.id ?? variantId;
      const res = await fetch(`/api/admin/cover-verify/${encodeURIComponent(resolvedId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cacheKey: variantId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCoverVerifyState('done');
      setTimeout(() => window.location.reload(), 800);
    } catch {
      setCoverVerifyState('error');
    }
  }

  async function handleUnverifyCover() {
    setCoverUnverifyState('loading');
    try {
      const resolvedId = variant.id ?? variantId;
      const res = await fetch(`/api/admin/cover-verify/${encodeURIComponent(resolvedId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cacheKey: variantId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCoverUnverifyState('done');
      setTimeout(() => window.location.reload(), 800);
    } catch {
      setCoverUnverifyState('error');
    }
  }

  const proxiedSaleUrl    = proxyHeroCoverUrl(latestSaleImageUrl);
  const isCoverSuppressed = variant.coverVerified === false || !!variant.yearDivergence;
  const coverAllowed    = variant.coverVerified === false
    ? false
    : variant.coverVerified === true
      ? true
      : (variant.productYear === null || variant.productYear === variant.year) && !!variant.coverImageUrl;
  const proxiedCoverUrl = coverAllowed ? proxyHeroCoverUrl(variant.coverImageUrl) : null;
  const heroSrc = heroImgFailStage === 0 ? (proxiedSaleUrl || proxiedCoverUrl) : heroImgFailStage === 1 ? (proxiedSaleUrl ? proxiedCoverUrl : null) : null;
  const isShowingSaleImage = !!(proxiedSaleUrl && heroImgFailStage === 0);
  const heroImageLabel = isShowingSaleImage ? 'Latest sale image' : 'Cover image';

  const mr = instrumentIntelligence?.marketRegime;
  const tierColor   = mr ? (TIER_COLOR[mr.tectonicTier] ?? eraColors.border) : eraColors.border;
  const regimeRing  = mr ? (REGIME_RING[mr.fourStateRegime] ?? 'transparent') : 'transparent';
  const stressBarW  = mr?.stressIndex != null ? Math.min(100, mr.stressIndex * 100) : 0;
  const imgFilter   = mr?.fourStateRegime === 'PANIC' ? 'saturate(0.85) brightness(0.94)' : 'none';
  const heroBoxShadow = [`0 8px 32px rgba(0,0,0,0.6)`, `0 0 20px ${eraColors.border}20`, regimeRing !== 'transparent' ? `0 0 0 1px ${regimeRing}` : null].filter(Boolean).join(', ');

  const ScarcityIcon = SCARCITY_ICONS[variant.scarcityTier] || Clock;

  return (
    <>
      <div className="rounded-xl p-6 mb-6 relative overflow-hidden" style={{ background: scarcityColors.bgGradient || scarcityColors.bg || '#111827', border: `2px solid ${scarcityColors.border}40` }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${eraColors.border}00, ${eraColors.border}, ${eraColors.border}00)` }} />
        <div className="flex gap-6 flex-wrap">
          {/* Cover image */}
          <div id="no-cover-badge" className="flex-shrink-0">
            {heroSrc ? (
              <button
                type="button"
                onClick={() => {
                  startTransition(() => {
                    setShowCoverLightbox(true);
                  });
                }}
                title="Click to enlarge"
                className="block relative cursor-zoom-in pp-hover-cover"
                style={{ width: '210px', background: 'none', border: 'none', padding: 0, ['--pp-hover-color' as string]: eraColors.border } as CSSProperties}
              >
                <div className="rounded-lg overflow-hidden flex items-center justify-center pointer-events-none" style={{ width: '210px', height: '310px', backgroundColor: 'rgba(0,0,0,0.3)', border: `2px solid ${eraColors.border}60`, boxShadow: heroBoxShadow, pointerEvents: 'none' }}>
                  <img
                    src={heroSrc}
                    alt={`${variant.workName} #${variant.issueNumber}`}
                    width={210}
                    height={310}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="pointer-events-none"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', filter: imgFilter, pointerEvents: 'none' }}
                    onError={() => {
                      startTransition(() => {
                        setHeroImgFailStage(s => Math.min(s + 1, 2));
                        if (heroImgFailStage === 0 && proxiedSaleUrl) onBrokenImageReport?.({ url: latestSaleImageUrl, variantId, stage: 0 });
                      });
                    }}
                  />
                </div>
                <div className="absolute inset-0 rounded-lg flex items-end justify-center pb-2 pointer-events-none" style={{ pointerEvents: 'none' }}>
                  <div className="cover-overlay-bg absolute inset-0 rounded-lg pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)', opacity: 0, transition: 'opacity 150ms ease', pointerEvents: 'none' }} />
                  <span className="cover-enlarge-label relative flex items-center gap-1 text-[9px] uppercase tracking-widest pointer-events-none" style={{ color: `${eraColors.border}00`, transition: 'color 150ms ease', pointerEvents: 'none' }}>⊕ Enlarge</span>
                </div>
              </button>
            ) : (
              <div className="rounded-lg overflow-hidden flex flex-col items-center justify-center gap-2" style={{ width: '210px', height: '310px', backgroundColor: 'rgba(0,0,0,0.3)', border: `2px solid ${eraColors.border}60`, boxShadow: heroBoxShadow }}>
                <span className="text-4xl" style={{ color: `${eraColors.border}40` }}>{variant.workName.charAt(0)}</span>
                {isCoverSuppressed && (
                  <span style={{ fontSize: '8px', color: `${eraColors.border}55`, fontFamily: 'Hind, sans-serif', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1.2px', border: `1px solid ${eraColors.border}30`, borderRadius: '2px', padding: '2px 5px' }}>
                    NO COVER
                  </span>
                )}
                {isCoverSuppressed && isAdmin && (
                  <button
                    onClick={handleVerifyCover}
                    disabled={coverVerifyState === 'loading' || coverVerifyState === 'done'}
                    style={{
                      fontSize: '8px',
                      fontFamily: 'Hind, sans-serif',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      padding: '3px 8px',
                      borderRadius: '3px',
                      cursor: coverVerifyState === 'loading' || coverVerifyState === 'done' ? 'default' : 'pointer',
                      backgroundColor: coverVerifyState === 'done' ? 'rgba(34,197,94,0.18)' : coverVerifyState === 'error' ? 'rgba(239,68,68,0.18)' : 'rgba(59,130,246,0.18)',
                      color: coverVerifyState === 'done' ? '#4ade80' : coverVerifyState === 'error' ? '#f87171' : '#60a5fa',
                      border: `1px solid ${coverVerifyState === 'done' ? '#4ade8060' : coverVerifyState === 'error' ? '#f8717160' : '#60a5fa60'}`,
                      opacity: coverVerifyState === 'loading' ? 0.6 : 1,
                    }}
                  >
                    {coverVerifyState === 'loading' ? '···' : coverVerifyState === 'done' ? '✓ Verified' : coverVerifyState === 'error' ? '✗ Failed' : 'Verify Cover'}
                  </button>
                )}
              </div>
            )}
            {mr && mr.tectonicTier != null && (
              <div className="mt-2" style={{ width: '210px' }}>
                <div style={{ height: '3px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${stressBarW}%`, height: '100%', backgroundColor: tierColor, borderRadius: '2px', transition: 'width 0.6s ease' }} />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span style={{ color: tierColor, fontSize: '8px', fontFamily: 'monospace', opacity: 0.75 }}>
                    T{mr.tectonicTier}{mr.stressIndex != null && !isNaN(mr.stressIndex) ? ` · ${(mr.stressIndex * 100).toFixed(0)}/100` : ''}
                  </span>
                  {mr.principalOverlayActive && <span style={{ color: '#fb923c', fontSize: '8px', fontFamily: 'monospace' }}>⊙ {mr.principalOverlayRemaining}t</span>}
                </div>
              </div>
            )}
            {isShowingSaleImage ? <p className="text-[9px] text-center mt-1" style={{ color: 'rgba(255,255,255,0.46)' }}>Latest sale · click to enlarge</p> : variant.coverSource ? <p className="text-[9px] text-center mt-1" style={{ color: 'rgba(255,255,255,0.46)' }}>Source: {variant.coverSource}</p> : null}
            {completeness && (() => { const gc = GRADE_COLORS[completeness.grade] || '#6b7280'; return <div className="flex items-center justify-center gap-1.5 mt-1.5"><span className="text-[8px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.38)' }}>Readiness</span><span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${gc}18`, color: gc, border: `1px solid ${gc}40`, fontFamily: 'monospace' }}>{completeness.grade}</span></div>; })()}
            {variant.coverMeta?.adminVerified && isAdmin && (
              <div className="flex flex-col items-center gap-1 mt-2">
                <span style={{ fontSize: '8px', color: '#4ade8099', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>✓ Admin verified</span>
                <button
                  onClick={handleUnverifyCover}
                  disabled={coverUnverifyState === 'loading' || coverUnverifyState === 'done'}
                  style={{
                    fontSize: '8px',
                    fontFamily: 'Hind, sans-serif',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    padding: '3px 8px',
                    borderRadius: '3px',
                    cursor: coverUnverifyState === 'loading' || coverUnverifyState === 'done' ? 'default' : 'pointer',
                    backgroundColor: coverUnverifyState === 'done' ? 'rgba(34,197,94,0.18)' : coverUnverifyState === 'error' ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.12)',
                    color: coverUnverifyState === 'done' ? '#4ade80' : coverUnverifyState === 'error' ? '#f87171' : '#f87171',
                    border: `1px solid ${coverUnverifyState === 'done' ? '#4ade8060' : coverUnverifyState === 'error' ? '#f8717160' : '#f8717140'}`,
                    opacity: coverUnverifyState === 'loading' ? 0.6 : 1,
                  }}
                >
                  {coverUnverifyState === 'loading' ? '···' : coverUnverifyState === 'done' ? '✓ Removed' : coverUnverifyState === 'error' ? '✗ Failed' : 'Remove Verification'}
                </button>
              </div>
            )}
          </div>

          {/* Hero right column */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              {/* Asset class badge */}
              {(() => {
                const rawGrade = keyPrices.display_grade || 'RAW';
                const isRawCopy = !rawGrade || rawGrade === 'RAW' || rawGrade.toUpperCase() === 'RAW';
                const variantTag = variant.variantDescription;
                const isTrueVariant = !!variantTag && !['direct', 'base', 'regular'].includes((variantTag || '').toLowerCase());
                
                const isSovereign = variant.isSovereign === true;
                const marketPriceClass = variant.marketPriceClass || resolvePriceTier(keyPrices.display_fmv_usd || 0);

                const displayAssetClass: string = isRawCopy
                  ? 'RAW'
                  : isSovereign && rawGrade === '9.8' && !isTrueVariant
                    ? 'SOV'
                    : marketPriceClass;

                const assetKey = displayAssetClass.toUpperCase();
                const ac = ASSET_CLASS_HERO_CONFIG[assetKey] ?? ASSET_CLASS_HERO_CONFIG.OTC;
                return (
                  <div className="mb-2">
                    <div className="inline-flex items-center gap-3 mb-1.5 flex-wrap">
                      <span className="text-base px-4 py-1.5 rounded uppercase tracking-widest font-semibold pp-hover-var-glow" style={{ backgroundColor: `${ac.color}18`, color: ac.color, border: `1px solid ${ac.color}60`, fontFamily: 'monospace', letterSpacing: '0.18em', boxShadow: `0 0 12px ${ac.glowColor}, inset 0 0 8px ${ac.color}08`, cursor: 'default', ['--pp-hover-shadow' as string]: `0 0 32px ${ac.color}cc, 0 0 60px ${ac.color}44, inset 0 0 14px ${ac.color}14`, ['--pp-hover-bg' as string]: `${ac.color}26` } as CSSProperties}>
                        {ac.label}
                      </span>
                      {(variant as any).ticker && (
                        <span className="text-base px-3.5 py-1 rounded font-mono font-bold tracking-wider" style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.45)' }}>
                          ${String((variant as any).ticker).replace(/^\$/, '')}
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2.5 py-1 rounded uppercase tracking-wider font-semibold" style={{ backgroundColor: `${eraColors.border}88`, color: 'rgba(255,255,255,0.95)', border: `1px solid ${eraColors.border}cc`, fontFamily: 'monospace' }}>{variant.publisher}</span>
                        {variant.era && <span className="text-xs px-2.5 py-1 rounded uppercase tracking-wider font-semibold" style={{ backgroundColor: `${eraColors.border}88`, color: 'rgba(255,255,255,0.85)', border: `1px solid ${eraColors.border}cc`, fontFamily: 'monospace' }}>{ERA_MAP[variant.era.toLowerCase()] || variant.era}</span>}
                        <div className="flex items-center gap-1.5">
                          <ScarcityIcon className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.9)', filter: `drop-shadow(0 0 5px ${scarcityColors.border}ff)` }} />
                          <span className="text-xs px-2.5 py-1 rounded uppercase tracking-wider font-semibold" style={{ backgroundColor: `${scarcityColors.border}50`, color: 'rgba(255,255,255,0.92)', border: `1px solid ${scarcityColors.border}ff` }}>{scarcityColors.label}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace' }}>{ac.desc}</p>
                  </div>
                );
              })()}

              {(() => {
                const conf = variant.identityConfidence;
                const lowConfidence = conf != null && conf < 75;
                const confTier = conf == null ? null
                  : conf === 100 ? { label: 'FULL', color: '#22c55e' }
                  : conf >= 75   ? { label: 'HIGH', color: '#22c55e' }
                  : conf >= 50   ? { label: 'MED',  color: '#eab308' }
                  : conf >= 25   ? { label: 'LOW',  color: '#f59e0b' }
                  :                { label: 'NONE', color: '#ef4444' };
                const confTitle = conf != null
                  ? lowConfidence
                    ? `Identity confidence ${conf} — price data may derive from a reprint product`
                    : `Identity confidence ${conf} — data quality verified`
                  : undefined;
                return (
                  <div
                    className="flex items-center gap-2 mb-0"
                    title={confTitle}
                  >
                    {conf != null && confTier && (
                      <span className="flex items-center gap-1" style={{ flexShrink: 0 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            width: '8px', height: '8px',
                            borderRadius: '50%',
                            backgroundColor: confTier.color,
                            flexShrink: 0,
                            boxShadow: `0 0 6px ${confTier.color}cc`,
                          }}
                        />
                        <span
                          className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider"
                          style={{
                            backgroundColor: `${confTier.color}18`,
                            border: `1px solid ${confTier.color}44`,
                            color: confTier.color,
                            fontFamily: 'monospace',
                          }}
                        >
                          CONF {conf} · {confTier.label}
                        </span>
                      </span>
                    )}
                    <h1 className="text-4xl sm:text-5xl mb-0" style={{ fontWeight: 600, lineHeight: 1.1, color: lowConfidence ? 'rgba(241,245,249,0.65)' : '#fff' }}>
                      {variant.workName} #{variant.issueNumber}
                      <span style={{ color: 'rgba(255,255,255,0.62)', fontWeight: 400, fontSize: '2rem', marginLeft: '0.6rem' }}>({variant.productYear ?? variant.year})</span>
                    </h1>
                  </div>
                );
              })()}
              {variant.variantDescription && <p className="text-sm mb-0.5" style={{ color: 'rgba(255,255,255,0.68)' }}>{variant.variantDescription}</p>}
              {variant.yearDivergence && (
                <div className="flex items-start gap-2 mb-1 px-2 py-1.5 rounded" style={{ backgroundColor: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)' }}>
                  <span style={{ color: 'rgb(251,191,36)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>⚠ Data Integrity</span>
                  <span style={{ color: 'rgba(251,191,36,0.75)', fontSize: '10px', lineHeight: 1.4 }}>This variant ({variant.productYear}) is linked to a {variant.year} issue record — a {variant.yearGap}-year gap. Cover image and creator credits are suppressed to prevent false attribution.{' '}<a href="#no-cover-badge" style={{ color: 'rgba(251,191,36,0.9)', textDecoration: 'underline' }}>See cover panel ↑</a></span>
                </div>
              )}
              <p className="text-[10px] mb-0.5 tracking-widest uppercase" style={{ fontFamily: 'monospace', color: `${eraColors.border}cc`, letterSpacing: '0.14em' }}>
                {variant.publisher} · {variant.workName} · #{variant.issueNumber}
                {variantTypeLabel(variant.variantKey) ? ` (${variantTypeLabel(variant.variantKey)})` : ''}
                {variant.yearDivergence ? ` · variant year ${variant.productYear} / issue record ${variant.year}` : variant.era ? ` · ${ERA_LABELS[variant.era] || variant.era}` : ''}
                {variant.productId ? ` · ID-${variant.productId}` : ''}
              </p>

              {/* Primary creators */}
              {!variant.yearDivergence && (() => {
                const creators = heroCreatorsData?.data || [];
                const PRIORITY = ['writer', 'penciler', 'artist', 'creator', 'inker'];
                const primary = creators.filter(c => PRIORITY.includes(c.role.toLowerCase())).sort((a, b) => PRIORITY.indexOf(a.role.toLowerCase()) - PRIORITY.indexOf(b.role.toLowerCase())).slice(0, 5);
                if (primary.length === 0) return null;
                return (
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {primary.map((c, i) => (
                      <Link key={c.name} href={`/creator/${encodeURIComponent(c.name)}`}>
                        <span style={{ fontSize: '10px', color: i === 0 ? eraColors.border : 'rgba(255,255,255,0.78)', fontFamily: 'Hind, sans-serif', cursor: 'pointer' }}>
                          <span style={{ color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontSize: '9px' }}>{c.role}</span> {c.name}
                          {i < primary.length - 1 && <span style={{ color: 'rgba(255,255,255,0.64)', marginLeft: '6px' }}>·</span>}
                        </span>
                      </Link>
                    ))}
                  </div>
                );
              })()}

              {/* Variant Lineage Gallery: Sister Covers Strip */}
              {relationalData?.variants && relationalData.variants.length > 1 && (() => {
                const totalVars = relationalData.variants.length;
                const activeGcdId = variant.productId ? parseInt(variant.productId, 10) : null;
                const activeIdx = relationalData.variants.findIndex((v) => v.id === activeGcdId || v.catalogId === variantId);
                return (
                  <div className="my-2 p-2.5 rounded-lg bg-black/40 border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider">
                      <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        Variant Lineage Gallery ({totalVars} Published Covers)
                      </span>
                      {activeIdx !== -1 && (
                        <span className="text-slate-400">
                          Viewing Cover {activeIdx + 1} of {totalVars}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                      {relationalData.variants.map((v, vIdx) => {
                        const isCurrent = v.catalogId === variantId || v.id === activeGcdId;
                        const shortLabel = v.variantName
                          .replace(/^.*?Cover\s+([A-Z0-9]+).*?$/i, 'Cover $1')
                          .replace(/^.*?(FOC\s+Bonus.*?Cover\s+[A-Z0-9]+).*?$/i, '$1')
                          .slice(0, 24);

                        const content = (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap transition-all border"
                            style={{
                              backgroundColor: isCurrent ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                              borderColor: isCurrent ? '#06b6d4' : 'rgba(255, 255, 255, 0.1)',
                              color: isCurrent ? '#22d3ee' : '#94a3b8',
                              fontWeight: isCurrent ? 600 : 400,
                            }}
                            title={`${v.variantName}${v.coverArtist ? ` · Art by ${v.coverArtist}` : ''}`}
                          >
                            {v.coverArtist && <span className="text-amber-300 font-sans">{v.coverArtist.split(' ').pop()}:</span>}
                            <span>{shortLabel || `Var #${v.id}`}</span>
                            {isCurrent && <span className="text-[8px] uppercase tracking-wider bg-cyan-500/20 px-1 rounded ml-0.5">ACTIVE</span>}
                          </span>
                        );

                        if (v.catalogId && !isCurrent) {
                          return (
                            <Link key={v.id} href={`/comics/${v.catalogId}`}>
                              {content}
                            </Link>
                          );
                        }

                        return <span key={v.id}>{content}</span>;
                      })}
                    </div>
                  </div>
                );
              })()}

              {wikiSummary && !variant.yearDivergence ? (
                <p className="text-[10px] mb-2 leading-snug" style={{ color: 'rgba(255,255,255,0.75)', maxWidth: '560px' }}>{wikiSummary}</p>
              ) : !variant.yearDivergence ? (
                <p className="text-[10px] mb-2 leading-snug" style={{ color: 'rgba(255,255,255,0.62)', maxWidth: '560px' }}>
                  {variant.workName} #{variant.issueNumber}, published in {variant.productYear ?? variant.year} by {variant.publisher}.{ERA_CONTEXT[variant.era] ? ` ${ERA_CONTEXT[variant.era]}` : ''}
                </p>
              ) : null}

              {/* Instrument states: Sovereign / Anchor / Atomic */}
              <div className="flex gap-6 flex-wrap">
                {instrumentStates?.sovereign && (
                  <div>
                    <div className="text-xs uppercase tracking-widest mb-1 font-semibold" style={{ color: eraColors.border, letterSpacing: '0.12em' }}>
                      Sovereign · CGC {keyPrices.display_grade ?? instrumentStates.sovereign.grade}
                      {instrumentStates.anchor?.grade === instrumentStates.sovereign.grade && instrumentStates.anchor.salesVolume > 0 && <span style={{ color: 'rgba(255,255,255,0.55)', marginLeft: '5px' }}>{instrumentStates.anchor.salesVolume} sales</span>}
                    </div>
                    <div className="text-3xl sm:text-4xl" style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 600, textShadow: `0 0 20px ${eraColors.border}40` }}>{fmt(keyPrices.display_fmv_usd ?? instrumentStates.sovereign.priceUsd)}</div>
                    {keyPrices.delta24h != null && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {keyPrices.delta24h >= 0 ? <TrendingUp className="w-3.5 h-3.5" style={{ color: '#4ade80' }} /> : <TrendingDown className="w-3.5 h-3.5" style={{ color: '#f87171' }} />}
                        <span className="text-xs tabular-nums" style={{ color: keyPrices.delta24h >= 0 ? '#4ade80' : '#f87171', fontFamily: 'monospace', fontWeight: 600 }}>{keyPrices.delta24h >= 0 ? '+' : ''}{keyPrices.delta24h.toFixed(2)}%</span>
                        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.55)' }}>24h</span>
                      </div>
                    )}
                  </div>
                )}
                {instrumentStates?.anchor && (
                  <div>
                    <div className="text-xs uppercase tracking-widest mb-1 font-semibold" style={{ color: 'rgba(255,255,255,0.75)', letterSpacing: '0.12em' }}>Anchor · CGC {instrumentStates.anchor.grade}{instrumentStates.anchor.salesVolume > 0 && <span style={{ color: 'rgba(255,255,255,0.74)', marginLeft: '4px' }}>{instrumentStates.anchor.salesVolume} sales</span>}</div>
                    <div className="text-3xl sm:text-4xl" style={{ color: '#e2e8f0', fontFamily: 'monospace', fontWeight: 600 }}>{fmt(instrumentStates.anchor.priceUsd)}</div>
                  </div>
                )}
                {instrumentStates?.atomic && (
                  <div>
                    <div className="text-xs uppercase tracking-widest mb-1 font-semibold" style={{ color: 'rgba(255,255,255,0.68)', letterSpacing: '0.12em' }}>Atomic · Raw</div>
                    <div className="text-3xl sm:text-4xl" style={{ color: '#cbd5e1', fontFamily: 'monospace', fontWeight: 600 }}>{fmt(instrumentStates.atomic.priceUsd)}</div>
                  </div>
                )}
                {!instrumentStates?.sovereign && !instrumentStates?.atomic && !instrumentStates?.anchor && (() => {
                  const fallbackPrice = keyPrices.display_fmv_usd ?? keyPrices.fmv98Usd ?? keyPrices.fmvRawUsd;
                  if (fallbackPrice == null) return null;
                  const gradeLabel = keyPrices.display_grade ? `CGC ${keyPrices.display_grade}` : keyPrices.fmv98Usd ? 'CGC 9.8' : 'Raw';
                  return (
                    <div>
                      <div className="text-xs uppercase tracking-widest mb-1 font-semibold" style={{ color: eraColors.border, letterSpacing: '0.12em' }}>{gradeLabel}</div>
                      <div className="text-3xl sm:text-4xl" style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 600, textShadow: `0 0 20px ${eraColors.border}40` }}>{fmt(fallbackPrice)}</div>
                      {keyPrices.delta24h != null && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {keyPrices.delta24h >= 0 ? <TrendingUp className="w-3.5 h-3.5" style={{ color: '#4ade80' }} /> : <TrendingDown className="w-3.5 h-3.5" style={{ color: '#f87171' }} />}
                          <span className="text-xs tabular-nums" style={{ color: keyPrices.delta24h >= 0 ? '#4ade80' : '#f87171', fontFamily: 'monospace', fontWeight: 600 }}>{keyPrices.delta24h >= 0 ? '+' : ''}{keyPrices.delta24h.toFixed(2)}%</span>
                          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.55)' }}>24h</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
                {instrumentStates?.sovereignToAtomicMultiple != null && (
                  <div>
                    <div className="text-xs uppercase tracking-widest mb-1 font-semibold" style={{ color: 'rgba(255,255,255,0.76)', letterSpacing: '0.12em' }}>Sov / Raw ×</div>
                    <div className="text-3xl sm:text-4xl" style={{ color: '#94a3b8', fontFamily: 'monospace', fontWeight: 600 }}>{instrumentStates.sovereignToAtomicMultiple}×</div>
                  </div>
                )}
              </div>
            </div>

            {/* Price History Sparkline — STD and OTC only */}
            {(() => {
              const rawGrade = keyPrices.display_grade || 'RAW';
              const isRawCopy = !rawGrade || rawGrade === 'RAW' || rawGrade.toUpperCase() === 'RAW';
              const variantTag = variant.variantDescription;
              const isTrueVariant = !!variantTag && !['direct', 'base', 'regular'].includes((variantTag || '').toLowerCase());
              const isSovereign = variant.isSovereign === true;
              const marketPriceClass = variant.marketPriceClass || resolvePriceTier(keyPrices.display_fmv_usd || 0);
              const displayAssetClass: string = isRawCopy ? 'RAW' : isSovereign && rawGrade === '9.8' && !isTrueVariant ? 'SOV' : marketPriceClass;
              const assetKey = displayAssetClass.toUpperCase();
              if (assetKey !== 'STD' && assetKey !== 'OTC' && assetKey !== 'PREMIUM') return null;
              const acConf = ASSET_CLASS_HERO_CONFIG[assetKey] ?? ASSET_CLASS_HERO_CONFIG.OTC;
              return (
                <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${eraColors.border}22` }}>
                  <div className="mb-2">
                    <span className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.14em' }}>Price History</span>
                  </div>
                  <OraclePriceSparkline assetId={variantId} color={acConf.color} height={80} limit={30} />
                </div>
              );
            })()}

            {/* CGC Census Histogram */}
            {censusSummary && censusSummary.totalGraded > 0 && censusSummary.histogram.length > 0 && (() => {
              const sovereignGrade = instrumentStates?.sovereign?.grade, anchorGrade = instrumentStates?.anchor?.grade;
              const maxCount = Math.max(...censusSummary.histogram.map(g => g.count), 1);
              const gradePriceDetailMap = new Map<string, GradePrice>(
                gradeLattice.filter(gp => gp.priceUsd > 0).map(gp => [gp.grade, gp])
              );
              return (
                <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${eraColors.border}22` }}>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.60)' }}>CGC Census · {censusSummary.totalGraded.toLocaleString()}{censusSummary.scope === 'issue' && !censusSummary.isBaseVariant ? <span style={{ color: 'rgba(255,200,100,0.80)', fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}> series total · all printings</span> : <span> graded</span>}</span>
                    <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.70)', fontFamily: 'monospace' }}>snapshot {censusSummary.snapshotDate}</span>
                  </div>
                  <div className="space-y-0.5 max-w-xl">
                    {censusSummary.histogram.map(g => {
                      const isSov = g.grade === sovereignGrade, isAnc = g.grade === anchorGrade && !isSov, isPeak = g.count === maxCount;
                      const barPct = Math.max(2, (g.count / maxCount) * 100);
                      const barColor = isSov ? eraColors.border : isPeak ? 'rgba(255,255,255,0.70)' : isAnc ? 'rgba(255,255,255,0.50)' : 'rgba(255,255,255,0.20)';
                      const lColor = isSov ? eraColors.border : isPeak ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.55)';
                      const gpDetail = gradePriceDetailMap.get(g.grade) ?? null;
                      const gradePrice = isSov && instrumentStates?.sovereign
                        ? instrumentStates.sovereign.priceUsd
                        : isAnc && instrumentStates?.anchor
                          ? instrumentStates.anchor.priceUsd
                          : gpDetail?.priceUsd ?? null;
                      const gradeSalesVol = isAnc && instrumentStates?.anchor
                        ? instrumentStates.anchor.salesVolume
                        : gpDetail?.salesVolume ?? null;
                      const hasConfirmedSales = gradeSalesVol != null && gradeSalesVol > 0;
                      const priceColor = isSov
                        ? eraColors.border
                        : isAnc
                          ? (hasConfirmedSales ? 'rgba(255,255,255,0.70)' : 'rgba(255,255,255,0.38)')
                          : (hasConfirmedSales ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.28)');
                      const isHovered = hoveredCensusGrade === g.grade;
                      const salesVolume = gpDetail?.salesVolume ?? null;
                      const observedAt = gpDetail?.observedAt ?? null;
                      return (
                        <div
                          key={g.grade}
                          className="flex items-center gap-2"
                          style={{ position: 'relative', cursor: 'default' }}
                          onMouseEnter={() => setHoveredCensusGrade(g.grade)}
                          onMouseLeave={() => setHoveredCensusGrade(null)}
                        >
                          <span className="text-[9px] w-7 text-right shrink-0" style={{ fontFamily: 'monospace', color: lColor }}>{g.grade}</span>
                          <div className="flex-1 h-1.5 rounded-sm overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}><div className="h-full rounded-sm" style={{ width: `${barPct}%`, backgroundColor: barColor, boxShadow: isSov ? `0 0 5px ${eraColors.border}50` : 'none' }} /></div>
                          <span className="text-[9px] w-10 shrink-0 text-right" style={{ fontFamily: 'monospace', color: isPeak ? '#fff' : lColor }}>{g.count.toLocaleString()}</span>
                          {isSov && <span className="text-[8px] shrink-0" style={{ color: eraColors.border, fontFamily: 'monospace' }}>SOV</span>}
                          {isAnc && <span className="text-[8px] shrink-0" style={{ color: 'rgba(255,255,255,0.58)', fontFamily: 'monospace' }}>ANC</span>}
                          {isPeak && !isSov && !isAnc && <span className="text-[8px] shrink-0" style={{ color: 'rgba(255,255,255,0.65)', fontFamily: 'monospace' }}>PEAK</span>}
                          {gradePrice != null
                            ? <span
                                className="text-[8px] w-14 shrink-0 text-right"
                                title={hasConfirmedSales ? `${gradeSalesVol} confirmed sale${gradeSalesVol === 1 ? '' : 's'}` : 'catalog estimate — no confirmed sales'}
                                style={{ fontFamily: 'monospace', color: priceColor, fontStyle: hasConfirmedSales ? 'normal' : 'italic' }}
                              >
                                {hasConfirmedSales ? '' : '~'}{fmt(gradePrice)}
                              </span>
                            : <span className="w-14 shrink-0" />
                          }
                          {hasConfirmedSales && gradeSalesVol != null
                            ? <span className="text-[7px] w-6 shrink-0 text-left" style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.38)' }}>×{gradeSalesVol}</span>
                            : <span className="w-6 shrink-0" />
                          }
                          {isHovered && (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: 'calc(100% + 5px)',
                                left: '28px',
                                zIndex: 50,
                                backgroundColor: 'rgba(8, 8, 12, 0.97)',
                                border: `1px solid ${isSov ? eraColors.border : 'rgba(255,255,255,0.18)'}`,
                                borderRadius: '3px',
                                padding: '7px 10px',
                                minWidth: '148px',
                                whiteSpace: 'nowrap',
                                boxShadow: `0 4px 20px rgba(0,0,0,0.70)${isSov ? `, 0 0 10px ${eraColors.border}30` : ''}`,
                                pointerEvents: 'none',
                              }}
                            >
                              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: lColor, marginBottom: '5px', letterSpacing: '0.05em' }}>
                                CGC {g.grade}
                                {isSov && <span style={{ marginLeft: '6px', color: eraColors.border, fontSize: '8px', letterSpacing: '0.08em' }}>SOV</span>}
                                {isAnc && <span style={{ marginLeft: '6px', color: 'rgba(255,255,255,0.55)', fontSize: '8px', letterSpacing: '0.08em' }}>ANC</span>}
                                {isPeak && !isSov && !isAnc && <span style={{ marginLeft: '6px', color: 'rgba(255,255,255,0.55)', fontSize: '8px', letterSpacing: '0.08em' }}>PEAK</span>}
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 10px', alignItems: 'baseline' }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '8px', color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pop</span>
                                <span style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.85)', textAlign: 'right' }}>{g.count.toLocaleString()}</span>
                                {gradePrice != null && <>
                                  <span style={{ fontFamily: 'monospace', fontSize: '8px', color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Price</span>
                                  <span style={{ fontFamily: 'monospace', fontSize: '9px', color: priceColor === 'rgba(255,255,255,0.40)' ? 'rgba(255,255,255,0.75)' : priceColor, textAlign: 'right' }}>{fmt(gradePrice)}</span>
                                </>}
                                {salesVolume != null && <>
                                  <span style={{ fontFamily: 'monospace', fontSize: '8px', color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sales</span>
                                  <span style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.70)', textAlign: 'right' }}>{salesVolume.toLocaleString()}</span>
                                </>}
                                {observedAt && <>
                                  <span style={{ fontFamily: 'monospace', fontSize: '8px', color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Last</span>
                                  <span style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.55)', textAlign: 'right' }}>{fmtDate(observedAt)}</span>
                                </>}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex items-center gap-3" style={{ opacity: 0.7 }}>
                    <span className="text-[7px]" style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.55)' }}>
                      <span style={{ color: 'rgba(255,255,255,0.70)' }}>price</span> = confirmed sale &nbsp;<span style={{ color: 'rgba(255,255,255,0.38)' }}>×n</span> = sales count
                    </span>
                    <span className="text-[7px]" style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.38)', fontStyle: 'italic' }}>
                      ~price = catalog estimate
                    </span>
                  </div>
                  {censusSummary.floatConcentration != null && censusSummary.scope === 'variant' && <div className="mt-1 text-[8px]" style={{ color: 'rgba(255,255,255,0.48)', fontFamily: 'monospace' }}>High-grade float (9.4–9.8): {(censusSummary.floatConcentration * 100).toFixed(1)}% of total</div>}
                  {censusSummary.scope === 'issue' && !censusSummary.isBaseVariant && <div className="mt-2 text-[8px]" style={{ color: 'rgba(255,200,100,0.65)', fontFamily: 'monospace' }}>Variant-specific census not yet ingested. Population above covers all printings.</div>}
                </div>
              );
            })()}

            {/* Canon Equity Truth Layer */}
            {truthLayerData?.found && truthLayerData.data && (() => {
              const tl = truthLayerData.data;
              const confColor = tl.anchorConfidence === 'HIGH' ? '#22c55e' : tl.anchorConfidence === 'MEDIUM' ? '#eab308' : '#ef4444';
              return (
                <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${eraColors.border}22` }}>
                  <div className="text-[9px] uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.60)', letterSpacing: '0.14em' }}>
                    Canon Equity Truth Layer <span className="ml-2 text-[7px]" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{new Date(tl.computedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {tl.anchorGrade != null && (
                      <div>
                        <div className="text-[8px] uppercase tracking-wider mb-0.5" style={{ color: 'rgba(255,255,255,0.50)' }}>Anchor Grade <span className="ml-1.5 px-1 rounded text-[7px]" style={{ backgroundColor: `${confColor}20`, color: confColor, border: `1px solid ${confColor}55` }}>{tl.anchorConfidence}</span></div>
                        <div className="text-lg" style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 500 }}>{tl.anchorGrade.toFixed(1)}</div>
                        <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace' }}>{fmt(tl.anchorPriceUsd || 0)}{tl.anchorSalesVolume != null && tl.anchorSalesVolume > 0 && <span style={{ marginLeft: '6px', color: 'rgba(255,255,255,0.40)' }}>{tl.anchorSalesVolume} sales</span>}</div>
                      </div>
                    )}
                    {tl.supplyAdjustment !== 1.0 && (
                      <div>
                        <div className="text-[8px] uppercase tracking-wider mb-0.5" style={{ color: 'rgba(255,255,255,0.50)' }}>Supply Adj</div>
                        <div className="text-lg" style={{ color: tl.supplyAdjustment > 1 ? '#22c55e' : '#ef4444', fontFamily: 'monospace', fontWeight: 500 }}>{tl.supplyAdjustment > 1 ? '+' : ''}{((tl.supplyAdjustment - 1) * 100).toFixed(1)}%</div>
                      </div>
                    )}
                  </div>
                  {(tl.price99Usd || tl.price100Usd) && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="text-[8px] uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.50)' }}>ISM Derivatives</div>
                      <div className="flex gap-4">
                        {tl.price99Usd != null && <div><div className="text-[8px]" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>9.9 · {tl.ismMethod99 === 'OBSERVED' ? 'Observed' : 'Derived'}</div><div className="text-base" style={{ color: tl.ismMethod99 === 'OBSERVED' ? '#fff' : '#cbd5e1', fontFamily: 'monospace', fontWeight: 500 }}>{fmt(tl.price99Usd)}</div>{tl.ism99 != null && <div className="text-[8px]" style={{ color: 'rgba(255,255,255,0.40)', fontFamily: 'monospace' }}>ISM {tl.ism99.toFixed(2)}×</div>}</div>}
                        {tl.price100Usd != null && <div><div className="text-[8px]" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>10.0 · {tl.ismMethod100 === 'OBSERVED' ? 'Observed' : 'Derived'}</div><div className="text-base" style={{ color: tl.ismMethod100 === 'OBSERVED' ? '#fff' : '#cbd5e1', fontFamily: 'monospace', fontWeight: 500 }}>{fmt(tl.price100Usd)}</div>{tl.ism100 != null && <div className="text-[8px]" style={{ color: 'rgba(255,255,255,0.40)', fontFamily: 'monospace' }}>ISM {tl.ism100.toFixed(2)}×</div>}</div>}
                      </div>
                    </div>
                  )}
                  {Object.keys(tl.graderSpread).length > 0 && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="text-[8px] uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.50)' }}>Grader Spread · Anchor Grade</div>
                      <div className="flex gap-4">
                        {Object.entries(tl.graderSpread).map(([company, spread]) => (
                          <div key={company}>
                            <div className="text-[8px]" style={{ color: company === 'CGC' ? '#3b82f6' : company === 'CBCS' ? '#f59e0b' : '#a78bfa', fontFamily: 'monospace' }}>{company}</div>
                            <div className="text-sm" style={{ color: '#e2e8f0', fontFamily: 'monospace', fontWeight: 500 }}>{fmt(spread.price_usd)}</div>
                            <div className="text-[7px]" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>×{spread.multiplier.toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Spread Microstructure */}
            {spreadData?.found && spreadData.data && (() => {
              const sp = spreadData.data;
              const liqVal = sp.liquidityScore > 1 ? sp.liquidityScore / 100 : sp.liquidityScore;
              const liqColor = liqVal >= 0.6 ? '#22c55e' : liqVal >= 0.3 ? '#eab308' : '#ef4444';
              const anchorKeys = Object.keys(sp.observedAnchors || {});
              const formatPct = (val: number | null | undefined): string => {
                if (val == null || isNaN(val)) return '—';
                const pct = val > 1 ? val : val * 100;
                return `${pct.toFixed(1)}%`;
              };
              const formatLiq = (val: number | null | undefined): string => {
                if (val == null || isNaN(val)) return '—';
                const pct = val > 1 ? val : val * 100;
                return `${pct.toFixed(0)}%`;
              };
              return (
                <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${eraColors.border}22` }}>
                  <div className="text-[9px] uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.60)', letterSpacing: '0.14em' }}>Spread Microstructure <span className="ml-2 px-1.5 rounded text-[7px]" style={{ backgroundColor: `${liqColor}15`, color: liqColor, border: `1px solid ${liqColor}40` }}>{sp.spreadMethod}</span></div>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-2 mb-3">
                    {[{ label: 'Base Spread', val: formatPct(sp.baseSpread), col: '#fff' }, { label: 'Live Spread', val: formatPct(sp.currentSpread), col: sp.currentSpread > sp.baseSpread * 1.5 ? '#ef4444' : '#fff' }, { label: 'Liquidity', val: formatLiq(sp.liquidityScore), col: liqColor }].map(({ label, val, col }) => (
                      <div key={label}><div className="text-[8px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</div><div className="text-sm" style={{ color: col, fontFamily: 'monospace' }}>{val}</div></div>
                    ))}
                  </div>
                  {anchorKeys.length > 0 && (
                    <div className="pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="text-[8px] uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>Observed Spread Anchors</div>
                      <div className="flex gap-3 flex-wrap">
                        {anchorKeys.map(tier => { const a = sp.observedAnchors[tier]; return <div key={tier} className="px-2 py-1 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}><div className="text-[7px] uppercase" style={{ color: 'rgba(255,255,255,0.50)' }}>{tier}</div><div className="text-[9px]" style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{fmt(a.buy)} / {fmt(a.sell)}</div><div className="text-[7px]" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{formatPct(a.spread)}</div></div>; })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Buy / Sell */}
            <div className="mt-4 pt-3 flex items-center gap-3 flex-wrap" style={{ borderTop: `1px solid ${eraColors.border}15` }}>
              <button className="px-5 py-2 rounded text-sm uppercase tracking-wider" style={{ backgroundColor: '#16a34a', color: '#fff', border: '1px solid #22c55e40', letterSpacing: '0.08em' }} onClick={() => onOpenExecModal('buy')}>Buy</button>
              <button className="px-5 py-2 rounded text-sm uppercase tracking-wider" style={{ backgroundColor: 'rgba(220,38,38,0.15)', color: '#f87171', border: '1px solid #f8717140', letterSpacing: '0.08em' }} onClick={() => onOpenExecModal('sell')}>Sell</button>
              <div className="flex flex-col ml-2">
                <span className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.76)' }}>Last Price Data</span>
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.78)', fontFamily: 'monospace' }}>{fmtDate(keyPrices.observedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cover lightbox portal */}
      <CoverLightboxPortal
        isOpen={showCoverLightbox && !!heroSrc}
        onClose={() => {
          startTransition(() => {
            setShowCoverLightbox(false);
          });
        }}
        heroSrc={heroSrc || ''}
        workName={variant.workName}
        issueNumber={variant.issueNumber}
        year={variant.year}
        eraBorder={eraColors.border}
        heroImageLabel={heroImageLabel}
        latestSaleImageUrl={latestSaleImageUrl}
      />
    </>
  );
}

function CoverLightboxPortal({
  isOpen,
  onClose,
  heroSrc,
  workName,
  issueNumber,
  year,
  eraBorder,
  heroImageLabel,
  latestSaleImageUrl,
}: {
  isOpen: boolean;
  onClose: () => void;
  heroSrc: string;
  workName: string;
  issueNumber: string;
  year: number | null;
  eraBorder: string;
  heroImageLabel: string;
  latestSaleImageUrl: string | null;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="lightbox-overlay fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.92)', cursor: 'zoom-out' }}
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      tabIndex={0}
    >
      <div
        className="lightbox-content relative flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '90vw', maxHeight: '90vh' }}
      >
        <div className="flex items-center justify-between w-full px-1">
          <span className="text-sm font-sans" style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'Hind, sans-serif' }}>
            {workName} #{issueNumber} {year ? `· ${year}` : ''}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-3 py-1 rounded transition-colors"
            style={{ color: eraBorder, border: `1px solid ${eraBorder}40`, backgroundColor: `${eraBorder}15` }}
          >
            Close ✕
          </button>
        </div>
        <img
          src={heroSrc}
          alt={`${workName} #${issueNumber}`}
          loading="eager"
          decoding="async"
          style={{
            maxWidth: 'min(480px, 80vw)',
            maxHeight: '75vh',
            objectFit: 'contain',
            display: 'block',
            boxShadow: `0 0 60px rgba(0,0,0,0.9), 0 0 30px ${eraBorder}25`,
            border: `1px solid ${eraBorder}35`,
            borderRadius: '4px',
          }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <p className="text-[10px] font-mono" style={{ color: latestSaleImageUrl ? eraBorder : 'rgba(255,255,255,0.4)' }}>
          {heroImageLabel} · Click outside to close · Escape
        </p>
      </div>
    </div>,
    document.body
  );
}
