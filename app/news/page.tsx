import { Archive, Radio } from "lucide-react";
import Link from "next/link";
import { Newsroom } from "@/components/news/newsroom";
import { getNewsStories } from "@/lib/news/feed";

export const revalidate = 60;

export const metadata = {
  title: "Newsroom // Live Comic Wire | Panel Profits",
  description: "Live industry news wire, breaking publisher catalysts, and real-time comic bulletins.",
};

export default async function NewsPage() {
  const stories = await getNewsStories(60);

  return (
    <div className="relative min-h-screen text-[#e0e6ed] font-sans antialiased selection:bg-cyan-500 selection:text-black">
      {/* High-Resolution Live Newsroom Wire Full-Page Background */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat opacity-35 transition-opacity duration-700"
        style={{
          backgroundImage: `url('/brand/cbse-newsroom-wire-bg.jpg?v=20261124')`,
        }}
      />
      {/* Atmospheric vignette allowing rich backdrop visibility */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-[#070b14]/75 via-[#070b14]/65 to-[#070b14]/90" />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      {/* Top Header Bar */}
      <header className="border-b border-slate-800 pb-6 mb-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.28em] text-cyan-400">
              <Radio className="h-3.5 w-3.5 text-cyan-400 animate-pulse" /> Panel Profits Wire
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-slate-100">
              Newsroom
            </h1>
            <p className="mt-2 max-w-2xl text-xs sm:text-sm leading-6 text-slate-400">
              Real-time bulletins from major industry sources, covering breaking series announcements, market catalysts, and publisher intelligence.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/research/archive"
              className="flex items-center gap-2 border border-slate-800 bg-[#090C14]/90 backdrop-blur-sm px-3.5 py-2 text-[11px] font-mono uppercase tracking-[0.14em] text-cyan-300 hover:border-cyan-400/60 hover:text-cyan-200 transition-colors rounded"
            >
              <Archive className="h-3.5 w-3.5 text-cyan-400" /> Archive
            </Link>
            <Link
              href="/research"
              className="flex items-center gap-2 border border-slate-800 bg-[#090C14]/90 backdrop-blur-sm px-3.5 py-2 text-[11px] font-mono uppercase tracking-[0.14em] text-slate-300 hover:border-slate-600 hover:text-slate-100 transition-colors rounded"
            >
              Research Terminal
            </Link>
          </div>
        </div>
      </header>

      {/* Complete Rebuilt Newsroom Component */}
      <Newsroom stories={stories} />
    </main>
    </div>
  );
}
