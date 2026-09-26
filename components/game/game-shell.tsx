import Link from "next/link";
import { ArrowUpRight, BookOpen, CircleUserRound, Layers3, Radar, Settings2 } from "lucide-react";
import { Profile } from "@/lib/account/types";
import { SignOutButton } from "@/components/shell/sign-out-button";

export function GameShell({ profile }: { profile: Profile }) {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:py-12">
      <div className="flex flex-col justify-between gap-5 border-b border-slate-800 pb-7 sm:flex-row sm:items-end">
        <div><p className="text-[10px] uppercase tracking-[0.28em] text-cyan-300">Player command / live account</p><h1 className="mt-3 text-4xl text-slate-100">Good evening, {profile.display_name || "operator"}.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">Your market workspace is online. The systems below are ready for the next authorized game layer.</p></div>
        <div className="flex items-center gap-3 text-xs text-slate-400"><Link href="/account" className="flex items-center gap-2 border border-slate-700 px-3 py-2 hover:border-cyan-300 hover:text-cyan-200"><CircleUserRound className="h-4 w-4" /> Account</Link><SignOutButton /></div>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[{ icon: Radar, label: "Market position", value: "Awaiting live game state", copy: "The authoritative market is connected; player decisions will appear here." }, { icon: Layers3, label: "Player identity", value: profile.display_name || "Unnamed player", copy: "Your authenticated profile is the player identity used by current profile-owned game surfaces." }, { icon: Settings2, label: "Firm context", value: "Not assigned", copy: "Firm presentation will use authorized game data when exposed by the game logic." }].map(({ icon: Icon, label, value, copy }) => <section key={label} className="border border-slate-800 bg-[#0d1118] p-5"><Icon className="h-5 w-5 text-cyan-300" /><p className="mt-7 text-[10px] uppercase tracking-[0.22em] text-slate-500">{label}</p><p className="mt-2 text-lg text-slate-100">{value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{copy}</p></section>)}
      </div>
      <section className="mt-4 border border-slate-800 bg-[#0d1118] p-6 sm:p-8"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><p className="text-[10px] uppercase tracking-[0.22em] text-amber-300">Primary workspace</p><h2 className="mt-3 text-2xl text-slate-100">The market is ready for your attention.</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">Use the catalog to research the authoritative universe, then bring conviction into your private collection and watchlist. No placeholder gameplay has been inserted here.</p></div><Link href="/comics" className="flex shrink-0 items-center gap-2 border border-amber-300/60 px-4 py-2 text-xs text-amber-200 hover:bg-amber-300 hover:text-slate-950">Open catalog <ArrowUpRight className="h-3.5 w-3.5" /></Link></div><div className="mt-8 grid gap-3 sm:grid-cols-2"><Link href="/collection" className="flex items-center gap-3 border border-slate-800 p-4 text-sm text-slate-200 hover:border-cyan-300"><BookOpen className="h-4 w-4 text-cyan-300" /> Review collection</Link><Link href="/watchlist" className="flex items-center gap-3 border border-slate-800 p-4 text-sm text-slate-200 hover:border-cyan-300"><Radar className="h-4 w-4 text-cyan-300" /> Review watchlist</Link></div></section>
    </main>
  );
}