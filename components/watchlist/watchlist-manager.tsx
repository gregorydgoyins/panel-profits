"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { WatchlistItem } from "@/lib/account/types";
import { WatchlistCard } from "./watchlist-card";
import { Button } from "@/components/ui/button";
import { Bookmark, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface WatchlistManagerProps {
  items: WatchlistItem[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}

export function WatchlistManager({
  items,
  nextCursor,
  hasMore,
  totalCount,
}: WatchlistManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleNextPage = () => {
    if (!nextCursor) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("cursor", nextCursor);
    router.push(`/watchlist?${params.toString()}`);
  };

  const handlePrevPage = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("cursor");
    router.push(`/watchlist?${params.toString()}`);
  };

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-800 bg-[#0C0E15] p-12 text-center">
        <Bookmark className="mx-auto h-10 w-10 text-slate-600 mb-3" />
        <h3 className="text-base font-light text-slate-200 mb-1">Your Watchlist is Empty</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
          Monitor market movements and price changes on priority comic books by bookmarking them from the catalog.
        </p>
        <Link
          href="/comics"
          className="inline-flex items-center gap-1.5 rounded bg-pink-600 hover:bg-pink-500 px-4 py-2 text-xs text-white transition-colors"
        >
          Explore Catalog &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <WatchlistCard key={item.id} item={item} />
        ))}
      </div>

      {/* Keyset Cursor Pagination Footer */}
      {(hasMore || searchParams.get("cursor")) && (
        <div className="mt-8 flex items-center justify-between border-t border-slate-800/80 pt-4 text-xs text-slate-400">
          <div>
            Showing {items.length} of {totalCount} watchlisted comics
          </div>
          <div className="flex items-center gap-2">
            {searchParams.get("cursor") && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                className="h-8 border-slate-800 bg-[#12151F] text-slate-300 hover:bg-[#1A1E2C] text-xs flex items-center gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> First Page
              </Button>
            )}
            {hasMore && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                className="h-8 border-slate-800 bg-[#12151F] text-slate-300 hover:bg-[#1A1E2C] text-xs flex items-center gap-1"
              >
                Next Page <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
