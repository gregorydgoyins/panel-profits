import { Skeleton } from "@/components/ui/skeleton";

export default function ComicDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center justify-between border-b border-graphite-800 pb-4">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-5 w-48" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column Skeleton */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-xl border border-graphite-800 bg-graphite-900 p-4 space-y-4">
            <Skeleton className="aspect-[2/3] w-full rounded" />
            <Skeleton className="h-6 w-full" />
          </div>
        </div>

        {/* Right Column Skeleton */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-xl border border-graphite-800 bg-graphite-900 p-6 space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-10 w-3/4" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-graphite-800">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>

          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
