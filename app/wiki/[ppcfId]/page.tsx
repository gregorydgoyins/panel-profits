import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminServerClient } from "@/lib/supabase/admin";
import { getPpcfComic } from "@/lib/ppcf/queries";
import type { StorySummary } from "@/lib/comics/story-summary";
import { FANDOM_HOSTS } from "@/lib/comics/stored-fandom";
import { readSavedStorySummary } from "@/lib/comics/story-summary";
import { storedPrices, type PriceObservation } from "@/lib/sniper/stored-market-evidence";
import { guideHistory, type GuideSnapshot } from "@/lib/sniper/guide-history";
import { LotGuideChart } from "@/components/sniper/LotGuideChart";
import { wikiPlainText } from "@/lib/wiki/article-text";
import { resolveComicCover } from "@/lib/comics/cover-resolver";
import { findCe70Dossier, buildWikiFinancialAnalytics } from "@/lib/wiki/ce70-dossier-lookup";
import { financialSegments } from "@/lib/lexicon/financial-links";
import OptionChainTable from "@/components/detail/equity/OptionChainTable";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function fmtUsd(amount: number | null | undefined, currency = "USD"): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: amount >= 1000 ? 0 : 2,
  });
}

function LinkedFinancialProse({ text }: { text: string }) {
  const parts = financialSegments(text);
  return (
    <>
      {parts.map((part, idx) =>
        part.url ? (
          <Link
            key={idx}
            href={part.url}
            className="text-cyan-300 underline decoration-cyan-500/40 underline-offset-2 hover:text-cyan-200 hover:decoration-cyan-300"
          >
            {part.text}
          </Link>
        ) : (
          <span key={idx}>{part.text}</span>
        ),
      )}
    </>
  );
}

function resolveDisplayCoverUrl(opts: {
  coverStoragePath?: string | null;
  coverUrl?: string | null;
  coverSource?: string | null;
  coverVerifiedAt?: string | null;
  dossierCoverUrl?: string | null;
  publisher?: string | null;
  series?: string | null;
  issueNumber?: string | null;
}): string | null {
  const resolved = resolveComicCover({
    cover_storage_path: opts.coverStoragePath,
    cover_url: opts.coverUrl,
    cover_source: opts.coverSource,
    cover_verified_at: opts.coverVerifiedAt,
    publisher: opts.publisher,
    series: opts.series,
    issue_number: opts.issueNumber,
  });

  const rawUrl = opts.dossierCoverUrl || (!resolved.isFallback && resolved.url ? resolved.url : null);
  if (!rawUrl) return null;

  // Serve Supabase Storage & Google Cloud Storage directly; proxy hotlink-protected external hosts (e.g. wikia/pricecharting)
  if (
    rawUrl.includes("supabase.co/storage") ||
    rawUrl.includes("storage.googleapis.com") ||
    rawUrl.startsWith("/")
  ) {
    return rawUrl;
  }
  return `/api/cover-proxy?url=${encodeURIComponent(rawUrl)}`;
}

function humanSourceSystem(sys: string): string {
  switch (sys.toUpperCase()) {
    case "PANEL_PROFITS":
      return "Panel Profits Trading Ledger";
    case "COMICBASE":
      return "ComicBase Authoritative Catalog";
    case "GCD":
      return "Grand Comics Database (GCD)";
    default:
      return sys.replace(/_/g, " ");
  }
}

