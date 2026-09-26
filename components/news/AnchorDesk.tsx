"use client";

import { Radio, Play, RotateCcw, Square, Volume2, Mic, Settings2, Activity, Tv, FileText, MonitorPlay } from "lucide-react";
import * as React from "react";
import { buildAnchorScript, analyzeStoryMarketMetrics, type ScriptPacket, type SubtitleCue } from "@/lib/news/broadcast-script";
import type { NewsStory } from "@/lib/news/feed";

interface AnchorDeskProps {
  story: NewsStory;
  fallbackLoopVideo?: string;
}

const CLOUD_STUDIO_VOICES = [
  { id: "brooklyn", name: "Brooklyn (Lead Anchor)", engine: "ElevenLabs" },
  { id: "loretta", name: "Loretta (Smooth Broadcast)", engine: "ElevenLabs" },
  { id: "sharon", name: "Sharon (Warm & Confident)", engine: "ElevenLabs" },
  { id: "ava", name: "Ava (News & Explainer)", engine: "ElevenLabs" },
  { id: "rene", name: "Rene (Commanding Network)", engine: "ElevenLabs" },
];

export function AnchorDesk({
  story,
  fallbackLoopVideo = "/media/newsroom-backdrop.png",
}: AnchorDeskProps) {
  const audioPlayerRef = React.useRef<HTMLAudioElement | null>(null);
  const avatarVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const animFrameRef = React.useRef<number | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const [speaking, setSpeaking] = React.useState(false);
  const [avatarVideoUrl, setAvatarVideoUrl] = React.useState<string | null>(null);
  const [generatingAvatar, setGeneratingAvatar] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [activeCue, setActiveCue] = React.useState<SubtitleCue | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = React.useState<string>("brooklyn");
  const [speechRate, setSpeechRate] = React.useState<number>(0.96);
  const [showVoiceSettings, setShowVoiceSettings] = React.useState(false);
  const [stageMode, setStageMode] = React.useState<"studio" | "video" | "avatar" | "teleprompter">("video");
  const [audioSource, setAudioSource] = React.useState<"cloud" | "browser">("cloud");

  const scriptPacket: ScriptPacket = React.useMemo(() => {
    return buildAnchorScript({
      headline: story?.headline,
      summary: story?.summary,
      source: story?.source,
      published_at: story?.publishedAt,
    });
  }, [story?.id, story?.headline, story?.summary]);

  const marketMetrics = React.useMemo(() => {
    return analyzeStoryMarketMetrics(`${story?.headline || ""} ${story?.summary || ""}`);
  }, [story?.id, story?.headline, story?.summary]);

  const progressTimerRef = React.useRef<number | null>(null);
  const startTimeRef = React.useRef<number>(0);

  // Automatically pre-render the active story lip-sync video in the background (debounced)
  React.useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/newsroom/avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scriptText: scriptPacket.fullScript }),
        });
        if (res.ok && active) {
          const data = await res.json();
          if (data.videoUrl) {
            setAvatarVideoUrl(data.videoUrl);
          } else if (data.pollUrl) {
            const pInterval = setInterval(async () => {
              if (!active) {
                clearInterval(pInterval);
                return;
              }
              const pRes = await fetch(data.pollUrl);
              if (pRes.ok) {
                const pData = await pRes.json();
                if ((pData.status === "done" || pData.status === "completed") && pData.videoUrl) {
                  clearInterval(pInterval);
                  if (active) setAvatarVideoUrl(pData.videoUrl);
                } else if (pData.status === "error" || pData.status === "failed") {
                  clearInterval(pInterval);
                }
              }
            }, 2500);
          }
        }
      } catch {
        // Background prefetch silent catch
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [scriptPacket.fullScript]);

  // Audio Equalizer Canvas Animation (Safe without hijacking audio routing)
  const startEqualizer = (audioEl: HTMLAudioElement) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      audioContextRef.current = ctx;

      const source = ctx.createMediaElementSource(audioEl);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyser.connect(ctx.destination); // Ensure audio continues to speakers
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const render = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        const canvas = canvasRef.current;
        const cCtx = canvas.getContext("2d");
        if (!cCtx) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        cCtx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 1.8;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height * 0.85;

          // Studio gold / rose gradient
          const gradient = cCtx.createLinearGradient(0, canvas.height, 0, 0);
          gradient.addColorStop(0, "rgba(223, 59, 88, 0.4)");
          gradient.addColorStop(0.5, "rgba(251, 191, 36, 0.8)");
          gradient.addColorStop(1, "rgba(255, 255, 255, 0.95)");

          cCtx.fillStyle = gradient;
          cCtx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);

          x += barWidth;
        }

        animFrameRef.current = requestAnimationFrame(render);
      };

      render();
    } catch {
      // Direct audio output is preserved even if Web Audio fails
    }
  };

  async function generateLipSyncedAvatar() {
    setGeneratingAvatar(true);
    stop();

    try {
      const res = await fetch("/api/newsroom/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptText: scriptPacket.fullScript,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.videoUrl) {
          setAvatarVideoUrl(data.videoUrl);
          setStageMode("avatar");
          setGeneratingAvatar(false);
          setSpeaking(true);
          return;
        } else if (data.pollUrl) {
          // Poll until completed
          const pollInterval = setInterval(async () => {
            const pRes = await fetch(data.pollUrl);
            if (pRes.ok) {
              const pData = await pRes.json();
              if ((pData.status === "done" || pData.status === "completed") && pData.videoUrl) {
                clearInterval(pollInterval);
                setAvatarVideoUrl(pData.videoUrl);
                setStageMode("avatar");
                setGeneratingAvatar(false);
                setSpeaking(true);
              } else if (pData.status === "error" || pData.status === "failed") {
                clearInterval(pollInterval);
                setGeneratingAvatar(false);
              }
            }
          }, 2000);
          return;
        }
      }
    } catch {
      // Failed
    }
    setGeneratingAvatar(false);
  }

  function stop() {
    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.src = "";
      audioPlayerRef.current = null;
    }
    if (avatarVideoRef.current) {
      avatarVideoRef.current.pause();
      avatarVideoRef.current.currentTime = 0;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
      analyserRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
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

  async function start() {
    stop();

    // Play instant ElevenLabs neural audio stream directly
    try {
      const res = await fetch("/api/newsroom/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: scriptPacket.fullScript,
          voiceId: selectedVoiceId,
        }),
      });

      if (res.ok && res.headers.get("content-type")?.includes("audio/")) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const audio = new Audio(blobUrl);
        audio.volume = 1.0;
        audioPlayerRef.current = audio;
        setAudioSource("cloud");

        audio.onplay = () => {
          setSpeaking(true);
          startTimeRef.current = Date.now();

          progressTimerRef.current = window.setInterval(() => {
            const currentSec = audio.currentTime || (Date.now() - startTimeRef.current) / 1000;
            const duration = audio.duration && !isNaN(audio.duration) && audio.duration > 0
              ? audio.duration
              : scriptPacket.estimatedDurationSec;
            const ratio = Math.min(1, currentSec / duration);
            setProgress(ratio);

            const current = scriptPacket.cues.find(
              (cue) => currentSec >= cue.start && currentSec <= cue.end
            );
            if (current) setActiveCue(current);
          }, 50);
        };

        audio.onended = () => {
          stop();
          setProgress(1);
        };

        audio.onerror = () => {
          stop();
        };

        await audio.play();
        return;
      }
    } catch {
      // Audio network error
    }
  }

  const isLive = speaking;

  return (
    <aside className="anchor-panel rim-panel">
      <header className="anchor-panel__header">
        <div>
          <div className="newsroom-label">Anchor Broadcast Panel</div>
          <h2 style={{ margin: "2px 0 0", color: "#eef3f8" }}>Live Desk // Brooklyn</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Stage View Mode Selector */}
          <div className="flex items-center bg-[#06080E] border border-slate-800 rounded p-0.5">
            <button
              type="button"
              onClick={() => setStageMode("studio")}
              className={`p-1 rounded text-[10px] flex items-center gap-1 transition-colors ${
                stageMode === "studio" ? "bg-amber-400/20 text-amber-300" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Studio Telemetry View"
            >
              <Tv className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => setStageMode("video")}
              className={`p-1 rounded text-[10px] flex items-center gap-1 transition-colors ${
                stageMode === "video" ? "bg-amber-400/20 text-amber-300" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Wide Camera Loop"
            >
              <MonitorPlay className="h-3 w-3" />
            </button>
            {avatarVideoUrl && (
              <button
                type="button"
                onClick={() => setStageMode("avatar")}
                className={`p-1 rounded text-[10px] flex items-center gap-1 transition-colors ${
                  stageMode === "avatar" ? "bg-amber-400/20 text-amber-300 border border-amber-400/50" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Lip-Sync Broadcast Video"
              >
                <Activity className="h-3 w-3 text-rose-400 animate-pulse" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setStageMode("teleprompter")}
              className={`p-1 rounded text-[10px] flex items-center gap-1 transition-colors ${
                stageMode === "teleprompter" ? "bg-amber-400/20 text-amber-300" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Teleprompter Readout"
            >
              <FileText className="h-3 w-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowVoiceSettings(!showVoiceSettings)}
            className={`p-1.5 rounded transition-colors ${
              showVoiceSettings
                ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
            title="Audio & Voice Configuration"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
          <div className={`status-chip ${isLive ? "is-live" : ""}`}>
            <span className="status-chip__dot" />
            {isLive ? "ON AIR" : "STANDBY"}
          </div>
        </div>
      </header>

      {/* Voice Settings Drawer */}
      {showVoiceSettings && (
        <div className="rounded border border-amber-900/50 bg-[#0A0D15] p-3 text-xs space-y-2.5">
          <div className="flex items-center justify-between text-[10px] text-amber-300 uppercase tracking-wider font-mono">
            <span className="flex items-center gap-1.5">
              <Mic className="h-3 w-3 text-amber-400" />
              Presenter Voice Engine
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800/50 text-amber-300">
              Neural Studio Active
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] text-slate-400 uppercase tracking-widest">Presenter Voice Profile</label>
            <select
              value={selectedVoiceId}
              onChange={(e) => {
                if (speaking) stop();
                setSelectedVoiceId(e.target.value);
              }}
              className="w-full bg-[#06080E] border border-slate-800 text-slate-200 text-xs rounded px-2 py-1.5 outline-none focus:border-amber-400"
            >
              {CLOUD_STUDIO_VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Primary Stage */}
      <div className="anchor-stage relative overflow-hidden">
        {stageMode === "avatar" && avatarVideoUrl ? (
          <video
            ref={avatarVideoRef}
            className="anchor-stage__desk-video"
            src={avatarVideoUrl}
            playsInline
            autoPlay
            controls={false}
            onPlay={() => setSpeaking(true)}
            onEnded={() => {
              setSpeaking(false);
              setProgress(1);
            }}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (v.duration > 0) {
                const ratio = v.currentTime / v.duration;
                setProgress(ratio);

                const current = scriptPacket.cues.find(
                  (cue) => v.currentTime >= cue.start && v.currentTime <= cue.end
                );
                if (current) setActiveCue(current);
              }
            }}
          />
        ) : stageMode === "video" ? (
          <video
            className="anchor-stage__desk-video"
            src="/media/newsdesk-loop.mp4"
            poster="/media/newsdesk-poster.jpg"
            playsInline
            autoPlay
            loop
            muted
          />
        ) : stageMode === "teleprompter" ? (
          <div className="absolute inset-0 bg-[#06080E] p-6 flex flex-col justify-center overflow-y-auto z-10 font-mono text-sm leading-relaxed text-slate-200">
            <div className="text-[10px] text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              PROMPTER FEED // LIVE
            </div>
            <p className="text-base text-slate-100 font-semibold">{scriptPacket.fullScript}</p>
          </div>
        ) : (
          /* Studio Telemetry Stage */
          <div className="absolute inset-0 bg-gradient-to-br from-[#0A0D15] via-[#0E1320] to-[#07090F] flex flex-col justify-between p-4">
            {/* Ambient Background Grid */}
            <div
              className="absolute inset-0 opacity-25 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(circle at 50% 30%, rgba(223, 59, 88, 0.15), transparent 70%),
                  linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)`,
                backgroundSize: "100% 100%, 24px 24px, 24px 24px",
              }}
            />

            {/* Top Telemetry Header */}
            <div className="relative z-10 flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono tracking-widest text-amber-300 font-semibold uppercase">
                  PPN LIVE BROADCAST
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-[9px] font-mono text-slate-400">ALEX MORGAN DESK</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-mono text-emerald-400">SIGNAL LOCKED</span>
              </div>
            </div>

            {/* Center Anchor Portrait with Audio Reactive EQ */}
            <div className="relative z-10 flex items-center justify-center gap-4 my-auto py-2">
              <div className="relative w-20 h-20 rounded-full border-2 border-amber-400/60 overflow-hidden shadow-[0_0_20px_rgba(251,191,36,0.25)] flex-shrink-0">
                <img
                  src="/media/anchor-face.jpg"
                  alt="Alex Morgan - Live Anchor"
                  className="w-full h-full object-cover"
                />
                {isLive && (
                  <span className="absolute inset-0 rounded-full border-2 border-rose-500 animate-ping opacity-75" />
                )}
              </div>

              <div className="flex flex-col items-start justify-center">
                <canvas
                  ref={canvasRef}
                  width={200}
                  height={45}
                  className="w-[200px] h-[45px]"
                />
                <div className="mt-1 text-[10px] font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Volume2 className="h-3 w-3 text-amber-400" />
                  {isLive ? "ALEX MORGAN ON AIR" : "STANDBY READY"}
                </div>
              </div>
            </div>

            {/* Bottom Telemetry Ticker */}
            <div className="relative z-10 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono text-slate-500">
              <span>VOICE: BROOKLYN</span>
              <span>ENGINE: ELEVENLABS / D-ID</span>
              <span>EST: {scriptPacket.estimatedDurationSec}S</span>
            </div>
          </div>
        )}

        {/* Live Over-The-Shoulder Graphic Box (Camera 2 Broadcast Style) */}
        <div className="absolute top-10 left-3 z-20 w-32 sm:w-36 rounded border border-amber-400/60 bg-[#06080E]/90 p-2 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between text-[8px] font-mono text-amber-300 uppercase tracking-widest border-b border-slate-800 pb-1 mb-1.5">
            <span>KEY STORY GRAPHIC</span>
            {marketMetrics.trend === "upward" ? (
              <span className="text-emerald-400 font-bold flex items-center">▲ UP</span>
            ) : marketMetrics.trend === "downward" ? (
              <span className="text-rose-400 font-bold flex items-center">▼ DOWN</span>
            ) : (
              <span className="text-amber-400 font-bold flex items-center">◆ CATALYST</span>
            )}
          </div>
          {story.imageUrl ? (
            <img
              src={story.imageUrl}
              alt="Story Graphic"
              className="w-full h-16 object-cover rounded border border-slate-800 mb-1"
            />
          ) : (
            <div className="w-full h-14 bg-gradient-to-br from-amber-950/40 to-slate-900 flex flex-col items-center justify-center text-center p-1 rounded border border-slate-800">
              <span className="text-[9px] font-mono text-amber-300 font-bold uppercase">{marketMetrics.investopediaTerm.term}</span>
            </div>
          )}
          <div className="text-[8px] font-mono text-slate-300 truncate">
            {story.source}
          </div>
        </div>

        {/* Live Studio Desk Badge */}
        <div className="anchor-stage__desk-badge flex items-center gap-1.5 z-20">
          <Radio style={{ width: 10, height: 10 }} className={isLive ? "animate-pulse text-rose-400" : ""} />
          <span>{isLive ? "LIVE BROADCAST" : "STANDBY READY"}</span>
          {isLive && (
            <span className="ml-1.5 pl-1.5 border-l border-white/20 text-[9px] text-amber-300 font-mono tracking-wider">
              {selectedVoiceId.toUpperCase()}
            </span>
          )}
        </div>

        {/* Backdrop Lighting and Scanlines */}
        <div className="anchor-stage__overlay pointer-events-none" />
        <div className="anchor-stage__deskline pointer-events-none" />

        {/* Lower Third Live Financial Telemetry Banner Overlay */}
        <div className="anchor-lower-third z-20 space-y-1">
          <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-widest text-amber-300">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              {marketMetrics.trend.toUpperCase()} TREND // {marketMetrics.affectedEntities[0] || "CATALYST WIRE"}
            </span>
            <span className="text-slate-400 font-normal">
              CONCEPT: <strong className="text-amber-200">{marketMetrics.investopediaTerm.term}</strong>
            </span>
          </div>

          <div className="anchor-lower-third__headline">{scriptPacket.headline}</div>
          
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 border-t border-slate-800/60 pt-1">
            <span>{scriptPacket.sourceLine}</span>
            <span className="text-emerald-400 font-semibold">ZERO-COST HIGH SPEED AUDIO ACTIVE</span>
          </div>
        </div>

        {/* Real-time Subtitles */}
        {activeCue?.text && isLive ? (
          <div className="anchor-subtitles z-20">
            <span>{activeCue.text}</span>
          </div>
        ) : null}
      </div>

      {/* Streamlined Controls Bar: Single Clean Play/Mute Button */}
      <div className="anchor-controls flex items-center gap-2 mt-2">
        <button
          type="button"
          className="control-btn control-btn--primary flex-1 py-2 text-xs font-medium tracking-wide flex items-center justify-center gap-2"
          onClick={() => {
            if (speaking) {
              stop();
            } else {
              start();
            }
          }}
        >
          {speaking ? (
            <>
              <Square className="h-3.5 w-3.5 text-rose-300" />
              MUTE BROADCAST AUDIO
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 text-amber-300" />
              PLAY BROADCAST AUDIO
            </>
          )}
        </button>

        <button
          type="button"
          className="control-btn px-3 py-2 text-xs font-mono"
          onClick={reset}
          title="Reset Audio Playhead"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="progress-bar mt-1">
        <div className="progress-bar__fill" style={{ width: `${progress * 100}%` }} />
      </div>

      {/* Generated Anchor Script Box */}
      <section className="anchor-copy rim-panel mt-2 p-3 bg-[#080B12] border border-slate-800/80 rounded">
        <div className="newsroom-label text-[9px] font-mono uppercase text-amber-400 tracking-wider">Spoken Anchor Wire Copy</div>
        <p className="mt-1 text-xs text-slate-300 leading-relaxed font-sans">{scriptPacket.fullScript}</p>
      </section>
    </aside>
  );
}
