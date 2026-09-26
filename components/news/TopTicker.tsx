"use client";

import * as React from "react";
import { getSourceTicker } from "@/lib/news/sourceTickerMap";
import type { NewsStory } from "@/lib/news/feed";

const SOURCE_COLORS: Record<string, string> = {
  CBR: "#c1121f",
  "BLEEDING COOL": "#e85d04",
  "THE BEAT": "#7b2d8b",
  AIPT: "#1b6b3a",
  ICV2: "#1d3557",
  NEWSARAMA: "#c77d05",
  CGC: "#2176ae",
  HERITAGE: "#264653",
  MULTIVERSITY: "#0077b6",
  "MAJOR SPOILERS": "#c9184a",
  "FIRSTCOMICSNEWS": "#059669",
  "COMIC VINE": "#d97706",
  "BROKEN FRONTIER": "#9d0208",
  COMICBOOK: "#1565c0",
  GOCOLLECT: "#00796b",
  SCREENRANT: "#880e4f",
  THR: "#7f1d1d",
  DEADLINE: "#1c1c1c",
  VARIETY: "#2d3748",
  CRUNCHYROLL: "#f97316",
  "OTAKU USA": "#ec4899",
  "ANIME HERALD": "#8b5cf6",
  "ANIME TRENDING": "#06b6d4",
  "COMICS JOURNAL": "#64748b",
  "COMICSXF": "#10b981",
  "BBC NEWS": "#dc2626",
};

function getSourceAccent(source: string): string {
  const norm = source.toUpperCase().trim();
  if (SOURCE_COLORS[norm]) return SOURCE_COLORS[norm];
  for (const [key, color] of Object.entries(SOURCE_COLORS)) {
    if (norm.includes(key)) return color;
  }
  const PALETTE = ["#1565c0", "#6a0dad", "#00796b", "#c77d05", "#7b2d8b", "#1b6b3a", "#9d0208", "#e85d04"];
  let hash = 0;
  for (let i = 0; i < source.length; i++) hash = (hash * 31 + source.charCodeAt(i)) & 0xffffffff;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

interface TopTickerProps {
  stories: NewsStory[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function TopTicker({ stories, activeId, onSelect }: TopTickerProps) {
  return (
    <section className="flex items-center gap-3 border-y border-slate-800/80 bg-[#07090F] px-3 py-2 overflow-hidden shadow-inner">
      <div className="shrink-0 text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400 font-semibold px-2 py-0.5 border-r border-slate-800">
        WIRE
      </div>

      <div className="flex items-center gap-2 overflow-x-auto py-0.5 no-scrollbar scroll-smooth">
        {stories.slice(0, 24).map((story) => {
          const isActive = story.id === activeId;
          const accent = getSourceAccent(story.source);
          return (
            <button
              key={story.id}
              onClick={() => onSelect(story.id)}
              className={`group flex shrink-0 items-center gap-2 border px-2.5 py-1 text-left transition-all ${
                isActive
                  ? "border-amber-400/90 bg-[#141824] shadow-[0_0_16px_rgba(251,191,36,0.2)]"
                  : "border-slate-800/80 bg-[#0B0E17] hover:border-slate-700 hover:bg-[#101420]"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: accent }} />
              <span className="max-w-[210px] truncate text-xs text-slate-200 group-hover:text-amber-100 font-medium">
                {story.headline}
              </span>
              <span className="text-[9px] font-mono font-semibold tracking-wider shrink-0" style={{ color: accent }}>
                {getSourceTicker(story.source)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
