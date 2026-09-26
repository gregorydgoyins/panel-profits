import Link from "next/link";
import { User as UserIcon } from "lucide-react";
import { getCurrentUser, getUserProfile } from "@/lib/account/queries";
import { SystemClock } from "./system-clock";
import { SignOutButton } from "./sign-out-button";
import { PrimaryNav } from "./primary-nav";
import { PlayerSettings } from "./player-settings";
import { MarketClocks } from "./market-clocks";

export async function Header() {
  const user = await getCurrentUser();
  const profile = user ? await getUserProfile() : null;

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Account";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#090A0E]/95 backdrop-blur-md">
      {/* Top Compact Identity Row */}
      <div className="border-b border-slate-800/50 px-4 py-1.5 bg-[#06070A] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-purple-600 text-white text-[10px] tracking-wider font-light">
              PP
            </span>
            <div className="flex items-center gap-1.5 text-[11px] tracking-wider">
              <span className="text-slate-100 uppercase">PANEL PROFITS</span>
              <span className="text-slate-600">·</span>
              <span className="text-[10px] text-purple-400 uppercase tracking-widest hidden sm:inline">
                COMIC MARKET INTELLIGENCE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <SystemClock />
            <PlayerSettings />
            {user && (
              <div className="hidden sm:flex items-center gap-2 border-l border-slate-800 pl-3">
                <span className="text-slate-400">OPERATOR:</span>
                <span className="text-slate-200">{displayName}</span>
                <SignOutButton />
              </div>
            )}
          </div>
        </div>
      </div>

      <MarketClocks />

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-12 max-w-7xl items-center justify-between gap-4">
        <PrimaryNav />

        {/* Right Action: Account or Sign In */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/account"
                className="flex items-center gap-1.5 rounded px-2.5 py-1 text-slate-200 hover:text-purple-300 hover:bg-[#141620] transition-colors border border-purple-500/30 hover:border-purple-500/70 text-xs"
              >
                <UserIcon className="h-3.5 w-3.5 text-purple-400" />
                <span className="max-w-[110px] truncate">{displayName}</span>
              </Link>
              <div className="sm:hidden">
                <SignOutButton />
              </div>
            </div>
          ) : (
            <Link
              href="/sign-in"
              className="flex items-center gap-1.5 rounded px-3 py-1 text-slate-200 bg-purple-950/40 hover:bg-purple-900/60 transition-colors border border-purple-500/50 hover:border-purple-400 text-xs"
            >
              <UserIcon className="h-3.5 w-3.5 text-purple-400" />
              <span>SIGN IN</span>
            </Link>
          )}
        </div>
        </div>
      </div>
    </header>
  );
}
