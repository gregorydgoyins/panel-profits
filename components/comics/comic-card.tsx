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
      className="markets-rimlight-hover group relative flex flex-col justify-between overflow-hidden rounded-lg bg-[#111319] transition-all duration-200"
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
            <h4 className="text-sm text-slate-100 line-clamp-1 group-hover:text-amber-400 transition-colors">
              {comic.series}
            </h4>
            <span className="shrink-0 text-xs text-slate-200">
              #{comic.issue_number}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 line-clamp-1">
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
      <div className="mt-2 flex items-center justify-between border-t border-slate-800/80 bg-[#0A0A0C] px-3 py-2 text-xs">
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-wider text-slate-400">
            {pricing.baselineSource ? "9.8 BASELINE" : "MARKET VALUE"}
          </span>
          <span className="text-slate-100">
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
