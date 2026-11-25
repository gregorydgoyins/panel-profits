"use client";

import { Layers, Check, ChevronDown } from "lucide-react";
import * as React from "react";
import { usePathname } from "next/navigation";

interface RailItem {
  key: string;
  label: string;
  isHeaderSticky: boolean;
  defaultVisible: boolean;
}

const RAILS: RailItem[] = [
  { key: "market-clocks", label: "Market Clocks", isHeaderSticky: true, defaultVisible: true },
  { key: "market-barometers", label: "Market Barometers", isHeaderSticky: true, defaultVisible: false },
  { key: "newsTicker", label: "News Ticker Wire", isHeaderSticky: true, defaultVisible: true },
  { key: "marketTelemetry", label: "Market Telemetry", isHeaderSticky: true, defaultVisible: true },
  { key: "equities", label: "Sovereign Equity Rail", isHeaderSticky: false, defaultVisible: false },
  { key: "assets", label: "16 Asset Surfaces Rail", isHeaderSticky: false, defaultVisible: false },
  { key: "diary", label: "Operator Diary Rail", isHeaderSticky: false, defaultVisible: false },
];

export function RailsDropdown() {
  const pathname = usePathname() || "";
  const [open, setOpen] = React.useState(false);
  const [railVisibility, setRailVisibility] = React.useState<Record<string, boolean>>({});
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function load() {
      const state: Record<string, boolean> = {};
      for (const r of RAILS) {
        const storageKey =
          r.key === "market-barometers"
            ? "pp-barometers-visible"
            : r.key === "market-clocks"
            ? "pp-clock-rail-visible"
            : `pp-rail-visible-${r.key}`;
        const stored = localStorage.getItem(storageKey);
        if (stored !== null) {
          state[r.key] = stored === "true";
        } else {
          // Flow rails default to visible ONLY on home ("/")
          if (!r.isHeaderSticky) {
            state[r.key] = pathname === "/";
          } else {
            state[r.key] = r.defaultVisible;
          }
        }
      }
      setRailVisibility(state);
    }

    load();
    window.addEventListener("pp-rail-settings", load);
    window.addEventListener("pp-clock-settings", load);

    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("pp-rail-settings", load);
      window.removeEventListener("pp-clock-settings", load);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [pathname]);

  function toggleRail(key: string, currentValue: boolean) {
    const newValue = !currentValue;
    const storageKey =
      key === "market-barometers"
        ? "pp-barometers-visible"
        : key === "market-clocks"
        ? "pp-clock-rail-visible"
        : `pp-rail-visible-${key}`;
    localStorage.setItem(storageKey, String(newValue));
    setRailVisibility((prev) => ({ ...prev, [key]: newValue }));
    window.dispatchEvent(new CustomEvent("pp-rail-settings"));
    window.dispatchEvent(new CustomEvent("pp-clock-settings"));
  }

  // Count active rails
  const activeCount = Object.values(railVisibility).filter(Boolean).length;

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        type="button"
        aria-label="Toggle display rails"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded border border-slate-700/80 bg-[#07090e] px-2.5 py-1 text-[11px] font-mono tracking-wider text-slate-300 transition-colors hover:border-cyan-400 hover:text-cyan-200"
        title="Toggle header & market view rails"
      >
        <Layers className="h-3.5 w-3.5 text-cyan-400" />
        <span className="hidden sm:inline">RAILS</span>
        <span className="rounded bg-cyan-950/80 px-1 py-0.2 text-[9px] font-bold text-cyan-300 border border-cyan-800/50">
          {activeCount}
        </span>
        <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="!fixed right-4 top-14 z-[100] w-72 border border-cyan-500/30 bg-[#090d16] p-3 shadow-2xl backdrop-blur-xl sm:right-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300 font-bold">Display Rails</p>
              <p className="text-[10px] text-slate-500">Toggle telemetry and navigation rails</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 space-y-1">
            <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500 px-1">Sticky Telemetry</p>
            {RAILS.filter((r) => r.isHeaderSticky).map((r) => {
              const active = !!railVisibility[r.key];
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => toggleRail(r.key, active)}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs text-left text-slate-300 hover:bg-cyan-950/40 hover:text-cyan-200 transition-colors"
                >
                  <span className="truncate">{r.label}</span>
                  <div
                    className={`h-4 w-4 rounded flex items-center justify-center border text-[10px] ${
                      active
                        ? "border-cyan-500/60 bg-cyan-950 text-cyan-300"
                        : "border-slate-700 bg-black/40 text-transparent"
                    }`}
                  >
                    <Check className="h-3 w-3" />
                  </div>
                </button>
              );
            })}

            <div className="pt-2 border-t border-slate-800/80">
              <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500 px-1">Flow / Trading Rails</p>
              {RAILS.filter((r) => !r.isHeaderSticky).map((r) => {
                const active = !!railVisibility[r.key];
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => toggleRail(r.key, active)}
                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs text-left text-slate-300 hover:bg-cyan-950/40 hover:text-cyan-200 transition-colors"
                  >
                    <span className="truncate">{r.label}</span>
                    <div
                      className={`h-4 w-4 rounded flex items-center justify-center border text-[10px] ${
                        active
                          ? "border-cyan-500/60 bg-cyan-950 text-cyan-300"
                          : "border-slate-700 bg-black/40 text-transparent"
                      }`}
                    >
                      <Check className="h-3 w-3" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
