import { Skeleton } from "@/components/ui/skeleton";
import { Layers } from "lucide-react";

export default function ComicsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-2 border-b border-graphite-800 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-cobalt-400 animate-pulse" />
            <Skeleton className="h-7 w-64" />
          </div>
          <Skeleton className="h-6 w-28" />
        </div>
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Search & Filters Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col rounded-lg border border-graphite-800 bg-graphite-900 p-3 space-y-3"
          >
            <Skeleton className="aspect-[2/3] w-full rounded" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-1 pt-1">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-3 w-10" />
            </div>
            <div className="border-t border-graphite-800 pt-2 flex justify-between">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
