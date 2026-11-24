"use client";

import React, { useState, useEffect } from "react";
import { BOOK_EXCERPTS, BookExcerpt } from "@/lib/book/excerpts-data";

export function BookExcerptsShowcase() {
  const [selectedExcerpt, setSelectedExcerpt] = useState<BookExcerpt>(BOOK_EXCERPTS[0]);
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
    setIsSubmitting(false);
  };

  const handleOpenReader = (excerpt: BookExcerpt) => {
    if (isUnlocked || excerpt.id === selectedExcerpt.id) {
      setActiveModalExcerpt(excerpt);
    } else {
      // scroll to lead unlock box
      const el = document.getElementById("excerpt-unlock-vault");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <section id="excerpts-reader" className="py-20 px-6 max-w-6xl mx-auto border-t border-white/10">
      <div className="space-y-4 mb-12 text-center md:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-xs font-mono tracking-widest uppercase">
          Interactive Reading Folio &bull; 1,200-Page Master Monograph
        </div>
        <h2 className="text-3xl sm:text-5xl font-serif font-black text-white tracking-tight">
          Curated Excerpts &amp; Forensic Chapters
        </h2>
        <p className="text-slate-300 text-sm md:text-base max-w-3xl leading-relaxed font-light">
          Sample unreleased chapters from the 1,200-page sovereign textbook before purchasing the complete edition. Rotating previews are available immediately; unlock all six master dossiers below.
        </p>
      </div>

      {/* Featured Rotating Excerpt Card */}
      <div className="mb-16 p-6 sm:p-8 rounded-2xl border-2 border-[#c5a059] bg-[#0b101d]/90 backdrop-blur-md shadow-2xl relative overflow-hidden">
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-[#c5a059]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-start justify-between">
          <div className="space-y-4 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono text-[#c5a059]">
              <span className="px-2 py-0.5 rounded bg-[#c5a059]/20 border border-[#c5a059]/40 font-bold uppercase tracking-wider">
                {selectedExcerpt.volume} &bull; {selectedExcerpt.chapter}
              </span>
              <span className="text-slate-400 font-normal">&bull;</span>
              <span className="text-slate-300">{selectedExcerpt.pagesInTextbook}</span>
              <span className="text-slate-400 font-normal">&bull;</span>
              <span className="text-emerald-400 font-bold">{selectedExcerpt.readTime}</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                FEATURED OPEN ROTATION
              </span>
            </div>

            <h3 className="text-2xl sm:text-4xl font-serif font-black text-white tracking-tight leading-tight">
              {selectedExcerpt.title}
            </h3>
            <p className="text-xs sm:text-sm text-[#e7c87d] font-mono tracking-wide">
              {selectedExcerpt.subtitle}
            </p>

            <blockquote className="border-l-2 border-[#c5a059] pl-4 py-1 italic text-slate-200 text-xs sm:text-sm font-serif leading-relaxed bg-[#070b14]/50 rounded-r">
              &ldquo;{selectedExcerpt.quote}&rdquo;
            </blockquote>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light pt-1">
              {selectedExcerpt.summary}
            </p>
          </div>

          <div className="flex-shrink-0 w-full lg:w-auto flex flex-col sm:flex-row lg:flex-col gap-3 self-stretch lg:self-center justify-center">
            <button
              onClick={() => handleOpenReader(selectedExcerpt)}
              className="px-8 py-3.5 rounded bg-[#c5a059] hover:bg-[#d8b368] text-black font-mono font-bold uppercase tracking-wider text-xs shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <span>📖</span> READ COMPLETE EXCERPT
            </button>
            <div className="text-[10px] font-mono text-center text-slate-400 tracking-wider uppercase">
              {selectedExcerpt.wordCount} &bull; Full Forensic Text
            </div>
          </div>
        </div>
      </div>

      {/* Grid of All Available Book Excerpts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {BOOK_EXCERPTS.map((excerpt) => {
          const isThisFeatured = excerpt.id === selectedExcerpt.id;
          const canRead = isUnlocked || isThisFeatured;

          return (
            <div
              key={excerpt.id}
              className={`p-6 rounded-xl border transition-all duration-300 flex flex-col justify-between ${
                isThisFeatured
                  ? "border-[#c5a059] bg-[#0d1424]/90 shadow-lg shadow-[#c5a059]/10"
                  : "border-white/10 bg-[#080d19]/80 hover:border-[#c5a059]/40"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="text-[#c5a059] font-bold">{excerpt.chapter}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 uppercase">
                    {excerpt.readTime}
                  </span>
                </div>

                <h4 className="text-lg font-serif font-bold text-white hover:text-[#c5a059] transition-colors leading-snug">
                  {excerpt.title}
                </h4>
                <div className="text-xs text-[#e7c87d] font-mono line-clamp-1">
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
                    onClick={() => handleOpenReader(excerpt)}
                    className="px-3.5 py-1.5 rounded bg-[#c5a059]/20 hover:bg-[#c5a059] text-[#c5a059] hover:text-black border border-[#c5a059]/40 text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-1.5"
                  >
                    <span>📖</span> READ
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenReader(excerpt)}
                    className="px-3 py-1 rounded bg-slate-900/80 text-slate-400 border border-slate-800 text-[11px] font-mono uppercase tracking-wider hover:text-[#c5a059] hover:border-[#c5a059]/40 transition-colors flex items-center gap-1"
                  >
                    <span>🔒</span> UNLOCK
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reader Unlock Vault / Registration Box */}
      {!isUnlocked && (
        <div id="excerpt-unlock-vault" className="p-8 sm:p-10 rounded-2xl border-2 border-[#c5a059] bg-[#0d1424]/95 backdrop-blur-md shadow-2xl relative">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <div className="text-xs font-mono text-[#c5a059] font-bold uppercase tracking-widest">
              VIP SCHOLARSHIP ARCHIVE ACCESS
            </div>
            <h3 className="text-2xl sm:text-4xl font-serif font-black text-white">
              Unlock All 6 Master Book Excerpts
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed">
              Input your email below to unlock unrestricted instant access to all rotating chapter excerpts from the 1,200-page definitive manual, plus notification of the three-volume print release.
            </p>

            <form onSubmit={handleUnlock} className="pt-4 flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <input
                type="text"
                placeholder="Your name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-4 py-3 rounded-lg bg-[#070b14] border border-white/20 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-[#c5a059] flex-1"
              />
              <input
                type="email"
                required
                placeholder="your.email@institutional.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-4 py-3 rounded-lg bg-[#070b14] border border-white/20 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-[#c5a059] flex-1"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 rounded-lg bg-[#c5a059] hover:bg-[#d8b368] text-black font-mono font-bold uppercase tracking-wider text-xs transition-all flex-shrink-0 disabled:opacity-50"
              >
                {isSubmitting ? "UNLOCKING..." : "UNLOCK ALL 6"}
              </button>
            </form>

            <div className="text-[10px] font-mono text-slate-500 pt-1">
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
