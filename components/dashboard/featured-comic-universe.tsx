import * as React from "react";
import Link from "next/link";
import { ComicRecord } from "@/lib/comics/types";
import { ComicCover } from "@/components/comics/comic-cover";
import { resolveBaselinePrice } from "@/lib/pricing/baseline";
import { ArrowRight, BookOpen, Layers } from "lucide-react";

interface FeaturedComicUniverseProps {
  comics: ComicRecord[];
}

export function FeaturedComicUniverse({ comics }: FeaturedComicUniverseProps) {
  if (!comics || comics.length === 0) return null;

  return (
    <section className="rounded-xl border-2 border-orange-500/60 bg-[#0B0D14] p-6 shadow-xl transition-all markets-rimlight-hover">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4 mb-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-orange-400" />
          <h2 className="text-base sm:text-lg text-slate-100 tracking-wide uppercase">
            FEATURED COMIC UNIVERSE
          </h2>
        </div>
        <Link
          href="/comics"
          className="inline-flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 transition-colors self-start sm:self-auto"
        >
          <span>EXPLORE ALL 3.48M ISSUES</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {comics.map((comic) => {
          const pricing = resolveBaselinePrice(comic);

          return (
            <Link
              key={comic.id}
              href={`/comics/${comic.id}`}
              className="group flex flex-col rounded-lg border border-slate-800/90 bg-[#0E111B] p-2.5 transition-all hover:border-orange-500/80 hover:bg-[#141826] focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              {/* Cover Thumbnail */}
              <div className="overflow-hidden rounded border border-slate-800 bg-[#07080C] mb-2.5">
                <ComicCover
                  coverUrl={comic.cover_url}
                  storagePath={comic.cover_storage_path}
                  series={comic.series}
                  issueNumber={comic.issue_number}
                  publisher={comic.publisher}
                  size="md"
                />
              </div>

              {/* Title & Metadata */}
              <div className="flex-1 space-y-1 text-xs">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="truncate max-w-[90px]">{comic.publisher || "INDEPENDENT"}</span>
                  {comic.publication_year && <span>{comic.publication_year}</span>}
                </div>

                <h3 className="line-clamp-1 text-slate-100 group-hover:text-orange-300 transition-colors text-xs">
                  {comic.series}
                </h3>

                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span>Issue</span>
                  <span className="text-orange-400">#{comic.issue_number || "—"}</span>
                </div>

                {comic.cover_variant && (
                  <p className="line-clamp-1 text-[10px] text-orange-400/80 italic">
                    Var: {comic.cover_variant}
                  </p>
                )}
              </div>

              {/* Pricing Footer */}
              <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-[10px] text-slate-500">9.8 REF</span>
                <span className="text-emerald-400">{pricing.formatted}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
