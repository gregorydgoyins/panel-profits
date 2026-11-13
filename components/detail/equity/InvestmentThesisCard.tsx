'use client';
import { gradingSubmissionCost, netSaleProceeds } from "@/lib/pricing/canonical-underwriting-core";
import React, { useMemo } from 'react';
import Panel from './Panel';
import { getEraColors } from '@/lib/design-system/colors';
import { Target, TrendingUp, TrendingDown, Zap } from 'lucide-react';

export interface InvestmentThesisCardProps {
  variant: {
    workName: string;
    issueNumber: string;
    era: string | null;
    publisher: string;
    scarcityTier: string | null;
    year?: number | null;
    variantDescription?: string | null;
  };
  keyPrices: {
    fmv98Usd: number;
    sovPriceUsd: number;
    fmvRawUsd?: number | null;
    display_grade?: string;
  };
  censusSummary: {
    totalGraded: number;
    highGradeCount: number;
    census98Count?: number;
    printRunTotal?: number | null;
    rawCopiesEstimated?: number | null;
  } | null | undefined;
  series: {
    name: string;
    totalIssues: number;
  } | null | undefined;
  priceHistory: Array<{ priceUsd: number; observedAt: string }>;
  eraColors: { border: string; bg: string; bgHover: string; glow: string };
  gradeLattice?: Array<{ grade: string; priceUsd: number; salesVolume?: number | null }> | null;
  rawPrice?: number | null;
  comic?: any;
}

