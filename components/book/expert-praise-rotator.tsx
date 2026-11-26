"use client";

import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";

interface DeskEndorsement {
  id: string;
  name: string;
  role: string;
  desk: string;
  focusTag: string;
  quote: string;
  highlight: string;
}

const IN_UNIVERSE_DESK_DISPATCHES: DeskEndorsement[] = [
  {
    id: "lindqvist",
    name: "Dr. Henrik Lindqvist",
    role: "Chief Paper Conservation Chemist",
    desk: "CBSE Materials & Lignin Lab • Simulation Desk",
    focusTag: "MATERIALS SCIENCE",
    highlight: "Groundwood pulp kinetics translated into hard asset pricing.",
    quote:
      "Gregory D. Goyins is the first author to treat 1938 wood-pulp newsprint as a thermodynamic clock rather than nostalgia. His lignin decay chapters read like a forensic conservation monograph welded directly onto an institutional valuation manual.",
  },
  {
    id: "mercer",
    name: "Sloane Mercer, CFA",
    role: "Head of Alternative Asset Structuring",
    desk: "Arnveld Vault Custody Desk • Simulation Desk",
    focusTag: "CONDITION CONVEXITY",
    highlight: "The first real quantitative framework for slabbed sequential art.",
    quote:
      "Wall Street desks spent decades laughing at collectibles because nobody could model grade elasticity or thin-float haircuts. Gregory D. Goyins solves that cold in Panel Profits—his condition convexity curves and Chapter 8 haircut matrices belong on every alternative-asset terminal.",
  },
  {
    id: "benali",
    name: "Prof. Nadia Benali",
    role: "Chair of Visual Semiotics & Sequential Aesthetics",
    desk: "CBSE Curatorial Institute • Simulation Desk",
    focusTag: "THE ROOM TEST",
    highlight: "Dismantles the false wall between fine art salons and four-color comics.",
    quote:
      "With 'The Room Test' and the 20-Metric Appraisal Standard, Gregory D. Goyins gives art historians and collectors a rigorous shared vocabulary. You finish Volume I convinced that Golden Age panels are the true twentieth-century successors to Renaissance frescoes.",
  },
  {
    id: "kowalski",
    name: 'Arthur "Artie" Kowalski',
    role: "40-Year Golden Age Floor Broker & Estate Appraiser",
    desk: "Vintage Floor & Pedigree Desk • Simulation Desk",
    focusTag: "DEALER FORENSICS",
    highlight: "Unvarnished back-room truth nobody else had the nerve to print.",
    quote:
      "I have bought and sold Golden Age grails on convention floors for forty years, and Gregory D. Goyins exposes every shadow spread, auction trap, and pedigree myth with razor precision. His Seven Canonical Trading Rules alone will save serious buyers six figures.",
  },
  {
    id: "takahashi",
    name: "Dr. Kenji Takahashi",
    role: "Quantitative Microstructure & Derivatives Strategist",
    desk: "STIX Tri-Index Research • Simulation Desk",
    focusTag: "INDEX ARCHITECTURE",
    highlight: "Transforms a fragmented hobby into a disciplined multi-index bourse.",
    quote:
      "Most market books stop at storytelling. Gregory D. Goyins goes all the way to the mathematical floor—formalizing Null Singularity governance, Tri-Index weighting, and 45-second execution telemetry into a coherent operating system for sequential art capital.",
  },
  {
    id: "goldfarb",
    name: "Miriam Goldfarb, JD",
    role: "Senior Archival Provenance & Legal Discovery Counsel",
    desk: "Historical Ledger & Rights Desk • Simulation Desk",
    focusTag: "PRIMARY-SOURCE HISTORY",
    highlight: "Reads like gripping non-fiction history backed by courtroom-grade receipts.",
    quote:
      "From the 1938 $130 Siegel & Shuster release voucher to the Library of Congress audit of Fredric Wertham's 1954 archives, Gregory D. Goyins brings relentless primary-source discipline to every page. It is as riveting as a financial thriller and as documented as a legal brief.",
  },
  {
    id: "vance",
    name: "Marcus Vance",
    role: "Quantitative Finance Lead & Co-Host",
    desk: "CBSE Broadcast Desk • Simulation Desk",
    focusTag: "TACTICAL MONOGRAPH",
    highlight: "The master blueprint behind the entire Comic Book Stock Exchange.",
    quote:
      "Every model we break down on the broadcast traces straight back to Gregory D. Goyins's 700-page architecture in Panel Profits. Chapter 8 is the most relentless, practical trading manual ever assembled for certified cultural equities.",
  },
  {
    id: "rostov",
    name: "Elena Rostov",
    role: "Art History & Pedigree Provenance Lead",
    desk: "CBSE Broadcast Desk • Simulation Desk",
    focusTag: "CULTURAL PARITY",
    highlight: "Proves why America's only native mythology outperforms the salon vitrine.",
    quote:
      "Gregory D. Goyins captures both the tragedy of the Depression-era creators and the mathematical inevitability of their work's triumph over contemporary fine art. Panel Profits is the definitive canon of sequential art sovereignty.",
  },
];

