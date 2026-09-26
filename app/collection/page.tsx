import { redirect } from "next/navigation";
import { getCurrentUser, getUserCollections, getCollectionItems, ensureDefaultCollection } from "@/lib/account/queries";
import { calculateHoldingsSummary } from "@/lib/account/calculations";
import { HoldingsSummaryBanner } from "@/components/collection/holdings-summary-banner";
import { CollectionManager } from "@/components/collection/collection-manager";
import { BrokerDiary } from "@/components/account/broker-diary";

export const metadata = {
  title: "My Collection | Panel Profits",
  description: "Track and value your personal comic collection with real-time baseline pricing and market intelligence.",
};

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; cursor?: string; q?: string; sort?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?returnTo=/collection");
  }

  const params = await searchParams;
  let collections = await getUserCollections();

  if (collections.length === 0) {
    const defaultCol = await ensureDefaultCollection(user.id);
    if (defaultCol) collections = [defaultCol];
  }

  const activeCollection = (params.id && collections.find((c) => c.id === params.id)) ||
    collections.find((c) => c.is_default) ||
    collections[0];

  if (!activeCollection) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center text-xs text-slate-400">
        Initializing collection database... Please refresh.
      </div>
    );
  }

  // Fetch items for active collection
  const result = await getCollectionItems(activeCollection.id, {
    cursor: params.cursor || null,
    q: params.q || undefined,
    limit: 24,
  });

  // Fetch all items in active collection for complete summary calculation
  const allItemsResult = await getCollectionItems(activeCollection.id, {
    limit: 100, // covers up to full active collection sample
  });
  const summary = calculateHoldingsSummary(allItemsResult.items);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Title & Context */}
      <div className="mb-6">
        <h1 className="text-2xl font-light tracking-wide text-slate-100">
          Personal Comic Collection
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Manage physical holdings, record grades and acquisition costs, and track secondary market valuations.
        </p>
      </div>

      {/* Financial Portfolio Summary Banner */}
      <HoldingsSummaryBanner
        summary={summary}
        totalItemsCount={result.totalCount}
      />

      {/* Collection Manager */}
      <CollectionManager
        collections={collections}
        activeCollection={activeCollection}
        items={result.items}
        nextCursor={result.nextCursor}
        hasMore={result.hasMore}
        totalCount={result.totalCount}
      />

      {/* Broker Diary & Institutional Whales Activity Feed */}
      <div className="mt-12">
        <BrokerDiary
          entries={[
            {
              id: "whale-1",
              type: "whale_alert",
              title: "Institutional Whale Acquisition",
              description: "A private portfolio acquired a CGC 9.8 copy of Amazing Spider-Man #300 via Heritage Auctions.",
              timestamp: "2 hours ago",
              amountUsd: 4250.00,
              ticker: "$SPDR",
            },
            {
              id: "trade-1",
              type: "trade",
              title: "CE70 Index Rebalance Trade",
              description: "Seat #14 rebalanced constituent weights following updated Clean census float observation.",
              timestamp: "5 hours ago",
              amountUsd: 1850.00,
              ticker: "$CE70",
            },
            {
              id: "acq-1",
              type: "acquisition",
              title: "Portfolio Cost Basis Logging",
              description: "Acquisition cost basis of $1,200.00 recorded for Batman #428 9.8 graded slab.",
              timestamp: "1 day ago",
              amountUsd: 1200.00,
              ticker: "$BTMN",
            },
          ]}
        />
      </div>
    </div>
  );
}
