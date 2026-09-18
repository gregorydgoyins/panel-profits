import * as React from "react";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { Collection, CollectionItem, HoldingsSummary } from "@/lib/account/types";
import { ComicCover } from "@/components/comics/comic-cover";
import { resolveBaselinePrice } from "@/lib/pricing/baseline";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Layers,
  Bookmark,
  DollarSign,
  Search,
  User as UserIcon,
  ArrowRight,
  TrendingUp,
  Clock,
} from "lucide-react";

interface AuthenticatedSnapshotProps {
  user: User;
  collections: Collection[];
  recentItems: CollectionItem[];
  watchlistItems: any[];
  watchlistCount: number;
  holdingsSummary: HoldingsSummary;
}

export function AuthenticatedSnapshot({
  user,
  collections,
  recentItems,
  watchlistItems,
  watchlistCount,
  holdingsSummary,
}: AuthenticatedSnapshotProps) {
  const isPositiveGain = (holdingsSummary.dollarGainLoss ?? 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Top Row: Direct Actions Bar with Universal Rimlight destination colors */}
      <div className="rounded-xl border-2 border-purple-500/60 bg-[#0B0D14] p-5 shadow-xl transition-all dashboard-rimlight-hover">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-purple-400">AUTHENTICATED OPERATOR SESSION</span>
            <h2 className="text-lg text-slate-100">
              Welcome back, {user.email?.split("@")[0]}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Search Catalog -> Orange Action */}
            <Link
              href="/comics"
              className="inline-flex items-center gap-1.5 rounded border border-orange-500/60 bg-orange-950/30 px-3 py-2 text-orange-300 hover:border-orange-400 hover:bg-orange-900/40 transition-colors"
            >
              <Search className="h-3.5 w-3.5 text-orange-400" />
              <span>SEARCH CATALOG</span>
            </Link>

            {/* Open Collection -> Orange Action */}
            <Link
              href="/collection"
              className="inline-flex items-center gap-1.5 rounded border border-orange-500/60 bg-orange-950/30 px-3 py-2 text-orange-300 hover:border-orange-400 hover:bg-orange-900/40 transition-colors"
            >
              <Layers className="h-3.5 w-3.5 text-orange-400" />
              <span>MY COLLECTION</span>
            </Link>

            {/* Open Watchlist -> Pink Action */}
            <Link
              href="/watchlist"
              className="inline-flex items-center gap-1.5 rounded border border-pink-500/60 bg-pink-950/30 px-3 py-2 text-pink-300 hover:border-pink-400 hover:bg-pink-900/40 transition-colors"
            >
              <Bookmark className="h-3.5 w-3.5 text-pink-400" />
              <span>WATCHLIST</span>
            </Link>

            {/* Open Account -> Purple Action */}
            <Link
              href="/account"
              className="inline-flex items-center gap-1.5 rounded border border-purple-500/60 bg-purple-950/30 px-3 py-2 text-purple-300 hover:border-purple-400 hover:bg-purple-900/40 transition-colors"
            >
              <UserIcon className="h-3.5 w-3.5 text-purple-400" />
              <span>ACCOUNT</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Middle Row: Collection & Watchlist Snapshots */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Collection Financial Summary */}
        <div className="lg:col-span-7 rounded-xl border-2 border-orange-500/60 bg-[#0B0D14] p-6 shadow-xl transition-all portfolio-rimlight-hover space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-orange-400" />
              <h3 className="text-sm uppercase text-slate-100 tracking-wider">
                COLLECTION FINANCIAL SNAPSHOT
              </h3>
            </div>
            <Link
              href="/collection"
              className="text-xs text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1"
            >
              <span>MANAGE HOLDINGS</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded border border-slate-800 bg-[#0F121C] p-3 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase">TOTAL OWNED</span>
              <div className="text-xl text-slate-100">{holdingsSummary.totalOwnedQuantity}</div>
              <span className="text-[10px] text-slate-500">
                Across {recentItems.length} holdings
              </span>
            </div>

            <div className="rounded border border-slate-800 bg-[#0F121C] p-3 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase">COST BASIS</span>
              <div className="text-xl text-slate-100">
                {holdingsSummary.totalAcquisitionCost > 0
                  ? formatCurrency(holdingsSummary.totalAcquisitionCost)
                  : "$0.00"}
              </div>
              <span className="text-[10px] text-slate-500">Recorded cost</span>
            </div>

            <div className="rounded border border-slate-800 bg-[#0F121C] p-3 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase">9.8 REF SUM</span>
              <div className="text-xl text-emerald-400">
                {holdingsSummary.totalBaselineValue > 0
                  ? formatCurrency(holdingsSummary.totalBaselineValue)
                  : "Uncalculated"}
              </div>
              <span className="text-[10px] text-slate-500">
                {holdingsSummary.pricedHoldingsCount} priced · {holdingsSummary.unpricedHoldingsCount} unpriced
              </span>
            </div>

            <div className="rounded border border-slate-800 bg-[#0F121C] p-3 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase">RECORDED VARIANCE</span>
              <div
                className={`text-xl ${
                  isPositiveGain ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {holdingsSummary.dollarGainLoss !== null
                  ? `${isPositiveGain ? "+" : ""}${formatCurrency(
                      holdingsSummary.dollarGainLoss
                    )}`
                  : "—"}
              </div>
              <span className="text-[10px] text-slate-500">
                {holdingsSummary.percentageGainLoss !== null
                  ? `${isPositiveGain ? "+" : ""}${holdingsSummary.percentageGainLoss.toFixed(1)}% vs cost`
                  : "No cost basis comparison"}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic">
            * Note: 9.8 Reference Sum represents unadjusted market guide values. Certified/recorded grades differing from 9.8 are isolated from direct valuation summing.
          </p>
        </div>

        {/* Right: Watchlist Preview */}
        <div className="lg:col-span-5 rounded-xl border-2 border-pink-500/60 bg-[#0B0D14] p-6 shadow-xl transition-all research-rimlight-hover space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-pink-400" />
              <h3 className="text-sm uppercase text-slate-100 tracking-wider">
                WATCHLIST INTELLIGENCE ({watchlistCount})
              </h3>
            </div>
            <Link
              href="/watchlist"
              className="text-xs text-pink-400 hover:text-pink-300 transition-colors flex items-center gap-1"
            >
              <span>VIEW ALL</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {watchlistItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-slate-800 rounded bg-[#0F121C]">
              <Bookmark className="h-6 w-6 text-slate-600 mb-2" />
              <p className="text-xs text-slate-400">Your watchlist is currently empty.</p>
              <Link href="/comics" className="mt-2 text-xs text-pink-400 hover:underline">
                Explore catalog to add tracked issues
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {watchlistItems.slice(0, 4).map((item) => {
                const comic = item.comic;
                if (!comic) return null;
                const pricing = resolveBaselinePrice(comic);

                return (
                  <Link
                    key={item.id}
                    href={`/comics/${comic.id}`}
                    className="group rounded border border-slate-800 bg-[#0E111B] p-2 hover:border-pink-500/70 transition-colors text-xs space-y-1.5"
                  >
                    <div className="overflow-hidden rounded border border-slate-800 bg-black">
                      <ComicCover
                        coverUrl={comic.cover_url}
                        storagePath={comic.cover_storage_path}
                        series={comic.series}
                        issueNumber={comic.issue_number}
                        publisher={comic.publisher}
                        size="sm"
                      />
                    </div>
                    <div className="text-[10px]">
                      <p className="text-slate-200 line-clamp-1 group-hover:text-pink-300">
                        {comic.series}
                      </p>
                      <span className="text-pink-400">#{comic.issue_number}</span>
                      <div className="text-emerald-400 pt-0.5">{pricing.formatted}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Recent Holdings Activity */}
      {recentItems.length > 0 && (
        <div className="rounded-xl border-2 border-orange-500/60 bg-[#0B0D14] p-6 shadow-xl transition-all portfolio-rimlight-hover space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-400" />
              <h3 className="text-sm uppercase text-slate-100 tracking-wider">
                RECENT COLLECTION ACTIVITY
              </h3>
            </div>
            <Link
              href="/collection"
              className="text-xs text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1"
            >
              <span>VIEW FULL COLLECTION</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {recentItems.slice(0, 4).map((item) => {
              const comic = item.comic;
              if (!comic) return null;
              const pricing = resolveBaselinePrice(comic);

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded border border-slate-800 bg-[#0E111B] p-2.5 text-xs"
                >
                  <div className="h-14 w-10 shrink-0 overflow-hidden rounded border border-slate-800 bg-black">
                    <ComicCover
                      coverUrl={comic.cover_url}
                      storagePath={comic.cover_storage_path}
                      series={comic.series}
                      issueNumber={comic.issue_number}
                      publisher={comic.publisher}
                      size="sm"
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <Link
                      href={`/comics/${comic.id}`}
                      className="text-slate-100 hover:text-orange-300 transition-colors line-clamp-1 block text-xs"
                    >
                      {comic.series} #{comic.issue_number}
                    </Link>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2">
                      <span>Qty: {item.quantity}</span>
                      {item.grade && <span>Grade: {item.grade}</span>}
                    </div>
                    <div className="text-[10px] text-emerald-400">
                      Ref: {pricing.formatted}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
