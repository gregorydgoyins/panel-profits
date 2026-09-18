"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ComicSearchBarProps {
  onToggleFilters?: () => void;
  showFilters?: boolean;
}

export function ComicSearchBar({ onToggleFilters, showFilters }: ComicSearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = React.useState(searchParams.get("q") || "");

  React.useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    
    // Reset cursor when performing new search
    params.delete("cursor");
    params.delete("prevCursor");

    if (query.trim()) {
      params.set("q", query.trim());
    } else {
      params.delete("q");
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClear = () => {
    setQuery("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("cursor");
    params.delete("prevCursor");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSearch} className="flex w-full items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
        <Input
          type="text"
          placeholder="SEARCH SERIES OR TITLE (E.G. AMAZING SPIDER-MAN, BATMAN, X-MEN)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-9 h-10 text-xs bg-graphite-900 border-graphite-700 text-chalk placeholder:text-graphite-400 focus-visible:border-cobalt-500"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-graphite-400 hover:text-chalk"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <Button type="submit" size="default" className="h-10 px-5 shrink-0">
        SEARCH
      </Button>

      {onToggleFilters && (
        <Button
          type="button"
          variant={showFilters ? "secondary" : "outline"}
          size="default"
          onClick={onToggleFilters}
          className="h-10 px-3 shrink-0 flex items-center gap-1.5"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">FILTERS</span>
        </Button>
      )}
    </form>
  );
}
