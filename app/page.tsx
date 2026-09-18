import Link from "next/link";
import { getFeaturedComics } from "@/lib/comics/queries";
import { ComicCard } from "@/components/comics/comic-card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Database, TrendingUp, Search, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const featured = await getFeaturedComics(6);

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative border-b border-graphite-800 bg-gradient-to-b from-graphite-950 via-graphite-900 to-[#0D0D0E] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded border border-cobalt-800 bg-cobalt-950/60 px-3 py-1 text-xs text-cobalt-300">
              <ShieldCheck className="h-3.5 w-3.5 text-cobalt-400" />
              <span>PRODUCTION CATALOG MILESTONE · 3,481,445 RECORDS</span>
            </div>

            <h1 className="text-3xl sm:text-5xl tracking-tight text-chalk">
              Comic-Book Financial Intelligence & Canonical Catalog
            </h1>

            <p className="text-base sm:text-lg text-graphite-300 leading-relaxed">
              Direct, high-performance market surveillance and pricing baseline
              covering over 3.48 million authoritative comic records across
              Panel Profits, ComicBase, and the Grand Comics Database.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link href="/comics">
                <Button size="lg" className="h-11 px-6 gap-2 text-xs tracking-wider">
                  <Search className="h-4 w-4" />
                  <span>EXPLORE CATALOG</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Market Issues */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex items-center justify-between border-b border-graphite-800 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm uppercase tracking-wider text-chalk">
                MARKET BENCHMARK SPOTLIGHT
              </h2>
            </div>
            <Link
              href="/comics"
              className="text-xs text-cobalt-400 hover:text-cobalt-300 transition-colors flex items-center gap-1"
            >
              <span>VIEW FULL CATALOG</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {featured.map((comic) => (
              <ComicCard key={comic.id} comic={comic} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
