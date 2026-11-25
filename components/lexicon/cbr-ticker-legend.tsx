"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, ArrowUpRight, BookOpen, Layers, ShieldCheck, Sparkles, TrendingUp, Building2, User } from "lucide-react";

export interface TickerLegendEntry {
  ticker: string;
  name: string;
  category: "INDEX" | "CORPORATE" | "CHARACTER" | "KEY_ISSUE";
  landmark: string;
  targetUrl: string;
  description: string;
  benchmarkPrice?: string;
}

export const CBR_TICKER_REGISTRY: TickerLegendEntry[] = [
  // 1. BENCHMARK INDICES
  {
    ticker: "$CE70",
    name: "Comic Equity 70 Sovereign Index",
    category: "INDEX",
    landmark: "70 Sovereign Blue-Chip Constituent Key Issues",
    targetUrl: "/equity/CE70",
    description: "Benchmark capital-weighted index tracking the top 70 sovereign Golden, Silver, and Bronze Age keys in CGC 9.8 / Anchor condition.",
  },
  {
    ticker: "$PPIX100",
    name: "Panel Profits Broad Market 100",
    category: "INDEX",
    landmark: "100 Verified Historical Keys",
    targetUrl: "/equity/PPIX100",
    description: "Broad-market aggregate measuring overall certified slab market liquidity and auction volume across all recognized publishers.",
  },
  {
    ticker: "$PPIX",
    name: "PPIX Composite Index",
    category: "INDEX",
    landmark: "Broad Market Sequential Art Composite",
    targetUrl: "/equities",
    description: "Composite market capitalization benchmark reflecting total capital stored across all verified comic book equities.",
  },
  {
    ticker: "$GOLD",
    name: "Golden Age Sovereign Basket",
    category: "INDEX",
    landmark: "1938–1955 Historical Foundation Keys",
    targetUrl: "/equities",
    description: "Ultra-high net worth portfolio tranche tracking Action Comics #1, Detective Comics #27, and foundational Golden Age rarities.",
  },
  {
    ticker: "$SLVR",
    name: "Silver Age Blue-Chip ETF",
    category: "INDEX",
    landmark: "1956–1969 Marvel & DC Genesis Keys",
    targetUrl: "/equities",
    description: "Core investment grade tranche tracking Amazing Fantasy #15, Fantastic Four #1, Avengers #1, and The X-Men #1.",
  },
  {
    ticker: "$BRNZ",
    name: "Bronze Age Liquidity Pool",
    category: "INDEX",
    landmark: "1970–1983 Landmark Debut Issues",
    targetUrl: "/equities",
    description: "High-volume investment grade keys anchored by Incredible Hulk #181, Giant-Size X-Men #1, and Amazing Spider-Man #129.",
  },

  // 2. CORPORATE & STUDIO PUBLIC EQUITIES
  {
    ticker: "$DIS",
    name: "The Walt Disney Company",
    category: "CORPORATE",
    landmark: "Marvel Studios · Lucasfilm · 20th Century Studios",
    targetUrl: "/news?q=Disney",
    description: "Parent studio equity governing Marvel Cinematic Universe theatrical and streaming adaptations, theme parks, and merchandise licensing.",
  },
  {
    ticker: "$WBD",
    name: "Warner Bros. Discovery",
    category: "CORPORATE",
    landmark: "DC Studios · DC Comics · HBO / Max",
    targetUrl: "/news?q=Warner+Bros",
    description: "Parent entertainment conglomerate directing James Gunn's DC Universe (DCU), Batman multimedia rights, and Warner Bros. Pictures slates.",
  },
  {
    ticker: "$SONY",
    name: "Sony Pictures Entertainment",
    category: "CORPORATE",
    landmark: "Sony's Spider-Man Universe (SSU)",
    targetUrl: "/news?q=Sony",
    description: "Theatrical studio controlling Spider-Man live-action and animated feature film rights, Venom, and connected Marvel character adaptations.",
  },
  {
    ticker: "$PARA",
    name: "Paramount Global / Skydance",
    category: "CORPORATE",
    landmark: "Teenage Mutant Ninja Turtles · Sonic Franchises",
    targetUrl: "/news?q=Paramount",
    description: "Major entertainment studio managing comic-adjacent cinematic franchises, animation portfolios, and streaming distribution.",
  },
  {
    ticker: "$CMCSA",
    name: "Comcast / Universal Pictures",
    category: "CORPORATE",
    landmark: "Universal Theme Parks · Peacock Distribution",
    targetUrl: "/news?q=Universal",
    description: "Conglomerate holding theme park licensing for Marvel superhero islands and global theatrical distribution channels.",
  },

  // 3. SOVEREIGN CHARACTER EQUITIES
  {
    ticker: "$SPDR",
    name: "Spider-Man (Peter Parker)",
    category: "CHARACTER",
    landmark: "Amazing Fantasy #15 (1962)",
    targetUrl: "/wiki/entry/spider-man",
    description: "The premier global superhero equity. First appearance commands multi-million-dollar clearing prices; highest trading volume character in sequential art.",
    benchmarkPrice: "$285,000 CGC 9.8 FMV",
  },
  {
    ticker: "$DOOM",
    name: "Doctor Doom (Victor Von Doom)",
    category: "CHARACTER",
    landmark: "Fantastic Four #5 (1962)",
    targetUrl: "/wiki/entry/doctor-doom",
    description: "Monarch of Latveria and prime antagonist of the Multiverse Saga. Sovereign Silver Age blue-chip villain investment anchor.",
    benchmarkPrice: "$95,000 CGC 9.8 FMV",
  },
  {
    ticker: "$DOOM:LATV",
    name: "Latverian Witches (Zefiro Coven)",
    category: "CHARACTER",
    landmark: "Astonishing Tales #8 / Triumph and Torment",
    targetUrl: "/wiki/entry/latverian-witches",
    description: "Ancestral Latverian sorcery coven and Mephisto pact continuity. Rapidly appreciating speculative catalyst asset.",
    benchmarkPrice: "$1,200 CGC 9.8 FMV",
  },
  {
    ticker: "$BAT",
    name: "Batman (Bruce Wayne)",
    category: "CHARACTER",
    landmark: "Detective Comics #27 (1939)",
    targetUrl: "/wiki/entry/batman",
    description: "DC's foundational sovereign blue chip. Commands consistent multi-million-dollar auction clearance records across authenticated high grades.",
    benchmarkPrice: "$850,000 CGC 9.8 FMV",
  },
  {
    ticker: "$SUPR",
    name: "Superman (Kal-El / Clark Kent)",
    category: "CHARACTER",
    landmark: "Action Comics #1 (1938)",
    targetUrl: "/wiki/entry/superman",
    description: "The birth certificate of the superhero genre. Holds the world record clearing price for any printed sequential art publication.",
    benchmarkPrice: "$1,200,000 CGC 9.8 FMV",
  },
  {
    ticker: "$WOLV",
    name: "Wolverine (Logan / Weapon X)",
    category: "CHARACTER",
    landmark: "The Incredible Hulk #181 (1974)",
    targetUrl: "/wiki/entry/wolverine",
    description: "The supreme Bronze Age investment bellwether. Unmatched liquidity velocity across all certified CGC census grades.",
    benchmarkPrice: "$42,000 CGC 9.8 FMV",
  },
  {
    ticker: "$XMEN",
    name: "The X-Men (Mutantkind)",
    category: "CHARACTER",
    landmark: "The X-Men #1 (1963) / Giant-Size X-Men #1",
    targetUrl: "/wiki/entry/x-men",
    description: "Marvel's foundational mutant allegorical masterwork. Anchors generational investment capital across Silver and Bronze Age registries.",
    benchmarkPrice: "$48,000 CGC 9.8 FMV",
  },
  {
    ticker: "$FF4",
    name: "Fantastic Four (Marvel's First Family)",
    category: "CHARACTER",
    landmark: "Fantastic Four #1 (1961)",
    targetUrl: "/wiki/entry/fantastic-four",
    description: "The catalyst issue that launched the Silver Age Marvel Universe. Fundamental cornerstone of modern pop culture and cinematic adaptation slates.",
    benchmarkPrice: "$165,000 CGC 9.8 FMV",
  },
  {
    ticker: "$THUN",
    name: "Thunderbolts (Reformed Anti-Heroes)",
    category: "CHARACTER",
    landmark: "The Incredible Hulk #449 / Thunderbolts #1",
    targetUrl: "/wiki/entry/thunderbolts",
    description: "Kurt Busiek and Mark Bagley's landmark 1997 creation. Active cinematic catalyst driver for Yelena Belova, Bucky Barnes, and Sentry.",
    benchmarkPrice: "$950 CGC 9.8 FMV",
  },
  {
    ticker: "$PNSH",
    name: "The Punisher (Frank Castle)",
    category: "CHARACTER",
    landmark: "The Amazing Spider-Man #129 (1974)",
    targetUrl: "/wiki/entry/punisher",
    description: "Bronze Age vigilante cornerstone created by Gerry Conway, Ross Andru, and John Romita Sr. Exceptional high-grade census demand.",
    benchmarkPrice: "$14,500 CGC 9.8 FMV",
  },
  {
    ticker: "$NURSE",
    name: "Claire Temple (Night Nurse)",
    category: "CHARACTER",
    landmark: "Hero for Hire #2 (1972) / Night Nurse #1",
    targetUrl: "/wiki/entry/claire-temple",
    description: "Street-level underground Harlem medic portrayed by Rosario Dawson. Bridge between Defenders television continuity and theatrical MCU.",
    benchmarkPrice: "$850 CGC 9.8 FMV",
  },

  // 4. HOLY GRAIL KEY ISSUE EQUITIES
  {
    ticker: "$AF15",
    name: "Amazing Fantasy #15",
    category: "KEY_ISSUE",
    landmark: "1st Appearance Spider-Man (1962)",
    targetUrl: "/comics?q=Amazing+Fantasy+%2315",
    description: "Stan Lee & Steve Ditko. The highest-valued modern comic book in existence; peak liquidity bellwether for the entire hobby.",
    benchmarkPrice: "$285,000 CGC 9.8 FMV",
  },
  {
    ticker: "$HULK181",
    name: "The Incredible Hulk #181",
    category: "KEY_ISSUE",
    landmark: "1st Full Appearance Wolverine (1974)",
    targetUrl: "/comics?q=Incredible+Hulk+%23181",
    description: "Len Wein, Herb Trimpe, John Romita Sr. The undisputed king of Bronze Age collectibles with over 14,000 graded copies on CGC census.",
    benchmarkPrice: "$42,000 CGC 9.8 FMV",
  },
  {
    ticker: "$FF1",
    name: "Fantastic Four #1",
    category: "KEY_ISSUE",
    landmark: "1st Appearance Fantastic Four & Origin (1961)",
    targetUrl: "/comics?q=Fantastic+Four+%231",
    description: "Stan Lee & Jack Kirby. The genesis of modern Marvel Comics. Sovereign anchor asset across all comic equity funds.",
    benchmarkPrice: "$165,000 CGC 9.8 FMV",
  },
  {
    ticker: "$TEC27",
    name: "Detective Comics #27",
    category: "KEY_ISSUE",
    landmark: "1st Appearance Batman (1939)",
    targetUrl: "/comics?q=Detective+Comics+%2327",
    description: "Bob Kane & Bill Finger. Top-3 most valuable cultural printed artifacts in human history. Under 100 copies known to survive.",
    benchmarkPrice: "$850,000 CGC 9.8 FMV",
  },
  {
    ticker: "$ACT1",
    name: "Action Comics #1",
    category: "KEY_ISSUE",
    landmark: "1st Appearance Superman (1938)",
    targetUrl: "/comics?q=Action+Comics+%231",
    description: "Jerry Siegel & Joe Shuster. The founding document of superhero mythology. Sells for over $6,000,000 in certified unrestored 8.5+.",
    benchmarkPrice: "$1,200,000 CGC 9.8 FMV",
  },
];

