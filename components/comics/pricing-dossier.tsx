import type { ComicRecord } from "@/lib/comics/types";
import {
  cbcsGrades,
  cgcGrades,
  comicBaseGrades,
  comicBaseReference,
  ebayGrades,
  getHighestGradedPrice,
  goCollectCgcGrades,
  goCollectCbcsGrades,
  goCollectPsaGrades,
  GRADES,
  type Grade,
  panelProfitsGrades,
  panelProfitsSpreads,
  panelProfitsDelta,
  panelProfitsVolume,
  panelProfitsListings,
  priceChartingGrades,
  psaGrades,
} from "@/lib/pricing/source-ladder";
import { formatCurrency } from "@/lib/utils";
import { getCleanPricingEvidence } from "@/lib/pricing/clean";
import { ArrowDownRight, ArrowUpRight, ShieldCheck, Database } from "lucide-react";
import { EvidenceRegistryTable, type EvidenceRowData } from "./evidence-registry-table";

const PRIMARY_EXCHANGE_GRADES: Array<{
  grade: Grade;
  label: string;
  sublabel: string;
}> = [
  { grade: "RAW", label: "Ungraded", sublabel: "Loose / Raw" },
  { grade: "4.0", label: "4.0 / VG", sublabel: "Very Good" },
  { grade: "6.0", label: "6.0 / Fine", sublabel: "Fine" },
  { grade: "8.0", label: "8.0 / VF", sublabel: "Very Fine" },
  { grade: "9.2", label: "9.2 / NM-", sublabel: "Near Mint -" },
  { grade: "9.8", label: "9.8", sublabel: "Near Mint / Mint" },
];

