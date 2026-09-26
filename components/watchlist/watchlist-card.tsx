"use client";

import { useState } from "react";
import Link from "next/link";
import { WatchlistItem } from "@/lib/account/types";
import { resolveBaselinePrice } from "@/lib/pricing/baseline";
import { toggleWatchlistAction } from "@/lib/account/actions";
import { ComicCover } from "@/components/comics/comic-cover";
import { Button } from "@/components/ui/button";
import { Bookmark, ExternalLink, Loader2, Trash2 } from "lucide-react";

interface WatchlistCardProps {
  item: WatchlistItem;
}

export function WatchlistCard({ item }: WatchlistCardProps) {
  const [loading, setLoading] = useState(false);
  const [removed, setRemoved] = useState(false);

  const comic = item.comic;
  const ppcf = item.ppcf;
  const pricing = resolveBaselinePrice(comic || null);

  const series = ppcf?.series_name || comic?.series || "Unknown Series";
  const issueNumber = ppcf?.issue_number || comic?.issue_number || "";
  const issue = issueNumber ? `#${issueNumber}` : "";
  const publisher = comic?.publisher || "Unknown Publisher";
  const year = comic?.publication_year;
  const variant = comic?.cover_variant || comic?.direct_or_variant;
  const detailHref = ppcf?.ppcf_id ? `/wiki/${ppcf.ppcf_id}` : `/comics/${item.comic_id}`;

  const dateAdded = item.created_at
    ? new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Recently";

  const handleRemove = async () => {
    setLoading(true);
    await toggleWatchlistAction(item.comic_id);
    setRemoved(true);
    setLoading(false);
  };

  if (removed) {
    return null;
  }

  return (
    <div className="group relative flex flex-col rounded-lg border border-pink-500/40 bg-[#0C0E15] p-3.5 shadow-lg transition-all duration-200 hover:border-pink-500 hover:shadow-pink-500/10 research-rimlight-hover">
      <div className="flex gap-3.5">
        {/* Cover Image */}
        <Link
          href={detailHref}
          className="relative block h-36 w-24 shrink-0 overflow-hidden rounded border border-slate-800 bg-[#161822]"
        >
          <ComicCover
            coverUrl={ppcf?.cover_url || comic?.cover_url}
            storagePath={ppcf?.cover_storage_path || comic?.cover_storage_path}
            series={series}
            issueNumber={issueNumber}
            publisher={publisher}
            size="full"
            priority={false}
          />
        </Link>

        {/* Watchlist Metadata */}
        <div className="flex flex-1 flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-start justify-between gap-1">
              <Link
                href={detailHref}
                className="group-hover:text-pink-400 transition-colors"
              >
                <h3 className="line-clamp-1 text-sm font-light text-slate-100">
                  {series} {issue}
                </h3>
              </Link>
              <button
                onClick={handleRemove}
                disabled={loading}
                className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                title="Remove from watchlist"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
              <span>{publisher}</span>
              {year && <span>• {year}</span>}
              {variant && (
                <span className="truncate max-w-[120px] text-slate-500">• {variant}</span>
              )}
            </div>

            <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
              <Bookmark className="h-3 w-3 text-pink-400" />
              <span>Added: {dateAdded}</span>
            </div>
          </div>

          {/* Pricing Intelligence Dossier Display */}
          <div className="mt-2.5 border-t border-slate-800/80 pt-2 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-[10px] uppercase text-slate-500 block">Current Baseline</span>
              <span className="text-emerald-400 font-light block">
                {pricing.formatted}
              </span>
              <span className="text-[9px] text-slate-500 block">
                {pricing.source}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase text-slate-500 block">ComicBase Ref</span>
              <span className="text-slate-300 font-light block">
                {comic?.comicbase_price !== null && comic?.comicbase_price !== undefined
                  ? `$${Number(comic.comicbase_price).toFixed(2)}`
                  : "N/A"}
              </span>
              <span className="text-[9px] text-slate-500 block">
                Raw Baseline
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-800/60 pt-2 text-xs">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          disabled={loading}
          className="h-7 text-[11px] text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 px-2"
        >
          {loading ? "Removing..." : "Remove"}
        </Button>

        <Link
          href={detailHref}
          className="flex items-center gap-1 text-[11px] text-pink-400 hover:text-pink-300 px-1"
        >
          View Full Dossier <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
