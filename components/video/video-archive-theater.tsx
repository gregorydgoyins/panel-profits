"use client";

import * as React from "react";
import Link from "next/link";
import { Play, Video, Film, Eye, Clock, ArrowLeft, ExternalLink, Tv, Sparkles, CheckCircle2 } from "lucide-react";
import { AuthenticVideoEmbed, type AuthenticVideo } from "@/components/news/authentic-video-embed";

export interface VideoArchiveItem {
  id: string;
  title: string;
  channel: string;
  category: "market" | "connoisseur" | "census" | "craft";
  duration: string;
  views: string;
  date: string;
  topics: string[];
  description: string;
  video: AuthenticVideo;
  relatedComic?: {
    id: string;
    ticker: string;
    series: string;
    issue: string;
  };
}

const CURATED_VIDEO_ARCHIVE: VideoArchiveItem[] = [
  {
    id: "vid-01",
    title: "The Economics of CGC 9.8 Universal Blue Labels: Float & Valuation Models",
    channel: "Panel Profits Forensic Desk",
    category: "market",
    duration: "18:45",
    views: "34.2K",
    date: "2026-09-24",
    topics: ["Institutional Float", "Vault Collateral", "CGC Census Ratios"],
    description: "A comprehensive forensic deep dive into secondary market clearing mechanisms, analyzing why certified 9.8 universal copies serve as sovereign collateral across institutional auctions.",
    video: {
      provider: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/GnNWNv4n-qU",
      videoId: "GnNWNv4n-qU",
    },
    relatedComic: {
      id: "ASM01",
      ticker: "ASM01",
      series: "Amazing Spider-Man",
      issue: "1",
    },
  },
  {
    id: "vid-02",
    title: "Action Comics #1: Forensic Lineage of the Million-Dollar Grail",
    channel: "Comic Book Market Intelligence",
    category: "census",
    duration: "22:15",
    views: "58.1K",
    date: "2026-09-18",
    topics: ["Golden Age Anchor", "Census Survivorship", "Historical Hammers"],
    description: "Detailed historical examination of Action Comics #1, tracing the known pedigree copies, restoration discoveries, and the macroeconomic trajectory of Jerry Siegel & Joe Shuster's masterwork.",
    video: {
      provider: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/BvWDjHWgNgc",
      videoId: "BvWDjHWgNgc",
    },
    relatedComic: {
      id: "ACT01",
      ticker: "ACT01",
      series: "Action Comics",
      issue: "1",
    },
  },
  {
    id: "vid-03",
    title: "The Room Test (RTS): 20 Dimensions of Comic Connoisseurship",
    channel: "The Obsidian Bourse Journal",
    category: "connoisseur",
    duration: "15:30",
    views: "21.9K",
    date: "2026-09-12",
    topics: ["Room Test Score (RTS)", "Auteur Theory", "Graphic Sequential Art"],
    description: "Exploring the critical adjudication rubric applied to determine museum-grade aesthetic merit, authorial handwriting, and cultural gravity beyond mere speculative bubbles.",
    video: {
      provider: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/NjGUE8XaUn4",
      videoId: "NjGUE8XaUn4",
    },
  },
  {
    id: "vid-04",
    title: "Jack Kirby's Cosmic Dynamism: Visual Pacing in Fantastic Four #48-52",
    channel: "Strip Panel Naked",
    category: "craft",
    duration: "14:10",
    views: "42.6K",
    date: "2026-08-30",
    topics: ["Panel Architecture", "Galactus Trilogy", "Kirby Krackle"],
    description: "Panel-by-panel sequential analysis of Jack Kirby and Stan Lee's groundbreaking Galactus and Silver Surfer saga, studying how page layouts evoke cosmic dread and scale.",
    video: {
      provider: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/GnNWNv4n-qU",
      videoId: "GnNWNv4n-qU",
    },
    relatedComic: {
      id: "FF048",
      ticker: "FF048",
      series: "Fantastic Four",
      issue: "48",
    },
  },
  {
    id: "vid-05",
    title: "Bronze Age Liquidity Shift: Giant-Size X-Men #1 vs Incredible Hulk #181",
    channel: "Swagglehaus Comics",
    category: "market",
    duration: "16:22",
    views: "29.4K",
    date: "2026-08-15",
    topics: ["Bronze Age Grails", "Wolverine Debut", "Market Velocity"],
    description: "Comparing secondary market float, graded census totals, and annualized ROI between Len Wein's Giant-Size X-Men #1 and the first full appearance of Wolverine in Hulk #181.",
    video: {
      provider: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/BvWDjHWgNgc",
      videoId: "BvWDjHWgNgc",
    },
    relatedComic: {
      id: "HK181",
      ticker: "HK181",
      series: "Incredible Hulk",
      issue: "181",
    },
  },
  {
    id: "vid-06",
    title: "The EC Comics Moral Panic & The Senate Subcommittee of 1954",
    channel: "Cartoonist Kayfabe",
    category: "connoisseur",
    duration: "28:40",
    views: "64.8K",
    date: "2026-07-20",
    topics: ["Kefauver Hearings", "Crime SuspenStories #22", "Comics Code"],
    description: "Forensic breakdown of Johnny Craig's infamous Crime SuspenStories #22 severed head cover and the subsequent implementation of the Comics Code Authority that reshaped the industry.",
    video: {
      provider: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/TdBAHexVYzc",
      videoId: "TdBAHexVYzc",
    },
    relatedComic: {
      id: "CSS22",
      ticker: "CSS22",
      series: "Crime SuspenStories",
      issue: "22",
    },
  },
  {
    id: "vid-nerdsync-cap",
    title: "How CRISPR Explains Captain America's Super Soldier Serum!",
    channel: "NerdSync",
    category: "connoisseur",
    duration: "14:28",
    views: "184K",
    date: "2026-06-14",
    topics: ["CRISPR Cas9", "Captain America #1", "Retroviral Vectors", "Genetic Engineering"],
    description: "Scott Niswander deconstructs the biochemical reality of Dr. Abraham Erskine's Super Soldier Serum, demonstrating how modern CRISPR-Cas9 genome editing, myostatin suppression, and telomerase therapy map to Steve Rogers' transformation in Captain America Comics #1.",
    video: {
      provider: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/TdBAHexVYzc",
      videoId: "TdBAHexVYzc",
    },
    relatedComic: {
      id: "CAP01",
      ticker: "CAP01",
      series: "Captain America Comics",
      issue: "1",
    },
  },
  {
    id: "vid-cbg19-xmen",
    title: "X-Men History: The Complete Epic Saga (Silver Age to Modern Era)",
    channel: "ComicBookGirl19",
    category: "connoisseur",
    duration: "3:34:00",
    views: "520K",
    date: "2026-05-10",
    topics: ["X-Men History", "Giant-Size X-Men #1", "Dark Phoenix Saga", "Days of Future Past"],
    description: "Danika XXIX delivers the legendary 3.5-hour cinematic masterwork charting the complete history of Marvel's mutantkind: Stan Lee and Jack Kirby's Silver Age, the Civil Rights mutant metaphor, Chris Claremont and Dave Cockrum's 1975 renaissance, the Dark Phoenix tragedy, and Days of Future Past dystopian science fiction.",
    video: {
      provider: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/BvWDjHWgNgc",
      videoId: "BvWDjHWgNgc",
    },
    relatedComic: {
      id: "GSX01",
      ticker: "GSX01",
      series: "Giant-Size X-Men",
      issue: "1",
    },
  },
  {
    id: "vid-danikaxix-akira",
    title: "AKIRA: The Documentary — Katsuhiro Otomo's Cyberpunk Graphic Revolution",
    channel: "Danika XIX (ComicBookGirl19)",
    category: "connoisseur",
    duration: "2:45",
    views: "380K",
    date: "2026-06-20",
    topics: ["Akira #1", "Katsuhiro Otomo", "Cyberpunk Canon", "Epic Comics", "Steve Oliff"],
    description: "Danika XIX's feature documentary investigation exploring Katsuhiro Otomo's 1988 opus AKIRA, its localization by Marvel's Epic Comics with pioneering computer coloring by Steve Oliff, and its monumental cultural shockwave across global cinema and sequential art.",
    video: {
      provider: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/S1QZnN5e-CM",
      videoId: "S1QZnN5e-CM",
    },
    relatedComic: {
      id: "AKIRA01",
      ticker: "AKIRA01",
      series: "Akira",
      issue: "1",
    },
  },
  {
    id: "vid-nerdsync-ditko-spidey",
    title: "Why Spider-Man Used to Suck: How Steve Ditko's Objectivism Shaped Peter Parker",
    channel: "NerdSync",
    category: "craft",
    duration: "16:12",
    views: "410K",
    date: "2026-05-18",
    topics: ["Steve Ditko", "Ayn Rand Objectivism", "Amazing Spider-Man #1", "Stan Lee Collaboration"],
    description: "Scott Niswander deconstructs how Steve Ditko's philosophical embrace of Objectivism and moral absolutism directly shaped Peter Parker's isolation, bitter cynicism, and unyielding individual responsibility during the foundational Silver Age run.",
    video: {
      provider: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/Tu9SA3wMNv8",
      videoId: "Tu9SA3wMNv8",
    },
    relatedComic: {
      id: "ASM01",
      ticker: "ASM01",
      series: "Amazing Spider-Man",
      issue: "1",
    },
  },
  {
    id: "vid-nerdsync-superman-nuke",
    title: "Superman's Uncomfortable History with Nuclear Weapons: Cold War Censorship & The Manhattan Project",
    channel: "NerdSync",
    category: "connoisseur",
    duration: "15:40",
    views: "295K",
    date: "2026-04-12",
    topics: ["Action Comics #1", "Manhattan Project", "US War Department Censorship", "Cold War Paranoia"],
    description: "An extraordinary historical deep dive into how the US War Department actively censored DC Comics during World War II when a Superman storyline accidentally anticipated secret atomic bomb tests, and how the Man of Steel became entangled with nuclear geopolitics.",
    video: {
      provider: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/qBMHaM_3JhA",
      videoId: "qBMHaM_3JhA",
    },
    relatedComic: {
      id: "ACT01",
      ticker: "ACT01",
      series: "Action Comics",
      issue: "1",
    },
  },
  {
    id: "vid-nerdsync-tights",
    title: "Why Do Superheroes Wear Tights? Circus Strongmen, Anatomy, and Golden Age Aesthetics",
    channel: "NerdSync",
    category: "craft",
    duration: "11:55",
    views: "530K",
    date: "2026-03-02",
    topics: ["Superhero Visual Design", "Circus Strongmen", "Action Comics #1", "Four-Color Printing"],
    description: "Scott Niswander traces the evolutionary morphology of superhero costume design from early 20th-century Vaudeville circus strongmen and athletic leotards to Jack Kirby and Joe Shuster's four-color newsprint requirements.",
    video: {
      provider: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/Pgwsmt2utX4",
      videoId: "Pgwsmt2utX4",
    },
    relatedComic: {
      id: "ACT01",
      ticker: "ACT01",
      series: "Action Comics",
      issue: "1",
    },
  },
  {
    id: "vid-nerdsync-mj-peter",
    title: "The Beautiful Origin of Mary Jane and Peter Parker's Relationship",
    channel: "NerdSync",
    category: "connoisseur",
    duration: "13:30",
    views: "340K",
    date: "2026-02-14",
    topics: ["Amazing Spider-Man #42", "John Romita Sr", "Face it Tiger", "Romance Realism"],
    description: "Analyzing the 18-issue running gag teasing Mary Jane Watson's face, culminating in John Romita Sr.'s legendary panel in Amazing Spider-Man #42, and how Mary Jane transformed Marvel's interpersonal realism forever.",
    video: {
      provider: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/4xtzfzDkWzs",
      videoId: "4xtzfzDkWzs",
    },
    relatedComic: {
      id: "ASM042",
      ticker: "ASM042",
      series: "Amazing Spider-Man",
      issue: "42",
    },
  },
  {
    id: "vid-nerdsync-batman-knight",
    title: "Could Batman Be a Literal Dark Knight? Chivalric Codes, Feudal Martial Law & Bruce Wayne",
    channel: "NerdSync",
    category: "connoisseur",
    duration: "14:15",
    views: "260K",
    date: "2026-01-28",
    topics: ["Detective Comics #27", "Medieval Chivalry", "Sovereign Justice", "Dark Knight Returns"],
    description: "Scott Niswander examines the historic qualifications of medieval European knighthood, code of arms, and extrajudicial enforcement, asking if Bruce Wayne's moral code and combat discipline would officially qualify him as a sovereign knight errant.",
    video: {
      provider: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/smcnGd3pCIc",
      videoId: "smcnGd3pCIc",
    },
    relatedComic: {
      id: "TEC027",
      ticker: "TEC027",
      series: "Detective Comics",
      issue: "27",
    },
  },
  {
    id: "vid-nerdsync-clone-saga",
    title: "Why the Spider-Man Clone Saga Sucks: 90s Speculative Mania & Editorial Chaos",
    channel: "NerdSync",
    category: "market",
    duration: "18:20",
    views: "480K",
    date: "2025-11-15",
    topics: ["Clone Saga", "90s Speculative Bubble", "Amazing Spider-Man", "Editorial Mandates"],
    description: "Scott Niswander breaks down how Marvel's 1990s speculative boom, variant gimmicks, and uncontrolled editorial extension warped Terry Kavanagh's original three-month Clone Saga story into a multi-year disaster that nearly bankrupted Marvel Comics.",
    video: {
      provider: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/YUJRJNRqfh4",
      videoId: "YUJRJNRqfh4",
    },
    relatedComic: {
      id: "ASM01",
      ticker: "ASM01",
      series: "Amazing Spider-Man",
      issue: "1",
    },
  },
  {
    id: "vid-longbox-cgc-keys",
    title: "Lords of the Long Box: High-Grade CGC Mail Call & Hidden Bronze Age Keys",
    channel: "Lords of the Long Box (T-VO)",
    category: "census",
    duration: "24:18",
    views: "45K",
    date: "2024-05-12",
    topics: ["CGC Mail Call", "Bronze Age Keys", "Long Box Digging", "Speculation"],
    description: "Tim Vo ('T-VO') unboxes high-grade CGC blue labels from recent estate long-box hunts, breaking down yield rates, census scarcity, and back-issue undervalued keys before mainstream market discovery.",
    video: {
      provider: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/6HvKD6APOpA",
      videoId: "6HvKD6APOpA",
    },
    relatedComic: {
      id: "HK181",
      ticker: "HK181",
      series: "Incredible Hulk",
      issue: "181",
    },
  },
  {
    id: "vid-longbox-mcu-spec",
    title: "Lords of the Long Box: Cinematic Catalyst Speculation & Character Debut Keys",
    channel: "Lords of the Long Box (T-VO)",
    category: "market",
    duration: "29:40",
    views: "68K",
    date: "2024-04-02",
    topics: ["Cinematic Adaptation", "First Appearance Keys", "Market Velocity", "Long Box Spec"],
    description: "T-VO's legendary insider speculation breakdown: analyzing how Hollywood production whispers and option agreements ripple through secondary market float months ahead of official trailer drops.",
    video: {
      provider: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/cM3f_w1xG_o",
      videoId: "cM3f_w1xG_o",
    },
    relatedComic: {
      id: "ASM01",
      ticker: "ASM01",
      series: "Amazing Spider-Man",
      issue: "1",
    },
  },
];