export default async function WikiRecordPage({ params }: { params: Promise<{ ppcfId: string }> }) {
  const { ppcfId } = await params;
  const comic = await getPpcfComic(ppcfId);
  if (!comic) redirect("/wiki");

  const year = Number(comic.publication_date?.match(/\b(?:18|19|20)\d{2}\b/)?.[0]) || null;
  const db = createAdminServerClient();
  const standard = !comic.variant_name || /^(direct edition|standard|regular|cover a)$/i.test(comic.variant_name);

  // Match CE70 Constitutional Dossier (all 65 certified seats indexed by ppcfId & gcdIssueId)
  const ce70Dossier = findCe70Dossier({ ppcfId, gcdIssueId: comic.gcd_issue_id });

  const [linksResult, pricesResult, savedStory, censusResult, creatorLinksResult] = await Promise.all([
    db.from("ppcf_source_links").select("source_system,source_record_id,source_role").eq("ppcf_id", ppcfId),
    db
      .from("ppcf_price_observations")
      .select("ppcf_id,source_system,source_record_id,price_field,grade_label,amount,currency,observed_at,source_locator")
      .eq("ppcf_id", ppcfId)
      .order("observed_at", { ascending: false, nullsFirst: false })
      .limit(250),
    readSavedStorySummary({
      series: (comic.series_name || "").replace(/^The /i, ""),
      issueNumber: comic.issue_number || "",
      year,
      publisher: ce70Dossier?.publisher || null,
    }),
    standard && year
      ? db.rpc("sniper_census_batch", {
          p_keys: [{ k: "wiki", title: (comic.series_name || "").replace(/^The /i, ""), issue: comic.issue_number }],
        })
      : Promise.resolve({ data: [], error: null }),
    db.from("ppcf_creator_links").select("creator_name,role").eq("ppcf_id", ppcfId).limit(30),
  ]);

  let story = savedStory;
  const links = linksResult.data || [];
  const rows = (pricesResult.data || []) as PriceObservation[];
  const prices = storedPrices(rows, {
    ppcf_id: ppcfId,
    series_name: comic.series_name || "",
    variant_name: comic.variant_name,
    publication_date: comic.publication_date,
  });

  const ppSourceIds = links.filter((l) => l.source_system === "PANEL_PROFITS").map((l) => l.source_record_id);
  const sourceIds = [
    ...new Set(
      [
        ...ppSourceIds,
        ...rows
          .filter((r) => /pricecharting/i.test(`${r.price_field} ${r.source_locator || ""}`))
          .map((r) => r.source_record_id),
      ].filter((v): v is string => !!v),
    ),
  ];

  const snapshots = sourceIds.length
    ? await db.from("pp_price_history").select("*").in("pp_id", sourceIds).not("snapshot_date", "is", null).order("snapshot_date")
    : null;

  if (!story && sourceIds.length && year) {
    const { data: matches } = await db.from("fandom_pp_match").select("wiki,page_title").in("pp_id", sourceIds).limit(10);
    const urls = [
      ...new Set(
        (matches || []).flatMap((m) => {
          const host = FANDOM_HOSTS[m.wiki.toLowerCase().replace(/[_ -]/g, "")];
          return host ? [`https://${host}/wiki/${encodeURIComponent(m.page_title.replace(/ /g, "_"))}`] : [];
        }),
      ),
    ];
    if (urls.length === 1) {
      const { data: linked } = await db
        .from("issue_story_summaries")
        .select("summary,source,source_url,license")
        .eq("source_url", urls[0])
        .eq("year", year)
        .eq("issue_number", comic.issue_number)
        .maybeSingle();
      if (linked?.summary) {
        try {
          const parsed = JSON.parse(linked.summary);
          if (typeof parsed.text === "string" && parsed.text.trim()) {
            story = {
              ...parsed,
              source: linked.source,
              sourceUrl: linked.source_url,
              license: linked.license,
            } as StorySummary;
          }
        } catch {}
      }
    }
  }

  const guide = sourceIds.flatMap((sourceId) =>
    guideHistory((snapshots?.data || []) as GuideSnapshot[], {
      id: ppcfId,
      panel_profits_data: { "PP Source ID": sourceId },
    }).map((p) => ({ ...p, url: `/wiki/${ppcfId}` })),
  );

  const candidates = (censusResult.data || []).filter((r: { year: number }) => r.year === year);
  const census = candidates.length === 1 ? candidates[0] : null;
  const censusTotal = census ? Number(census.total) : null;

  // Build full quantitative & financial analytics from raw database observations
  const analytics = buildWikiFinancialAnalytics({
    series: comic.series_name || ce70Dossier?.series || "",
    issueNumber: comic.issue_number || ce70Dossier?.issueNumber || "",
    year: year ?? ce70Dossier?.year ?? null,
    observations: rows,
    censusTotal,
  });

  // Resolve direct Trading Detail Page URL (always points to a working /comics/[id] detail terminal!)
  const detailHref = ppSourceIds[0]
    ? `/comics/${encodeURIComponent(ppSourceIds[0])}`
    : ce70Dossier?.detailUrl || `/comics/${encodeURIComponent(ppcfId)}`;

  // Resolve guaranteed working cover URL (Supabase Storage first -> CE70 verified cover -> proxied external)
  const displayCoverUrl = resolveDisplayCoverUrl({
    coverStoragePath: comic.cover_storage_path,
    coverUrl: comic.cover_url,
    coverSource: comic.cover_source,
    coverVerifiedAt: comic.cover_verified_at,
    dossierCoverUrl: ce70Dossier?.coverUrl,
    publisher: ce70Dossier?.publisher,
    series: comic.series_name,
    issueNumber: comic.issue_number,
  });

  const dbCreators = (creatorLinksResult.data || []) as { creator_name?: string; role?: string }[];
  const characters = [
    ...new Map(
      [...(story?.entities?.featuredCharacters || []), ...(story?.entities?.antagonists || [])].map((e) => [e.url, e]),
    ).values(),
  ].slice(0, 10);

  const facts: Array<[string, string]> = [
    ["Series", comic.series_name || ce70Dossier?.series || ""],
    ["Issue", `#${comic.issue_number || ce70Dossier?.issueNumber || "—"}`],
    ["Publication Date", comic.publication_date || (ce70Dossier?.year ? String(ce70Dossier.year) : "")],
    ["Publisher", ce70Dossier?.publisher || ""],
    ["Origin Era", ce70Dossier?.era || ""],
    ["Primary Creators", ce70Dossier?.creators || ""],
    ["CE70 Seat", ce70Dossier ? `Seat #${ce70Dossier.seatNumber} of 70 (RTS ${ce70Dossier.gregoryScore}/200)` : ""],
    ["Original Cover Price", analytics.coverPriceUsd != null ? fmtUsd(analytics.coverPriceUsd) : ""],
    ["Edition", comic.variant_name || "Standard Direct / Newsstand"],
    ["Issue Title", comic.issue_title || ""],
    ["Barcode", comic.barcode || ""],
    ["ISBN", comic.isbn || ""],
    ["Canonical PPCF ID", ppcfId],
    ["GCD Issue ID", comic.gcd_issue_id ? `iss_gcd_${comic.gcd_issue_id}` : ""],
  ].filter((pair): pair is [string, string] => Boolean(pair[1]));

  return (
    <main className="wiki-page">
      <nav className="wiki-breadcrumb">
        <Link href="/wiki">Wiki</Link>
        <span>/</span>
        <Link href="/wiki/issues">Issues &amp; Editions</Link>
        {ce70Dossier && (
          <>
            <span>/</span>
            <Link href="/equity/CE70" className="text-amber-300">
              CE70 Sovereign Index · Seat #{ce70Dossier.seatNumber}
            </Link>
          </>
        )}
      </nav>

      {/* Hero Header + Direct Detail Page & Benchmark Links */}
      <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          {ce70Dossier && (
            <div className="mb-2 inline-flex flex-wrap items-center gap-2 rounded border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-amber-300">
              <span>★ CE70 Sovereign Equity Benchmark · Seat #{ce70Dossier.seatNumber} of 70</span>
              <span className="text-amber-500/60">|</span>
              <span>{ce70Dossier.era}</span>
              <span className="text-amber-500/60">|</span>
              <span>RTS (Room Test Score) {ce70Dossier.gregoryScore} / 200.0</span>
              {ce70Dossier.sunOfEra && (
                <>
                  <span className="text-amber-500/60">|</span>
                  <span className="text-emerald-300 font-bold">SUN OF THE ERA</span>
                </>
              )}
            </div>
          )}
          <h1>
            {comic.series_name} #{comic.issue_number}
          </h1>
          <p className="wiki-lead">
            {ce70Dossier?.publisher ? `${ce70Dossier.publisher} · ` : ""}
            {comic.variant_name || "Canonical Issue Record"}
            {comic.publication_date ? ` · ${comic.publication_date}` : ""}
            {ce70Dossier?.creators ? ` · ${ce70Dossier.creators}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href={detailHref}
            className="inline-flex items-center gap-2 rounded border border-emerald-400/60 bg-emerald-500/15 px-4 py-2 text-xs font-mono font-semibold uppercase tracking-wider text-emerald-200 transition-colors hover:bg-emerald-500/25 hover:text-white"
          >
            Open Live Trading Detail Page ↗
          </Link>
          {ce70Dossier && (
            <Link
              href="/equity/CE70"
              className="inline-flex items-center gap-2 rounded border border-amber-400/50 bg-amber-500/10 px-3.5 py-2 text-xs font-mono font-semibold uppercase tracking-wider text-amber-200 transition-colors hover:bg-amber-500/20"
            >
              CE70 Index Floor ↗
            </Link>
          )}
        </div>
      </div>

      {/* Institutional Financial KPI Strip */}
      <section aria-label="Equity financial summary" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded border border-slate-800 bg-[#0b1019] p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">High-Grade Ref FMV</div>
          <div className="mt-1 font-mono text-lg font-bold text-emerald-300">
            {analytics.highGradeFmv ? fmtUsd(analytics.highGradeFmv.amount) : "—"}
          </div>
          <div className="text-[10px] text-slate-500">
            {analytics.highGradeFmv ? `Grade ${analytics.highGradeFmv.grade} · ${analytics.highGradeFmv.source}` : "Unpriced"}
          </div>
        </div>

        <div className="rounded border border-slate-800 bg-[#0b1019] p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Liquid Center FMV</div>
          <div className="mt-1 font-mono text-lg font-bold text-cyan-300">
            {analytics.liquidCenterFmv ? fmtUsd(analytics.liquidCenterFmv.amount) : "—"}
          </div>
          <div className="text-[10px] text-slate-500">
            {analytics.liquidCenterFmv ? `Grade ${analytics.liquidCenterFmv.grade} anchor` : "No active anchor"}
          </div>
        </div>

        <div className="rounded border border-slate-800 bg-[#0b1019] p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Bid–Ask Spread</div>
          <div className="mt-1 font-mono text-lg font-bold text-amber-300">
            {analytics.averageSpreadPct != null ? `${analytics.averageSpreadPct.toFixed(1)}%` : "—"}
          </div>
          <div className="text-[10px] text-slate-500">Dealer execution spread</div>
        </div>

        <div className="rounded border border-slate-800 bg-[#0b1019] p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Realized Vol (σ)</div>
          <div className="mt-1 font-mono text-lg font-bold text-purple-300">
            {analytics.realizedVolAnnualized != null
              ? `${(analytics.realizedVolAnnualized * 100).toFixed(1)}%`
              : analytics.derived
              ? `${(analytics.derived.sigma * 100).toFixed(1)}%`
              : "—"}
          </div>
          <div className="text-[10px] text-slate-500">
            {analytics.realizedVolAnnualized != null ? "Annualized log-return σ" : "Tier baseline σ"}
          </div>
        </div>

        <div className="rounded border border-slate-800 bg-[#0b1019] p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Multi-Year Return</div>
          <div
            className={`mt-1 font-mono text-lg font-bold ${
              (analytics.multiYearReturnPct ?? 0) >= 0 ? "text-emerald-300" : "text-rose-400"
            }`}
          >
            {analytics.multiYearReturnPct != null
              ? `${analytics.multiYearReturnPct >= 0 ? "+" : ""}${analytics.multiYearReturnPct.toFixed(1)}%`
              : "—"}
          </div>
          <div className="text-[10px] text-slate-500">
            {analytics.annualHistory.length >= 2
              ? `${analytics.annualHistory[0].year}–${analytics.annualHistory[analytics.annualHistory.length - 1].year} ComicBase`
              : "Insufficient series"}
          </div>
        </div>

        <div className="rounded border border-slate-800 bg-[#0b1019] p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">CGC Census Float</div>
          <div className="mt-1 font-mono text-lg font-bold text-slate-100">
            {censusTotal != null ? censusTotal.toLocaleString() : "—"}
          </div>
          <div className="text-[10px] text-slate-500">
            {analytics.derived ? `Liquidity: ${analytics.derived.liquidityState}` : "Universal census"}
          </div>
        </div>
      </section>

      <div className="wiki-rule" />

      <div className="wiki-article-grid">
        <article className="wiki-prose">
          {/* 1. CE70 CONSTITUTIONAL ADJUDICATION & HISTORICAL SIGNIFICANCE */}
          {ce70Dossier && (
            <section id="ce70-dossier">
              <h2>CE70 Constitutional Adjudication — Seat #{ce70Dossier.seatNumber}</h2>
              <div className="mt-3 rounded border border-amber-500/30 bg-amber-950/15 p-4 text-sm leading-relaxed text-amber-100">
                <strong className="block text-[11px] font-mono uppercase tracking-wider text-amber-300">
                  Canonical Historical Role &amp; Selection Rationale
                </strong>
                <p className="mt-1.5">
                  <LinkedFinancialProse text={ce70Dossier.role} />
                </p>
              </div>

              {ce70Dossier.qualityRuler.length > 0 && (
                <div className="mt-5 overflow-x-auto">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-300">
                    Room Test Score (RTS) Quality Ruler Assessment (Composite Score: {ce70Dossier.gregoryScore} / 200.0)
                  </h3>
                  <table className="mt-2 w-full text-left text-sm">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="p-2">Quality Dimension</th>
                        <th className="p-2">Score / 10</th>
                        <th className="p-2">Connoisseurship Rationale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ce70Dossier.qualityRuler.map((q) => (
                        <tr key={q.dimension} className="border-t border-slate-800">
                          <td className="p-2 font-medium text-slate-200">{q.dimension}</td>
                          <td className="p-2 font-mono font-semibold text-emerald-300">{q.score}</td>
                          <td className="p-2 text-slate-300">{q.rationale}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {ce70Dossier.essay && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-300">
                    Comprehensive Critical &amp; Curatorial Monograph
                  </h3>
                  {ce70Dossier.essay.split(/\n\s*\n/).map((para, idx) => (
                    <p key={idx} className="leading-7 text-slate-200">
                      <LinkedFinancialProse text={para} />
                    </p>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 2. VALUATION LADDER, BID-ASK EXECUTION & MULTI-YEAR PRICE HISTORY */}
          <section id="market">
            <h2>Valuation Ladder, Bid–Ask Spread &amp; Market Evidence</h2>
            {guide.length > 0 && (
              <LotGuideChart
                points={guide}
                series={comic.series_name || ""}
                issue={comic.issue_number || ""}
                ticker={ppcfId}
              />
            )}
            <p>
              <LinkedFinancialProse
                text="Every price observation below belongs strictly to this verified edition. Fair Market Value (FMV), dealer Bid–Ask spreads, ComicBase catalog benchmarks, and completed auction liquidity are separated by evidentiary tier."
              />
            </p>

            {/* Clean Bid / FMV / Ask Execution Table (NO raw database column names!) */}
            {analytics.bidAskLadder.length > 0 ? (
              <div className="mt-5 overflow-x-auto">
                <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-300">
                  Grade-by-Grade Execution &amp; Valuation Matrix
                </h3>
                <table className="mt-2 w-full text-left text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="p-2">Condition / Grade</th>
                      <th className="p-2">Dealer Bid</th>
                      <th className="p-2">Fair Market Value (FMV)</th>
                      <th className="p-2">Dealer Ask</th>
                      <th className="p-2">Bid–Ask Spread</th>
                      <th className="p-2">Authority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.bidAskLadder.map((rung) => (
                      <tr key={rung.grade} className="border-t border-slate-800">
                        <td className="p-2 font-mono font-semibold text-slate-100">
                          {rung.grade === "RAW" ? "Raw / Ungraded" : `CGC ${rung.grade}`}
                        </td>
                        <td className="p-2 font-mono text-slate-300">{fmtUsd(rung.bid)}</td>
                        <td className="p-2 font-mono font-bold text-emerald-300">{fmtUsd(rung.fmv)}</td>
                        <td className="p-2 font-mono text-slate-300">{fmtUsd(rung.ask)}</td>
                        <td className="p-2 font-mono text-amber-300">
                          {rung.spreadPct != null ? `${rung.spreadPct.toFixed(1)}% (${fmtUsd(rung.spreadUsd)})` : "—"}
                        </td>
                        <td className="p-2 text-xs text-slate-400">{rung.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : prices.length > 0 ? (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="p-2">Grade</th>
                      <th className="p-2">Fair Market Value</th>
                      <th className="p-2">Evidence Authority</th>
                      <th className="p-2">Observation Basis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prices.map((p, i) => (
                      <tr key={i} className="border-t border-slate-800">
                        <td className="p-2 font-mono">{p.grade === "RAW" ? "Raw / Ungraded" : `CGC ${p.grade}`}</td>
                        <td className="p-2 whitespace-nowrap font-mono font-semibold text-emerald-300">
                          {fmtUsd(p.amount, p.currency)}
                        </td>
                        <td className="p-2">
                          {p.source}
                          <span className="block text-xs text-slate-500">
                            {p.kind === "catalog" ? "Authoritative Catalog Reference" : "Valuation Guide Estimate"}
                          </span>
                        </td>
                        <td className="p-2 text-xs text-slate-400">{p.observedAt?.slice(0, 10) || "Catalog Baseline"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-slate-400">No matched price observations are attached to this edition yet.</p>
            )}

            {/* Multi-Year Annual Valuation History (ComicBase 2021-2024) */}
            {analytics.annualHistory.length > 0 && (
              <div className="mt-6 overflow-x-auto">
                <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-300">
                  Historical Multi-Year Valuation Trajectory (ComicBase Annual Benchmarks)
                </h3>
                <table className="mt-2 w-full text-left text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="p-2">Year</th>
                      <th className="p-2">Reference Grade</th>
                      <th className="p-2">Catalog Value</th>
                      <th className="p-2">YoY Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.annualHistory.map((pt) => (
                      <tr key={pt.year} className="border-t border-slate-800">
                        <td className="p-2 font-mono text-slate-200">{pt.year}</td>
                        <td className="p-2 font-mono text-slate-300">
                          {pt.grade === "RAW" ? "Raw" : `Near Mint (${pt.grade})`}
                        </td>
                        <td className="p-2 font-mono font-semibold text-slate-100">{fmtUsd(pt.amount)}</td>
                        <td
                          className={`p-2 font-mono ${
                            pt.yoyPct == null
                              ? "text-slate-500"
                              : pt.yoyPct >= 0
                              ? "text-emerald-300"
                              : "text-rose-400"
                          }`}
                        >
                          {pt.yoyPct == null ? "Baseline" : `${pt.yoyPct >= 0 ? "+" : ""}${pt.yoyPct.toFixed(1)}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {pricesResult.error && <p className="wiki-error">The pricing evidence could not be read.</p>}
          </section>

          {/* 3. DERIVED CROSS-ASSET INSTRUMENTS ANCHORED TO THIS ATOMIC EQUITY */}
          {analytics.derived && (
            <section id="derivatives">
              <h2>Derived Cross-Asset Instruments (Rule #1 Equity Linkage)</h2>
              <p>
                <LinkedFinancialProse
                  text={`Under Panel Profits Rule #1, this comic is an atomic equity (${analytics.derived.anchorGrade} anchor at ${fmtUsd(analytics.derived.anchorPrice)}, realized/tier volatility σ = ${(analytics.derived.sigma * 100).toFixed(1)}%, liquidity state ${analytics.derived.liquidityState}). All options, futures, institutional notes, and vault tokens below derive their pricing mathematically from this underlying equity and live news volatility.`}
                />
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {analytics.derived.frontCall && (
                  <div className="rounded border border-emerald-500/30 bg-[#091311] p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300">
                        3rd-Friday Monthly Call Option
                      </span>
                      <span className="font-mono text-xs text-slate-300">{analytics.derived.frontCall.optionSymbol}</span>
                    </div>
                    <div className="mt-2 font-mono text-xl font-bold text-white">
                      {fmtUsd(analytics.derived.frontCall.premium)}
                      <span className="ml-2 text-xs font-normal text-slate-400">/ 1-copy contract</span>
                    </div>
                    <div className="mt-1.5 text-xs text-slate-300">
                      Strike {fmtUsd(analytics.derived.frontCall.strike)} · Exp {analytics.derived.frontCall.expiryDate} (3rd Friday ·{" "}
                      {analytics.derived.frontCall.expiryDays}d / {analytics.derived.frontCall.turnsToExpiry} turns)
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-slate-400">
                      Intrinsic {fmtUsd(analytics.derived.frontCall.intrinsicValue)} + Time Value{" "}
                      {fmtUsd(analytics.derived.frontCall.timeValue)} · IV {(analytics.derived.frontCall.iv * 100).toFixed(1)}% ·
                      Δ {analytics.derived.frontCall.delta.toFixed(2)}
                    </div>
                  </div>
                )}

                {analytics.derived.frontPut && (
                  <div className="rounded border border-rose-500/30 bg-[#140a0e] p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-rose-300">
                        3rd-Friday Monthly Put Option
                      </span>
                      <span className="font-mono text-xs text-slate-300">{analytics.derived.frontPut.optionSymbol}</span>
                    </div>
                    <div className="mt-2 font-mono text-xl font-bold text-white">
                      {fmtUsd(analytics.derived.frontPut.premium)}
                      <span className="ml-2 text-xs font-normal text-slate-400">/ 1-copy contract</span>
                    </div>
                    <div className="mt-1.5 text-xs text-slate-300">
                      Strike {fmtUsd(analytics.derived.frontPut.strike)} · Exp {analytics.derived.frontPut.expiryDate} (3rd Friday ·{" "}
                      {analytics.derived.frontPut.expiryDays}d / {analytics.derived.frontPut.turnsToExpiry} turns)
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-slate-400">
                      Intrinsic {fmtUsd(analytics.derived.frontPut.intrinsicValue)} + Time Value{" "}
                      {fmtUsd(analytics.derived.frontPut.timeValue)} · IV {(analytics.derived.frontPut.iv * 100).toFixed(1)}% ·
                      Δ {analytics.derived.frontPut.delta.toFixed(2)}
                    </div>
                  </div>
                )}

                <div className="rounded border border-amber-500/30 bg-[#130f08] p-3.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300">
                    6-Month Cost-of-Carry Future
                  </div>
                  <div className="mt-2 font-mono text-xl font-bold text-white">{fmtUsd(analytics.derived.future6M)}</div>
                  <div className="mt-1 font-mono text-[11px] text-slate-400">
                    Basis {analytics.derived.futureBasis >= 0 ? "+" : ""}
                    {fmtUsd(analytics.derived.futureBasis)} ({analytics.derived.futureBasis >= 0 ? "Contango" : "Backwardation"}) ·
                    F₀ = S₀ · e^((r + u − y)T)
                  </div>
                </div>

                <div className="rounded border border-purple-500/30 bg-[#100b18] p-3.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-purple-300">
                    {analytics.derived.institutionalBond5Y ? "5Y Institutional Note & Vault Claim" : "Tokenized Vault Claim (NFT)"}
                  </div>
                  <div className="mt-2 font-mono text-xl font-bold text-white">
                    {analytics.derived.institutionalBond5Y
                      ? fmtUsd(analytics.derived.institutionalBond5Y.price)
                      : fmtUsd(analytics.derived.vaultNftPrice)}
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-slate-400">
                    {analytics.derived.institutionalBond5Y
                      ? `Coupon ${(analytics.derived.institutionalBond5Y.coupon * 100).toFixed(2)}% · Yield ${(analytics.derived.institutionalBond5Y.yReq * 100).toFixed(2)}% · Vault Token ${fmtUsd(analytics.derived.vaultNftPrice)}`
                      : `P_NFT = S · λ_provenance · λ_liquidity (${analytics.derived.liquidityState})`}
                  </div>
                </div>
              </div>

              {analytics.derived.optionChain && (
                <OptionChainTable
                  chain={analytics.derived.optionChain}
                  title={`${comic.series_name} #${comic.issue_number} (${analytics.derived.optionChain.underlyingRoot}) — Monthlies, Quarterlies & LEAPS`}
                />
              )}

              <div className="wiki-pills mt-4">
                <Link href={detailHref}>Trade &amp; Inspect Full Detail Terminal ↗</Link>
                <Link href="/assets">Explore All 16 Asset Families</Link>
                <Link href="/wiki/terms">Financial Terminology Dictionary</Link>
                <Link href="/sniper">Run Comp Analysis in Sniper ↗</Link>
              </div>
            </section>
          )}

          {/* 4. FINANCIAL RESEARCH & MARKET MICROSTRUCTURE */}
          <section id="financial">
            <h2>Reading This Edition’s Financial Microstructure</h2>
            <p>
              <LinkedFinancialProse
                text="Compare the exact cover, printing, census float, and certified grade before establishing a bid or underwriting acquisition cost. A raw guide valuation or higher-grade FMV never establishes a lower-grade slab price; account for auction fees, liquidity haircut, bid–ask spread, and completed-sale depth when modeling exit proceeds."
              />
            </p>
            {prices.length > 0 && (
              <p>
                This edition currently carries {prices.filter((p) => p.kind === "guide").length} valuation guide observations,{" "}
                {prices.filter((p) => p.kind === "catalog").length} catalog references, and{" "}
                {analytics.bidAskLadder.filter((r) => r.bid != null && r.ask != null).length} active dealer bid–ask spread pairs.
                {analytics.topPricePaidUsd != null && (
                  <> Historical recorded top price paid in catalog archives: {fmtUsd(analytics.topPricePaidUsd)}.</>
                )}
              </p>
            )}
          </section>

          {/* 5. GRADED POPULATION & CENSUS DISTRIBUTION */}
          <section id="population">
            <h2>Graded Census Population &amp; Scarcity</h2>
            {census ? (
              <>
                <p>
                  <LinkedFinancialProse
                    text={`CGC records ${Number(census.total).toLocaleString()} certified graded copies for ${census.title} #${census.issue_number} (${census.year}). Certified census population measures surviving graded supply and circulating float rather than original newsstand print run.`}
                  />
                </p>
                <div className="wiki-pills">
                  {Object.entries(census.pop || {})
                    .filter(([g, n]) => /^\d+_\d+$/.test(g) && Number(n) > 0)
                    .map(([g, n]) => (
                      <span key={g} className="border border-slate-700 px-2 py-1 font-mono text-xs">
                        CGC {g.replace("_", ".")} · {String(n)}
                      </span>
                    ))}
                </div>
              </>
            ) : (
              <p>
                No unambiguous single-edition CGC census snapshot is attached to this exact publication year yet. Census scarcity
                updates automatically as certified population audits reconcile.
              </p>
            )}
          </section>

          {/* 6. STORY SYNOPSIS & NARRATIVE CONTEXT */}
          <section id="story">
            <h2>{story?.storyTitle || "Narrative Synopsis & Issue Content"}</h2>
            {story ? (
              wikiPlainText(story.text)
                .split(/\n\s*\n/)
                .map((p, i) => (
                  <p key={i}>
                    <LinkedFinancialProse text={p} />
                  </p>
                ))
            ) : ce70Dossier ? (
              <p>
                <LinkedFinancialProse text={ce70Dossier.role} />
              </p>
            ) : (
              <p>No saved issue-specific synopsis is linked to this record and publication year yet.</p>
            )}
            {characters.length > 0 && (
              <div className="wiki-pills mt-5">
                {characters.map((e) => (
                  <Link href={e.url} key={e.url}>
                    {e.label}
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* 7. CREATIVE CREDITS */}
          {(story?.credits || dbCreators.length > 0 || ce70Dossier?.creators) && (
            <section id="credits">
              <h2>Creative Credits &amp; Auteur Attribution</h2>
              {ce70Dossier?.creators && (
                <p>
                  <strong>Primary Constitutional Creators:</strong> {ce70Dossier.creators}
                </p>
              )}
              {story?.credits &&
                [
                  ["Writers", story.credits.writers],
                  ["Interior Art", story.credits.pencilers],
                  ["Color", story.credits.colorists],
                  ["Cover Art", story.credits.coverArtists],
                ].map(([name, names]) =>
                  Array.isArray(names) && names.length > 0 ? (
                    <p key={String(name)}>
                      <strong>{String(name)}:</strong> {names.join(", ")}
                    </p>
                  ) : null,
                )}
              {dbCreators.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {dbCreators.map((c, idx) =>
                    c.creator_name ? (
                      <span key={idx} className="rounded border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-200">
                        {c.creator_name}
                        {c.role ? <span className="ml-1 text-slate-400">({c.role})</span> : null}
                      </span>
                    ) : null,
                  )}
                </div>
              )}
            </section>
          )}

          {/* 8. SOURCE RECORDS & PROVENANCE */}
          <section id="sources">
            <h2>Authoritative Source Crosswalks &amp; Provenance</h2>
            <p>Panel Profits maintains auditable cryptographic and relational provenance linking every edition across primary archives.</p>
            {links.map((l) => (
              <p key={`${l.source_system}-${l.source_record_id}`}>
                <strong>{humanSourceSystem(l.source_system)}:</strong>{" "}
                {l.source_system === "PANEL_PROFITS" ? (
                  <Link href={`/comics/${encodeURIComponent(l.source_record_id)}`} className="text-emerald-300 underline">
                    Record #{l.source_record_id} (Open Trading Detail Page ↗)
                  </Link>
                ) : (
                  <span className="font-mono text-slate-300">{l.source_record_id}</span>
                )}
              </p>
            ))}
            {story && (
              <details className="mt-3">
                <summary>Original story text reference and license</summary>
                <a href={story.sourceUrl} target="_blank" rel="noopener noreferrer">
                  Original text reference ↗
                </a>
                <p>{story.license}</p>
              </details>
            )}
          </section>
        </article>

        {/* Right Sidebar Infobox + Navigation */}
        <aside>
          <div className="wiki-infobox">
            <h2>Issue &amp; Edition</h2>
            {displayCoverUrl ? (
              <img
                className="wiki-cover"
                src={displayCoverUrl}
                alt={`${comic.series_name} #${comic.issue_number} cover`}
              />
            ) : (
              <div className="flex aspect-[2/3] w-full items-center justify-center rounded border border-slate-800 bg-slate-950 p-4 text-center text-xs text-slate-500">
                Archival cover scan pending verification
              </div>
            )}

            <div className="mt-3 flex flex-col gap-2">
              <Link
                href={detailHref}
                className="block w-full rounded border border-emerald-400/60 bg-emerald-500/15 px-3 py-2 text-center text-xs font-mono font-semibold uppercase tracking-wider text-emerald-200 transition-colors hover:bg-emerald-500/25 hover:text-white"
              >
                Open Trading Detail Page ↗
              </Link>
              {ce70Dossier && (
                <Link
                  href="/equity/CE70"
                  className="block w-full rounded border border-amber-400/50 bg-amber-500/10 px-3 py-2 text-center text-xs font-mono font-semibold uppercase tracking-wider text-amber-200 transition-colors hover:bg-amber-500/20"
                >
                  CE70 Seat #{ce70Dossier.seatNumber} Benchmark ↗
                </Link>
              )}
            </div>

            <dl className="mt-4">
              {facts.map(([name, value]) => (
                <div key={name}>
                  <dt>{name}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <nav className="wiki-toc" aria-label="Article contents">
            <h2>On this page</h2>
            {ce70Dossier && <a href="#ce70-dossier">CE70 Adjudication</a>}
            <a href="#market">Valuation &amp; Bid–Ask</a>
            {analytics.derived && <a href="#derivatives">Derived Cross-Assets</a>}
            <a href="#financial">Market Microstructure</a>
            <a href="#population">Graded Population</a>
            <a href="#story">Narrative Synopsis</a>
            {(story?.credits || dbCreators.length > 0 || ce70Dossier?.creators) && <a href="#credits">Creative Credits</a>}
            <a href="#sources">Source Provenance</a>
          </nav>
        </aside>
      </div>
    </main>
  );
}
