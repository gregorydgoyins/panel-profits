import { redirect } from "next/navigation";
import { getCurrentUser, getWatchlistItems } from "@/lib/account/queries";
import { WatchlistManager } from "@/components/watchlist/watchlist-manager";

export const metadata = {
  title: "Watchlist | Panel Profits",
  description: "Monitor market pricing, secondary market updates, and historical benchmarks for your favorite comic targets.",
};

export default async function WatchlistPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?returnTo=/watchlist");
  }

  const params = await searchParams;
  const result = await getWatchlistItems({
    cursor: params.cursor || null,
    limit: 24,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-light tracking-wide text-slate-100">
          Personal Watchlist
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Real-time market monitoring for priority issues across the 3.48M catalog.
        </p>
      </div>

      <WatchlistManager
        items={result.items}
        nextCursor={result.nextCursor}
        hasMore={result.hasMore}
        totalCount={result.totalCount}
      />
    </div>
  );
}
