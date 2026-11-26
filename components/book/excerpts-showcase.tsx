"use client";

import React, { useState, useEffect } from "react";
import { BOOK_EXCERPTS, BookExcerpt } from "@/lib/book/excerpts-data";

export function BookExcerptsShowcase() {
  const [selectedExcerpt, setSelectedExcerpt] = useState<BookExcerpt>(BOOK_EXCERPTS[0]);
  const [selectedLockedId, setSelectedLockedId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeModalExcerpt, setActiveModalExcerpt] = useState<BookExcerpt | null>(null);

  // Randomize initial rotation on mount
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * BOOK_EXCERPTS.length);
    setSelectedExcerpt(BOOK_EXCERPTS[randomIndex]);
    
    // Check local storage for persistent unlocked access
    const saved = localStorage.getItem("pp_excerpts_unlocked");
    if (saved === "true") {
      setIsUnlocked(true);
    }
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      await fetch("/api/leads/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name || undefined,
          source: "book_excerpts_reader",
          metadata: { timestamp: new Date().toISOString() }
        })
      });
    } catch (err) {
      console.warn("Failed to send lead to API, unlocking locally anyway:", err);
    }

    localStorage.setItem("pp_excerpts_unlocked", "true");
    setIsUnlocked(true);
    setSelectedLockedId(null);
    setIsSubmitting(false);
  };

  const handleOpenReader = (excerpt: BookExcerpt) => {
    if (isUnlocked || excerpt.id === selectedExcerpt.id) {
      setActiveModalExcerpt(excerpt);
    } else {
      setSelectedLockedId(excerpt.id);
      // scroll to electric icy-blue lead unlock box
      const el = document.getElementById("excerpt-unlock-vault");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <section id="excerpts-reader" className="py-20 px-6 max-w-6xl mx-auto border-t border-white/10">
      <div className="space-y-4 mb-12 text-center md:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-[#00ff66]/55 text-[#8affb8] text-xs font-mono tracking-widest uppercase">
          Free Mid-Chapter Reading Folio &bull; By Gregory D. Goyins
        </div>
        <h2 className="text-3xl sm:text-5xl font-serif font-black text-white tracking-tight">
          Read a Free Excerpt From Gregory D. Goyins&apos;s Manuscript
        </h2>
        <p className="text-slate-200 text-sm md:text-base max-w-3xl leading-relaxed font-light">
          Sample a rotating mid-chapter passage directly from Gregory D. Goyins&apos;s 700+ page monograph right below—no gate required. Every page load rotates a different open chapter; unlock all six master excerpts below.
        </p>
      </div>

      {/* Featured Rotating Excerpt Card — Bright Electric Green Rimlight + Inline Readable Passage */}
      <div className="mb-14 p-6 sm:p-8 md:p-10 rounded-2xl bg-[#040e0a]/90 backdrop-blur-2xl relative overflow-hidden podcast-rim-green">
        <div className="relative z-10 space-y-6">
          <div className="flex flex-col lg:flex-row gap-6 items-start justify-between border-b border-white/10 pb-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
                <span
                  className="px-2.5 py-0.5 rounded font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: "rgba(0, 255, 102, 0.16)",
                    color: "#8affb8",
                    border: "1px solid rgba(0, 255, 102, 0.7)",
                  }}
                >
                  FREE OPEN EXCERPT &bull; RANDOMIZED ON LOAD
                </span>
                <span className="px-2 py-0.5 rounded bg-[#c5a059]/20 border border-[#c5a059]/40 text-[#e7c87d] font-bold uppercase tracking-wider">
                  {selectedExcerpt.volume} &bull; {selectedExcerpt.chapter}
                </span>
                <span className="text-slate-300">{selectedExcerpt.pagesInTextbook}</span>
                <span className="text-slate-500">&bull;</span>
                <span className="text-[#8affb8] font-bold">{selectedExcerpt.readTime}</span>
              </div>

              <h3 className="text-2xl sm:text-4xl font-serif font-black text-white tracking-tight leading-tight">
                {selectedExcerpt.title}
              </h3>
              <p className="text-xs sm:text-sm text-[#8affb8] font-mono tracking-wide">
                {selectedExcerpt.subtitle} &mdash; From <span className="text-white">Panel Profits</span> by Gregory D. Goyins
              </p>
            </div>

            <div className="flex-shrink-0 w-full lg:w-auto flex flex-col sm:flex-row lg:flex-col gap-2.5">
              <button
                onClick={() => handleOpenReader(selectedExcerpt)}
                className="px-6 py-3 rounded text-slate-950 font-mono font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 cursor-pointer hover:brightness-110"
                style={{
                  backgroundColor: "#00ff66",
                  boxShadow: "0 0 16px rgba(0, 255, 102, 0.65)",
                }}
              >
                <span>📖</span> OPEN FULL-SCREEN READER
              </button>
              <div className="text-[10px] font-mono text-center text-slate-300 tracking-wider uppercase">
                {selectedExcerpt.wordCount} &bull; Uncut Passage
              </div>
            </div>
          </div>

          <blockquote className="border-l-2 border-[#00ff66] pl-5 py-2.5 italic text-[#e8fff1] text-sm sm:text-base font-serif leading-relaxed bg-black/45 rounded-r-lg">
            &ldquo;{selectedExcerpt.quote}&rdquo;
            <span className="block not-italic text-[11px] font-mono text-[#8affb8] mt-1.5 uppercase tracking-wider">
              &mdash; Gregory D. Goyins, Panel Profits ({selectedExcerpt.chapter}, {selectedExcerpt.pagesInTextbook})
            </span>
          </blockquote>

          {/* Inline Mid-Chapter Book Reading Pane — Visible Directly on /book */}
          <div className="p-6 sm:p-8 rounded-xl bg-[#040811]/90 border border-white/15 space-y-5 font-serif text-slate-100 text-sm sm:text-base leading-8 shadow-inner">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10 text-[11px] font-mono uppercase tracking-widest text-slate-400">
              <span>
                EXCERPT TEXT &bull; {selectedExcerpt.chapter} ({selectedExcerpt.pagesInTextbook})
              </span>
              <span className="text-[#8affb8]">BY GREGORY D. GOYINS</span>
            </div>

            {selectedExcerpt.fullExcerpt.map((para, i) => (
              <p
                key={i}
                className={
                  i === 0
                    ? "first-letter:text-4xl first-letter:font-black first-letter:text-[#8affb8] first-letter:mr-2 first-letter:float-left first-letter:leading-none"
                    : ""
                }
              >
                {para}
              </p>
            ))}

            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-slate-400">
              <span>
                End of Free Rotating Excerpt &bull; Panel Profits by Gregory D. Goyins
              </span>
              {!isUnlocked && (
                <a
                  href="#excerpt-unlock-vault"
                  className="text-[#7df9ff] hover:underline font-bold uppercase tracking-wider"
                >
                  Unlock All 6 Chapters Below &darr;
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid of All 6 Available Book Excerpts — Green Open + Crimson-Red Locked Hover Rimlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {BOOK_EXCERPTS.map((excerpt) => {
          const isThisFeatured = excerpt.id === selectedExcerpt.id;
          const canRead = isUnlocked || isThisFeatured;
          const isSelectedLocked = !canRead && selectedLockedId === excerpt.id;

          const cardRimClass = isThisFeatured
            ? "podcast-rim-green bg-[#04140c]/80"
            : isSelectedLocked
            ? "podcast-rim-red podcast-rim-red-selected"
            : !canRead
            ? "podcast-rim-red bg-[#060b14]/70"
            : "podcast-rim-unlocked bg-[#060b14]/75";

          return (
            <div
              key={excerpt.id}
              onClick={() => handleOpenReader(excerpt)}
              className={`group p-6 rounded-xl backdrop-blur-xl flex flex-col justify-between cursor-pointer ${cardRimClass}`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span
                    className={`font-bold transition-colors ${
                      isThisFeatured
                        ? "text-[#8affb8]"
                        : !canRead
                        ? "text-[#c5a059] group-hover:text-red-400"
                        : "text-[#c5a059]"
                    }`}
                  >
                    {excerpt.chapter}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 uppercase">
                    {isThisFeatured ? "FREE OPEN" : excerpt.readTime}
                  </span>
                </div>

                <h4
                  className={`text-lg font-serif font-bold text-white transition-colors leading-snug ${
                    isThisFeatured
                      ? "group-hover:text-[#8affb8]"
                      : !canRead
                      ? "group-hover:text-red-300"
                      : "group-hover:text-[#e7c87d]"
                  }`}
                >
                  {excerpt.title}
                </h4>
                <div
                  className={`text-xs font-mono line-clamp-1 ${
                    isThisFeatured ? "text-[#8affb8]" : "text-[#e7c87d]"
                  }`}
                >
                  {excerpt.subtitle}
                </div>
                <p className="text-xs text-slate-300 font-light leading-relaxed line-clamp-3">
                  {excerpt.summary}
                </p>
              </div>

              <div className="pt-5 mt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">{excerpt.pagesInTextbook}</span>

                {canRead ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenReader(excerpt);
                    }}
                    className="px-3.5 py-1.5 rounded text-slate-950 font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                    style={{
                      backgroundColor: "#00ff66",
                      boxShadow: "0 0 12px rgba(0, 255, 102, 0.5)",
                    }}
                  >
                    <span>📖</span> READ
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenReader(excerpt);
                    }}
                    className="px-3 py-1 rounded bg-red-500/20 group-hover:bg-red-500/35 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/60 text-[11px] font-mono uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>🔒</span> UNLOCK
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reader Unlock Vault / Registration Box — Electric Icy Blue */}
      {!isUnlocked && (
        <div
          id="excerpt-unlock-vault"
          className="p-8 sm:p-10 rounded-2xl bg-[#040d18]/90 backdrop-blur-2xl relative overflow-hidden unlock-rim-ice"
        >
          <div className="relative z-10 max-w-2xl mx-auto text-center space-y-4">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded text-xs font-mono font-bold uppercase tracking-widest"
              style={{
                backgroundColor: "rgba(0, 229, 255, 0.14)",
                color: "#7df9ff",
                border: "1px solid rgba(56, 246, 255, 0.65)",
                boxShadow: "0 0 12px rgba(0, 229, 255, 0.35)",
              }}
            >
              <span>🔒</span> VIP SCHOLARSHIP ARCHIVE ACCESS
            </div>
            <h3 className="text-2xl sm:text-4xl font-serif font-black text-white">
              Unlock All 6 Master Book Excerpts
            </h3>
            <p className="text-xs sm:text-sm text-cyan-100/80 font-light leading-relaxed">
              Input your email below to unlock unrestricted instant access to all rotating chapter excerpts from the 1,200-page definitive manual, plus notification of the three-volume print release.
            </p>

            <form onSubmit={handleUnlock} className="pt-4 flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <input
                type="text"
                placeholder="Your name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-4 py-3 rounded-lg bg-[#040c18] border border-cyan-400/30 text-white placeholder-slate-400 text-xs font-mono focus:outline-none focus:border-[#38f6ff] flex-1"
              />
              <input
                type="email"
                required
                placeholder="your.email@institutional.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-4 py-3 rounded-lg bg-[#040c18] border border-cyan-400/30 text-white placeholder-slate-400 text-xs font-mono focus:outline-none focus:border-[#38f6ff] flex-1"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 rounded-lg text-[#03101a] font-mono font-bold uppercase tracking-wider text-xs transition-all flex-shrink-0 disabled:opacity-50 hover:brightness-110 cursor-pointer"
                style={{
                  background: "linear-gradient(90deg, #00e5ff 0%, #00b8ff 52%, #0084ff 100%)",
                  boxShadow: "0 0 18px rgba(0, 174, 255, 0.65)",
                }}
              >
                {isSubmitting ? "UNLOCKING..." : "UNLOCK ALL 6"}
              </button>
            </form>

            <div className="text-[10px] font-mono text-cyan-200/60 pt-1">
              Zero corporate marketing spam &bull; Instant PDF chapters &bull; One-click unsubscribe
            </div>
          </div>
        </div>
      )}

      {/* Modal Reader Overlay */}
      {activeModalExcerpt && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl bg-[#080d19] border-2 border-[#c5a059] shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 bg-[#0d1424] flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-[#c5a059] uppercase tracking-wider font-bold">
                  {activeModalExcerpt.volume} &bull; {activeModalExcerpt.chapter} &bull; {activeModalExcerpt.pagesInTextbook}
                </div>
                <h3 className="text-xl sm:text-2xl font-serif font-black text-white mt-1">
                  {activeModalExcerpt.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveModalExcerpt(null)}
                className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-mono transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-4 text-slate-300 font-serif leading-relaxed text-sm sm:text-base">
              <blockquote className="border-l-2 border-[#c5a059] pl-4 py-2 italic text-[#e7c87d] bg-[#0b101d] rounded-r text-sm font-sans mb-6">
                &ldquo;{activeModalExcerpt.quote}&rdquo;
              </blockquote>

              {activeModalExcerpt.fullExcerpt.map((para, i) => (
                <p key={i} className="leading-relaxed">
                  {para}
                </p>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-white/10 bg-[#0d1424] flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs font-mono text-slate-400">
                Panel Profits Canonical Monograph &bull; Copyright &copy; Gregory D. Goyins
              </span>
              <button
                onClick={() => setActiveModalExcerpt(null)}
                className="px-6 py-2 rounded bg-white/10 hover:bg-white/20 text-white font-mono text-xs uppercase tracking-wider transition-colors"
              >
                Close Reader
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
