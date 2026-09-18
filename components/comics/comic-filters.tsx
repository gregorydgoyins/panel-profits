"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { RotateCcw, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ComicFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentIssue = searchParams.get("issue") || "";
  const currentPublisher = searchParams.get("publisher") || "";
  const currentYear = searchParams.get("year") || "";
  const currentVariant = searchParams.get("variant") || "all";

  const [issue, setIssue] = React.useState(currentIssue);
  const [publisher, setPublisher] = React.useState(currentPublisher);
  const [year, setYear] = React.useState(currentYear);
  const [variant, setVariant] = React.useState(currentVariant);

  React.useEffect(() => {
    setIssue(searchParams.get("issue") || "");
    setPublisher(searchParams.get("publisher") || "");
    setYear(searchParams.get("year") || "");
    setVariant(searchParams.get("variant") || "all");
  }, [searchParams]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("cursor");
    params.delete("prevCursor");

    if (value && value !== "all") {
      params.set(key, value.trim());
    } else {
      params.delete(key);
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.delete("cursor");
    params.delete("prevCursor");

    if (issue.trim()) params.set("issue", issue.trim());
    else params.delete("issue");

    if (publisher.trim()) params.set("publisher", publisher.trim());
    else params.delete("publisher");

    if (year.trim()) params.set("year", year.trim());
    else params.delete("year");

    if (variant && variant !== "all") params.set("variant", variant);
    else params.delete("variant");

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleReset = () => {
    setIssue("");
    setPublisher("");
    setYear("");
    setVariant("all");

    const params = new URLSearchParams(searchParams.toString());
    params.delete("issue");
    params.delete("publisher");
    params.delete("year");
    params.delete("variant");
    params.delete("cursor");
    params.delete("prevCursor");

    router.push(`${pathname}?${params.toString()}`);
  };

  const hasActiveFilters = Boolean(
    searchParams.get("issue") ||
    searchParams.get("publisher") ||
    searchParams.get("year") ||
    searchParams.get("variant")
  );

  return (
    <form
      onSubmit={handleApply}
      className="dashboard-rimlight-hover rounded-lg bg-[#111319] p-4 shadow-sm"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs uppercase text-slate-100">
          <Filter className="h-3.5 w-3.5 text-purple-400" />
          <span>CATALOG FILTERS</span>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>RESET ALL</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3">
        {/* Exact Issue Number */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-slate-400">
            ISSUE NUMBER
          </label>
          <Input
            type="text"
            placeholder="E.G. 1, 300, 1/2"
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            className="h-8 text-xs bg-[#0A0A0C]"
          />
        </div>

        {/* Publisher */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-slate-400">
            PUBLISHER
          </label>
          <Input
            type="text"
            placeholder="E.G. MARVEL, DC, IMAGE"
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
            className="h-8 text-xs bg-[#0A0A0C]"
          />
        </div>

        {/* Publication Year */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-slate-400">
            PUBLICATION YEAR
          </label>
          <Input
            type="number"
            placeholder="E.G. 1962, 1986, 2024"
            min="1900"
            max="2030"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="h-8 text-xs bg-[#0A0A0C]"
          />
        </div>

        {/* Direct / Newsstand / Variant */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-slate-400">
            FORMAT / VARIANT
          </label>
          <Select
            value={variant}
            onValueChange={(val) => {
              setVariant(val);
              updateParam("variant", val);
            }}
          >
            <SelectTrigger className="h-8 text-xs bg-[#0A0A0C]">
              <SelectValue placeholder="All Formats" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ALL FORMATS</SelectItem>
              <SelectItem value="direct">DIRECT EDITION</SelectItem>
              <SelectItem value="newsstand">NEWSSTAND</SelectItem>
              <SelectItem value="variant">COVER VARIANT</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-2 pt-2 border-t border-slate-800/60">
        <Button type="submit" size="sm" variant="default" className="px-4 bg-purple-600 hover:bg-purple-700 text-white">
          APPLY FILTERS
        </Button>
      </div>
    </form>
  );
}
