"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { IntelligenceRailItem } from "@/lib/dashboard/queries";
import { ShieldCheck, Layers } from "lucide-react";

interface IntelligenceRailProps {
  items: IntelligenceRailItem[];
}

export function IntelligenceRail({ items }: IntelligenceRailProps) {
  if (!items || items.length === 0) return null;

  return (
    <aside
      aria-label="Market Intelligence Surveillance Rail"
      className="border-b border-slate-800/80 bg-[#090B10] px-4 py-1.5 text-xs text-slate-300"
    >
      <div className="mx-auto max-w-7xl flex items-center gap-3">
        {/* Label */}
        <div className="flex shrink-0 items-center gap-1.5 border-r border-slate-800 pr-3 text-[11px] text-purple-400">
          <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
          <span className="uppercase tracking-wider">NEWS / INTELLIGENCE</span>
        </div>

        {/* Scrolling or Flex Rail Container */}
        <div
          tabIndex={0}
          role="region"
          aria-label="Recent Indexed Issues"
          className="flex-1 overflow-x-auto overflow-y-hidden no-scrollbar flex items-center gap-4 py-0.5 focus:outline-none focus:ring-1 focus:ring-purple-500 rounded"
        >
          {items.map((comic) => {
            const hasCover = Boolean(comic.coverUrl || comic.coverStoragePath);
            const coverSrc =
              comic.coverUrl ||
              (comic.coverStoragePath
                ? `https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/${comic.coverStoragePath}`
                : null);

            return (
              <a
                key={comic.id}
                href={comic.href}
                target={comic.href.startsWith("/") ? undefined : "_blank"}
                rel={comic.href.startsWith("/") ? undefined : "noreferrer"}
                className="group flex shrink-0 items-center gap-2 rounded border border-slate-800/70 bg-[#0E111A] px-2.5 py-1 text-[11px] transition-all hover:border-purple-500/60 hover:bg-[#141824] focus:outline-none focus:border-purple-500"
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
                  <div className="flex h-6 w-4 shrink-0 items-center justify-center rounded-[2px] border border-slate-800 bg-slate-900 text-[8px] text-slate-500">
                    <Layers className="h-2.5 w-2.5" />
                  </div>
                )}

                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="text-slate-200 group-hover:text-purple-300 transition-colors max-w-[140px] truncate">
                    {comic.series}
                  </span>
                  <span className="text-purple-400">#{comic.issueNumber}</span>
                  {comic.publicationYear && (
                    <span className="text-[10px] text-slate-500">({comic.publicationYear})</span>
                  )}
                </div>

                <span className="rounded bg-purple-950/40 px-1 py-0.2 text-[9px] text-purple-300 border border-purple-800/40">
                  VERIFIED
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
