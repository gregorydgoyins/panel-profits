import { redirect } from "next/navigation";
import { getCurrentUser, getUserCollections, getCollectionItems, ensureDefaultCollection } from "@/lib/account/queries";
import { calculateHoldingsSummary } from "@/lib/account/calculations";
import { HoldingsSummaryBanner } from "@/components/collection/holdings-summary-banner";
import { CollectionManager } from "@/components/collection/collection-manager";

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
    </div>
  );
}
