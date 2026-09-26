"use client";

import { Mic, Play, RotateCcw, Square, Radio, Users, Gauge, Activity } from "lucide-react";
import * as React from "react";
import { buildAnchorScript, type ScriptPacket, type SubtitleCue } from "@/lib/news/broadcast-script";
import { AnchorAvatar, ANCHOR_PERSONAS, type AnchorPersona } from "@/components/news/anchor-avatar";

interface NewsAnchorProps {
  headline: string;
  summary: string | null;
  source: string;
  publishedAt?: string | null;
  keywords?: string[];
}

export function NewsAnchor({ headline, summary, source, publishedAt, keywords }: NewsAnchorProps) {
  const [persona, setPersona] = React.useState<AnchorPersona>("vance");
  const [speedMultiplier, setSpeedMultiplier] = React.useState<number>(1.0);
  const [speaking, setSpeaking] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [activeCue, setActiveCue] = React.useState<SubtitleCue | null>(null);
  const [availableVoices, setAvailableVoices] = React.useState<SpeechSynthesisVoice[]>([]);

  const personaConfig = ANCHOR_PERSONAS[persona];

  const scriptPacket: ScriptPacket = React.useMemo(() => {
    return buildAnchorScript({
      headline,
      summary,
      source,
      published_at: publishedAt,
      keywords,
    });
  }, [headline, summary, source, publishedAt, keywords]);

  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const progressTimerRef = React.useRef<number | null>(null);
  const startTimeRef = React.useRef<number>(0);

  // Load available system voices
  React.useEffect(() => {
    if (!supported) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length) setAvailableVoices(voices);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [supported]);

  React.useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.speechSynthesis?.cancel();
      }
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
      }
    };
  }, [scriptPacket, persona, speedMultiplier]);

  function stop() {
    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setSpeaking(false);
  }

  function reset() {
    stop();
    setProgress(0);
    setActiveCue(null);
  }

  function selectVoiceForPersona(): SpeechSynthesisVoice | undefined {
    if (!availableVoices.length) return undefined;
    const isFemale = personaConfig.voiceGender === "female";
    const isDeep = personaConfig.voiceGender === "deep";

    if (isFemale) {
      return (
        availableVoices.find((v) => /samantha|karen|victoria|zira|female|moira|fiona/i.test(v.name)) ||
        availableVoices.find((v) => v.lang.startsWith("en"))
      );
    }
    if (isDeep) {
      return (
        availableVoices.find((v) => /daniel|oliver|arthur|fred|george|male/i.test(v.name)) ||
        availableVoices.find((v) => v.lang.startsWith("en"))
      );
    }
    return (
      availableVoices.find((v) => /alex|aaron|david|tom|male/i.test(v.name)) ||
      availableVoices.find((v) => v.lang.startsWith("en"))
    );
  }

  function start() {
    if (!supported) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(scriptPacket.fullScript);
    utterance.rate = personaConfig.rate * speedMultiplier;
    utterance.pitch = personaConfig.pitch;

    const matchedVoice = selectVoiceForPersona();
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    const effectiveDuration = scriptPacket.estimatedDurationSec / speedMultiplier;

    utterance.onstart = () => {
      setSpeaking(true);
      startTimeRef.current = Date.now();
      if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);

      progressTimerRef.current = window.setInterval(() => {
        const elapsedSec = (Date.now() - startTimeRef.current) / 1000;
        const ratio = Math.min(1, elapsedSec / effectiveDuration);
        setProgress(ratio);

        const current = scriptPacket.cues.find(
          (cue) => elapsedSec >= cue.start / speedMultiplier && elapsedSec <= cue.end / speedMultiplier
        );
        if (current) {
          setActiveCue(current);
        }
      }, 100);
    };

    utterance.onend = () => {
      stop();
      setProgress(1);
    };

    utterance.onerror = () => {
      stop();
    };

    window.speechSynthesis.speak(utterance);
  }

  const priorityColor =
    scriptPacket.priority === "breaking"
      ? "border-rose-500/80 text-rose-300 bg-rose-950/40"
      : scriptPacket.priority === "developing"
      ? "border-amber-500/80 text-amber-300 bg-amber-950/40"
      : "border-blue-500/80 text-blue-300 bg-blue-950/40";

  return (
    <section
      aria-label="Panel Profits News Broadcast Studio"
      className="overflow-hidden border border-amber-900/70 bg-[#090C14] p-4 sm:p-6 shadow-2xl"
    >
      {/* Broadcast Desk Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center border transition-all ${
              speaking
                ? "border-rose-400 bg-rose-950/70 shadow-[0_0_16px_rgba(244,63,94,0.4)]"
                : "border-amber-400/50 bg-amber-950/30"
            }`}
          >
            <Mic
              className={`h-5 w-5 ${
                speaking ? "animate-pulse text-rose-300" : "text-amber-300"
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.22em] text-amber-300">
                Panel Profits Broadcast Studio
              </span>
              <span className={`text-[9px] uppercase tracking-[0.14em] px-2 py-0.5 border ${priorityColor}`}>
                {scriptPacket.priority}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              {speaking ? "LIVE ON AIR // Streaming Audio Feed" : "STUDIO STANDBY // Ready for Broadcast"}
            </p>
          </div>
        </div>

        {/* Presenter & Speed Presets */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Persona Selection */}
          <div className="flex items-center gap-1 border border-slate-800 bg-[#06080E] p-1 rounded">
            <Users className="h-3 w-3 text-slate-500 ml-1" />
            {(Object.keys(ANCHOR_PERSONAS) as AnchorPersona[]).map((key) => {
              const p = ANCHOR_PERSONAS[key];
              const isSelected = persona === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (speaking) stop();
                    setPersona(key);
                  }}
                  className={`px-2 py-1 text-[9px] uppercase tracking-wider rounded transition-all ${
                    isSelected
                      ? "bg-amber-400/20 text-amber-300 border border-amber-400/50 font-medium"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {p.name.split(" ")[0]}
                </button>
              );
            })}
          </div>

          {/* Speed Selection */}
          <div className="flex items-center gap-1 border border-slate-800 bg-[#06080E] p-1 rounded">
            <Gauge className="h-3 w-3 text-slate-500 ml-1" />
            {[0.85, 1.0, 1.15, 1.3].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => {
                  if (speaking) stop();
                  setSpeedMultiplier(rate);
                }}
                className={`px-1.5 py-0.5 text-[9px] font-mono rounded transition-all ${
                  speedMultiplier === rate
                    ? "bg-blue-400/20 text-blue-300 border border-blue-400/50"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Playback Trigger Buttons */}
          <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
            {!speaking ? (
              <button
                type="button"
                onClick={start}
                disabled={!supported}
                className="inline-flex items-center gap-1.5 border border-amber-300/80 bg-amber-950/50 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.15em] text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.15)] hover:border-amber-200 hover:bg-amber-900/60 transition-all disabled:opacity-40"
              >
                <Play className="h-3 w-3" /> Broadcast
              </button>
            ) : (
              <button
                type="button"
                onClick={stop}
                className="inline-flex items-center gap-1.5 border border-rose-500 bg-rose-950/60 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.15em] text-rose-200 hover:bg-rose-900/80 transition-all"
              >
                <Square className="h-3 w-3" /> Stop
              </button>
            )}

            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 border border-slate-800 bg-slate-900/60 px-2 py-1.5 text-[10px] text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all rounded"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Broadcast Stage (Anchor Avatar + Lower Third Subtitles) */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4 items-stretch">
        {/* Procedural Anchor Avatar Screen */}
        <div className="h-44 md:h-full min-h-[175px]">
          <AnchorAvatar persona={persona} speaking={speaking} className="h-full w-full" />
        </div>

        {/* Subtitle Telemetry & Real-Time Lower Third */}
        <div className="flex flex-col justify-between rounded border border-slate-800/80 bg-[#06080E] p-4">
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-widest pb-2.5 border-b border-slate-800/60">
              <span className="flex items-center gap-1.5 text-amber-400">
                <Radio className="h-3 w-3" /> {scriptPacket.sourceLine}
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <Activity className="h-3 w-3 text-emerald-400" /> ~{Math.round(scriptPacket.estimatedDurationSec / speedMultiplier)}s Segment
              </span>
            </div>

            {/* Live Synchronized Closed Caption Track */}
            <div className="min-h-16 flex items-center pt-3">
              {speaking && activeCue ? (
                <p className="text-sm font-medium text-amber-100 leading-6 tracking-wide">
                  &ldquo;{activeCue.text}&rdquo;
                </p>
              ) : (
                <p className="text-xs text-slate-400 leading-relaxed italic">
                  &ldquo;{scriptPacket.fullScript}&rdquo;
                </p>
              )}
            </div>
          </div>

          {/* Dynamic Audio Visualizer Bar & Segment Progress */}
          <div className="pt-3">
            <div className="flex items-center gap-1 mb-2 h-3">
              {[40, 75, 30, 90, 60, 100, 45, 80, 25, 70, 95, 50, 85, 35, 65, 90, 40, 75, 100, 55].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-xs transition-all duration-75"
                  style={{
                    height: speaking ? `${Math.max(15, (h * Math.sin(Date.now() / 200 + i)) % 100)}%` : "15%",
                    backgroundColor: speaking ? (i % 3 === 0 ? "#F43F5E" : "#F59E0B") : "#1E293B",
                  }}
                />
              ))}
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500 transition-all duration-100"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {!supported && (
        <p className="mt-3 text-xs text-rose-400">
          Web Speech audio playback is unavailable in this browser environment.
        </p>
      )}
    </section>
  );
}
