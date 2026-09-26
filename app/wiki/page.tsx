import Link from "next/link";
import { BookOpen, Search, Sparkles, TrendingUp, Cpu } from "lucide-react";
import { searchPpcfComics } from "@/lib/ppcf/queries";
import { COMIC_FINANCIAL_GLOSSARY } from "@/lib/wiki/entity-extractor";
import { queryPineconeVectorIndex } from "@/lib/wiki/pinecone";

export const dynamic = "force-dynamic";

export default async function WikiPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const queryText = params.q?.trim() || "";
  const [comics, vectorMatches] = await Promise.all([
    searchPpcfComics(queryText, 24),
    queryText ? queryPineconeVectorIndex(queryText, 6) : Promise.resolve([]),
  ]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      {/* Header Bar */}
      <header className="border-b border-slate-800 pb-7">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-pink-300">
          <BookOpen className="h-3.5 w-3.5" /> Panel Profits Encyclopedia & Financial Knowledge Engine
        </div>
        <h1 className="mt-3 text-3xl text-slate-100 sm:text-5xl font-bold tracking-tight">
          Comic Lore & Equity Oracle
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Universal encyclopedic crosswalk connecting Grand Comics Database (GCD) publication history, verified creator lineages, and Investopedia-style comic equity financial mechanics.
        </p>
      </header>

      {/* Search Input Bar */}
      <form className="mt-6 flex max-w-xl items-center gap-2 border border-slate-800 bg-[#0b0f15] p-2 rounded shadow-lg">
        <Search className="ml-2 h-4 w-4 text-pink-300" />
        <input
          name="q"
          defaultValue={queryText}
          placeholder="Search creators, titles, characters, or financial terms..."
          className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600"
        />
        <button className="border border-pink-300/60 bg-pink-950/40 px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-pink-200 hover:bg-pink-900/60 transition-colors rounded">
          Search Oracle
        </button>
      </form>

      {/* Investopedia-Style Equity Financial Terms Grid */}
      <section className="mt-10" aria-label="Comic Equity Financial Glossary">
        <div className="flex items-center gap-2 mb-4 text-xs font-mono uppercase tracking-[0.18em] text-amber-400 font-semibold">
          <TrendingUp className="h-4 w-4 text-amber-300" />
          Comic Equity & Investment Fundamentals
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(COMIC_FINANCIAL_GLOSSARY).map(([key, termObj]) => (
            <div
              key={key}
              id={key}
              className="border border-slate-800/80 bg-[#0A0D15] p-5 rounded hover:border-amber-400/50 transition-all shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 bg-amber-950/40 px-2 py-0.5 border border-amber-500/30 rounded">
                    {termObj.category}
                  </span>
                  <Sparkles className="h-3 w-3 text-slate-500" />
                </div>
                <h3 className="mt-3 text-base font-semibold text-slate-100">{termObj.term}</h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">{termObj.definition}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>PPCF STANDARD</span>
                <Link href={`/comics?q=${encodeURIComponent(termObj.term)}`} className="text-pink-400 hover:text-pink-300">
                  Explore Equities &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pinecone 65k Vector Estate Semantic Matches */}
      {vectorMatches.length > 0 && (
        <section className="mt-10" aria-label="Pinecone Semantic Vector Matches">
          <div className="flex items-center gap-2 mb-4 text-xs font-mono uppercase tracking-[0.18em] text-cyan-400 font-semibold">
            <Cpu className="h-4 w-4 text-cyan-300" />
            Pinecone Vector Estate Matches (Semantic 65k Index)
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {vectorMatches.map((match) => (
              <div
                key={match.id}
                className="border border-cyan-800/60 bg-[#070B12] p-4 rounded hover:border-cyan-400/80 transition-all shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 bg-amber-950/40 px-2 py-0.5 border border-amber-500/30 rounded">
                    {match.ticker}
                  </span>
                  <span className="text-[9px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 border border-cyan-500/30 rounded">
                    Score {(match.score * 100).toFixed(1)}%
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-slate-100">{match.name}</h3>
                <p className="mt-1 text-xs text-slate-400 uppercase tracking-wider font-mono font-medium">{match.type} entity</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Canonical PPCF Records */}
      <section className="mt-12" aria-label="PPCF encyclopedia results">
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-xs font-mono uppercase tracking-[0.18em] text-slate-400">
            Canonical Edition Records & Crosswalks
          </span>
          <span className="text-xs text-slate-500 font-mono">{comics?.length || 0} Records</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(comics || []).map((comic) => (
            <Link
              key={comic.ppcf_id}
              href={`/wiki/${comic.ppcf_id}`}
              className="border border-slate-800 bg-[#0b0f15] p-5 rounded transition-all hover:border-pink-400/70 hover:shadow-[0_0_22px_rgba(244,114,182,0.18)]"
            >
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-pink-300 bg-pink-950/40 px-2 py-0.5 border border-pink-500/30 rounded">
                  PPCF CATALOG
                </span>
                <span className="text-[9px] uppercase tracking-[0.12em] text-slate-500 font-mono">
                  {comic.identity_status}
                </span>
              </div>
              <h2 className="mt-3 text-lg font-semibold text-slate-100">
                {comic.series_name || "Untitled series"}{" "}
                <span className="text-slate-400">#{comic.issue_number || "?"}</span>
              </h2>
              <p className="mt-2 text-xs text-slate-400">
                {comic.publication_date || "Date unavailable"}
                {comic.variant_name ? ` · ${comic.variant_name}` : " · Standard Edition"}
              </p>
            </Link>
          ))}
        </div>

        {!comics?.length && (
          <div className="border border-slate-800 bg-[#090C14] px-4 py-16 text-center rounded">
            <p className="text-sm text-slate-400 font-mono uppercase tracking-wider">
              No PPCF encyclopedia records matched that query.
            </p>
            <p className="mt-2 text-xs text-slate-600">
              Try searching for major titles like &ldquo;Amazing Spider-Man&rdquo;, creators like &ldquo;Steve Ditko&rdquo;, or financial terms.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