export function CbrTickerLegend() {
  const [activeTab, setActiveTab] = React.useState<"ALL" | "INDEX" | "CORPORATE" | "CHARACTER" | "KEY_ISSUE">("ALL");

  const filtered = React.useMemo(() => {
    if (activeTab === "ALL") return CBR_TICKER_REGISTRY;
    return CBR_TICKER_REGISTRY.filter((e) => e.category === activeTab);
  }, [activeTab]);

  return (
    <div id="ticker-legend" className="rounded-lg border border-slate-800 bg-[#0A0D15] p-6 sm:p-8 shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-cyan-400 font-semibold">
            <Activity className="h-3.5 w-3.5 text-cyan-400" />
            CBR Ticker Legend & Symbology Authority
          </div>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-100">
            CIMA Canonical Ticker Symbology
          </h2>
          <p className="mt-1 text-xs text-slate-400 max-w-2xl leading-relaxed">
            Standardized abbreviation codes designed for instantaneous trading desk identification. Derived from *The Book* Canon: <code className="text-cyan-300 font-mono">[SERIES_ROOT].[ISSUE].[ASSET_CLASS]</code> (e.g. <span className="text-amber-300 font-mono">ASM.300.SOV</span>).
          </p>
        </div>

        {/* Tab Filter */}
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-800 bg-[#07090F] p-1 text-[11px] font-mono">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`rounded px-2.5 py-1 transition-all ${
              activeTab === "ALL" ? "bg-cyan-950 text-cyan-300 border border-cyan-500/50" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All Tickers ({CBR_TICKER_REGISTRY.length})
          </button>
          <button
            onClick={() => setActiveTab("INDEX")}
            className={`rounded px-2.5 py-1 transition-all ${
              activeTab === "INDEX" ? "bg-cyan-950 text-cyan-300 border border-cyan-500/50" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Indices
          </button>
          <button
            onClick={() => setActiveTab("CORPORATE")}
            className={`rounded px-2.5 py-1 transition-all ${
              activeTab === "CORPORATE" ? "bg-indigo-950 text-indigo-300 border border-indigo-500/50" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Corporate
          </button>
          <button
            onClick={() => setActiveTab("CHARACTER")}
            className={`rounded px-2.5 py-1 transition-all ${
              activeTab === "CHARACTER" ? "bg-amber-950 text-amber-300 border border-amber-500/50" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Characters
          </button>
          <button
            onClick={() => setActiveTab("KEY_ISSUE")}
            className={`rounded px-2.5 py-1 transition-all ${
              activeTab === "KEY_ISSUE" ? "bg-emerald-950 text-emerald-300 border border-emerald-500/50" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Key Issues
          </button>
        </div>
      </div>

      {/* Ticker Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 text-[10px] font-mono uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-3 py-2.5">Symbol</th>
              <th className="px-3 py-2.5">Asset / Company</th>
              <th className="px-3 py-2.5">Landmark Basis</th>
              <th className="px-3 py-2.5">Benchmark Valuation</th>
              <th className="px-3 py-2.5 text-right">Detail Page</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filtered.map((item) => {
              const isIndex = item.category === "INDEX";
              const isCorp = item.category === "CORPORATE";
              const isChar = item.category === "CHARACTER";

              return (
                <tr key={item.ticker} className="hover:bg-slate-900/40 transition-colors group">
                  <td className="px-3 py-3 font-mono font-bold">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] border ${
                        isIndex
                          ? "bg-cyan-950/70 border-cyan-500/40 text-cyan-300"
                          : isCorp
                          ? "bg-indigo-950/70 border-indigo-500/40 text-indigo-300"
                          : isChar
                          ? "bg-amber-950/70 border-amber-500/40 text-amber-300"
                          : "bg-emerald-950/70 border-emerald-500/40 text-emerald-300"
                      }`}
                    >
                      {item.ticker}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                      {item.description}
                    </div>
                  </td>
                  <td className="px-3 py-3 font-mono text-[11px] text-slate-400">
                    {item.landmark}
                  </td>
                  <td className="px-3 py-3 font-mono text-[11px] text-emerald-400 font-medium">
                    {item.benchmarkPrice || "Clean Reference"}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      href={item.targetUrl}
                      className="inline-flex items-center gap-1 font-mono text-[10px] text-cyan-400 hover:text-cyan-200 transition-colors uppercase tracking-wider"
                    >
                      Inspect <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
