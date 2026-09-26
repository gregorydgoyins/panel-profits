"use client";

import * as React from "react";

export type AnchorPersona = "vance" | "elena" | "arthur";

export interface AnchorPersonaConfig {
  id: AnchorPersona;
  name: string;
  title: string;
  voiceGender: "male" | "female" | "deep";
  rate: number;
  pitch: number;
  suitColor: string;
  tieColor: string;
  hairColor: string;
  skinColor: string;
  accentColor: string;
}

export const ANCHOR_PERSONAS: Record<AnchorPersona, AnchorPersonaConfig> = {
  vance: {
    id: "vance",
    name: "Vance Sterling",
    title: "Chief Market Anchor // Capital Desk",
    voiceGender: "male",
    rate: 1.0,
    pitch: 0.95,
    suitColor: "#111827",
    tieColor: "#E11D48",
    hairColor: "#334155",
    skinColor: "#E2BA9D",
    accentColor: "#F59E0B",
  },
  elena: {
    id: "elena",
    name: "Elena Rostova",
    title: "Senior M&A & Industry Correspondent",
    voiceGender: "female",
    rate: 1.05,
    pitch: 1.15,
    suitColor: "#1E1B4B",
    tieColor: "#06B6D4",
    hairColor: "#1E293B",
    skinColor: "#F3D5B5",
    accentColor: "#38BDF8",
  },
  arthur: {
    id: "arthur",
    name: "Arthur Pendelton",
    title: "Bibliographic & Valuation Historian",
    voiceGender: "deep",
    rate: 0.9,
    pitch: 0.85,
    suitColor: "#1C1917",
    tieColor: "#D97706",
    hairColor: "#94A3B8",
    skinColor: "#D7B59A",
    accentColor: "#10B981",
  },
};

interface AnchorAvatarProps {
  persona: AnchorPersona;
  speaking: boolean;
  className?: string;
}

