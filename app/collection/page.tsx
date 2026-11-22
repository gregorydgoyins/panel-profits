import { redirect } from "next/navigation";
import { getCurrentUser, getUserCollections, getCollectionItems, ensureDefaultCollection } from "@/lib/account/queries";
import { calculateHoldingsSummary } from "@/lib/account/calculations";
import { getDiaryEntries } from "@/lib/panel-profits/queries";
import { HoldingsSummaryBanner } from "@/components/collection/holdings-summary-banner";
import { CollectionManager } from "@/components/collection/collection-manager";
import { BrokerDiary, type DiaryEntry } from "@/components/account/broker-diary";

export const metadata = {
  title: "My Collection | Panel Profits",
  description: "Track and value your personal comic collection with real-time baseline pricing and market intelligence.",
};

const DIARY_ENTRY_TYPES = new Set<DiaryEntry["type"]>(["trade", "acquisition", "valuation_change", "whale_alert", "note"]);

function toDiaryEntry(row: { id: string; entry_type: string; title: string; body: string; occurred_at: string }): DiaryEntry {
  const type = DIARY_ENTRY_TYPES.has(row.entry_type as DiaryEntry["type"]) ? (row.entry_type as DiaryEntry["type"]) : "note";
  return {
    id: row.id,
    type,
    title: row.title,
    description: row.body,
    timestamp: new Date(row.occurred_at).toLocaleString(),
  };
}

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; cursor?: string; q?: string; sort?: string }>;
}) {
  const authUser = await getCurrentUser();
  const user: any = authUser || {
    id: "00000000-0000-0000-0000-000000000000",
    email: "guest@comicbookstockexchange.com",
    created_at: new Date().toISOString(),
    user_metadata: { display_name: "Guest Investor" }
  };
  

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

  // Real per-account diary entries (the same source backing /diary). No
  // institutional "whale" trade feed exists in this codebase, so nothing
  // is invented for that — this shows the account's own recorded entries,
  // and the diary component's built-in empty state covers the case where
  // there are none yet.
  const diaryRows = await getDiaryEntries(user.id);
  const diaryEntries = diaryRows.map(toDiaryEntry);

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

      {/* Broker Diary (real account diary entries; no fabricated activity) */}
      <div className="mt-12">
        <BrokerDiary entries={diaryEntries} />
      </div>
    </div>
  );
}
