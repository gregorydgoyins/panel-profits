import Link from "next/link";
import { Activity, BookOpen, Layers, Bookmark, User as UserIcon } from "lucide-react";
import { getCurrentUser, getUserProfile } from "@/lib/account/queries";

export async function Header() {
  const user = await getCurrentUser();
  const profile = user ? await getUserProfile() : null;

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Account";

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
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden lg:flex items-center gap-2 rounded border border-slate-800 bg-[#111319] px-2.5 py-1 text-[11px] text-slate-300">
            <Activity className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            <span className="text-slate-400">INDEXED:</span>
            <span className="text-slate-100">3,481,445</span>
            <span className="text-slate-400">RECORDS</span>
          </div>

          <nav className="flex items-center gap-1 sm:gap-2 text-xs">
            <Link
              href="/comics"
              className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-slate-300 hover:text-orange-400 hover:bg-[#161822] transition-colors border border-transparent hover:border-orange-500/40"
            >
              <BookOpen className="h-3.5 w-3.5 text-orange-400" />
              <span className="hidden xs:inline">CATALOG</span>
            </Link>

            <Link
              href="/collection"
              className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-slate-300 hover:text-orange-400 hover:bg-[#161822] transition-colors border border-transparent hover:border-orange-500/40"
            >
              <Layers className="h-3.5 w-3.5 text-orange-400" />
              <span className="hidden xs:inline">COLLECTION</span>
            </Link>

            <Link
              href="/watchlist"
              className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-slate-300 hover:text-pink-400 hover:bg-[#161822] transition-colors border border-transparent hover:border-pink-500/40"
            >
              <Bookmark className="h-3.5 w-3.5 text-pink-400" />
              <span className="hidden xs:inline">WATCHLIST</span>
            </Link>

            {user ? (
              <Link
                href="/account"
                className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-slate-200 hover:text-purple-400 hover:bg-[#161822] transition-colors border border-purple-500/30 hover:border-purple-500/70"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    className="h-4 w-4 rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="h-3.5 w-3.5 text-purple-400" />
                )}
                <span className="max-w-[100px] truncate text-[11px]">{displayName}</span>
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="flex items-center gap-1.5 rounded px-3 py-1.5 text-slate-200 bg-purple-950/40 hover:bg-purple-900/60 transition-colors border border-purple-500/50 hover:border-purple-400 text-[11px]"
              >
                <UserIcon className="h-3.5 w-3.5 text-purple-400" />
                <span>SIGN IN</span>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
