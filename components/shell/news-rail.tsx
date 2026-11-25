"use client";

import * as React from "react";
import { ArrowRight, Newspaper } from "lucide-react";
import { shortNewsSource, type NewsStory } from "@/lib/news/types";
import { getSourceTicker } from "@/lib/news/sourceTickerMap";
import { STRICT_NEGATIVE_FILTER } from "@/lib/news/self-healing";

interface NewsRailProps {
  initialStories: NewsStory[];
}

export function NewsRail({ initialStories }: NewsRailProps) {
  const [stories, setStories] = React.useState(() =>
    initialStories.filter((s) => !STRICT_NEGATIVE_FILTER.test(`${s.headline} ${s.summary || ""}`))
  );

  React.useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/news?limit=32", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json() as { stories?: NewsStory[] };
        if (active && Array.isArray(payload.stories)) {
          setStories(payload.stories.filter((s) => !STRICT_NEGATIVE_FILTER.test(`${s.headline} ${s.summary || ""}`)));
        }
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
    <aside aria-label="National and international news ticker" className="relative z-10 border-b border-slate-800/80 bg-[#090B10] py-1.5 text-xs text-slate-300">
      <div className="pp-shell-frame flex items-center gap-3">
        <div className="flex min-w-max shrink-0 items-center gap-1.5 whitespace-nowrap border-r border-slate-800 pr-4 text-[11px] text-cyan-400">
          <Newspaper className="h-3.5 w-3.5" />
          <span className="uppercase tracking-wider">NEWS TICKER</span>
        </div>
        <div className="news-marquee min-w-0 flex-1 overflow-hidden py-0.5" role="region" aria-label="Current national and international news">
          <div className="news-marquee-track flex w-max items-center gap-3 hover:[animation-play-state:paused] motion-reduce:animate-none">
            {[...stories, ...stories].map((story, index) => {
              const corpTicker = getSourceTicker(story.source);
              return (
                <a key={`${story.id}-${index}`} href={`/news/${story.id}`} className="group flex min-w-[320px] max-w-[720px] shrink-0 items-center gap-2.5 border border-slate-800/80 bg-[#0E111A] px-3 py-1.5 transition-colors hover:border-cyan-400/90 hover:bg-[#141824] rounded-sm">
                  {story.imageUrl ? (
                      <img src={story.imageUrl} alt="" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/newsroom-default.svg"; }} className="h-7 w-10 shrink-0 rounded-sm object-cover opacity-80" />
                  ) : null}
                  {corpTicker ? (
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] font-mono text-cyan-300 bg-[#0C1626] px-1.5 py-0.5 border border-cyan-500/40 rounded">
                      ${corpTicker}
                    </span>
                  ) : null}
                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">{shortNewsSource(story.source)}</span>
                  <span className="min-w-0 truncate text-xs font-normal text-slate-100 group-hover:text-cyan-200">{story.headline}</span>
                  <ArrowRight className="h-3 w-3 shrink-0 text-slate-500 group-hover:text-cyan-400 transition-transform group-hover:translate-x-0.5" />
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
