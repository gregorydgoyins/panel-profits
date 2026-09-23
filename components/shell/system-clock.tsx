"use client";

import * as React from "react";

export function SystemClock() {
  const [timeStr, setTimeStr] = React.useState<string | null>(null);
  const [timezone, setTimezone] = React.useState("UTC");
  const [showSeconds, setShowSeconds] = React.useState(true);

  React.useEffect(() => {
    const loadSettings = () => {
      setTimezone(localStorage.getItem("pp-clock-timezone") || "UTC");
      setShowSeconds(localStorage.getItem("pp-clock-seconds") !== "false");
    };
    const updateTime = () => {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: showSeconds ? "2-digit" : undefined,
        hour12: false,
      }).format(now).replace(",", "");
      setTimeStr(`${timezone === "UTC" ? "UTC" : timezone.split("/").pop()?.replaceAll("_", " ")} ${formatted}`);
    };

    loadSettings();
    updateTime();
    const interval = setInterval(updateTime, 1000);
    window.addEventListener("pp-clock-settings", loadSettings);
    return () => {
      clearInterval(interval);
      window.removeEventListener("pp-clock-settings", loadSettings);
    };
  }, [timezone, showSeconds]);

  if (!timeStr) {
    return <span className="text-[10px] text-slate-500 tracking-wider">UTC LIVE TIME</span>;
  }

  return (
    <span className="text-[10px] text-slate-400 tracking-wider" aria-label="System Time">
      {timeStr}
    </span>
  );
}