export function AnchorAvatar({ persona, speaking, className = "" }: AnchorAvatarProps) {
  const config = ANCHOR_PERSONAS[persona];
  const [mouthPhase, setMouthPhase] = React.useState(0);
  const [blink, setBlink] = React.useState(false);
  const [headTilt, setHeadTilt] = React.useState(0);

  // Mouth animation during speech
  React.useEffect(() => {
    if (!speaking) {
      setMouthPhase(0);
      return;
    }
    const interval = window.setInterval(() => {
      setMouthPhase((prev) => (prev + 1) % 4);
    }, 120);
    return () => window.clearInterval(interval);
  }, [speaking]);

  // Periodic blinking
  React.useEffect(() => {
    const blinkInterval = window.setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 160);
    }, 3800);
    return () => window.clearInterval(blinkInterval);
  }, []);

  // Subtle natural head movement while speaking
  React.useEffect(() => {
    if (!speaking) {
      setHeadTilt(0);
      return;
    }
    const tiltInterval = window.setInterval(() => {
      setHeadTilt((Math.random() - 0.5) * 2.5);
    }, 1200);
    return () => window.clearInterval(tiltInterval);
  }, [speaking]);

  // Mouth SVG paths for phoneme simulation
  const mouthPaths = [
    "M 94 136 Q 100 138 106 136 Q 100 137 94 136 Z", // Closed / subtle
    "M 93 135 Q 100 144 107 135 Q 100 137 93 135 Z", // Medium open 'O'
    "M 92 134 Q 100 148 108 134 Q 100 140 92 134 Z", // Wide open 'A/E'
    "M 94 135 Q 100 142 106 135 Q 100 136 94 135 Z", // Narrow 'M/B/P'
  ];

  return (
    <div className={`relative overflow-hidden rounded border border-slate-800 bg-[#07090E] ${className}`}>
      {/* Studio Background Grid & Lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(30,41,59,0.8),#030508_85%)]" />
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />

      {/* On-Air Studio Spotlight Aura */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-2xl pointer-events-none transition-all duration-500"
        style={{
          backgroundColor: speaking ? config.accentColor : "transparent",
          opacity: speaking ? 0.18 : 0.05,
        }}
      />

      {/* Procedural Vector Anchor Character */}
      <svg
        viewBox="0 0 200 240"
        className="relative z-10 w-full h-full object-contain"
        style={{ transform: `rotate(${headTilt}deg)`, transition: "transform 0.6s ease-in-out" }}
      >
        <defs>
          {/* Suit Gradient */}
          <linearGradient id="suitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={config.suitColor} />
            <stop offset="100%" stopColor="#05070A" />
          </linearGradient>
          {/* Studio Rim Light */}
          <linearGradient id="rimLight" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={config.accentColor} stopOpacity="0.4" />
            <stop offset="50%" stopColor="transparent" stopOpacity="0" />
            <stop offset="100%" stopColor={config.accentColor} stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Studio Desk Silhouette */}
        <path d="M 0 210 L 200 210 L 200 240 L 0 240 Z" fill="#0C1019" stroke="#1E293B" strokeWidth="1" />
        <line x1="0" y1="210" x2="200" y2="210" stroke={config.accentColor} strokeWidth="1.5" strokeOpacity="0.7" />

        {/* Shoulders & Suit */}
        <path
          d="M 30 225 C 45 175 70 165 100 165 C 130 165 155 175 170 225 Z"
          fill="url(#suitGrad)"
          stroke="#1F2937"
          strokeWidth="1.5"
        />
        {/* Suit Lapels */}
        <path d="M 82 165 L 100 205 L 75 220 Z" fill="#0F172A" />
        <path d="M 118 165 L 100 205 L 125 220 Z" fill="#0F172A" />

        {/* Shirt Collar */}
        <path d="M 88 162 L 100 176 L 94 184 L 84 166 Z" fill="#F8FAFC" />
        <path d="M 112 162 L 100 176 L 106 184 L 116 166 Z" fill="#F8FAFC" />

        {/* Tie */}
        <polygon points="97,175 103,175 105,210 100,218 95,210" fill={config.tieColor} />

        {/* Neck */}
        <rect x="89" y="142" width="22" height="26" fill={config.skinColor} />
        {/* Neck Shadow */}
        <path d="M 89 142 L 111 142 L 100 156 Z" fill="#000000" opacity="0.15" />

        {/* Head & Face */}
        <ellipse cx="100" cy="110" rx="28" ry="36" fill={config.skinColor} stroke="#000000" strokeWidth="0.5" />

        {/* Hair Styles based on persona */}
        {persona === "elena" ? (
          <path
            d="M 68 115 C 65 75 80 65 100 65 C 120 65 135 75 132 115 C 136 125 138 148 135 155 C 125 140 128 100 126 95 C 120 75 80 75 74 95 C 72 100 75 140 65 155 C 62 148 64 125 68 115 Z"
            fill={config.hairColor}
          />
        ) : (
          <path
            d="M 70 105 C 70 70 82 66 100 66 C 118 66 130 70 130 105 C 125 85 118 80 100 80 C 82 80 75 85 70 105 Z"
            fill={config.hairColor}
          />
        )}

        {/* Eyebrows */}
        <path
          d={speaking ? "M 82 96 Q 89 93 95 96" : "M 82 98 Q 89 96 95 98"}
          stroke={config.hairColor}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={speaking ? "M 105 96 Q 111 93 118 96" : "M 105 98 Q 111 96 118 98"}
          stroke={config.hairColor}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* Eyes */}
        {blink ? (
          <>
            <line x1="83" y1="106" x2="93" y2="106" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
            <line x1="107" y1="106" x2="117" y2="106" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
          </>
        ) : (
          <>
            {/* Sclera */}
            <ellipse cx="88" cy="106" rx="5.5" ry="4" fill="#FFFFFF" />
            <ellipse cx="112" cy="106" rx="5.5" ry="4" fill="#FFFFFF" />
            {/* Iris & Pupil */}
            <circle cx="88.5" cy="106" r="2.8" fill="#1E293B" />
            <circle cx="112.5" cy="106" r="2.8" fill="#1E293B" />
            {/* Catchlight */}
            <circle cx="89.5" cy="105" r="1" fill="#FFFFFF" />
            <circle cx="113.5" cy="105" r="1" fill="#FFFFFF" />
          </>
        )}

        {/* Nose */}
        <path d="M 100 107 L 97 122 L 103 122" stroke="#B4886B" strokeWidth="1.5" fill="none" strokeLinecap="round" />

        {/* Mouth (Phoneme animated) */}
        <path
          d={mouthPaths[mouthPhase]}
          fill={mouthPhase === 0 ? "none" : "#5A1A1A"}
          stroke="#994D38"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Earpiece Microphone */}
        <path d="M 72 110 Q 68 130 84 138" stroke="#64748B" strokeWidth="1.2" fill="none" />
        <circle cx="85" cy="138" r="2.2" fill="#0F172A" stroke="#38BDF8" strokeWidth="1" />
      </svg>

      {/* Broadcast Studio Scanline Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40" />

      {/* Tally Light & Station Code */}
      <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/80 border border-slate-800 backdrop-blur-sm">
        <span
          className={`h-2 w-2 rounded-full transition-all ${
            speaking ? "bg-rose-500 animate-pulse shadow-[0_0_8px_#F43F5E]" : "bg-emerald-500"
          }`}
        />
        <span className="text-[9px] font-mono tracking-widest text-slate-300 uppercase">
          {speaking ? "ON AIR" : "STANDBY"}
        </span>
      </div>

      <div className="absolute top-2.5 right-2.5 z-20 px-2 py-0.5 rounded bg-black/80 border border-slate-800 text-[8px] font-mono tracking-wider text-slate-400">
        PPN-98.0
      </div>

      {/* Presenter Nameplate */}
      <div className="absolute bottom-2 left-2.5 right-2.5 z-20 flex items-center justify-between px-2.5 py-1 rounded bg-[#090D16]/90 border border-slate-800 backdrop-blur-md">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-slate-100 truncate">{config.name}</p>
          <p className="text-[8px] text-amber-300/90 truncate uppercase tracking-wider">{config.title}</p>
        </div>
      </div>
    </div>
  );
}
