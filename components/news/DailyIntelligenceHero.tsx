"use client";

import * as React from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Radio,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Volume2,
  Clock,
  CheckCircle2,
  Tv,
} from "lucide-react";
import type { NewsStory } from "@/lib/news/types";
import { PRESENTERS, type PresenterProfile } from "@/lib/video/pipeline";
import { analyzeStoryCatalyst } from "@/lib/news/catalyst";
import { createTwoSentenceAudioBrief } from "@/lib/news/audio-brief";

interface DailyIntelligenceHeroProps {
  story: NewsStory;
  videoUrl?: string;
  posterUrl?: string;
}

export function DailyIntelligenceHero({
  story,
  videoUrl = "/media/newsdesk-loop.mp4",
  posterUrl = "/media/anchor-face.jpg",
}: DailyIntelligenceHeroProps) {
  const [selectedPresenterKey, setSelectedPresenterKey] = React.useState<"corinne" | "marcus" | "elena">("corinne");
  const [isPlayingAudio, setIsPlayingAudio] = React.useState(false);
  const [audioProgress, setAudioProgress] = React.useState(0);
  const [activeChapterIndex, setActiveChapterIndex] = React.useState(0);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const presenter = PRESENTERS[selectedPresenterKey] || PRESENTERS.corinne;
  const catalyst = React.useMemo(() => {
    return analyzeStoryCatalyst(story.headline, story.summary);
  }, [story]);

  // Executive two-sentence spoken brief
  const twoSentenceBrief = React.useMemo(() => {
    return createTwoSentenceAudioBrief({
      headline: story.headline,
      summary: story.summary,
      source: story.source,
      catalystReasoning: catalyst.reasoning,
    });
  }, [story, catalyst]);

  // Chapters for synchronized broadcast scrubbing
  const chapters = React.useMemo(() => {
    const targetComic = catalyst.affectedComics[0]?.title || "Market Key Issues";
    return [
      { timeSec: 0, label: "Breaking Catalyst", subtext: "Wire Bulletin & Macro Impact" },
      { timeSec: 4, label: targetComic, subtext: `CGC 9.8 Valuation & Census Depth` },
      { timeSec: 8, label: "Floor Outlook", subtext: "Secondary Market Liquidity" },
    ];
  }, [catalyst]);

  const [usingBrowserVoice, setUsingBrowserVoice] = React.useState(false);

  // Fallback when the neural stream can't play: the browser's own speech engine.
  const speakWithBrowser = React.useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsPlayingAudio(false);
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(twoSentenceBrief);
    u.onboundary = (e) => {
      if (twoSentenceBrief.length) setAudioProgress(Math.min(100, (e.charIndex / twoSentenceBrief.length) * 100));
    };
    u.onend = () => {
      setIsPlayingAudio(false);
      setAudioProgress(0);
    };
    setUsingBrowserVoice(true);
    setIsPlayingAudio(true);
    window.speechSynthesis.speak(u);
  }, [twoSentenceBrief]);

  const stopAll = React.useCallback(() => {
    audioRef.current?.pause();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setIsPlayingAudio(false);
  }, []);

  React.useEffect(() => stopAll, [stopAll]);

  const playNeural = () => {
    const a = audioRef.current;
    if (!a) return speakWithBrowser();
    setUsingBrowserVoice(false);
    setIsPlayingAudio(true);
    a.play().catch(() => speakWithBrowser());
  };

  const toggleAudio = () => {
    if (isPlayingAudio) return stopAll();
    if (usingBrowserVoice) return speakWithBrowser();
    playNeural();
  };

  const handleSeekChapter = (index: number, timeSec: number) => {
    setActiveChapterIndex(index);
    if (audioRef.current) {
      audioRef.current.currentTime = timeSec;
      if (!isPlayingAudio && !usingBrowserVoice) playNeural();
    }
    if (videoRef.current) {
      videoRef.current.currentTime = timeSec % (videoRef.current.duration || 10);
    }
  };

  const audioSrc = `/api/news/tts?text=${encodeURIComponent(
    twoSentenceBrief
  )}&storyId=${encodeURIComponent(story.id)}&presenter=${selectedPresenterKey}`;

  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#070912] shadow-2xl">
      {/* Broadcast Station Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#090C16] px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-cyan-300 flex items-center gap-1.5">
            <Tv className="h-3.5 w-3.5 text-cyan-400" />
            Today On The Floor // Broadcast Desk
          </span>
        </div>

        {/* Presenter Switcher Tabs */}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#04060A] p-1">
          <button
            onClick={() => {
              setSelectedPresenterKey("corinne");
              stopAll();
              setUsingBrowserVoice(false);
            }}
            className={`rounded px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
              selectedPresenterKey === "corinne"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Corinne Howard
          </button>
          <button
            onClick={() => {
              setSelectedPresenterKey("marcus");
              stopAll();
              setUsingBrowserVoice(false);
            }}
            className={`rounded px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
              selectedPresenterKey === "marcus"
                ? "bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Marcus Vance
          </button>
          <button
            onClick={() => {
              setSelectedPresenterKey("elena");
              stopAll();
              setUsingBrowserVoice(false);
            }}
            className={`rounded px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
              selectedPresenterKey === "elena"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Elena Rostova
          </button>
        </div>
      </div>

      {/* Main Broadcast Stage: Video + Live Intelligence Rail */}
      <div className="grid gap-0 lg:grid-cols-12">
        {/* Left: Broadcast Video Feed */}
        <div className="relative aspect-video w-full bg-[#030407] lg:col-span-7 flex flex-col justify-end">
          <video
            ref={videoRef}
            src={videoUrl}
            poster={posterUrl}
            playsInline
            autoPlay
            loop
            muted
            className="h-full w-full object-cover"
          />

          {/* Lower Thirds Broadcast Chyrons */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <span className="rounded bg-red-600 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider text-white">
                LIVE DESK
              </span>
              <span className="font-mono text-xs font-bold text-slate-200">
                {presenter.name}
              </span>
              <span className="text-slate-500">·</span>
              <span className="font-mono text-[10px] text-cyan-300">
                {presenter.role}
              </span>
            </div>

            <h2 className="mt-1.5 text-base sm:text-lg font-bold text-white line-clamp-2 leading-snug">
              {story.headline}
            </h2>
          </div>
        </div>

        {/* Right: Audio Briefing & Chapter Scrubbing Rail */}
        <div className="flex flex-col justify-between border-t border-slate-800 bg-[#080B14] p-5 lg:col-span-5 lg:border-t-0 lg:border-l">
          <div>
            {/* Audio Stream Control Box */}
            <div className="rounded-xl border border-slate-800 bg-[#0B0F1C] p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={toggleAudio}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500 text-black hover:bg-cyan-400 transition-colors shadow-lg"
                    aria-label={isPlayingAudio ? "Pause Briefing" : "Play Executive Briefing"}
                  >
                    {isPlayingAudio ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5 ml-0.5" />
                    )}
                  </button>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                        90-Second Executive Audio Brief
                      </span>
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Anchored by {presenter.name} ({usingBrowserVoice ? "browser voice" : "ElevenLabs"})
                    </p>
                  </div>
                </div>

                <audio
                  ref={audioRef}
                  src={audioSrc}
                  preload="none"
                  onError={() => {
                    if (isPlayingAudio && !usingBrowserVoice) speakWithBrowser();
                  }}
                  onTimeUpdate={() => {
                    if (audioRef.current) {
                      const dur = audioRef.current.duration || 14;
                      const cur = audioRef.current.currentTime;
                      setAudioProgress((cur / dur) * 100);
                      if (cur >= 8) setActiveChapterIndex(2);
                      else if (cur >= 4) setActiveChapterIndex(1);
                      else setActiveChapterIndex(0);
                    }
                  }}
                  onEnded={() => {
                    setIsPlayingAudio(false);
                    setAudioProgress(0);
                    setActiveChapterIndex(0);
                  }}
                />
              </div>

              {/* Spoken Briefing Text Transcript */}
              <p className="mt-3 text-xs leading-relaxed text-slate-300 italic border-l-2 border-cyan-500/50 pl-3">
                "{twoSentenceBrief}"
              </p>
            </div>

            {/* Interactive Chapters */}
            <div className="mt-4">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500 font-semibold">
                Synchronized Chapter Markers
              </span>

              <div className="mt-2 space-y-1.5">
                {chapters.map((ch, idx) => {
                  const isActive = activeChapterIndex === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSeekChapter(idx, ch.timeSec)}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                        isActive
                          ? "border-cyan-500/50 bg-cyan-950/30 text-cyan-200"
                          : "border-slate-800/80 bg-[#090D18] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-cyan-400">
                          0:0{ch.timeSec}
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-slate-200">{ch.label}</p>
                          <p className="text-[10px] text-slate-500">{ch.subtext}</p>
                        </div>
                      </div>
                      {isActive && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Call to Action */}
          <div className="mt-5 border-t border-slate-800/80 pt-3 flex items-center justify-between">
            <span className="font-mono text-[10px] text-slate-500">
              Source: {story.source}
            </span>
            <Link
              href={`/news/${story.id}`}
              className="inline-flex items-center gap-1 font-mono text-xs font-semibold uppercase tracking-wider text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Full Story &amp; Dossier <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