export function ExpertPraiseRotator() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % IN_UNIVERSE_DESK_DISPATCHES.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [isPaused]);

  const current = IN_UNIVERSE_DESK_DISPATCHES[activeIndex];
  const next =
    IN_UNIVERSE_DESK_DISPATCHES[
      (activeIndex + 1) % IN_UNIVERSE_DESK_DISPATCHES.length
    ];
  const prev =
    IN_UNIVERSE_DESK_DISPATCHES[
      (activeIndex - 1 + IN_UNIVERSE_DESK_DISPATCHES.length) %
        IN_UNIVERSE_DESK_DISPATCHES.length
    ];

  return (
    <section
      aria-label="In-Universe CBSE Editorial Desk Commentary on Gregory D. Goyins's Panel Profits"
      className="py-16 px-6 max-w-6xl mx-auto"
    >
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="p-8 md:p-12 rounded-3xl bg-[#060b14]/55 backdrop-blur-2xl border border-[#c5a059]/45 shadow-2xl shadow-black/75 space-y-8 relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c5a059]/15 border border-[#c5a059]/40 text-[#e7c87d] text-[11px] font-mono tracking-widest uppercase">
              <span className="w-2 h-2 rounded-full bg-[#c5a059] animate-pulse" />
              CBSE Simulation Desk Dispatches &bull; Fictional In-Universe Commentary
            </div>
            <h2 className="text-2xl sm:text-4xl font-serif font-black text-white">
              Critical Acclaim for Gregory D. Goyins&apos;s{" "}
              <span className="text-[#e7c87d]">Panel Profits</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Rotating perspectives from across the Panel Profits universe—materials science, quantitative finance, visual semiotics, archival law, and vintage floor brokerage—on why Gregory D. Goyins&apos;s work redefines sequential art equities.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-slate-400 mr-2">
              {String(activeIndex + 1).padStart(2, "0")} /{" "}
              {String(IN_UNIVERSE_DESK_DISPATCHES.length).padStart(2, "0")}
            </span>
            <button
              type="button"
              onClick={() =>
                setActiveIndex(
                  (i) =>
                    (i - 1 + IN_UNIVERSE_DESK_DISPATCHES.length) %
                    IN_UNIVERSE_DESK_DISPATCHES.length
                )
              }
              aria-label="Previous commentary"
              className="p-2 rounded-lg bg-[#040c18] border border-[#c5a059]/40 text-[#e7c87d] hover:bg-[#c5a059]/20 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                setActiveIndex(
                  (i) => (i + 1) % IN_UNIVERSE_DESK_DISPATCHES.length
                )
              }
              aria-label="Next commentary"
              className="p-2 rounded-lg bg-[#040c18] border border-[#c5a059]/40 text-[#e7c87d] hover:bg-[#c5a059]/20 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active Spotlight Card */}
        <div
          key={current.id}
          className="p-6 md:p-8 rounded-2xl bg-[#040b15]/90 border-2 border-[#c5a059] shadow-[0_0_18px_rgba(197,160,89,0.35)] space-y-5 transition-all"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Quote className="w-5 h-5 text-[#e7c87d] shrink-0" />
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#e7c87d]">
                {current.focusTag}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-300 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded">
              {current.desk}
            </span>
          </div>

          <p className="text-lg md:text-2xl font-serif italic text-white leading-relaxed">
            &ldquo;{current.quote}&rdquo;
          </p>

          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-base font-serif font-bold text-[#e7c87d]">
                {current.name}
              </div>
              <div className="text-xs font-mono text-slate-300">
                {current.role}
              </div>
            </div>
            <div className="text-xs font-mono text-emerald-300 bg-emerald-950/50 border border-emerald-500/40 px-3 py-1.5 rounded">
              &ldquo;{current.highlight}&rdquo;
            </div>
          </div>
        </div>

        {/* Compact Side Previews + Direct Selector Pills */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[prev, next].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                setActiveIndex(
                  IN_UNIVERSE_DESK_DISPATCHES.findIndex((d) => d.id === item.id)
                )
              }
              className="text-left p-4 rounded-xl bg-[#050a14]/70 border border-white/10 hover:border-[#c5a059]/70 transition-all space-y-1.5 cursor-pointer group"
            >
              <div className="flex items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-wider">
                <span className="text-[#c5a059] font-bold">{item.focusTag}</span>
                <span className="text-slate-400 group-hover:text-[#e7c87d]">
                  Click to Read &rarr;
                </span>
              </div>
              <p className="text-xs font-serif italic text-slate-300 line-clamp-2">
                &ldquo;{item.quote}&rdquo;
              </p>
              <div className="text-[11px] font-mono text-white/80">
                &mdash; {item.name},{" "}
                <span className="text-slate-400">{item.role}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Dot / Expert Switcher Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {IN_UNIVERSE_DESK_DISPATCHES.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider border transition-all cursor-pointer ${
                idx === activeIndex
                  ? "bg-[#c5a059] text-black border-[#e7c87d] font-bold"
                  : "bg-[#040c18]/80 text-slate-300 border-white/15 hover:border-[#c5a059]/60 hover:text-white"
              }`}
            >
              {item.name.split(" ").slice(-1)[0]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
