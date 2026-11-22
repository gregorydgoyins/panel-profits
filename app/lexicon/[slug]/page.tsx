import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpen, Scale, Sparkles, TrendingUp, ShieldAlert, ArrowUpRight, Calculator } from "lucide-react";
import { getCbrTermBySlug, searchCbrTerms } from "@/lib/lexicon/cbr-lexicon";

export const dynamic = "force-dynamic";

export default async function LexiconTermPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cleanSlug = slug.toLowerCase().trim();

  // CBR Market Lexicon Dictionary (4,653 terms) is the sole source for lexicon pages.
  const cbrEntry = getCbrTermBySlug(cleanSlug);

  if (!cbrEntry) {
    redirect("/lexicon");
  }

  const termTitle = cbrEntry.term;
  const category = cbrEntry.category;
  const investopediaDef = cbrEntry.investopedia_definition;
  const panelProfitsTranslation = cbrEntry.panel_profits_translation;
  const formula = cbrEntry.canonical_formula;
  const comicExample = cbrEntry.comic_example;
  const antiPatterns = cbrEntry.anti_patterns;

  // Related terms from the same category
  const relatedTerms = searchCbrTerms(category, 6)
    .filter((t) => t.slug !== cbrEntry.slug)
    .slice(0, 4);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <Link
        href="/lexicon"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-cyan-400 hover:text-cyan-200 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Market Lexicon
      </Link>

      {/* Main Term Header */}
      <header className="mt-6 rounded-lg border border-slate-800 bg-[#0B0F18] p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-cyan-400" />
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-slate-400">
              CBR Market Lexicon · Comic Book Reference
            </span>
          </div>
          <div className="flex items-center gap-2">
            {cbrEntry?.is_core_canon && (
              <span className="rounded border border-emerald-500/40 bg-emerald-950/60 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-emerald-300 font-semibold">
                Core Canon Benchmark
              </span>
            )}
            <span className="rounded border border-cyan-500/40 bg-cyan-950/60 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-cyan-300">
              {category}
            </span>
          </div>
        </div>

        <h1 className="mt-5 text-3xl sm:text-5xl font-bold tracking-tight text-slate-100">
          {termTitle}
        </h1>

        {/* Panel Profits Translation */}
        <div className="mt-6 rounded border border-cyan-500/30 bg-[#070E1A] p-5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
            Panel Profits Domain Translation
          </span>
          <p className="mt-2 text-base sm:text-lg leading-relaxed text-slate-100">
            {panelProfitsTranslation}
          </p>
        </div>

        {/* Investopedia Benchmark Definition */}
        <div className="mt-4 rounded border border-slate-800/80 bg-[#070A12] p-4 text-xs text-slate-400">
          <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
            Underlying Financial Principle:
          </span>
          <p className="leading-relaxed text-slate-300">{investopediaDef}</p>
          <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-mono text-cyan-400">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
            <span>INTEGRATED SOVEREIGN CBR LEXICON BENCHMARK</span>
          </div>
        </div>
      </header>

      {/* Canonical Mathematical Formula */}
      {formula && (
        <section className="mt-6 rounded-lg border border-slate-800 bg-[#0A0E17] p-6 shadow-xl space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
            <Calculator className="h-4 w-4 text-cyan-400" />
            <h2 className="text-xs font-mono uppercase tracking-wider text-cyan-300 font-semibold">
              Canonical Mathematical Formula
            </h2>
          </div>
          <div className="rounded border border-slate-800 bg-[#060910] p-4 overflow-x-auto">
            <code className="text-sm font-mono text-cyan-200 block whitespace-pre-wrap">
              {formula}
            </code>
          </div>
        </section>
      )}

      {/* Comic Book Real-World Example */}
      {comicExample && (
        <section className="mt-6 rounded-lg border border-slate-800 bg-[#0A0E17] p-6 shadow-xl space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
            <TrendingUp className="h-4 w-4 text-cyan-400" />
            <h2 className="text-xs font-mono uppercase tracking-wider text-cyan-300 font-semibold">
              Real-World Comic Market Application
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-slate-300">
            {comicExample}
          </p>
        </section>
      )}

      {/* Domain Guardrails & Anti-Patterns */}
      {antiPatterns && (
        <section className="mt-6 rounded-lg border border-red-900/30 bg-[#12080A] p-6 shadow-xl space-y-3">
          <div className="flex items-center gap-2 border-b border-red-900/50 pb-3">
            <ShieldAlert className="h-4 w-4 text-red-400" />
            <h2 className="text-xs font-mono uppercase tracking-wider text-red-300 font-semibold">
              Domain Guardrails & Anti-Patterns
            </h2>
          </div>
          <p className="text-xs leading-relaxed text-red-200/90 font-mono">
            {antiPatterns}
          </p>
        </section>
      )}

      {/* Explore Related Equities in Catalog */}
      <section className="mt-8 rounded-lg border border-slate-800 bg-[#0A0E17] p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-100">Trade or Inspect Related Assets</h3>
          <p className="text-xs text-slate-400 mt-0.5">Explore comic equity issues governed by this valuation standard.</p>
        </div>
        <Link
          href={`/comics?q=${encodeURIComponent(termTitle)}`}
          className="inline-flex items-center gap-2 rounded border border-cyan-500/40 bg-cyan-950/40 px-4 py-2 text-xs font-mono uppercase tracking-wider text-cyan-300 hover:border-cyan-400 hover:bg-cyan-900/60 transition-all"
        >
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          Search Catalog for {termTitle} &rarr;
        </Link>
      </section>

      {/* Related Terms Rail */}
      {relatedTerms.length > 0 && (
        <section className="mt-8 border-t border-slate-800/80 pt-6">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
            Related {category} Terms:
          </span>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {relatedTerms.map((rItem) => (
              <Link
                key={rItem.slug}
                href={`/lexicon/${rItem.slug}`}
                className="rounded border border-slate-800 bg-slate-900/50 p-3 hover:border-cyan-400/60 transition-colors"
              >
                <p className="text-xs font-semibold text-slate-200 hover:text-cyan-300 flex items-center justify-between">
                  <span>{rItem.term}</span>
                  <ArrowUpRight className="h-3 w-3 text-slate-500" />
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
