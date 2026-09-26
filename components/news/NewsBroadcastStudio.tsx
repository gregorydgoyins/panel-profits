"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TopTicker } from "./TopTicker";
import { StoryPanel } from "./StoryPanel";
import { AnchorDesk } from "./AnchorDesk";
import { NewsCountdown } from "./NewsCountdown";
import type { NewsStory } from "@/lib/news/feed";
import "@/styles/newsroom-final.css";

interface NewsBroadcastStudioProps {
  initialStories: NewsStory[];
}

export function NewsBroadcastStudio({ initialStories }: NewsBroadcastStudioProps) {
  const [stories, setStories] = useState<NewsStory[]>(initialStories);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(initialStories[0]?.id || null);

  // Background auto-refresh polling
  useEffect(() => {
    let active = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/news?limit=60");
        if (res.ok) {
          const data = await res.json();
          if (active && Array.isArray(data.stories) && data.stories.length > 0) {
            setStories(data.stories);
          }
        }
      } catch {
        // Keep existing batch
      }
    }, 5 * 60 * 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const activeStory = useMemo(() => {
    if (!stories.length) return null;
    return stories.find((s) => s.id === activeStoryId) || stories[0];
  }, [stories, activeStoryId]);

  if (!stories.length || !activeStory) {
    return (
      <div
        className="newsroom-shell"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
        }}
      >
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "10px",
            color: "#df3b58",
            letterSpacing: "0.14em",
          }}
        >
          WAITING FOR WIRE DATA
        </span>
        <span style={{ fontSize: "11px", color: "#5a6374" }}>
          Connecting to Panel Profits newsroom feed...
        </span>
      </div>
    );
  }

  return (
    <div className="newsroom-shell">
      <Link href="/news" className="nr-back-link">
        <ArrowLeft style={{ width: 12, height: 12 }} />
        COMIC NEWS WIRE
      </Link>

      <header className="newsroom-topbar rim-panel">
        <div className="newsroom-brand">
          <span className="newsroom-brand__kicker">Panel Profits</span>
          <span className="newsroom-brand__title">Newsroom</span>
        </div>

        <div className="newsroom-topbar__chips">
          <span className="status-chip is-live">
            <span className="status-chip__dot" />
            LIVE
          </span>

          <span className="status-chip">Narrative Engine</span>

          <span className="status-chip">{stories.length} Stories</span>

          <NewsCountdown lastRefreshed={stories[0]?.ingestedAt} />
        </div>
      </header>

      <TopTicker
        stories={stories}
        activeId={activeStory.id}
        onSelect={(id) => setActiveStoryId(id)}
      />

      <main className="newsroom-layout">
        <StoryPanel story={activeStory} />

        <AnchorDesk
          story={activeStory}
          fallbackLoopVideo="/media/newsdesk-loop.mp4"
        />
      </main>
    </div>
  );
}
