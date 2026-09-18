import Link from "next/link";
import { Activity } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#0A0A0C]/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Title */}
        <div className="flex items-center gap-3">
          <Link href="/comics" className="flex items-center gap-2.5 group">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-600 text-white text-xs tracking-wider group-hover:bg-blue-500 transition-colors">
              PP
            </div>
            <div className="flex flex-col">
              <span className="text-sm tracking-tight text-slate-100 group-hover:text-blue-400 transition-colors">
                PANEL PROFITS
              </span>
              <span className="text-[9px] uppercase tracking-widest text-slate-400">
                MARKET INTELLIGENCE & CATALOG
              </span>
            </div>
          </Link>
        </div>

        {/* Live Metrics & Navigation */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 rounded border border-slate-800 bg-[#111319] px-2.5 py-1 text-[11px] text-slate-300">
            <Activity className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            <span className="text-slate-400">INDEXED:</span>
            <span className="text-slate-100">3,481,445</span>
            <span className="text-slate-400">RECORDS</span>
          </div>

          <nav className="flex items-center gap-1.5 text-xs">
            <Link
              href="/comics"
              className="rounded px-3 py-1.5 text-slate-100 hover:bg-[#161822] hover:text-amber-400 transition-colors border border-transparent hover:border-amber-500/40"
            >
              MARKETS
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
