import { Suspense } from "react";
import { getComics } from "@/lib/comics/queries";
import { ComicCard } from "@/components/comics/comic-card";
import { ComicSearchBar } from "@/components/comics/comic-search-bar";
import { ComicFilters } from "@/components/comics/comic-filters";
import { ComicPagination } from "@/components/comics/comic-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Database, SearchX, Layers } from "lucide-react";

export const dynamic = "force-dynamic";

interface ComicsPageProps {
  searchParams: Promise<{
    q?: string;
    issue?: string;
    publisher?: string;
    year?: string;
    variant?: string;
    cursor?: string;
    prevCursor?: string;
  }>;
}

export default async function ComicsPage({ searchParams }: ComicsPageProps) {
  const params = await searchParams;
  const result = await getComics({
    q: params.q,
    issue: params.issue,
    publisher: params.publisher,
    year: params.year,
    variant: params.variant,
    cursor: params.cursor,
    prevCursor: params.prevCursor,
  });

  const hasFilter = Boolean(
    params.q || params.issue || params.publisher || params.year || params.variant
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-2 border-b border-graphite-800 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-cobalt-400" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-chalk font-mono">
              COMIC CATALOG EXPLORER
            </h1>
          </div>
          <span className="rounded bg-graphite-900 border border-graphite-800 px-2.5 py-1 text-xs font-mono text-graphite-300">
            PAGE SIZE: {result.comics.length}
          </span>
        </div>
        <p className="text-xs text-graphite-400 font-mono">
          SURVEILLANCE OVER 3,481,445 CANONICAL RECORDS · KEYSET PAGINATED
        </p>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4">
        <Suspense fallback={<Skeleton className="h-10 w-full" />}>
          <ComicSearchBar />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-28 w-full" />}>
          <ComicFilters />
        </Suspense>
      </div>

      {/* Catalog Results Grid */}
      {result.comics.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-lg border border-graphite-800 bg-graphite-950/60 p-8 text-center font-mono">
          <div className="rounded-full bg-graphite-900 p-4 text-graphite-500 mb-3 border border-graphite-800">
            <SearchX className="h-8 w-8" />
          </div>
          <h3 className="text-sm font-semibold uppercase text-chalk">
            NO COMIC RECORDS FOUND
          </h3>
          <p className="text-xs text-graphite-400 mt-1 max-w-md font-sans">
            {hasFilter
              ? "No records matched the specified search criteria. Try relaxing your search filters or clear issue/publisher parameters."
              : "No comic records available in the requested catalog window."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {result.comics.map((comic) => (
              <ComicCard key={comic.id} comic={comic} />
            ))}
          </div>

          {/* Keyset Pagination Bar */}
          <ComicPagination
            nextCursor={result.nextCursor}
            hasMore={result.hasMore}
            itemCount={result.comics.length}
          />
        </div>
      )}
    </div>
  );
}
