import Link from "next/link";
import { Database, ShieldCheck, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-graphite-800 bg-graphite-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Title */}
        <div className="flex items-center gap-3">
          <Link href="/comics" className="flex items-center gap-2 group">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-cobalt text-white font-mono font-bold text-xs tracking-wider group-hover:bg-cobalt-600 transition-colors">
              PP
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-chalk">
                PANEL PROFITS
              </span>
              <span className="text-[9px] font-mono uppercase tracking-widest text-graphite-400">
                MARKET INTELLIGENCE & CATALOG
              </span>
            </div>
          </Link>
        </div>

        {/* Live Metrics & Navigation */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 rounded border border-graphite-800 bg-graphite-900/80 px-2.5 py-1 text-[11px] font-mono text-graphite-300">
            <Activity className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            <span className="text-graphite-400">INDEXED:</span>
            <span className="font-semibold text-chalk">3,481,445</span>
            <span className="text-graphite-500">RECORDS</span>
          </div>

          <nav className="flex items-center gap-2">
            <Link
              href="/comics"
              className="rounded px-3 py-1.5 text-xs font-mono font-medium text-chalk hover:bg-graphite-800 transition-colors"
            >
              CATALOG
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
