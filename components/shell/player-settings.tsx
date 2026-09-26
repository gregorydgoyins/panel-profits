"use client";

import { Settings2, X } from "lucide-react";
import * as React from "react";

const TIMEZONES = [
  ["UTC", "UTC"],
  ["New York", "America/New_York"],
  ["London", "Europe/London"],
  ["Tokyo", "Asia/Tokyo"],
] as const;

const RAILS = [
  ["market-clocks", "Market clocks", true],
  ["market-barometers", "Market barometers", false],
  ["newsTicker", "News ticker", true],
  ["marketTelemetry", "Market telemetry", true],
  ["assets", "Assets rail", true],
  ["equities", "Equity rail", true],
  ["diary", "Diary rail", true],
] as const;

export function PlayerSettings() {
  const [open, setOpen] = React.useState(false);
  const [timezone, setTimezone] = React.useState("UTC");
  const [showSeconds, setShowSeconds] = React.useState(true);
  const [railVisibility, setRailVisibility] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setTimezone(localStorage.getItem("pp-clock-timezone") || "UTC");
    setShowSeconds(localStorage.getItem("pp-clock-seconds") !== "false");
    setRailVisibility(Object.fromEntries(RAILS.map(([key, , defaultValue]) => {
      const storageKey = key === "market-barometers" ? "pp-barometers-visible" : key === "market-clocks" ? "pp-clock-rail-visible" : `pp-rail-visible-${key}`;
      const stored = localStorage.getItem(storageKey);
      return [key, stored === null ? defaultValue : stored !== "false"];
    })));
  }, []);

  function updateTimezone(value: string) {
    setTimezone(value);
    localStorage.setItem("pp-clock-timezone", value);
    window.dispatchEvent(new CustomEvent("pp-clock-settings"));
  }

  function updateSeconds(value: boolean) {
    setShowSeconds(value);
    localStorage.setItem("pp-clock-seconds", String(value));
    window.dispatchEvent(new CustomEvent("pp-clock-settings"));
  }

  function updateRail(key: string, value: boolean) {
    const storageKey = key === "market-barometers" ? "pp-barometers-visible" : key === "market-clocks" ? "pp-clock-rail-visible" : `pp-rail-visible-${key}`;
    setRailVisibility((current) => ({ ...current, [key]: value }));
    localStorage.setItem(storageKey, String(value));
    window.dispatchEvent(new CustomEvent("pp-clock-settings"));
    window.dispatchEvent(new CustomEvent("pp-rail-settings"));
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Open player settings"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 w-8 items-center justify-center rounded border border-slate-700 text-slate-400 transition-colors hover:border-cyan-300/70 hover:text-cyan-200"
      >
        <Settings2 className="h-4 w-4" />
      </button>
      {open && (
        <div className="!fixed right-6 top-14 z-50 w-72 border border-cyan-300/40 bg-[#0b1018] p-4 shadow-2xl trading-rimlight-hover">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">Player controls</p>
              <p className="mt-1 text-xs text-slate-500">Market time display</p>
            </div>
            <button type="button" aria-label="Close player settings" onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-200">
              <X className="h-4 w-4" />
            </button>
          </div>
          <label className="mt-4 block text-[10px] uppercase tracking-[0.16em] text-slate-500">
            Clock zone
            <select value={timezone} onChange={(event) => updateTimezone(event.target.value)} className="mt-2 w-full border border-slate-700 bg-[#070a0f] px-2 py-2 text-xs text-slate-200 outline-none focus:border-cyan-300">
              {TIMEZONES.map(([label, value]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-300">
            <span>Show seconds</span>
            <input type="checkbox" checked={showSeconds} onChange={(event) => updateSeconds(event.target.checked)} className="accent-cyan-300" />
          </label>
          <p className="mt-4 border-t border-slate-800 pt-3 text-[10px] leading-4 text-slate-500">Your clock preference stays in this browser and controls the market-session timestamps.</p>
          <div className="mt-4 border-t border-slate-800 pt-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-300">Dashboard rails</p>
            <div className="mt-2 space-y-2">{RAILS.map(([key, label, defaultValue]) => <label key={key} className="flex items-center justify-between gap-3 text-xs text-slate-300"><span>{label}</span><input type="checkbox" checked={railVisibility[key] ?? defaultValue} onChange={(event) => updateRail(key, event.target.checked)} className="accent-cyan-300" /></label>)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
