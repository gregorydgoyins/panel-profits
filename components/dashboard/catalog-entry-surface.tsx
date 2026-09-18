"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, ArrowRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CatalogEntrySurface() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [issue, setIssue] = React.useState("");
  const [publisher, setPublisher] = React.useState("");
  const [year, setYear] = React.useState("");
  const [variant, setVariant] = React.useState("");
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();

    if (query.trim()) params.set("q", query.trim());
    if (issue.trim()) params.set("issue", issue.trim());
    if (publisher.trim()) params.set("publisher", publisher.trim());
    if (year.trim()) params.set("year", year.trim());
    if (variant.trim()) params.set("variant", variant.trim());

    router.push(`/comics?${params.toString()}`);
  };

  return (
    <section className="rounded-xl border-2 border-orange-500/60 bg-[#0B0D14] p-6 shadow-xl transition-all markets-rimlight-hover">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4 mb-5">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-orange-400" />
          <h2 className="text-base sm:text-lg text-slate-100 tracking-wide uppercase">
            CATALOG ENTRY SURFACE
          </h2>
        </div>
        <span className="text-[11px] text-orange-300 rounded bg-orange-950/60 px-2.5 py-1 border border-orange-800/50 self-start sm:self-auto">
          KEYSET SEARCH OVER 3,481,445 CANONICAL RECORDS
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Primary Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="SEARCH SERIES OR TITLE (E.G. AMAZING SPIDER-MAN, BATMAN, SPAWN)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-[#0E111B] pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="h-10 px-3 text-xs flex items-center gap-1.5 border-slate-700 hover:border-orange-500/60 hover:text-orange-300 w-1/2 sm:w-auto"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-orange-400" />
              <span>{showAdvanced ? "HIDE FILTERS" : "FILTERS"}</span>
            </Button>

            <Button
              type="submit"
              size="default"
              className="h-10 px-5 text-xs bg-orange-600 hover:bg-orange-500 text-white flex items-center gap-1.5 w-1/2 sm:w-auto"
            >
              <span>SEARCH</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Advanced Filter Row */}
        {showAdvanced && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80 text-xs">
            <div>
              <label className="block text-[10px] uppercase text-slate-400 mb-1">Issue #</label>
              <input
                type="text"
                placeholder="E.G. 1, 300, 1/2"
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                className="w-full rounded border border-slate-700 bg-[#0E111B] px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-slate-400 mb-1">Publisher</label>
              <input
                type="text"
                placeholder="E.G. Marvel, DC, Image"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                className="w-full rounded border border-slate-700 bg-[#0E111B] px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-slate-400 mb-1">Year</label>
              <input
                type="text"
                placeholder="E.G. 1962, 1988"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full rounded border border-slate-700 bg-[#0E111B] px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-slate-400 mb-1">Format / Variant</label>
              <select
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
                className="w-full rounded border border-slate-700 bg-[#0E111B] px-3 py-1.5 text-xs text-slate-100 focus:border-orange-500 focus:outline-none"
              >
                <option value="">All Editions</option>
                <option value="direct">Direct Edition</option>
                <option value="newsstand">Newsstand</option>
                <option value="variant">Variant Cover</option>
              </select>
            </div>
          </div>
        )}

        {/* Quick Search Tags */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
          <span className="text-slate-500">QUICK FILTERS:</span>
          {["Amazing Spider-Man", "Batman", "Uncanny X-Men", "Spawn", "Hulk", "Star Wars"].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                setQuery(tag);
                router.push(`/comics?q=${encodeURIComponent(tag)}`);
              }}
              className="rounded bg-slate-800/80 px-2 py-0.5 text-slate-300 hover:bg-orange-950/60 hover:text-orange-300 hover:border-orange-500/40 border border-slate-700/60 transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      </form>
    </section>
  );
}