export default function InvestmentThesisCard({
  variant,
  keyPrices,
  censusSummary,
  series,
  priceHistory = [],
  eraColors,
  gradeLattice = [],
  rawPrice = null,
  comic = null,
}: InvestmentThesisCardProps) {
  const colors = eraColors ?? getEraColors(variant?.era);

  const { bullBullets, bearBullets, catalystBullets } = useMemo(() => {
    const workName = variant?.workName || series?.name || 'This Series';
    const issueNum = variant?.issueNumber || '1';
    const issueTitle = `${workName} #${issueNum}`;
    const pubYear = variant?.year || comic?.publication_year || null;
    const eraStr = (variant?.era || '').toLowerCase().trim();
    const eraDisplay = eraStr ? `${eraStr.charAt(0).toUpperCase()}${eraStr.slice(1)} Age` : (pubYear && pubYear < 1980 ? 'Vintage Age' : 'Modern Age');
    const pubStr = (variant?.publisher || 'Independent').trim();

    const totalGraded = censusSummary?.totalGraded ?? 0;
    const census98 = censusSummary?.census98Count ?? censusSummary?.highGradeCount ?? 0;
    const printRun = censusSummary?.printRunTotal ?? null;
    const rawFloat = censusSummary?.rawCopiesEstimated ?? null;

    const fmv98 = keyPrices?.fmv98Usd || keyPrices?.sovPriceUsd || 0;
    const rawUsd = rawPrice || keyPrices?.fmvRawUsd || gradeLattice?.find((g) => g.grade.toUpperCase() === 'RAW')?.priceUsd || 0;
    const rawTo98Multiple = rawUsd > 0 && fmv98 > 0 ? Number((fmv98 / rawUsd).toFixed(1)) : 0;

    const writers = comic?.writer ? String(comic.writer).split(/;|,/)[0]?.trim() : null;
    const pencilers = comic?.penciler || comic?.artist ? String(comic.penciler || comic.artist).split(/;|,/)[0]?.trim() : null;
    const firstApps = Array.isArray(comic?.fandom_first_appearances) && comic.fandom_first_appearances.length > 0
      ? String(comic.fandom_first_appearances[0]).replace(/\[|\]/g, '').trim()
      : null;

    const fmtUsd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // ── Bull Case (Issue-Specific Upside Drivers) ──────────────────
    const bulls: string[] = [];

    if (pubYear && pubYear < 1980) {
      bulls.push(
        `${pubYear} ${eraDisplay} provenance on ${issueTitle} with only ${totalGraded > 0 ? `${totalGraded.toLocaleString()} total CGC slabs (${census98.toLocaleString()} in 9.8)` : 'a tightly held surviving census'}`
      );
    } else if (rawTo98Multiple >= 3.5 && rawUsd > 0) {
      bulls.push(
        `${rawTo98Multiple}× condition expansion from ${fmtUsd(rawUsd)} raw entry to ${fmtUsd(fmv98)} CGC 9.8 benchmark on ${issueTitle}`
      );
    } else if (fmv98 > 0) {
      bulls.push(
        `${issueTitle} (${pubYear || eraDisplay}) establishes a verified ${fmtUsd(fmv98)} apex benchmark across ${totalGraded > 0 ? `${totalGraded.toLocaleString()} registered CGC slabs` : 'active secondary clearing'}`
      );
    }

    if (firstApps) {
      bulls.push(`Key canon milestone featuring the debut of ${firstApps} in ${pubStr} continuity`);
    } else if (writers || pencilers) {
      bulls.push(
        `Creative pedigree (${[writers, pencilers].filter(Boolean).join(' / ')}) anchors enduring collector conviction in ${workName}`
      );
    } else if (census98 > 0 && census98 <= 100) {
      bulls.push(
        `Scarce high-grade apex population (${census98.toLocaleString()} copies in CGC 9.8${printRun ? ` out of ~${printRun.toLocaleString()} print run` : ''}) protects upside elasticity`
      );
    }

    const hurdle98 = fmv98 > 0
      ? gradingSubmissionCost(fmv98, pubYear ?? 1975, { includePressing: true }).total
      : 0;
    const netSpread98 = rawUsd > 0 && fmv98 > 0 ? Number((netSaleProceeds(fmv98) - (rawUsd + hurdle98)).toFixed(2)) : 0;

    if (rawUsd > 0 && fmv98 > 0 && (!pubYear || pubYear >= 1980) && netSpread98 > 0) {
      bulls.push(`Positive CPR arbitrage: raw acquisition (${fmtUsd(rawUsd)}) + ${fmtUsd(hurdle98)} grading hurdle yields +${fmtUsd(netSpread98)} net at 9.8`);
    }

    if (bulls.length < 3) {
      bulls.push(
        totalGraded > 0 && printRun && printRun > 0
          ? `Low ${((totalGraded / printRun) * 100).toFixed(2)}% CGC encapsulation rate against ~${printRun.toLocaleString()} initial circulation`
          : `Active multi-grade order book depth for ${issueTitle} across ${gradeLattice?.length || 1} priced condition tiers`
      );
    }

    // ── Bear Case (Issue-Specific Risk Factors) ────────────────────
    const bears: string[] = [];

    if (pubYear && pubYear < 1980 && rawUsd >= 150) {
      bears.push(
        `Uncertified raw purchases (${fmtUsd(rawUsd)}) carry undisclosed restoration/trimming risk${hurdle98 > 0 ? ` plus ${fmtUsd(hurdle98)} CGC grading, pressing & insured shipping at the 9.8 value` : ''}`
      );
    } else if (rawUsd > 0 && fmv98 > 0 && netSpread98 < 0) {
      bears.push(
        `Single-book raw slabbing (${fmtUsd(hurdle98)} hurdle + ${fmtUsd(rawUsd)} raw) is underwater by -${fmtUsd(Math.abs(netSpread98))} after eBay fee & shipping at ${fmtUsd(fmv98)} 9.8 FMV`
      );
    }

    if (totalGraded > 1500 || census98 > 300) {
      bears.push(
        `Elevated certified supply (${totalGraded.toLocaleString()} total slabs; ${census98.toLocaleString()} at 9.8) requires major catalyst volume to break resistance`
      );
    } else if (rawFloat && rawFloat > 40000) {
      bears.push(
        `Estimated ~${rawFloat.toLocaleString()} ungraded copies in raw circulation can expand CGC census if 9.8 premiums spike`
      );
    } else {
      bears.push(
        `Missing target grade by a single step (9.8 → 9.6) compresses realized resale value by ~45–60% on ${issueTitle}`
      );
    }

    if (bears.length < 3) {
      bears.push(
        `Secondary auction venue friction (10%–13.25% seller commission + insured shipping) requires disciplined entry below ${fmtUsd(fmv98 > 0 ? fmv98 * 0.88 : 50)}`
      );
    }

    // ── Catalyst Watch (Issue-Specific Forward Triggers) ───────────
    const catalysts: string[] = [];
    if (/marvel|timely|atlas/i.test(pubStr)) {
      catalysts.push(`Marvel Studios casting, trailer, or theatrical slate integration tied to ${workName} canon`);
    } else if (/\bdc\b|national|vertigo/i.test(pubStr)) {
      catalysts.push(`DC Studios / WBD theatrical & streaming announcements featuring ${workName} characters`);
    } else {
      catalysts.push(`${pubStr} cross-media adaptation, anniversary reprint, or creator spotlight on ${workName}`);
    }

    catalysts.push(
      `New record clearing comp above ${fmtUsd(fmv98 > 0 ? fmv98 : 100)} or tightening CGC 9.8 apex ratio (${census98.toLocaleString()} current slabs)`
    );
    catalysts.push(
      series?.totalIssues && series.totalIssues > 1
        ? `Run-collector accumulation across the ${series.totalIssues}-issue ${workName} series (${pubYear || eraDisplay})`
        : `Pedigree collection auction or institutional registry upgrade demand for ${issueTitle}`
    );

    return {
      bullBullets: bulls.slice(0, 3),
      bearBullets: bears.slice(0, 3),
      catalystBullets: catalysts.slice(0, 3),
    };
  }, [variant, keyPrices, censusSummary, series, priceHistory, gradeLattice, rawPrice, comic]);

  return (
    <Panel
      title="Investment Thesis"
      icon={<Target className="w-3.5 h-3.5" />}
      eraColors={colors as ReturnType<typeof getEraColors>}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Bull Case */}
        <div
          className="group relative rounded-xl p-3.5 bg-[#0d1512]/80 hover:bg-[#0f1f18] transition-all duration-300 flex flex-col justify-between border border-emerald-500/30 hover:border-emerald-400 hover:shadow-[0_0_25px_rgba(34,197,94,0.45),inset_0_0_15px_rgba(34,197,94,0.15)] ring-1 ring-emerald-500/20 hover:ring-emerald-400/60"
        >
          {/* Luminous Outer Laser Edge Rim Light on Hover */}
          <div className="absolute -top-[1px] left-3 right-3 h-[2px] rounded-full bg-emerald-400 opacity-60 group-hover:opacity-100 group-hover:shadow-[0_0_10px_#22c55e] transition-all duration-300" />
          <div className="absolute -bottom-[1px] left-6 right-6 h-[1px] rounded-full bg-emerald-400/40 group-hover:opacity-80 transition-all duration-300" />

          {/* Subtle ghosted ambient green backlight on hover */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-emerald-500/15 via-emerald-950/10 to-transparent opacity-40 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-emerald-500/25">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#22c55e] animate-pulse" />
                <TrendingUp className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110 text-emerald-400" />
                <span
                  className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-300 font-mono"
                  style={{ letterSpacing: '0.12em' }}
                >
                  Bull Case
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                UPSIDE
              </span>
            </div>
            <ul className="space-y-2 m-0 p-0 list-none">
              {bullBullets.map((bullet, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-1.5 leading-snug"
                  style={{
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontFamily: 'Hind, sans-serif',
                  }}
                >
                  <span
                    className="select-none shrink-0 text-emerald-400 font-bold"
                    style={{ fontSize: '12px', lineHeight: '14px' }}
                  >
                    •
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Catalyst Watch (Yellow / Amber) */}
        <div
          className="group relative rounded-xl p-3.5 bg-[#17140b]/80 hover:bg-[#211b0e] transition-all duration-300 flex flex-col justify-between border border-amber-500/30 hover:border-amber-400 hover:shadow-[0_0_25px_rgba(245,158,11,0.45),inset_0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/20 hover:ring-amber-400/60"
        >
          {/* Luminous Outer Laser Edge Rim Light on Hover */}
          <div className="absolute -top-[1px] left-3 right-3 h-[2px] rounded-full bg-amber-400 opacity-60 group-hover:opacity-100 group-hover:shadow-[0_0_10px_#f59e0b] transition-all duration-300" />
          <div className="absolute -bottom-[1px] left-6 right-6 h-[1px] rounded-full bg-amber-400/40 group-hover:opacity-80 transition-all duration-300" />

          {/* Subtle ghosted ambient yellow/amber backlight on hover */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-amber-500/15 via-amber-950/10 to-transparent opacity-40 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-amber-500/25">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-pulse" />
                <Zap className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110 text-amber-400" />
                <span
                  className="text-[9px] uppercase tracking-wider font-extrabold text-amber-300 font-mono"
                  style={{ letterSpacing: '0.12em' }}
                >
                  Catalyst Watch
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                TRIGGERS
              </span>
            </div>
            <ul className="space-y-2 m-0 p-0 list-none">
              {catalystBullets.map((bullet, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-1.5 leading-snug"
                  style={{
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontFamily: 'Hind, sans-serif',
                  }}
                >
                  <span
                    className="select-none shrink-0 text-amber-400 font-bold"
                    style={{ fontSize: '12px', lineHeight: '14px' }}
                  >
                    •
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bear Case (Red) */}
        <div
          className="group relative rounded-xl p-3.5 bg-[#170e0f]/80 hover:bg-[#221013] transition-all duration-300 flex flex-col justify-between border border-rose-500/30 hover:border-rose-400 hover:shadow-[0_0_25px_rgba(239,68,68,0.45),inset_0_0_15px_rgba(239,68,68,0.15)] ring-1 ring-rose-500/20 hover:ring-rose-400/60"
        >
          {/* Luminous Outer Laser Edge Rim Light on Hover */}
          <div className="absolute -top-[1px] left-3 right-3 h-[2px] rounded-full bg-rose-400 opacity-60 group-hover:opacity-100 group-hover:shadow-[0_0_10px_#ef4444] transition-all duration-300" />
          <div className="absolute -bottom-[1px] left-6 right-6 h-[1px] rounded-full bg-rose-400/40 group-hover:opacity-80 transition-all duration-300" />

          {/* Subtle ghosted ambient red backlight on hover */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-rose-500/15 via-rose-950/10 to-transparent opacity-40 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-rose-500/25">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_#ef4444] animate-pulse" />
                <TrendingDown className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110 text-rose-400" />
                <span
                  className="text-[9px] uppercase tracking-wider font-extrabold text-rose-300 font-mono"
                  style={{ letterSpacing: '0.12em' }}
                >
                  Bear Case
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                DOWNSIDE
              </span>
            </div>
            <ul className="space-y-2 m-0 p-0 list-none">
              {bearBullets.map((bullet, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-1.5 leading-snug"
                  style={{
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontFamily: 'Hind, sans-serif',
                  }}
                >
                  <span
                    className="select-none shrink-0 text-rose-400 font-bold"
                    style={{ fontSize: '12px', lineHeight: '14px' }}
                  >
                    •
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Panel>
  );
}
