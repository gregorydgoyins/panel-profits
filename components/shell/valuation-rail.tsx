"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ValuationRailItem } from "@/lib/dashboard/queries";
import { TrendingUp, DollarSign } from "lucide-react";

interface ValuationRailProps {
  items: ValuationRailItem[];
}

export function ValuationRail({ items }: ValuationRailProps) {
  if (!items || items.length === 0) return null;

  return (
    <aside
      aria-label="Comic price references"
      className="border-b border-slate-800/80 bg-[#07080C] px-4 py-1.5 text-xs text-slate-300"
    >
      <div className="mx-auto max-w-7xl flex items-center gap-3">
        {/* Label */}
        <div className="flex shrink-0 items-center gap-1.5 border-r border-slate-800 pr-3 text-[11px] text-blue-400">
          <DollarSign className="h-3.5 w-3.5 text-blue-400" />
          <span className="uppercase tracking-wider">COMIC PRICE REFERENCES</span>
        </div>

        {/* Rail Items */}
        <div
          tabIndex={0}
          role="region"
          aria-label="Priced comic records"
          className="flex-1 overflow-x-auto overflow-y-hidden no-scrollbar flex items-center gap-4 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
        >
          {items.map((comic) => {
            const coverSrc =
              comic.coverUrl ||
              (comic.coverStoragePath
                ? `https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/${comic.coverStoragePath}`
                : null);

            return (
              <Link
                key={comic.id}
                href={`/comics/${comic.id}`}
                className="group flex shrink-0 items-center gap-2 rounded border border-slate-800/70 bg-[#0A0D16] px-2.5 py-1 text-[11px] transition-all hover:border-blue-500/60 hover:bg-[#101624] focus:outline-none focus:border-blue-500"
              >
                {coverSrc ? (
                  <div className="relative h-6 w-4 shrink-0 overflow-hidden rounded-[2px] border border-slate-800">
                    <Image
                      src={coverSrc}
                      alt={`${comic.series} #${comic.issueNumber}`}
                      fill
                      sizes="16px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-6 w-4 shrink-0 items-center justify-center rounded-[2px] border border-slate-800 bg-slate-900 text-[8px] text-blue-400">
                    $
                  </div>
                )}

                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="text-slate-200 group-hover:text-blue-300 transition-colors max-w-[130px] truncate">
                    {comic.series}
                  </span>
                  <span className="text-blue-400">#{comic.issueNumber}</span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-emerald-400 text-[11px]">{comic.priceFormatted}</span>
                  <span className="rounded bg-blue-950/40 px-1 py-0.2 text-[9px] text-blue-300 border border-blue-800/40">
                    {comic.sourceLabel}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
