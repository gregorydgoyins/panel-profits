"use client";

import * as React from "react";
import { ArrowRight, Newspaper } from "lucide-react";
import { shortNewsSource, type NewsStory } from "@/lib/news/feed";

interface NewsRailProps {
  initialStories: NewsStory[];
}

export function NewsRail({ initialStories }: NewsRailProps) {
  const [stories, setStories] = React.useState(initialStories);

  React.useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/news?limit=32", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json() as { stories?: NewsStory[] };
        if (active && Array.isArray(payload.stories)) setStories(payload.stories);
      } catch {
        // The last stored batch remains visible when a source is unavailable.
      }
    };
    const interval = window.setInterval(load, 5 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  if (!stories.length) return null;

  return (
    <aside aria-label="National and international news ticker" className="border-b border-slate-800/80 bg-[#090B10] px-4 py-1.5 text-xs text-slate-300 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <div className="flex min-w-max shrink-0 items-center gap-1.5 whitespace-nowrap border-r border-slate-800 pr-4 text-[11px] text-amber-300">
          <Newspaper className="h-3.5 w-3.5" />
          <span className="uppercase tracking-wider">NEWS TICKER</span>
        </div>
        <div className="news-marquee min-w-0 flex-1 overflow-hidden py-0.5" role="region" aria-label="Current national and international news">
          <div className="news-marquee-track flex w-max items-center gap-3 hover:[animation-play-state:paused] motion-reduce:animate-none">
            {[...stories, ...stories].map((story, index) => (
            <a key={`${story.id}-${index}`} href={`/news/${story.id}`} className="group flex min-w-[260px] max-w-[420px] shrink-0 items-center gap-2 border border-slate-800/70 bg-[#0E111A] px-2.5 py-1 transition-colors hover:border-amber-300/80 hover:bg-[#141824]">
              {story.imageUrl ? (
                  <img src={story.imageUrl} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/newsroom-default.svg"; }} className="h-7 w-10 shrink-0 object-cover opacity-75" />
              ) : null}
              <span className="shrink-0 text-[9px] uppercase tracking-[0.12em] text-amber-300">{shortNewsSource(story.source)}</span>
              <span className="min-w-0 truncate text-[11px] text-slate-200 group-hover:text-amber-200">{story.headline}</span>
              <ArrowRight className="h-3 w-3 shrink-0 text-slate-600 group-hover:text-amber-300" />
            </a>
          ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