export async function PricingDossier({ comic }: { comic: ComicRecord }) {
  // Books keyed to a PriceCharting id (pp_source_id) are priced ONLY from the current verified
  // pp_series_rows_full row (already on comic.panel_profits_data). Older observation snapshots are
  // never blended in: they carry grades (1.8, 3.0, 9.6 ...) and prices the current data does not have.
  const cleanEvidence = comic.pp_source_id
    ? { grades: {} as Record<string, number>, sources: new Set<string>(), observationCount: 0 }
    : await getCleanPricingEvidence(comic.id, comic.pp_source_id);
  const ppCurrent = panelProfitsGrades(comic);
  const pp = {
    ...cleanEvidence.grades,
    ...ppCurrent,
  };
  const pcGrades = priceChartingGrades(comic);
  const ebayLadder = ebayGrades(comic);
  const cbGrades = comicBaseGrades(comic);
  const cb = comicBaseReference(comic);
  const gcCgcGrades = goCollectCgcGrades(comic);
  const gcCbcsGrades = goCollectCbcsGrades(comic);
  const gcPsaGrades = goCollectPsaGrades(comic);
  const cgcGpaGrades = cgcGrades(comic);
  const cbcsLadder = cbcsGrades(comic);
  const psaLadder = psaGrades(comic);

  const rawCoverPrice =
    (comic.panel_profits_data as any)?.coverPrice ??
    (comic.panel_profits_data as any)?.cover_price ??
    (comic.comicbase_data as any)?.["CB - Cover Price"] ??
    (comic.gcd_data as any)?.["GCD - gcd_issue.price"] ??
    (comic as any).cover_price;
  const coverPrice = rawCoverPrice != null ? Number(String(rawCoverPrice).replace(/[^0-9.]/g, "")) : null;

  const highest = getHighestGradedPrice({
    "Panel Profits": pp,
    "PriceCharting": pcGrades,
    "GoCollect - CGC": gcCgcGrades,
    "GoCollect - CBCS": gcCbcsGrades,
    "GoCollect - PSA": gcPsaGrades,
    "CGC · GPA sales": cgcGpaGrades,
    "CBCS": cbcsLadder,
    "PSA": psaLadder,
    "eBay Sold Transactions": ebayLadder,
    "ComicBase": cbGrades,
  });

  // Build candidate rows and evaluate all 26 grades
  const buildRowValues = (
    evaluator: (grade: Grade) => { display: string; colorClass?: string }
  ): Record<Grade, { display: string; colorClass?: string }> => {
    const res: Record<string, { display: string; colorClass?: string }> = {};
    for (const g of GRADES) {
      res[g] = evaluator(g);
    }
    return res as Record<Grade, { display: string; colorClass?: string }>;
  };

  const allCandidateRows: Array<EvidenceRowData & { alwaysShow?: boolean }> = [
    // 1. PANEL PROFITS SUITE (FMV, BUY, SELL, VOLUME, LISTINGS)
    {
      id: "pp-fmv",
      source: "Panel Profits",
      badge: "Exchange FMV",
      badgeClass: "text-emerald-400/90",
      alwaysShow: true,
      values: buildRowValues((grade: Grade) => {
        const p = pp[grade] ?? pcGrades[grade] ?? null;
        return {
          display: p ? formatCurrency(p) : "—",
          colorClass: p
            ? grade === "9.8"
              ? "text-cyan-300 font-bold"
              : grade === "RAW"
              ? "text-amber-300 font-bold"
              : "text-emerald-300 font-medium"
            : "text-slate-600",
        };
      }),
    },
    {
      id: "pp-buy",
      source: "Panel Profits",
      badge: "Bid (Buy Price)",
      badgeClass: "text-blue-400/90",
      alwaysShow: false,
      values: buildRowValues((grade: Grade) => {
        const fallbackPrice = pp[grade] ?? pcGrades[grade] ?? null;
        const s = panelProfitsSpreads(comic, grade, fallbackPrice);
        return {
          display: s.buy ? formatCurrency(s.buy) : "—",
          colorClass: s.buy ? "text-blue-400 font-medium" : "text-slate-600",
        };
      }),
    },
    {
      id: "pp-sell",
      source: "Panel Profits",
      badge: "Ask (Sell Price)",
      badgeClass: "text-emerald-400/90",
      alwaysShow: false,
      values: buildRowValues((grade: Grade) => {
        const fallbackPrice = pp[grade] ?? pcGrades[grade] ?? null;
        const s = panelProfitsSpreads(comic, grade, fallbackPrice);
        return {
          display: s.sell ? formatCurrency(s.sell) : "—",
          colorClass: s.sell ? "text-emerald-400 font-medium" : "text-slate-600",
        };
      }),
    },
    {
      id: "pp-volume",
      source: "Panel Profits",
      badge: "Annual Volume",
      badgeClass: "text-cyan-400/90",
      alwaysShow: false,
      values: buildRowValues((grade: Grade) => {
        const v = panelProfitsVolume(comic, grade);
        return {
          display: v || "—",
          colorClass: v ? "text-cyan-300 font-mono text-[11px]" : "text-slate-600",
        };
      }),
    },
    {
      id: "pp-listings",
      source: "Panel Profits",
      badge: "Realized Listings",
      badgeClass: "text-amber-400/90",
      alwaysShow: false,
      values: buildRowValues((grade: Grade) => {
        const l = panelProfitsListings(comic, grade);
        return {
          display: l != null ? `${l} sold` : "—",
          colorClass: l != null && l > 0 ? "text-amber-300 font-mono" : "text-slate-600",
        };
      }),
    },

    // 2. EXCHANGE BENCHMARK SECONDARY MARKET EVIDENCE
    {
      id: "pricecharting",
      source: "Exchange Benchmark Index",
      badge: "Continuous Secondary Clearing",
      badgeClass: "text-sky-400/90",
      alwaysShow: false,
      values: buildRowValues((grade: Grade) => {
        const p = pcGrades[grade];
        return {
          display: p ? formatCurrency(p) : "—",
          colorClass: p
            ? grade === "9.8"
              ? "text-cyan-300 font-bold"
              : grade === "RAW"
              ? "text-amber-300 font-bold"
              : "text-sky-300 font-medium"
            : "text-slate-600",
        };
      }),
    },

    // 3. COMICBASE 1.1M CATALOG REFERENCE
    {
      id: "comicbase",
      source: "ComicBase",
      badge: "Catalog Guide Price",
      badgeClass: "text-amber-400/90",
      alwaysShow: false,
      values: buildRowValues((grade: Grade) => {
        const p = cbGrades[grade] ?? (grade === "9.2" || grade === "RAW" ? cb : null);
        return {
          display: p ? formatCurrency(p) : "—",
          colorClass: p ? "text-amber-300 font-medium" : "text-slate-600",
        };
      }),
    },

    // 4. CGC · GPA SALES (CERTIFIED SLABS)
    {
      id: "cgc-fmv",
      source: "CGC · GPA sales",
      badge: "Certified Slabs (Realized FMV)",
      badgeClass: "text-purple-400/90",
      isGradedOnly: true,
      alwaysShow: false,
      values: buildRowValues((grade: Grade) => {
        const p = cgcGpaGrades[grade];
        return {
          display: p ? formatCurrency(p) : "—",
          colorClass: p ? "text-purple-300 font-medium" : "text-slate-600",
        };
      }),
    },

    // 5. EBAY SOLD TRANSACTIONS
    {
      id: "ebay",
      source: "eBay Sold Transactions",
      badge: "Realized Sales",
      badgeClass: "text-yellow-400/80",
      alwaysShow: false,
      values: buildRowValues((grade: Grade) => {
        const p = ebayLadder[grade];
        return {
          display: p ? formatCurrency(p) : "—",
          colorClass: p ? "text-yellow-300 font-medium" : "text-slate-600",
        };
      }),
    },

    // 6. GOCOLLECT - CGC
    {
      id: "gc-cgc",
      source: "GoCollect - CGC",
      badge: "CGC Census FMV",
      badgeClass: "text-blue-400/80",
      isGradedOnly: true,
      alwaysShow: false,
      values: buildRowValues((grade: Grade) => {
        const p = gcCgcGrades[grade];
        return {
          display: p ? formatCurrency(p) : "—",
          colorClass: p ? "text-blue-300 font-medium" : "text-slate-600",
        };
      }),
    },

    // 7. CBCS CERTIFIED OBSERVATIONS
    {
      id: "cbcs",
      source: "CBCS",
      badge: "CBCS Certified Only",
      badgeClass: "text-indigo-400/80",
      isGradedOnly: true,
      alwaysShow: false,
      values: buildRowValues((grade: Grade) => {
        const p = cbcsLadder[grade] ?? gcCbcsGrades[grade];
        return {
          display: p ? formatCurrency(p) : "—",
          colorClass: p ? "text-indigo-300 font-medium" : "text-slate-600",
        };
      }),
    },

    // 8. PSA CERTIFIED OBSERVATIONS
    {
      id: "psa",
      source: "PSA",
      badge: "PSA Certified Only",
      badgeClass: "text-red-400/80",
      isGradedOnly: true,
      alwaysShow: false,
      values: buildRowValues((grade: Grade) => {
        const p = psaLadder[grade] ?? gcPsaGrades[grade];
        return {
          display: p ? formatCurrency(p) : "—",
          colorClass: p ? "text-red-300 font-medium" : "text-slate-600",
        };
      }),
    },
  ];

  // Dynamic Filtering: Render rows that have at least 1 verified data point for this comic.
  const activeRows: EvidenceRowData[] = allCandidateRows.filter((row) => {
    if (row.alwaysShow) return true;
    return GRADES.some((grade) => {
      const cell = row.values[grade];
      return cell && cell.display !== "—";
    });
  });

  const unrecordedAuthorities = [
    { name: "Exchange Benchmark Index", count: Object.keys(pcGrades).length },
    { name: "ComicBase", count: Object.keys(cbGrades).length + (cb ? 1 : 0) },
    { name: "CGC · GPA", count: Object.keys(cgcGpaGrades).length },
    { name: "CBCS", count: Object.keys(cbcsLadder).length + Object.keys(gcCbcsGrades).length },
    { name: "PSA", count: Object.keys(psaLadder).length + Object.keys(gcPsaGrades).length },
    { name: "eBay Sold", count: Object.keys(ebayLadder).length },
    { name: "GoCollect", count: Object.keys(gcCgcGrades).length },
  ].filter((a) => a.count === 0);

  return (
    <section aria-labelledby="pricing-heading" className="rounded-xl border border-slate-700 bg-[#111319] p-4 sm:p-6 shadow-lg space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-700 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="pricing-heading" className="text-lg font-semibold text-slate-100">
              Price Evidence & Market Order Book by Grade Tier
            </h2>
            <span className="inline-flex items-center gap-1 rounded bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              VERIFIED EVIDENCE ENGINE
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Recorded price evidence by source and grade tier. Ungraded / RAW pricing represents loose physical copies; certified grading authorities record authenticated slabbed grades only. Unpriced grades remain unpriced.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono">
            {GRADES.length} grade tiers · Multi-source market ladder
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/50 rounded px-2 py-0.5">
            <Database className="h-3 w-3" />
            {activeRows.length} Active Authority Streams
          </span>
        </div>
      </div>

      {/* 6-Grade Market Order Book Shelf */}
      <div>
        <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 mb-2.5 flex items-center justify-between">
          <span>Continuous Market Execution Ladder</span>
          <span className="text-[10px] text-slate-500 lowercase">bid/ask depth</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {PRIMARY_EXCHANGE_GRADES.filter(({ grade }) => {
            const pr = pp[grade] ?? pcGrades[grade] ?? null;
            return pr !== null && pr > 0;
          }).map(({ grade, label, sublabel }) => {
            const price = pp[grade] ?? pcGrades[grade] ?? null;
            const spreads = panelProfitsSpreads(comic, grade, price);
            const delta = panelProfitsDelta(comic, grade);
            const volume = panelProfitsVolume(comic, grade);
            const isPriced = price !== null && price > 0;
            const hasSpread = spreads.buy !== null && spreads.sell !== null && spreads.sell >= spreads.buy;

            return (
              <div
                key={grade}
                className={`rounded-lg border p-3 flex flex-col justify-between transition-colors ${
                  isPriced
                    ? "border-slate-800 bg-[#0C1626] hover:border-cyan-500/50"
                    : "border-slate-900 bg-[#0A0D14] opacity-70"
                }`}
              >
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-slate-200">{label}</span>
                    <span className="text-[9px] text-slate-500 font-mono">{grade}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                    <span>{sublabel}</span>
                    {volume && (
                      <span className="text-[9px] font-mono text-cyan-400/90 truncate max-w-[95px]" title={volume}>
                        {volume}
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between gap-1">
                    <div className="text-base sm:text-lg font-bold tabular-nums tracking-tight">
                      {isPriced ? (
                        <span className={grade === "9.8" ? "text-cyan-300" : grade === "RAW" ? "text-amber-300" : "text-emerald-300"}>
                          {formatCurrency(price)}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-sm">Unpriced</span>
                      )}
                    </div>
                    {delta !== null && delta !== undefined && (
                      <span
                        className={`inline-flex items-center text-[10px] font-mono font-medium ${
                          delta >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {delta >= 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                        {delta >= 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Execution Spreads (Bid/Ask) - only when the verified data has them */}
                {hasSpread && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] font-mono">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-blue-400/90" title="Exchange Institutional Bid">
                        Bid: {formatCurrency(spreads.buy!)}
                      </span>
                      <span className="text-emerald-400/90" title="Exchange Institutional Ask">
                        Ask: {formatCurrency(spreads.sell!)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cross-Authority Evidence Registry (Full Complete Ladder with View Controls) */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400">
              Cross-Authority Evidence Registry
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              · Full Continuous Multi-Tier Matrix
            </span>
          </div>
        </div>

        {/* Interactive Evidence Registry Table */}
        <EvidenceRegistryTable
          rows={activeRows}
          unrecordedAuthorities={unrecordedAuthorities}
        />
      </div>

      {/* Summary Footer Cards */}
      <div className="grid gap-3 text-sm grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-[#0C1626] p-3.5">
          <div className="text-[10px] font-mono font-medium uppercase tracking-wider text-cyan-300">
            Highest Graded Market Price
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-lg font-semibold text-slate-100">
              {highest ? formatCurrency(highest.price) : "Unpriced"}
            </span>
            {highest && (
              <span className="text-[11px] font-mono font-medium text-cyan-400">
                ({highest.isRaw ? "RAW Ungraded" : `Grade ${highest.grade}`})
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Highest verified price observed. Non-9.8 books never receive a 9.8 price or synthetic valuation.
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#0C1626] p-3.5">
          <div className="text-[10px] font-mono font-medium uppercase tracking-wider text-cyan-300">
            ComicBase Reference Guide
          </div>
          <div className="mt-1.5 text-lg font-semibold text-slate-100">{cb === null ? "—" : formatCurrency(cb)}</div>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            ComicBase catalog guide reference valuation. Evaluated independently from newsstand cover prices and certified slabs.
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#0C1626] p-3.5">
          <div className="text-[10px] font-mono font-medium uppercase tracking-wider text-cyan-300">
            Original Stamped Cover Price
          </div>
          <div className="mt-1.5 text-lg font-semibold text-amber-300">
            {coverPrice != null && coverPrice > 0 ? formatCurrency(coverPrice) : "—"}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Historical cover price stamped on physical newsstand or direct copies at initial publication.
          </p>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3.5 text-xs text-slate-300">
          <strong className="block text-slate-100 uppercase tracking-wide text-[10px] font-mono">Translation Layer & Strict Isolation</strong>
          <p className="mt-1.5 leading-relaxed text-slate-400">
            Panel Profits decodes auction transaction feeds into sovereign econometric market valuations and bid-ask spreads. CGC, CBCS, and PSA never carry RAW prices.
          </p>
        </div>
      </div>
    </section>
  );
}
