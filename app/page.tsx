import { getCurrentUser, getUserCollections, getUserAllCollectionItems, getWatchlistItems } from "@/lib/account/queries";
import { calculateHoldingsSummary } from "@/lib/account/calculations";
import { getFeaturedUniverseComics } from "@/lib/dashboard/queries";
import { MarketUniverse } from "@/components/dashboard/market-universe";
import { FeaturedComicUniverse } from "@/components/dashboard/featured-comic-universe";
import { PriceIntelligenceCoverage } from "@/components/dashboard/price-intelligence-coverage";
import { CatalogEntrySurface } from "@/components/dashboard/catalog-entry-surface";
import { PlatformProvenance } from "@/components/dashboard/platform-provenance";
import { AuthenticatedSnapshot } from "@/components/dashboard/authenticated-snapshot";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [user, featuredComics] = await Promise.all([
    getCurrentUser(),
    getFeaturedUniverseComics(18),
  ]);

  let userCollections: any[] = [];
  let userCollectionItems: any[] = [];
  let userHoldingsSummary = null;
  let userWatchlist = { items: [] as any[], totalCount: 0 };

  if (user) {
    const [collections, collectionItems, watchlist] = await Promise.all([
      getUserCollections(),
      getUserAllCollectionItems(),
      getWatchlistItems({ limit: 8 }),
    ]);

    userCollections = collections;
    userCollectionItems = collectionItems;
    userHoldingsSummary = calculateHoldingsSummary(collectionItems);
    userWatchlist = watchlist;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Authenticated User Snapshot Banner */}
      {user && userHoldingsSummary && (
        <AuthenticatedSnapshot
          user={user}
          collections={userCollections}
          recentItems={userCollectionItems}
          watchlistItems={userWatchlist.items}
          watchlistCount={userWatchlist.totalCount}
          holdingsSummary={userHoldingsSummary}
        />
      )}

      {/* 1. Market Universe Coverage */}
      <MarketUniverse />

      {/* 2. Featured Comic Universe */}
      <FeaturedComicUniverse comics={featuredComics} />

      {/* 3. Catalog Entry Surface */}
      <CatalogEntrySurface />

      {/* 4. Price Intelligence Architecture */}
      <PriceIntelligenceCoverage />

      {/* 5. Platform Provenance Architecture */}
      <PlatformProvenance />
    </div>
  );
}
