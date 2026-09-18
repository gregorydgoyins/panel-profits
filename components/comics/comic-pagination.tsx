"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronsLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ComicPaginationProps {
  nextCursor: string | null;
  hasMore: boolean;
  itemCount: number;
}

export function ComicPagination({
  nextCursor,
  hasMore,
  itemCount,
}: ComicPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentCursor = searchParams.get("cursor");

  const goToNextPage = () => {
    if (!nextCursor) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("cursor", nextCursor);
    router.push(`${pathname}?${params.toString()}`);
  };

  const goToFirstPage = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("cursor");
    params.delete("prevCursor");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-lg border border-graphite-800 bg-graphite-900/80 px-4 py-3 font-mono text-xs text-graphite-300">
      <div className="flex items-center gap-2">
        <span className="text-graphite-400">SHOWING:</span>
        <span className="font-semibold text-chalk">{itemCount} RECORDS</span>
        {currentCursor && (
          <span className="rounded bg-graphite-800 px-2 py-0.5 text-[10px] text-graphite-300">
            KEYSET ACTIVE
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {currentCursor && (
          <Button
            variant="outline"
            size="sm"
            onClick={goToFirstPage}
            className="flex items-center gap-1 h-8 px-2.5"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">FIRST PAGE</span>
          </Button>
        )}

        <Button
          variant="default"
          size="sm"
          onClick={goToNextPage}
          disabled={!hasMore || !nextCursor}
          className="flex items-center gap-1 h-8 px-3"
        >
          <span>NEXT PAGE</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
