import Link from "next/link";
import { ComicRecord } from "@/lib/comics/types";
import { resolveComicPricing } from "@/lib/pricing/baseline";
import { ComicCover } from "@/components/comics/comic-cover";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface ComicCardProps {
  comic: ComicRecord;
}

export function ComicCard({ comic }: ComicCardProps) {
  const pricing = resolveComicPricing(comic);

  return (
    <Link
      href={`/comics/${comic.id}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-lg border border-graphite-800 bg-graphite-900/90 transition-all duration-200 hover:border-cobalt-600/80 hover:bg-graphite-900 hover:shadow-lg hover:shadow-cobalt-950/20"
    >
      <div className="p-3">
        {/* Cover Preview */}
        <div className="mb-3 overflow-hidden rounded">
          <ComicCover
            coverUrl={comic.cover_url}
            storagePath={comic.cover_storage_path}
            series={comic.series}
            issueNumber={comic.issue_number}
            publisher={comic.publisher}
            size="md"
          />
        </div>

        {/* Identification */}
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-1.5">
            <h4 className="text-sm font-semibold text-chalk line-clamp-1 group-hover:text-cobalt-400 transition-colors font-sans">
              {comic.series}
            </h4>
            <span className="shrink-0 text-xs font-mono font-bold text-chalk">
              #{comic.issue_number}
            </span>
          </div>

          <p className="text-[11px] text-graphite-400 line-clamp-1 font-mono">
            {comic.publisher || "Independent"} · {comic.publication_year || (comic.publication_date ? comic.publication_date.slice(0, 4) : "—")}
          </p>

          {/* Badges / Variants */}
          <div className="flex flex-wrap gap-1 pt-1.5">
            {comic.direct_or_variant && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                {comic.direct_or_variant}
              </Badge>
            )}
            {comic.cover_variant && (
              <Badge variant="copper" className="text-[9px] px-1.5 py-0">
                VAR {comic.cover_variant}
              </Badge>
            )}
            {comic.printing && comic.printing !== "1" && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                {comic.printing}PTG
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Pricing / Valuation Bar */}
      <div className="mt-2 flex items-center justify-between border-t border-graphite-800/80 bg-graphite-950/60 px-3 py-2 font-mono text-xs">
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-wider text-graphite-400">
            {pricing.baselineSource ? "9.8 BASELINE" : "MARKET VALUE"}
          </span>
          <span className="font-semibold text-chalk">
            {pricing.baselinePrice98 !== null
              ? formatCurrency(pricing.baselinePrice98)
              : pricing.comicbasePrice !== null
              ? formatCurrency(pricing.comicbasePrice)
              : "—"}
          </span>
        </div>

        {pricing.panelProfitsPrice98 !== null && (
          <Badge variant="default" className="text-[9px]">
            PP 9.8
          </Badge>
        )}
      </div>
    </Link>
  );
}
