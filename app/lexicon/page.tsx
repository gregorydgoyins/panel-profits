import Link from "next/link";
import { BookOpen, Scale, Calculator, TrendingUp, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { getCoreCanonTerms, getAllCbrCategories, getCbrTermsByCategory } from "@/lib/lexicon/cbr-lexicon";
import { CbrTickerLegend } from "@/components/lexicon/cbr-ticker-legend";

export const dynamic = "force-dynamic";

export default async function LexiconPage() {
  const coreCanon = getCoreCanonTerms();
  const categories = getAllCbrCategories();

  return (
    <div className="relative min-h-screen text-[#e0e6ed] font-sans antialiased selection:bg-cyan-500 selection:text-black">
      {/* High-Resolution Pantheon Lexicon Full-Page Background */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat opacity-30 transition-opacity duration-700"
        style={{
          backgroundImage: `url('/brand/cbse-academy-pantheon-bg.jpg?v=20261124')`,
        }}
      />
      {/* Atmospheric vignette allowing rich backdrop visibility */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-[#070b14]/75 via-[#070b14]/65 to-[#070b14]/90" />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      {/* Header */}
      <header className="border-b border-slate-800 pb-7">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-cyan-400 font-mono">
          <BookOpen className="h-3.5 w-3.5" /> CBR (Comic Book Reference) Market Lexicon Dictionary
        </div>
        <h1 className="mt-3 text-3xl sm:text-5xl font-bold tracking-tight text-slate-100">
          The Investopedia of Comic Equities
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Over 4,650 institutional financial principles translated into rigorous comic asset mechanics, certified census scarcity standards, tax lot cost accounting, and secondary trading velocity.
        </p>
      </header>

      {/* Core Canonical Benchmarks & Formulas Section */}
      <section className="mt-10 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2.5">
          <Calculator className="h-4 w-4 text-cyan-400" />
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-cyan-300 font-semibold">
            Core Canonical Valuation Formulas & Benchmarks
          </h2>
          <span className="text-[10px] font-mono text-emerald-400 ml-auto bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded">
            Verified Domain Formulas
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {coreCanon.map((term) => (
            <Link
              key={term.slug}
              href={`/lexicon/${term.slug}`}
              className="group flex flex-col justify-between rounded-lg border border-cyan-500/30 bg-[#0B101C] p-5 transition-all hover:border-cyan-400 hover:bg-[#0E1626] shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-cyan-400">
                    {term.category}
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400 font-semibold">
                    CANON
                  </span>
                </div>
                <h3 className="mt-2 text-base font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                  {term.term}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-300 line-clamp-2">
                  {term.panel_profits_translation}
                </p>

                {term.canonical_formula && (
                  <div className="mt-3 rounded border border-slate-800 bg-[#070A12] p-2.5">
                    <code className="text-[10px] font-mono text-cyan-200 block truncate">
                      {term.canonical_formula}
                    </code>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-[10px] font-mono text-slate-400">
                <span className="text-cyan-400 group-hover:text-cyan-300 flex items-center gap-1">
                  Inspect Formula & Mechanics <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CBR Ticker Legend & Symbology Authority Section */}
      <section className="mt-14">
        <CbrTickerLegend />
      </section>

      {/* Complete Dictionary by Category */}
      <div className="mt-14 space-y-12">
        {categories.map((categoryName) => {
          const items = getCbrTermsByCategory(categoryName, 12);
          if (items.length === 0) return null;

          return (
            <section key={categoryName} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2.5">
                <Scale className="h-4 w-4 text-slate-400" />
                <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-slate-300 font-semibold">
                  {categoryName}
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {items.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/lexicon/${item.slug}`}
                    className="group rounded border border-slate-800 bg-[#0A0D15] p-3.5 hover:border-cyan-500/50 hover:bg-[#0D121F] transition-all flex flex-col justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">
                        {item.term}
                      </h4>
                      <p className="mt-1 text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {item.panel_profits_translation || item.investopedia_definition}
                      </p>
                    </div>
                    <span className="mt-3 text-[9px] font-mono text-cyan-400/80 group-hover:text-cyan-300 flex items-center gap-1">
                      Definition &rarr;
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
    </div>
  );
}
