import Link from "next/link";
import { Tv, ArrowLeft, Radio, Archive } from "lucide-react";
import { VideoArchiveTheater } from "@/components/video/video-archive-theater";
import { XMenMasterclassSerialization } from "@/components/video/XMenMasterclassSerialization";
import { ComicBaseArchiveTheater } from "@/components/video/comicbase-archive-theater";
import { NerdSyncCuratedShowcase } from "@/components/video/nerdsync-curated-showcase";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Video Intelligence Archive // Broadcast Recordings | Panel Profits",
  description: "Curated broadcast recordings, video presenter briefings, and connoisseurial deep dives on sovereign comic equities.",
};

export default function VideoArchivePage() {
  return (
    <div className="relative min-h-screen text-[#e0e6ed] font-sans antialiased selection:bg-rose-500 selection:text-white">
      {/* High-Resolution Broadcast Screening Theater Full-Page Background */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat opacity-40 transition-opacity duration-700"
        style={{
          backgroundImage: `url('/brand/cbse-theater-screening-bg.jpg?v=20261124')`,
        }}
      />
      {/* Atmospheric vignette allowing rich backdrop visibility */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-[#070b14]/75 via-[#070b14]/60 to-[#070b14]/90" />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10 space-y-10">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          href="/news"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.14em] text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Live Newsroom Wire
        </Link>
      </div>

      {/* Header */}
      <header className="border-b border-slate-800/80 pb-7">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.28em] text-rose-400">
              <Tv className="h-3.5 w-3.5" /> Video Intelligence Theater // Curated Recordings
            </div>
            <h1 className="mt-3 text-3xl sm:text-5xl font-black text-slate-100 tracking-tight">
              Broadcast Intelligence Archive
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
              Archived floor broadcasts, video presenter briefs, and connoisseurial YouTube deep dives analyzing landmark issues, historical auction hammers, and secondary market float economics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/research/archive"
              className="flex items-center gap-2 border border-slate-800 bg-[#090C14]/90 backdrop-blur-sm px-3.5 py-2 text-[11px] font-mono uppercase tracking-[0.14em] text-slate-300 hover:border-slate-600 hover:text-slate-100 transition-colors rounded"
            >
              <Archive className="h-3.5 w-3.5 text-cyan-400" /> News Archive
            </Link>
          </div>
        </div>
      </header>

      {/* Primary-Source ComicBase Vault: Creator Interviews & Masterclass Retrospectives */}
      <ComicBaseArchiveTheater />

      {/* ComicBookGirl19 3.5-Hour Serialized X-Men Masterclass (Chopped into Precision Chapters) */}
      <XMenMasterclassSerialization />

      {/* Scott Niswander's NerdSync: Forensic Science, Sequential Grammar & Speculation Laboratory */}
      <NerdSyncCuratedShowcase />

      {/* Full Video Archive Theater */}
      <VideoArchiveTheater />
    </main>
    </div>
  );
}
