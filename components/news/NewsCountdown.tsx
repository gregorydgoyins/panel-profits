"use client";

import * as React from "react";

const NEWS_CACHE_INTERVAL_MS = 10 * 60 * 1000;

export function NewsCountdown({ lastRefreshed }: { lastRefreshed?: string | null }) {
  const [secsLeft, setSecsLeft] = React.useState<number | null>(null);

  React.useEffect(() => {
    function compute() {
      const baseTime = lastRefreshed ? new Date(lastRefreshed).getTime() : Date.now();
      const elapsed = Date.now() - baseTime;
      const remaining = Math.max(0, NEWS_CACHE_INTERVAL_MS - elapsed);
      setSecsLeft(Math.ceil(remaining / 1000));
    }
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [lastRefreshed]);

  if (secsLeft === null) return null;

  const mins = Math.floor(secsLeft / 60);
  const secs = secsLeft % 60;
  const label =
    secsLeft === 0
      ? "refreshing..."
      : `Next refresh in ${mins}:${String(secs).padStart(2, "0")}`;

  return (
    <span className="text-[10px] font-mono tabular-nums text-slate-400 bg-slate-900/60 px-2.5 py-1 border border-slate-800 rounded">
      {label}
    </span>
  );
}
