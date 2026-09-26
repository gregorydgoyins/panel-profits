"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Radio, Search, SlidersHorizontal } from "lucide-react";
import { type NewsStory } from "@/lib/news/feed";
import { TopTicker } from "@/components/news/TopTicker";
import { StoryPanel } from "@/components/news/StoryPanel";
import { AnchorDesk } from "@/components/news/AnchorDesk";
import { NewsCountdown } from "@/components/news/NewsCountdown";

interface NewsroomProps {
  stories: NewsStory[];
}

export function Newsroom({ stories }: NewsroomProps) {
  const [activeStoryId, setActiveStoryId] = React.useState<string>(stories[0]?.id || "");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const filteredStories = React.useMemo(() => {
    if (!searchQuery.trim()) return stories;
    const q = searchQuery.toLowerCase();
    return stories.filter(
      (s) =>
        s.headline.toLowerCase().includes(q) ||
        s.source.toLowerCase().includes(q) ||
        (s.summary && s.summary.toLowerCase().includes(q))
    );
  }, [stories, searchQuery]);

  const activeStory = React.useMemo(() => {
    if (!filteredStories.length) return null;
    return filteredStories.find((s) => s.id === activeStoryId) || filteredStories[0];
  }, [filteredStories, activeStoryId]);

  if (!stories.length || !activeStory) {
    return (
      <div className="border border-slate-800 bg-[#0A0D14] p-12 text-center text-sm text-slate-500">
        <span className="font-mono text-xs text-amber-300 uppercase tracking-widest">
          WAITING FOR LIVE WIRE INGESTION...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Ticker Wire */}
      <TopTicker stories={filteredStories} activeId={activeStory.id} onSelect={setActiveStoryId} />

      {/* Studio Header Bar & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono tracking-wider uppercase rounded border border-rose-500/60 bg-rose-950/40 text-rose-300">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
            LIVE
          </span>
          <span className="px-2.5 py-1 text-[10px] font-mono tracking-wider uppercase rounded border border-slate-800 bg-slate-900/60 text-slate-300">
            Narrative Engine
          </span>
          <span className="px-2.5 py-1 text-[10px] font-mono tracking-wider uppercase rounded border border-slate-800 bg-slate-900/60 text-amber-300">
            {filteredStories.length} Stories Active
          </span>
          <NewsCountdown lastRefreshed={stories[0]?.ingestedAt} />
        </div>

        <label className="flex items-center gap-2 border border-slate-800 bg-[#080B11] px-3 py-1.5 text-xs text-slate-400 sm:w-64 rounded">
          <Search className="h-3.5 w-3.5 text-slate-500" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search wire or ticker..."
            className="w-full bg-transparent outline-none placeholder:text-slate-600 text-slate-200 text-xs"
          />
        </label>
      </div>

      {/* Main Broadcast Stage: 2-Column Newsroom Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">
        {/* Left Column: Story Dossier & Analysis Grid */}
        <div className="min-w-0">
          <StoryPanel story={activeStory} />
        </div>

        {/* Right Column: Lead Anchor Broadcast Desk */}
        <div className="lg:sticky lg:top-20 space-y-4">
          <AnchorDesk story={activeStory} />
        </div>
      </div>
    </div>
  );
}
