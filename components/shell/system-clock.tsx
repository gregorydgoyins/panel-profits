"use client";

import * as React from "react";

export function SystemClock() {
  const [timeStr, setTimeStr] = React.useState<string | null>(null);

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format: UTC YYYY-MM-DD HH:mm:ss
      const iso = now.toISOString().replace("T", " ").replace(/\..+/, "");
      setTimeStr(`UTC ${iso}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!timeStr) {
    return <span className="text-[10px] text-slate-500 tracking-wider">UTC LIVE TIME</span>;
  }

  return (
    <span className="text-[10px] text-slate-400 tracking-wider" aria-label="System Time">
      {timeStr}
    </span>
  );
}
