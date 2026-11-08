import Link from "next/link";
import Image from "next/image";
import { BookOpen, Search, Sparkles, TrendingUp, ShieldCheck, ArrowRight, Layers } from "lucide-react";
import { searchVerifiedEquitiesLive } from "@/lib/equity/verified-equities-live";
import { searchPpcfComics } from "@/lib/ppcf/queries";
import { PpcfCard } from "@/components/ppcf/ppcf-card";
import { Badge } from "@/components/ui/badge";

export const revalidate = 120;

interface ComicsPageProps {
  searchParams: Promise<{
    q?: string;
    view?: string;
    era?: string;
  }>;
}

export default async function ComicsPage({ searchParams }: ComicsPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() || "";
  const currentView = params.view === "cbr" || params.view === "ppedia" ? "cbr" : "issues";
  const selectedEra = params.era?.toLowerCase();

  // 1. Fetch verified market issues from Supabase verified_equities
  const verifiedComics = await searchVerifiedEquitiesLive(query, 48, selectedEra);

  // 2. Fetch PPCF records when in archival mode or searching
  const ppcfComics = currentView === "cbr" ? await searchPpcfComics(query, 48) : [];

  const totalResults = currentView === "cbr" ? ppcfComics.length : verifiedComics.length;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10 space-y-8">
      {/* Header & Catalog Hero */}
      <header className="border-b border-cyan-500/40 pb-7 shadow-[0_4px_22px_rgba(6,182,212,0.1)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-cyan-400 font-mono">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              <span>CBR · COMIC BOOK REFERENCE &amp; INVESTOPEDIA™ MARKET AUTHORITY</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl">
              CBR (Comic Book Reference) &amp; Investopedia™ Master Catalog
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-400">
              Search across 38,957 verified canonical comic issues with authenticated cover art, cleared secondary market transactions, and complete CBR Connoisseur Dossiers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/market"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-xs text-slate-200 transition-colors font-mono"
            >
              <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
              <span>Markets Floor</span>
            </Link>
            <Link
              href="/lexicon"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/50 text-xs text-cyan-300 transition-colors font-mono"
            >
              <BookOpen className="h-3.5 w-3.5 text-cyan-400" />
              <span>CBR Market Lexicon</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Search Bar & Mode Selector */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <form role="search" className="flex-1 max-w-2xl flex items-center gap-2 border border-slate-800 bg-[#0b0f15] p-2 focus-within:border-cyan-400/80 focus-within:ring-1 focus-within:ring-cyan-400/80 transition-all rounded">
            <label htmlFor="comic-search-input" className="sr-only">Search series, issue, ticker, or PPCF ID</label>
            <Search className="ml-2 h-4 w-4 text-cyan-400 shrink-0" aria-hidden="true" />
            <input
              id="comic-search-input"
              name="q"
              defaultValue={query}
              placeholder="Search series (e.g. Amazing Spider-Man), ticker (e.g. ASM300, HK181), or issue..."
              className="min-w-0 flex-1 bg-transparent px-2 py-1 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:outline-none"
            />
            {currentView === "cbr" && <input type="hidden" name="view" value="cbr" />}
            <button
              type="submit"
              className="border border-cyan-500/50 bg-[#0C1626] px-3.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-cyan-300 hover:bg-[#10223D] hover:text-white transition-colors rounded font-mono"
            >
              Search
            </button>
          </form>

          {/* View Mode Toggle: Verified Market Issues vs CBR Canonical Editions */}
          <div className="flex items-center border border-slate-800 rounded bg-[#0b0f15] p-1 text-xs shrink-0 font-mono">
            <Link
              href={`/comics?q=${encodeURIComponent(query)}&view=issues${selectedEra ? `&era=${selectedEra}` : ""}`}
              className={`px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1.5 ${
                currentView === "issues"
                  ? "bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-medium"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <TrendingUp className="h-3 w-3" />
              <span>Market Issues ({verifiedComics.length})</span>
            </Link>
            <Link
              href={`/comics?q=${encodeURIComponent(query)}&view=cbr`}
              className={`px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1.5 ${
                currentView === "cbr"
                  ? "bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-medium"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="h-3 w-3" />
              <span>CBR Canonical Editions</span>
            </Link>
          </div>
        </div>

        {/* Era Filter Badges (when in Issues mode) */}
        {currentView === "issues" && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-500 text-[11px] uppercase tracking-wider mr-1 font-mono">Filter Era:</span>
            {[
              { label: "All Eras", value: "all" },
              { label: "Golden Age (Pre-1956)", value: "golden" },
              { label: "Silver Age (1956-1969)", value: "silver" },
              { label: "Bronze Age (1970-1984)", value: "bronze" },
              { label: "Modern Age (1985+)", value: "modern" },
            ].map((era) => {
              const active = (!selectedEra && era.value === "all") || selectedEra === era.value;
              return (
                <Link
                  key={era.value}
                  href={`/comics?q=${encodeURIComponent(query)}&era=${era.value}`}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    active
                      ? "bg-purple-950/80 border border-purple-500/60 text-purple-300 font-medium"
                      : "bg-[#0b0f15] border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  {era.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-slate-500 border-b border-slate-800/80 pb-2 font-mono">
        <span aria-live="polite">
          {query
            ? `Showing results for "${query}" (${totalResults})`
            : currentView === "cbr"
            ? `Canonical CBR Editions (${ppcfComics.length})`
            : `Featured Market Issues (${verifiedComics.length})`}
        </span>
        <span className="text-[10px] text-slate-500 font-mono">
          Page 1 · 48 records displayed
        </span>
      </div>

      {/* Grid: Verified Market Issues Mode */}
      {currentView === "issues" && (
        <>
          {verifiedComics.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {verifiedComics.map((comic) => {
                const fmvUsd = comic.fmv_usd;
                const formattedPrice = comic.price_formatted || `$${fmvUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                const era = comic.origin_era || comic.production_age || "MODERN";

                return (
                  <Link
                    key={comic.id}
                    href={`/comics/${comic.id}`}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-800 bg-[#0d1017] p-3 transition-all hover:border-cyan-500/60 hover:shadow-[0_0_24px_rgba(6,182,212,0.18)]"
                  >
                    <div>
                      {/* Cover Image Container */}
                      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-slate-950 border border-slate-800/60 mb-3">
                        {comic.cover_url ? (
                          <img
                            src={comic.cover_url}
                            alt={`${comic.series} #${comic.issue_number}`}
                            loading="lazy"
                            decoding="async"
                            draggable={false}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center p-4 text-center text-xs text-slate-600">
                            Cover Pending
                          </div>
                        )}

                        {/* Top Overlay Badges */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm border border-cyan-500/50 text-cyan-300 font-semibold shadow">
                            {comic.ticker}
                          </span>
                        </div>

                        <div className="absolute top-2 right-2">
                          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm border border-slate-700 text-slate-300 font-medium">
                            {era}
                          </span>
                        </div>
                      </div>

                      {/* Title & Metadata */}
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-1">
                          <h2 className="text-sm font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-1">
                            {comic.series}
                          </h2>
                          <span className="text-xs font-mono text-cyan-400 shrink-0 font-medium">
                            #{comic.issue_number}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {comic.publisher || "Independent"} · {comic.publication_year || "—"}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Pricing Row */}
                    <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 block">
                          9.8 SOVEREIGN FMV
                        </span>
                        <span className="font-mono text-sm font-semibold text-emerald-400">
                          {formattedPrice}
                        </span>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        <span>Dossier</span>
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="border border-slate-800 bg-[#0b0f15] p-12 text-center text-slate-400 rounded-lg space-y-3 font-mono">
              <Search className="h-8 w-8 text-slate-600 mx-auto" />
              <p className="text-sm">No verified market issues matched &ldquo;{query}&rdquo;.</p>
              <Link
                href="/comics"
                className="inline-block text-xs text-cyan-400 hover:text-cyan-300 underline"
              >
                Clear search and view all market issues
              </Link>
            </div>
          )}
        </>
      )}

      {/* Grid: CBR Archival Mode */}
      {currentView === "cbr" && (
        <>
          {ppcfComics.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {ppcfComics.map((comic) => (
                <PpcfCard key={comic.ppcf_id} comic={comic} />
              ))}
            </div>
          ) : (
            <div className="border border-slate-800 bg-[#0b0f15] p-12 text-center text-slate-400 rounded-lg space-y-3 font-mono">
              <BookOpen className="h-8 w-8 text-slate-600 mx-auto" />
              <p className="text-sm">No CBR canonical edition records matched &ldquo;{query}&rdquo;.</p>
              <Link
                href="/lexicon"
                className="inline-block text-xs text-cyan-400 hover:text-cyan-300 underline"
              >
                Explore CBR Market Lexicon &amp; Thesaurus Directory
              </Link>
            </div>
          )}
        </>
      )}
    </main>
  );
}
