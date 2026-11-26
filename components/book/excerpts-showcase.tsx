"use client";

import React, { useState, useEffect } from "react";
import {
  BOOK_EXCERPTS,
  BookExcerpt,
  IllustratedBookPage,
} from "@/lib/book/excerpts-data";

function IllustratedBookSheet({
  page,
  index,
  totalPages,
}: {
  page: IllustratedBookPage;
  index: number;
  totalPages: number;
}) {
  return (
    <article className="p-6 sm:p-8 md:p-10 rounded-xl bg-[#040811]/95 border border-white/15 shadow-2xl space-y-6">
      {/* Running Book Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10 text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.2em] text-slate-400">
        <span>{page.runningHeader}</span>
        <span className="text-[#8affb8] font-bold">
          PAGE {index + 1} OF {totalPages} &bull; p. {page.pageNumber}
        </span>
      </div>

      {/* Section Title */}
      <h4 className="text-xl sm:text-2xl font-serif font-bold text-[#e7c87d] tracking-tight">
        {page.sectionTitle}
      </h4>

      {/* Body + Archival Plate Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        <div
          className={`${
            page.figure ? "lg:col-span-8" : "lg:col-span-12"
          } space-y-4 font-serif text-slate-100 text-sm sm:text-[15.5px] leading-8`}
        >
          {page.paragraphs.map((para, pIdx) => (
            <p
              key={pIdx}
              className={
                index === 0 && pIdx === 0
                  ? "first-letter:text-5xl first-letter:font-black first-letter:text-[#00ff66] first-letter:mr-2.5 first-letter:float-left first-letter:leading-none"
                  : ""
              }
            >
              {para}
            </p>
          ))}

          {page.pullQuote && (
            <blockquote className="my-5 border-l-2 border-[#00ff66] pl-4 py-2 italic text-[#d9ffe8] text-sm sm:text-base font-serif bg-emerald-950/25 rounded-r">
              &ldquo;{page.pullQuote}&rdquo;
            </blockquote>
          )}
        </div>

        {page.figure && (
          <figure className="lg:col-span-4 rounded-xl overflow-hidden bg-black/70 border border-[#c5a059]/45 shadow-xl">
            {page.figure.secondarySrc ? (
              <div className="grid grid-cols-2 gap-1 bg-black p-1">
                <img
                  src={page.figure.src}
                  alt={page.figure.caption}
                  className="w-full aspect-[3/4] object-cover rounded-sm"
                  loading="lazy"
                />
                <img
                  src={page.figure.secondarySrc}
                  alt={page.figure.secondaryCaption || page.figure.caption}
                  className="w-full aspect-[3/4] object-cover rounded-sm"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="bg-black p-1.5">
                <img
                  src={page.figure.src}
                  alt={page.figure.caption}
                  className="w-full max-h-[340px] object-contain mx-auto rounded-sm"
                  loading="lazy"
                />
              </div>
            )}
            <figcaption className="p-3.5 border-t border-white/10 space-y-1 bg-[#060b14]/90">
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#e7c87d]">
                {page.figure.plateNumber} &bull; Archival Plate
              </div>
              <p className="text-[11px] font-sans text-slate-300 leading-relaxed">
                {page.figure.caption}
              </p>
            </figcaption>
          </figure>
        )}
      </div>

      {/* Book Page Footer */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-slate-500">
        <span>Panel Profits &mdash; Gregory D. Goyins</span>
        <span className="text-slate-300 font-bold">— {page.pageNumber} —</span>
      </div>
    </article>
  );
}

export function BookExcerptsShowcase() {
  const illustratedExcerpts = BOOK_EXCERPTS.filter(
    (e) => e.illustratedPages && e.illustratedPages.length > 0
  );
  const [selectedExcerpt, setSelectedExcerpt] = useState<BookExcerpt>(
    illustratedExcerpts[0] || BOOK_EXCERPTS[0]
  );
  const [pageViewMode, setPageViewMode] = useState<"all" | number>("all");
  const [selectedLockedId, setSelectedLockedId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeModalExcerpt, setActiveModalExcerpt] = useState<BookExcerpt | null>(null);

  // Randomize initial rotation on mount across the 3 full 3-page illustrated chapters
  useEffect(() => {
    const pool = BOOK_EXCERPTS.filter(
      (e) => e.illustratedPages && e.illustratedPages.length > 0
    );
    const pickFrom = pool.length > 0 ? pool : BOOK_EXCERPTS;
    const randomIndex = Math.floor(Math.random() * pickFrom.length);
    setSelectedExcerpt(pickFrom[randomIndex]);
    
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
    <section id="excerpts-reader" className="pt-4 space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-[#00ff66]/30">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-emerald-950/60 border border-[#00ff66]/60 text-[#8affb8] text-[11px] font-mono tracking-widest uppercase">
            <span>◆</span> FREE 3-PAGE MAGAZINE-TEXTBOOK EXCERPT // BY GREGORY D. GOYINS
          </div>
          <h2 className="text-2xl sm:text-3xl font-light text-white uppercase tracking-wide">
            Read Actual Typeset Pages From the Book
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed font-light">
            Every page load rotates one of Gregory D. Goyins&apos;s 3-page illustrated Magazine-Textbook spreads open for free below. Enter your info in the electric-blue vault to unlock all six chapter excerpts.
          </p>
        </div>
      </div>

      {/* Featured Rotating Excerpt Card — Bright Electric Green Rimlight + Actual Typeset Pages */}
      <div className="p-5 sm:p-7 rounded-xl bg-[#050c12]/85 backdrop-blur-2xl relative overflow-hidden podcast-rim-green">
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

          {/* Actual Rendered High-Res Typeset Pages Directly From Gregory D. Goyins's Textbook PDF */}
          {selectedExcerpt.renderedPageImages &&
          selectedExcerpt.renderedPageImages.length > 0 ? (
            <div className="space-y-5">
              {/* Page Navigation Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-black/70 border border-[#00ff66]/45">
                <div className="text-[11px] font-mono uppercase tracking-widest text-[#8affb8] font-bold">
                  Actual Typeset Textbook Pages &bull; {selectedExcerpt.chapter}{" "}
                  ({selectedExcerpt.pagesInTextbook})
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setPageViewMode("all")}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider border transition-colors cursor-pointer ${
                      pageViewMode === "all"
                        ? "bg-[#00ff66] text-slate-950 border-[#00ff66] font-bold"
                        : "bg-slate-950/80 text-slate-300 border-white/15 hover:border-[#00ff66]/60"
                    }`}
                  >
                    All {selectedExcerpt.renderedPageImages.length} Pages
                  </button>
                  {selectedExcerpt.renderedPageImages.map((pg, idx) => (
                    <button
                      key={pg.pageNumber}
                      type="button"
                      onClick={() => setPageViewMode(idx)}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider border transition-colors cursor-pointer ${
                        pageViewMode === idx
                          ? "bg-[#00ff66] text-slate-950 border-[#00ff66] font-bold"
                          : "bg-slate-950/80 text-slate-300 border-white/15 hover:border-[#00ff66]/60"
                      }`}
                    >
                      Page {idx + 1} (p.{pg.pageNumber})
                    </button>
                  ))}
                </div>
              </div>

              {/* Authentic High-Res Typeset Textbook Sheets */}
              <div className="space-y-8">
                {(pageViewMode === "all"
                  ? selectedExcerpt.renderedPageImages.map((pg, idx) => ({
                      pg,
                      idx,
                    }))
                  : [
                      {
                        pg: selectedExcerpt.renderedPageImages[pageViewMode],
                        idx: pageViewMode,
                      },
                    ]
                )
                  .filter((item) => Boolean(item.pg))
                  .map(({ pg, idx }) => (
                    <figure
                      key={pg.src}
                      className="max-w-4xl mx-auto space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2 px-1 text-[11px] font-mono text-slate-300">
                        <span className="text-[#8affb8] font-bold uppercase tracking-wider">
                          PAGE {idx + 1} OF{" "}
                          {selectedExcerpt.renderedPageImages!.length} &bull; p.{" "}
                          {pg.pageNumber}
                        </span>
                        <span className="text-slate-400 truncate">
                          {pg.label}
                        </span>
                      </div>
                      <div
                        onClick={() => handleOpenReader(selectedExcerpt)}
                        title="Click to open full-screen textbook reader"
                        className="rounded-lg overflow-hidden bg-white shadow-[0_24px_60px_rgba(0,0,0,0.9)] ring-1 ring-white/25 cursor-zoom-in transition-transform duration-200 hover:scale-[1.005]"
                      >
                        <img
                          src={pg.src}
                          alt={pg.label}
                          className="w-full h-auto block"
                          loading={idx === 0 ? "eager" : "lazy"}
                        />
                      </div>
                    </figure>
                  ))}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-slate-300">
                <span>
                  Direct Facsimile Pages From the Official Magazine-Textbook
                  Edition &bull; Panel Profits by Gregory D. Goyins
                </span>
                {!isUnlocked && (
                  <a
                    href="#excerpt-unlock-vault"
                    className="text-[#38e2ff] hover:underline font-bold uppercase tracking-wider"
                  >
                    Unlock All 6 Chapters Below &darr;
                  </a>
                )}
              </div>
            </div>
          ) : selectedExcerpt.illustratedPages &&
          selectedExcerpt.illustratedPages.length > 0 ? (
            <div className="space-y-5">
              {/* Page Navigation Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-black/60 border border-[#00ff66]/40">
                <div className="text-[11px] font-mono uppercase tracking-widest text-[#8affb8] font-bold">
                  3 Complete Illustrated Pages &bull; {selectedExcerpt.chapter} (
                  {selectedExcerpt.pagesInTextbook})
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setPageViewMode("all")}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider border transition-colors cursor-pointer ${
                      pageViewMode === "all"
                        ? "bg-[#00ff66] text-slate-950 border-[#00ff66] font-bold"
                        : "bg-slate-950/80 text-slate-300 border-white/15 hover:border-[#00ff66]/60"
                    }`}
                  >
                    All {selectedExcerpt.illustratedPages.length} Pages
                  </button>
                  {selectedExcerpt.illustratedPages.map((pg, idx) => (
                    <button
                      key={pg.pageNumber}
                      type="button"
                      onClick={() => setPageViewMode(idx)}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider border transition-colors cursor-pointer ${
                        pageViewMode === idx
                          ? "bg-[#00ff66] text-slate-950 border-[#00ff66] font-bold"
                          : "bg-slate-950/80 text-slate-300 border-white/15 hover:border-[#00ff66]/60"
                      }`}
                    >
                      Page {idx + 1} (p.{pg.pageNumber})
                    </button>
                  ))}
                </div>
              </div>

              {/* Render All 3 Full Illustrated Book Sheets or Selected Single Page */}
              <div className="space-y-6">
                {(pageViewMode === "all"
                  ? selectedExcerpt.illustratedPages.map((page, idx) => ({
                      page,
                      idx,
                    }))
                  : [
                      {
                        page: selectedExcerpt.illustratedPages[pageViewMode],
                        idx: pageViewMode,
                      },
                    ]
                )
                  .filter((item) => Boolean(item.page))
                  .map(({ page, idx }) => (
                    <IllustratedBookSheet
                      key={page.pageNumber}
                      page={page}
                      index={idx}
                      totalPages={selectedExcerpt.illustratedPages!.length}
                    />
                  ))}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-slate-300">
                <span>
                  End of 3-Page Illustrated Excerpt &bull; Panel Profits by Gregory D. Goyins
                </span>
                {!isUnlocked && (
                  <a
                    href="#excerpt-unlock-vault"
                    className="text-[#38e2ff] hover:underline font-bold uppercase tracking-wider"
                  >
                    Unlock All 6 Chapters Below &darr;
                  </a>
                )}
              </div>
            </div>
          ) : (
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
            </div>
          )}
        </div>
      </div>

      {/* Reader Unlock Vault — Electric Blue Gate Placed Right Between Free Preview & 6-Card Grid (Matches /podcasts!) */}
      {!isUnlocked && (
        <div
          id="excerpt-unlock-vault"
          className="p-8 sm:p-10 rounded-2xl bg-[#040d18]/90 backdrop-blur-2xl relative overflow-hidden unlock-rim-ice"
        >
          <div className="relative z-10 max-w-2xl mx-auto text-center space-y-4">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded text-xs font-mono font-bold uppercase tracking-widest"
              style={{
                backgroundColor: "rgba(0, 184, 255, 0.16)",
                color: "#38e2ff",
                border: "1px solid rgba(0, 200, 255, 0.75)",
                boxShadow: "0 0 10px rgba(0, 174, 255, 0.45)",
              }}
            >
              <span>🔒</span> VIP SCHOLARSHIP ARCHIVE ACCESS
            </div>
            <h3 className="text-2xl sm:text-3xl font-light text-white uppercase tracking-wide">
              Unlock All 6 Master Book Excerpts
            </h3>
            <p className="text-xs sm:text-sm text-cyan-100/85 font-light leading-relaxed">
              Enter your name and email below to immediately unlock all six chapter excerpts from Gregory D. Goyins&apos;s Panel Profits—including all three 3-page illustrated Magazine-Textbook spreads—plus print edition release alerts.
            </p>

            <form onSubmit={handleUnlock} className="pt-2 flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-4 py-3 rounded-lg bg-[#040c18] border border-cyan-400/35 text-white placeholder-slate-400 text-xs font-mono focus:outline-none focus:border-[#00c8ff] flex-1"
              />
              <input
                type="email"
                required
                placeholder="your.email@institutional.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-4 py-3 rounded-lg bg-[#040c18] border border-cyan-400/35 text-white placeholder-slate-400 text-xs font-mono focus:outline-none focus:border-[#00c8ff] flex-1"
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

            <div className="text-[10px] font-mono text-cyan-200/70 pt-1 uppercase tracking-wider">
              Zero spam &bull; Instant access to all 6 chapter folios &bull; Print release alerts
            </div>
          </div>
        </div>
      )}

      {/* Grid of All 6 Available Book Excerpts — 2-Col Podcast-Style Grid with Green Open + Crimson-Red Locked Hover Rimlights */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
          <h3 className="text-xs font-mono uppercase tracking-widest text-slate-300">
            Master Chapter Excerpt Catalog ({BOOK_EXCERPTS.length} Chapters &bull; 3 Illustrated Facsimile Spreads)
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BOOK_EXCERPTS.map((excerpt) => {
            const isThisFeatured = excerpt.id === selectedExcerpt.id;
            const canRead = isUnlocked || isThisFeatured;
            const isSelectedLocked = !canRead && selectedLockedId === excerpt.id;

            const cardRimClass = isThisFeatured
              ? "podcast-rim-green bg-[#04140c]/80"
              : isSelectedLocked
              ? "podcast-rim-red podcast-rim-red-selected"
              : !canRead
              ? "podcast-rim-red bg-[#060b14]/65"
              : "podcast-rim-unlocked bg-[#060b14]/70";

            return (
              <div
                key={excerpt.id}
                onClick={() => handleOpenReader(excerpt)}
                className={`group p-5 rounded-lg backdrop-blur-xl flex flex-col justify-between cursor-pointer ${cardRimClass}`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-bold transition-colors ${
                          isThisFeatured
                            ? "text-[#8affb8]"
                            : !canRead
                            ? "text-emerald-400 group-hover:text-red-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {excerpt.chapter}
                      </span>
                      {isThisFeatured && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold"
                          style={{
                            backgroundColor: "rgba(0, 255, 102, 0.18)",
                            color: "#8affb8",
                            border: "1px solid rgba(0, 255, 102, 0.65)",
                          }}
                        >
                          3-PAGE FREE OPEN
                        </span>
                      )}
                      {!isThisFeatured && excerpt.renderedPageImages?.length ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-950/70 text-[#ffe066] border border-[#ffd147]/45 text-[10px] font-mono">
                          3 PAGES &bull; TYPESET
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900/70 border border-slate-800 text-slate-300 uppercase shrink-0">
                      {excerpt.readTime}
                    </span>
                  </div>

                  <h4
                    className={`text-base font-normal text-white uppercase tracking-wide transition-colors leading-snug ${
                      isThisFeatured
                        ? "group-hover:text-[#8affb8]"
                        : !canRead
                        ? "group-hover:text-red-300"
                        : "group-hover:text-emerald-300"
                    }`}
                  >
                    {excerpt.title}
                  </h4>
                  <div
                    className={`text-xs font-light tracking-wide transition-colors ${
                      isThisFeatured
                        ? "text-[#8affb8]"
                        : !canRead
                        ? "text-emerald-400 group-hover:text-red-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {excerpt.subtitle}
                  </div>
                  <p className="text-xs text-slate-300 font-light leading-relaxed line-clamp-3">
                    {excerpt.summary}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">
                    {excerpt.pagesInTextbook} &bull; {excerpt.wordCount}
                  </span>

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
                      <span>📖</span> READ PAGES
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenReader(excerpt);
                      }}
                      className="px-3 py-1.5 rounded bg-red-500/20 group-hover:bg-red-500/35 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/60 text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>🔒</span> UNLOCK
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-200 font-serif leading-relaxed text-sm sm:text-base">
              <blockquote className="border-l-2 border-[#00ff66] pl-4 py-2 italic text-[#e8fff1] bg-[#0b101d] rounded-r text-sm font-sans">
                &ldquo;{activeModalExcerpt.quote}&rdquo;
              </blockquote>

              {activeModalExcerpt.renderedPageImages &&
              activeModalExcerpt.renderedPageImages.length > 0 ? (
                <div className="space-y-6">
                  {activeModalExcerpt.renderedPageImages.map((pg, idx) => (
                    <figure key={pg.src} className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                        <span className="text-[#8affb8] font-bold uppercase">
                          PAGE {idx + 1} OF{" "}
                          {activeModalExcerpt.renderedPageImages!.length} &bull;
                          p. {pg.pageNumber}
                        </span>
                        <span className="text-slate-400 truncate">
                          {pg.label}
                        </span>
                      </div>
                      <div className="rounded-lg overflow-hidden bg-white shadow-2xl ring-1 ring-white/25">
                        <img
                          src={pg.src}
                          alt={pg.label}
                          className="w-full h-auto block"
                        />
                      </div>
                    </figure>
                  ))}
                </div>
              ) : activeModalExcerpt.illustratedPages &&
              activeModalExcerpt.illustratedPages.length > 0 ? (
                activeModalExcerpt.illustratedPages.map((pg, idx) => (
                  <IllustratedBookSheet
                    key={pg.pageNumber}
                    page={pg}
                    index={idx}
                    totalPages={activeModalExcerpt.illustratedPages!.length}
                  />
                ))
              ) : (
                activeModalExcerpt.fullExcerpt.map((para, i) => (
                  <p key={i} className="leading-relaxed">
                    {para}
                  </p>
                ))
              )}
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