export function VideoArchiveTheater() {
  const [selectedVideo, setSelectedVideo] = React.useState<VideoArchiveItem>(CURATED_VIDEO_ARCHIVE[0]);
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const filteredVideos = React.useMemo(() => {
    return CURATED_VIDEO_ARCHIVE.filter((vid) => {
      if (categoryFilter === "cbg19" && !vid.channel.toLowerCase().includes("danika") && !vid.channel.toLowerCase().includes("comicbookgirl")) return false;
      if (categoryFilter === "nerdsync" && !vid.channel.toLowerCase().includes("nerdsync")) return false;
      if (categoryFilter === "longbox" && !vid.channel.toLowerCase().includes("long box")) return false;
      if (categoryFilter !== "all" && categoryFilter !== "cbg19" && categoryFilter !== "nerdsync" && categoryFilter !== "longbox" && vid.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          vid.title.toLowerCase().includes(q) ||
          vid.channel.toLowerCase().includes(q) ||
          vid.topics.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [categoryFilter, searchQuery]);

  return (
    <div className="space-y-10">
      {/* ── Main Theater Stage ─────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-800 bg-[#070A10] p-4 sm:p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Video Player */}
          <div className="lg:w-2/3">
            <AuthenticVideoEmbed
              video={selectedVideo.video}
              headline={selectedVideo.title}
            />
          </div>

          {/* Right: Broadcast Dossier */}
          <div className="lg:w-1/3 flex flex-col justify-between py-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-rose-950/60 border border-rose-500/40 px-2.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-rose-300">
                  {selectedVideo.category.toUpperCase()} BROADCAST
                </span>
                <span className="text-[10px] font-mono text-slate-500">{selectedVideo.date}</span>
              </div>

              <h2 className="mt-3 text-lg sm:text-xl font-bold text-slate-100 leading-snug">
                {selectedVideo.title}
              </h2>

              <p className="mt-2 text-xs font-mono text-cyan-400 font-semibold">
                Presented by {selectedVideo.channel}
              </p>

              <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                {selectedVideo.description}
              </p>

              {/* Topics */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {selectedVideo.topics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Meta & Related Ticker */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-500" /> {selectedVideo.duration}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5 text-slate-500" /> {selectedVideo.views} views
                </span>
              </div>

              {selectedVideo.relatedComic && (
                <Link
                  href={`/comics/${encodeURIComponent(selectedVideo.relatedComic.ticker)}`}
                  className="inline-flex items-center gap-1.5 rounded bg-cyan-950/70 border border-cyan-500/40 px-3 py-1 text-[11px] font-mono font-bold text-cyan-300 hover:bg-cyan-900/60 transition-colors"
                >
                  Inspect {selectedVideo.relatedComic.ticker} &rarr;
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Video Library Browser & Category Filters ───────────────── */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Film className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
              Archived Broadcast Library ({filteredVideos.length} Episodes)
            </h3>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              { id: "all", label: "All Broadcasts" },
              { id: "longbox", label: "Lords of the Long Box" },
              { id: "cbg19", label: "Danika XIX / CBG19" },
              { id: "nerdsync", label: "NerdSync Science" },
              { id: "market", label: "Market Valuations" },
              { id: "connoisseur", label: "Connoisseur Panels" },
              { id: "census", label: "Census Reports" },
              { id: "craft", label: "Sequential Craft" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`rounded px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors ${
                  categoryFilter === cat.id
                    ? "bg-cyan-950 text-cyan-300 border border-cyan-500/60 font-semibold"
                    : "bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Video Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVideos.map((vid) => {
            const isPlaying = selectedVideo.id === vid.id;
            return (
              <div
                key={vid.id}
                onClick={() => setSelectedVideo(vid)}
                className={`group flex flex-col justify-between rounded-xl border p-4 cursor-pointer transition-all shadow-lg ${
                  isPlaying
                    ? "border-cyan-500 bg-[#0C121E] shadow-cyan-950/40"
                    : "border-slate-800/80 bg-[#080B12] hover:border-slate-700 hover:bg-[#0B0F18]"
                }`}
              >
                <div>
                  {/* Thumbnail / Header Area */}
                  <div className="relative aspect-video w-full rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center group-hover:border-slate-700 transition-colors">
                    <div className="flex flex-col items-center gap-2 text-slate-500 group-hover:text-cyan-300 transition-colors">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/90 border border-slate-700 shadow-md group-hover:border-cyan-500/60 group-hover:scale-105 transition-all">
                        <Play className="h-5 w-5 text-cyan-400 fill-cyan-400 ml-0.5" />
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-wider">Play Broadcast</span>
                    </div>

                    {/* Duration badge */}
                    <div className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-0.5 text-[9px] font-mono text-slate-300">
                      {vid.duration}
                    </div>

                    {/* Active playing indicator */}
                    {isPlaying && (
                      <div className="absolute top-2 left-2 rounded bg-cyan-950/90 border border-cyan-500/60 px-2 py-0.5 text-[9px] font-mono text-cyan-300 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        NOW PLAYING
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span className="text-cyan-400 font-semibold">{vid.channel}</span>
                    <span>{vid.date}</span>
                  </div>

                  <h4 className="mt-1.5 text-sm font-bold text-slate-100 group-hover:text-cyan-200 transition-colors line-clamp-2">
                    {vid.title}
                  </h4>

                  <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {vid.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500">{vid.views} views</span>
                  {vid.relatedComic ? (
                    <span className="text-cyan-400 font-semibold">{vid.relatedComic.ticker}</span>
                  ) : (
                    <span className="text-slate-600">Archival</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
