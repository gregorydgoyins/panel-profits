import { Archive, Activity, Radio } from "lucide-react";
import Link from "next/link";
import { Newsroom } from "@/components/news/newsroom";
import { getNewsStories } from "@/lib/news/feed";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Newsroom // Narrative Engine | Panel Profits",
  description: "Live newsroom wire, narrative analysis, and broadcast anchor desk inside Panel Profits.",
};

export default async function NewsPage() {
  const stories = await getNewsStories(60);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      {/* Top Header Bar */}
      <header className="border-b border-slate-800 pb-6 mb-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.28em] text-amber-300">
              <Radio className="h-3.5 w-3.5 text-rose-500 animate-pulse" /> Panel Profits Narrative Wire
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-slate-100">
              Newsroom Desk
            </h1>
            <p className="mt-2 max-w-2xl text-xs sm:text-sm leading-6 text-slate-400">
              Follow real-time industry catalysts, read lead story market analysis, and activate the live broadcast presenter on the floor.
            </p>
          </div>

          <Link
            href="/research/archive"
            className="flex w-fit items-center gap-2 border border-slate-800 bg-[#090C14] px-3.5 py-2 text-[11px] font-mono uppercase tracking-[0.14em] text-slate-300 hover:border-amber-400/60 hover:text-amber-200 transition-colors"
          >
            <Archive className="h-3.5 w-3.5 text-amber-400" /> Research Archive
          </Link>
        </div>
      </header>

      {/* Complete Final Newsroom Suite */}
      <Newsroom stories={stories} />
    </main>
  );
}
