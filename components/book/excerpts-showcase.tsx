"use client";

import React, { useState, useEffect } from "react";
import { BOOK_EXCERPTS, BookExcerpt } from "@/lib/book/excerpts-data";

const CLAIMED_EXCERPT_STORAGE_KEY = "cbse_book_claimed_excerpt_id";
const CLAIMED_EXCERPT_COOKIE_NAME = "cbse_book_claimed_excerpt";

function readCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

function readPersistedClaimedExcerptId(): string | null {
  try {
    const ls = localStorage.getItem(CLAIMED_EXCERPT_STORAGE_KEY);
    if (ls && BOOK_EXCERPTS.some((e) => e.id === ls)) return ls;
  } catch {
    // ignore storage error
  }
  try {
    const ck = readCookieValue(CLAIMED_EXCERPT_COOKIE_NAME);
    if (ck && BOOK_EXCERPTS.some((e) => e.id === ck)) return ck;
  } catch {
    // ignore cookie error
  }
  return null;
}

function persistClaimedExcerptId(id: string) {
  try {
    localStorage.setItem(CLAIMED_EXCERPT_STORAGE_KEY, id);
  } catch {
    // ignore
  }
  try {
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `${CLAIMED_EXCERPT_COOKIE_NAME}=${encodeURIComponent(id)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    // ignore
  }
}

export function BookExcerptsShowcase({
  onOpenCheckout,
}: {
  onOpenCheckout: (format: string, price: string) => void;
}) {
  const [featuredExcerpt, setFeaturedExcerpt] = useState<BookExcerpt>(
    BOOK_EXCERPTS[0]
  );
  const [claimedExcerptId, setClaimedExcerptId] = useState<string | null>(null);
  const [selectedLockedId, setSelectedLockedId] = useState<string | null>(null);
  const [pageViewMode, setPageViewMode] = useState<"all" | number>("all");
  const [activeModalExcerpt, setActiveModalExcerpt] =
    useState<BookExcerpt | null>(null);

  // Reload-proof 1-of-4 sample logic:
  // - If visitor already claimed 1 of the 4 chapters, pin them strictly to that chapter (reloading never grants a 2nd free chapter).
  // - Otherwise rotate 1 of the 4 chapters into the spotlight on load (like /podcasts), and let them pick ANY 1 of the 4.
  useEffect(() => {
    const existingClaim = readPersistedClaimedExcerptId();
    if (existingClaim) {
      setClaimedExcerptId(existingClaim);
      const claimedObj = BOOK_EXCERPTS.find((e) => e.id === existingClaim);
      if (claimedObj) setFeaturedExcerpt(claimedObj);
      return;
    }

    const randomIndex = Math.floor(Math.random() * BOOK_EXCERPTS.length);
    setFeaturedExcerpt(BOOK_EXCERPTS[randomIndex]);
  }, []);

  const activeClaimedExcerpt = claimedExcerptId
    ? BOOK_EXCERPTS.find((e) => e.id === claimedExcerptId) || featuredExcerpt
    : null;

  const handleSelectChapter = (excerpt: BookExcerpt) => {
    // Case 1: Visitor has not claimed their 1-of-4 free chapter yet -> claim this one!
    if (!claimedExcerptId) {
      persistClaimedExcerptId(excerpt.id);
      setClaimedExcerptId(excerpt.id);
      setFeaturedExcerpt(excerpt);
      setSelectedLockedId(null);
      setPageViewMode("all");
      const readerEl = document.getElementById("book-claimed-reader");
      if (readerEl) {
        readerEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    // Case 2: Visitor clicked their already-claimed 1-of-4 chapter -> open full-screen reader
    if (excerpt.id === claimedExcerptId) {
      setSelectedLockedId(null);
      setActiveModalExcerpt(excerpt);
      return;
    }

    // Case 3: Visitor already used their 1-of-4 free sample and clicked one of the other 3 -> must buy the book!
    setSelectedLockedId(excerpt.id);
    const gateEl = document.getElementById("book-purchase-gate");
    if (gateEl) {
      gateEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    onOpenCheckout(
      `Complete eBook — Unlock ${excerpt.chapter}: ${excerpt.title}`,
      "$9.99"
    );
  };

  return (
    <section id="excerpts-reader" className="pt-4 space-y-10">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-[#00ff66]/30">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-emerald-950/60 border border-[#00ff66]/60 text-[#8affb8] text-[11px] font-mono tracking-widest uppercase">
            <span>◆</span> 1-OF-4 FREE MAGAZINE-TEXTBOOK SAMPLE // BY GREGORY D.
            GOYINS
          </div>
          <h2 className="text-2xl sm:text-3xl font-light text-white uppercase tracking-wide">
            Pick One of Four Chapters to Read Free (3 Typeset Pages)
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed font-light">
            Our rotating sampler features 3-page sections from four cornerstone
            parts of Gregory D. Goyins&apos;s official Magazine-Textbook PDF:{" "}
            <strong className="text-white">Appendix A</strong>,{" "}
            <strong className="text-white">Chapter 5</strong>,{" "}
            <strong className="text-white">Chapter 13</strong>, and{" "}
            <strong className="text-white">Chapter 1 (The Room Test)</strong>.
            Pick <strong className="text-[#8affb8]">one</strong> section to read
            free—then purchase the book for full unrestricted access.
          </p>
        </div>

        <span
          className="px-3 py-1.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider shrink-0"
          style={
            claimedExcerptId
              ? {
                  backgroundColor: "rgba(255, 42, 75, 0.18)",
                  color: "#ff8da1",
                  border: "1px solid rgba(255, 42, 75, 0.75)",
                }
              : {
                  backgroundColor: "rgba(0, 255, 102, 0.16)",
                  color: "#8affb8",
                  border: "1px solid rgba(0, 255, 102, 0.7)",
                }
          }
        >
          {claimedExcerptId
            ? "FREE SAMPLE: 1 / 1 CLAIMED"
            : "FREE SAMPLE: 0 / 1 CLAIMED"}
        </span>
      </div>

      {/* Top Rotating Spotlight / Active Claimed 3-Page Textbook Reader */}
      <div id="book-claimed-reader" className="scroll-mt-20">
        {activeClaimedExcerpt ? (
          <div className="p-5 sm:p-7 rounded-xl bg-[#050c12]/88 backdrop-blur-2xl relative overflow-hidden podcast-rim-green space-y-6">
            <div className="flex flex-col lg:flex-row gap-5 items-start justify-between border-b border-white/10 pb-5">
              <div className="space-y-2.5 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span
                    className="px-2.5 py-0.5 rounded font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: "rgba(0, 255, 102, 0.18)",
                      color: "#8affb8",
                      border: "1px solid rgba(0, 255, 102, 0.75)",
                    }}
                  >
                    YOUR CLAIMED FREE SAMPLE (1 OF 1)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-950/70 border border-[#ffd147]/50 text-[#ffe066] font-bold uppercase">
                    {activeClaimedExcerpt.volume} &bull;{" "}
                    {activeClaimedExcerpt.chapter}
                  </span>
                  <span className="text-slate-300">
                    {activeClaimedExcerpt.pagesInTextbook}
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-light text-white uppercase tracking-wide">
                  {activeClaimedExcerpt.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#8affb8] font-mono">
                  {activeClaimedExcerpt.subtitle} &mdash; By Gregory D. Goyins
                </p>
              </div>

              <button
                onClick={() => setActiveModalExcerpt(activeClaimedExcerpt)}
                className="px-5 py-2.5 rounded text-slate-950 font-mono font-bold uppercase tracking-wider text-xs transition-all flex items-center gap-2 cursor-pointer hover:brightness-110 shrink-0"
                style={{
                  backgroundColor: "#00ff66",
                  boxShadow: "0 0 16px rgba(0, 255, 102, 0.65)",
                }}
              >
                <span>📖</span> FULL-SCREEN READER
              </button>
            </div>

            {/* Page Navigation Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-black/70 border border-[#00ff66]/45">
              <div className="text-[11px] font-mono uppercase tracking-widest text-[#8affb8] font-bold">
                Actual Typeset Textbook Pages &bull;{" "}
                {activeClaimedExcerpt.chapter} (
                {activeClaimedExcerpt.pagesInTextbook})
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
                  All {activeClaimedExcerpt.renderedPageImages.length} Pages
                </button>
                {activeClaimedExcerpt.renderedPageImages.map((pg, idx) => (
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
                ? activeClaimedExcerpt.renderedPageImages.map((pg, idx) => ({
                    pg,
                    idx,
                  }))
                : [
                    {
                      pg: activeClaimedExcerpt.renderedPageImages[pageViewMode],
                      idx: pageViewMode,
                    },
                  ]
              )
                .filter((item) => Boolean(item.pg))
                .map(({ pg, idx }) => (
                  <figure key={pg.src} className="max-w-4xl mx-auto space-y-2.5">
                    <div className="flex items-center justify-between gap-2 px-1 text-[11px] font-mono text-slate-300">
                      <span className="text-[#8affb8] font-bold uppercase tracking-wider">
                        PAGE {idx + 1} OF{" "}
                        {activeClaimedExcerpt.renderedPageImages.length} &bull;
                        p. {pg.pageNumber}
                      </span>
                      <span className="text-slate-400 truncate">
                        {pg.label}
                      </span>
                    </div>
                    <div
                      onClick={() => setActiveModalExcerpt(activeClaimedExcerpt)}
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
          </div>
        ) : (
          /* Rotating Pre-Claim Spotlight Banner — Exact Same Pattern as /podcasts */
          <div className="p-5 md:p-7 rounded-xl bg-[#050c12]/85 backdrop-blur-2xl relative overflow-hidden podcast-rim-green">
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2.5 max-w-3xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="px-2.5 py-0.5 rounded text-[11px] uppercase tracking-widest font-mono font-semibold"
                    style={{
                      backgroundColor: "rgba(0, 255, 102, 0.16)",
                      color: "#8affb8",
                      border: "1px solid rgba(0, 255, 102, 0.75)",
                    }}
                  >
                    ROTATING SPOTLIGHT &bull; PICK 1 OF 4 FREE
                  </span>
                  <span className="text-slate-300 text-xs font-mono">
                    {featuredExcerpt.chapter} &bull;{" "}
                    {featuredExcerpt.pagesInTextbook}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/35 text-[10px] font-mono uppercase">
                    ROTATES ON LOAD
                  </span>
                </div>

                <h3 className="text-xl md:text-2xl font-light text-white uppercase tracking-wide">
                  {featuredExcerpt.title}
                </h3>
                <div className="text-[#8affb8] text-xs uppercase tracking-wider">
                  {featuredExcerpt.subtitle}
                </div>
                <blockquote className="border-l-2 border-[#00ff66] pl-4 py-1.5 italic text-slate-100 text-xs md:text-sm font-serif bg-black/45 rounded-r">
                  &ldquo;{featuredExcerpt.quote}&rdquo;
                </blockquote>
                <p className="text-slate-300 text-xs md:text-sm font-light leading-relaxed">
                  {featuredExcerpt.summary}
                </p>
              </div>

              <div className="flex flex-col items-start lg:items-end gap-3 shrink-0">
                <span className="text-xs text-slate-300 font-mono">
                  3 ACTUAL TYPESET PAGES &bull; {featuredExcerpt.readTime}
                </span>
                <button
                  onClick={() => handleSelectChapter(featuredExcerpt)}
                  className="px-5 py-3 rounded text-slate-950 font-mono font-bold uppercase tracking-widest text-xs transition-all flex items-center gap-2 cursor-pointer hover:brightness-110"
                  style={{
                    backgroundColor: "#00ff66",
                    boxShadow: "0 0 18px rgba(0, 255, 102, 0.65)",
                  }}
                >
                  <span>📖</span> CLAIM &amp; READ THIS CHAPTER FREE
                </button>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Or pick any other chapter below (1 free per reader)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Vivid Electric Blue Purchase Gate — Must Buy the Book After Claiming 1 of 4 */}
      <div
        id="book-purchase-gate"
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
            <span>🔒</span>{" "}
            {claimedExcerptId
              ? "1 / 1 FREE CHAPTER CLAIMED • BUY THE BOOK TO UNLOCK ALL CHAPTERS"
              : "1 FREE CHAPTER SAMPLE • FULL 700+ PAGE EDITION AVAILABLE NOW"}
          </div>
          <h3 className="text-2xl sm:text-3xl font-light text-white uppercase tracking-wide">
            Own Gregory D. Goyins&apos;s Complete Monograph
          </h3>
          <p className="text-xs sm:text-sm text-cyan-100/85 font-light leading-relaxed">
            Readers may preview{" "}
            <strong className="text-white">one</strong> of the four featured
            chapters free. Purchase the complete Magazine-Textbook digital
            edition ($9.99) or reserve the clothbound hardcover ($195.00) to
            unlock every chapter, all 140+ color plates, and all 70 asset
            dossiers immediately.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() =>
                onOpenCheckout(
                  "Complete eBook & Digital Field Manual",
                  "$9.99"
                )
              }
              className="w-full sm:w-auto px-7 py-3.5 rounded-lg text-[#03101a] font-mono font-bold uppercase tracking-widest text-xs transition-all hover:brightness-110 cursor-pointer"
              style={{
                background:
                  "linear-gradient(90deg, #00e5ff 0%, #00b8ff 52%, #0084ff 100%)",
                boxShadow: "0 0 18px rgba(0, 174, 255, 0.65)",
              }}
            >
              BUY COMPLETE EBOOK ($9.99)
            </button>
            <button
              type="button"
              onClick={() =>
                onOpenCheckout("Clothbound Library Edition", "$195.00")
              }
              className="w-full sm:w-auto px-6 py-3.5 rounded-lg bg-[#040c18] hover:bg-cyan-950/60 text-[#38e2ff] border border-[#00c8ff]/60 font-mono font-bold uppercase tracking-widest text-xs transition-all cursor-pointer"
            >
              PRE-ORDER HARDCOVER ($195)
            </button>
          </div>

          <div className="text-[10px] font-mono text-cyan-200/70 pt-1 uppercase tracking-wider">
            Instant PDF + EPUB + Kindle Download &bull; Complete 700+ Page
            Edition by Gregory D. Goyins
          </div>
        </div>
      </div>

      {/* 2-Column 4-Chapter Selector Grid — Mirrors /podcasts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
          <h3 className="text-xs font-mono uppercase tracking-widest text-slate-300">
            4 Featured Magazine-Textbook Chapters (Pick 1 Free &bull; 3 Typeset
            Pages Each)
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            {claimedExcerptId
              ? "3 Locked — Purchase Book to Read"
              : "Choose Wisely: 1 Free Sample Per Reader"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BOOK_EXCERPTS.map((excerpt) => {
            const isClaimed = claimedExcerptId === excerpt.id;
            const isRotatedSpotlight =
              !claimedExcerptId && featuredExcerpt.id === excerpt.id;
            const isLocked = Boolean(claimedExcerptId) && !isClaimed;
            const isSelectedLocked = isLocked && selectedLockedId === excerpt.id;

            const cardRimClass =
              isClaimed || isRotatedSpotlight
                ? "podcast-rim-green bg-[#04140c]/80"
                : isSelectedLocked
                ? "podcast-rim-red podcast-rim-red-selected"
                : isLocked
                ? "podcast-rim-red bg-[#060b14]/65"
                : "podcast-rim-unlocked bg-[#060b14]/70";

            return (
              <div
                key={excerpt.id}
                onClick={() => handleSelectChapter(excerpt)}
                className={`group p-5 rounded-lg backdrop-blur-xl flex flex-col justify-between cursor-pointer ${cardRimClass}`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-bold transition-colors ${
                          isClaimed || isRotatedSpotlight
                            ? "text-[#8affb8]"
                            : isLocked
                            ? "text-emerald-400 group-hover:text-red-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {excerpt.chapter}
                      </span>

                      {isClaimed && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold"
                          style={{
                            backgroundColor: "rgba(0, 255, 102, 0.18)",
                            color: "#8affb8",
                            border: "1px solid rgba(0, 255, 102, 0.7)",
                          }}
                        >
                          YOUR 1 FREE CHAPTER
                        </span>
                      )}

                      {isRotatedSpotlight && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold"
                          style={{
                            backgroundColor: "rgba(0, 255, 102, 0.18)",
                            color: "#8affb8",
                            border: "1px solid rgba(0, 255, 102, 0.7)",
                          }}
                        >
                          ROTATING FEATURED PICK
                        </span>
                      )}

                      {!claimedExcerptId && !isRotatedSpotlight && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-950/70 text-[#ffe066] border border-[#ffd147]/45 text-[10px] font-mono">
                          AVAILABLE AS YOUR 1 FREE PICK
                        </span>
                      )}

                      {isLocked && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold"
                          style={{
                            backgroundColor: "rgba(255, 42, 75, 0.2)",
                            color: "#ff8da1",
                            border: "1px solid rgba(255, 42, 75, 0.75)",
                          }}
                        >
                          🔒 BUY BOOK TO READ
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900/70 border border-slate-800 text-slate-300 uppercase shrink-0">
                      {excerpt.pagesInTextbook}
                    </span>
                  </div>

                  <h4
                    className={`text-base font-normal text-white uppercase tracking-wide transition-colors leading-snug ${
                      isClaimed || isRotatedSpotlight
                        ? "group-hover:text-[#8affb8]"
                        : isLocked
                        ? "group-hover:text-red-300"
                        : "group-hover:text-[#8affb8]"
                    }`}
                  >
                    {excerpt.title}
                  </h4>

                  <div
                    className={`text-xs font-light tracking-wide transition-colors ${
                      isClaimed || isRotatedSpotlight
                        ? "text-[#8affb8]"
                        : isLocked
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

                <div className="pt-4 mt-4 border-t border-slate-800/60 flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-slate-400">
                    3 Actual Typeset Pages &bull; {excerpt.readTime}
                  </span>

                  {isLocked ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectChapter(excerpt);
                      }}
                      className="px-3.5 py-1.5 rounded bg-red-500/20 group-hover:bg-red-500/35 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/60 text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>🔒</span> BUY BOOK ($9.99)
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectChapter(excerpt);
                      }}
                      className="px-3.5 py-1.5 rounded text-slate-950 font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                      style={{
                        backgroundColor: "#00ff66",
                        boxShadow: "0 0 12px rgba(0, 255, 102, 0.5)",
                      }}
                    >
                      <span>📖</span>{" "}
                      {isClaimed ? "OPEN 3 PAGES" : "PICK & READ FREE"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full-Screen Modal Reader Overlay */}
      {activeModalExcerpt && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-[#050b14] podcast-rim-green overflow-hidden my-auto">
            <div className="p-5 sm:p-6 border-b border-white/10 bg-[#07111e] flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-mono text-[#8affb8] uppercase tracking-wider font-bold">
                  {activeModalExcerpt.volume} &bull;{" "}
                  {activeModalExcerpt.chapter} &bull;{" "}
                  {activeModalExcerpt.pagesInTextbook}
                </div>
                <h3 className="text-xl sm:text-2xl font-light text-white uppercase tracking-wide mt-1">
                  {activeModalExcerpt.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveModalExcerpt(null)}
                className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-mono transition-colors cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="p-5 sm:p-7 overflow-y-auto space-y-6">
              {activeModalExcerpt.renderedPageImages.map((pg, idx) => (
                <figure key={pg.src} className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                    <span className="text-[#8affb8] font-bold uppercase">
                      PAGE {idx + 1} OF{" "}
                      {activeModalExcerpt.renderedPageImages.length} &bull; p.{" "}
                      {pg.pageNumber}
                    </span>
                    <span className="text-slate-400 truncate">{pg.label}</span>
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

            <div className="p-4 sm:p-5 border-t border-white/10 bg-[#07111e] flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs font-mono text-slate-400">
                Panel Profits by Gregory D. Goyins &bull; Official
                Magazine-Textbook Edition
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => {
                    setActiveModalExcerpt(null);
                    onOpenCheckout(
                      "Complete eBook & Digital Field Manual",
                      "$9.99"
                    );
                  }}
                  className="px-5 py-2 rounded text-[#03101a] font-mono font-bold text-xs uppercase tracking-wider cursor-pointer"
                  style={{
                    background:
                      "linear-gradient(90deg, #00e5ff 0%, #00b8ff 52%, #0084ff 100%)",
                  }}
                >
                  Buy Full Book ($9.99)
                </button>
                <button
                  onClick={() => setActiveModalExcerpt(null)}
                  className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-white font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
