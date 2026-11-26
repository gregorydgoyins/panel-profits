"use client";

import React, { useState } from "react";
import { BookOrderModal } from "@/components/book/book-order-modal";
import { BookExcerptsShowcase } from "@/components/book/excerpts-showcase";
import { ExpertPraiseRotator } from "@/components/book/expert-praise-rotator";
import EditorialStickyNav from "@/components/navigation/EditorialStickyNav";

export default function BookPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState(
    "Complete eBook & Digital Field Manual"
  );
  const [selectedPrice, setSelectedPrice] = useState("$9.99");

  const openCheckout = (format: string, price: string) => {
    setSelectedFormat(format);
    setSelectedPrice(price);
    setModalOpen(true);
  };

  return (
    <div className="relative min-h-screen text-[#f8fafc] font-light selection:bg-[#fbbf24] selection:text-black">
      {/* High-Resolution Grail Vault Parallax Full-Page Background */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat opacity-95 transition-opacity duration-700"
        style={{
          backgroundImage: `url('/brand/cbse-grail-vault-bg.jpg?v=20261124_robot_vault')`,
        }}
      />
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-[#05080e]/30 via-transparent to-[#05080e]/70" />

      <div className="relative z-10">
        {/* Shared Sticky Parallax Header — 3 glowing sibling pills (Podcasts · Private Beta · Donate) */}
        <EditorialStickyNav currentPage="book" />

        {/* Sleek Hero Header — Mirrors /podcasts Layout Rhythm */}
        <section className="relative overflow-hidden py-6 md:py-8 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8">
              <div className="p-6 md:p-8 rounded-2xl bg-[#060b14]/70 backdrop-blur-2xl book-rim-gold space-y-5">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-amber-950/60 border border-[#ffd147]/60 text-[#ffe066] text-[11px] font-mono tracking-widest uppercase">
                  <span>◆</span> OFFICIAL MONOGRAPH BY GREGORY D. GOYINS //
                  MAGAZINE-TEXTBOOK EDITION
                </div>

                <h1 className="text-3xl md:text-4xl lg:text-5xl font-light text-white tracking-wide uppercase leading-tight drop-shadow-lg">
                  Panel Profits:{" "}
                  <span className="text-[#ffd147] font-normal">
                    The Architecture of Sequential Art Equities
                  </span>
                </h1>

                <p className="text-slate-100 text-sm md:text-base leading-relaxed max-w-2xl font-light drop-shadow">
                  Written by{" "}
                  <strong className="text-[#ffe066] font-medium">
                    Gregory D. Goyins
                  </strong>
                  , founder and architect of the Comic Book Stock Exchange.
                  Uniting gripping non-fiction history with institutional
                  financial economics—wood-pulp decay kinetics, third-party
                  certification epistemics, 25 institutional trading desks, and
                  70 verified sovereign asset dossiers.
                </p>

                {/* Instant Digital Purchase Bar */}
                <div className="p-4 rounded-xl bg-[#040914]/85 border border-[#ffd147]/55 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#ffd147] font-bold">
                      Official Digital Edition &bull; PDF + EPUB + Kindle
                    </div>
                    <div className="text-2xl sm:text-3xl font-mono font-bold text-white flex items-baseline gap-2.5 mt-0.5">
                      <span>$9.99</span>
                      <span className="text-xs font-mono line-through text-slate-400 font-normal">
                        $49.00
                      </span>
                      <span className="text-[10px] font-mono text-[#8affb8] font-bold bg-emerald-950/70 px-2 py-0.5 rounded border border-[#00ff66]/55">
                        80% OFF LAUNCH
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      openCheckout(
                        "Complete eBook & Digital Field Manual",
                        "$9.99"
                      )
                    }
                    className="px-6 py-3 rounded text-slate-950 font-mono font-bold uppercase tracking-widest text-xs transition-all cursor-pointer hover:brightness-110 shrink-0"
                    style={{
                      background:
                        "linear-gradient(90deg, #ffe066 0%, #fbbf24 55%, #d97706 100%)",
                      boxShadow: "0 0 18px rgba(251, 191, 36, 0.55)",
                    }}
                  >
                    Buy &amp; Download ($9.99)
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] font-mono uppercase tracking-wider text-slate-300">
                  <button
                    onClick={() =>
                      openCheckout("Clothbound Library Edition", "$195.00")
                    }
                    className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-white border border-white/25 transition-colors cursor-pointer"
                  >
                    Pre-Order Hardcover ($195)
                  </button>
                  <a
                    href="#excerpts-reader"
                    className="text-[#8affb8] hover:underline font-semibold"
                  >
                    Scroll to Free Typeset Pages &darr;
                  </a>
                </div>
              </div>
            </div>

            {/* Right 3D Hardcover Card */}
            <div className="lg:col-span-4 flex flex-col items-center">
              <div
                onClick={() =>
                  openCheckout(
                    "Complete eBook & Digital Field Manual",
                    "$9.99"
                  )
                }
                className="relative w-72 sm:w-80 h-[420px] rounded-xl bg-[#070c18]/85 backdrop-blur-xl book-rim-gold overflow-hidden flex flex-col justify-between p-5 cursor-pointer group"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-luminosity pointer-events-none"
                  style={{
                    backgroundImage: "url('/covers/detective_comics_27.jpg')",
                  }}
                />
                <div className="relative z-10 border border-[#ffd147]/45 h-full p-5 flex flex-col justify-between bg-[#050912]/70 rounded-lg">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-[#ffd147] tracking-[0.22em] uppercase font-bold">
                        FIRST EDITION
                      </span>
                      <span className="text-[9px] font-mono text-white/75 bg-white/10 px-2 py-0.5 rounded">
                        700+ PAGES
                      </span>
                    </div>
                    <h2 className="text-2xl font-serif font-black text-white mt-3 tracking-tight leading-tight">
                      PANEL PROFITS
                    </h2>
                    <p className="text-[11px] text-[#ffe066] font-serif tracking-widest uppercase mt-0.5 font-bold">
                      THE ARCHITECTURE OF EQUITIES
                    </p>
                    <p className="text-[10px] text-slate-300 font-serif italic mt-2 leading-relaxed">
                      The authoritative financial monograph and actuarial
                      operating system for sequential art capital.
                    </p>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 py-3 my-2 border-y border-white/10">
                    <img
                      src="/covers/amazing_fantasy_15.jpg"
                      alt="Amazing Fantasy #15"
                      className="h-14 w-full object-cover rounded border border-[#ffd147]/45"
                    />
                    <img
                      src="/covers/action_comics_1.jpg"
                      alt="Action Comics #1"
                      className="h-14 w-full object-cover rounded border border-[#ffd147]/45"
                    />
                    <img
                      src="/covers/incredible_hulk_181.jpg"
                      alt="Incredible Hulk #181"
                      className="h-14 w-full object-cover rounded border border-[#ffd147]/45"
                    />
                    <img
                      src="/covers/x_men_1.jpg"
                      alt="X-Men #1"
                      className="h-14 w-full object-cover rounded border border-[#ffd147]/45"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="h-0.5 w-16 bg-gradient-to-r from-[#ffd147] to-transparent" />
                    <div className="text-xs font-mono font-bold text-[#ffe066] tracking-wider">
                      GREGORY D. GOYINS
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono flex items-center justify-between">
                      <span>MAGAZINE-TEXTBOOK</span>
                      <span>CBSE FOUNDING CANON</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content Area — Mirrors /podcasts Clean Vertical Rhythm */}
        <main className="max-w-7xl mx-auto px-6 py-6 space-y-12">
          {/* Compact 6-Card What's Included Grid */}
          <section id="whats-included" className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-3 border-b border-[#ffd147]/25">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-widest text-[#ffd147]">
                  Gregory D. Goyins&apos;s Complete Monograph
                </div>
                <h2 className="text-xl sm:text-2xl font-light text-white uppercase tracking-wide mt-0.5">
                  Inside the $9.99 Magazine-Textbook Edition
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-300 uppercase tracking-wider">
                Instant PDF &bull; EPUB &bull; Kindle
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  num: "01",
                  title: "700+ Pages of Original Scholarship",
                  desc: "Gregory D. Goyins's complete unabridged text—from 1938 groundwood pulp chemistry to 25 institutional trading desks.",
                },
                {
                  num: "02",
                  title: "196-Page Chapter 8 Tactical Manual",
                  desc: "Series 100–400 licensing curricula, dynamic slab haircut matrices, and 45-second order-book execution telemetry.",
                },
                {
                  num: "03",
                  title: "140+ Full-Color Archival Plates",
                  desc: "300 DPI cover plates, historic courtroom transcripts, primary-source sidebars, and verified pedigree logs.",
                },
                {
                  num: "04",
                  title: "70 Constituent Equities Dossiers",
                  desc: "Actuarial dossiers across the CE70 benchmark: survival attrition curves, condition convexity, and fair market value.",
                },
                {
                  num: "05",
                  title: "The Seven Canonical Trading Rules",
                  desc: "Gregory D. Goyins's unvarnished laws of physical capital, dealer shadow spreads, and disciplined underwriting.",
                },
                {
                  num: "06",
                  title: "Lifetime Multi-Format Access",
                  desc: "Delivered immediately in high-res searchable PDF, EPUB, and Kindle editions with all future digital updates.",
                },
              ].map((item) => (
                <div
                  key={item.num}
                  onClick={() =>
                    openCheckout(`eBook Feature: ${item.title}`, "$9.99")
                  }
                  className="group p-5 rounded-xl bg-[#060b14]/70 backdrop-blur-xl book-rim-gold cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[#ffd147] font-mono text-lg font-bold">
                        {item.num}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/70 text-[#ffe066] border border-[#ffd147]/45 group-hover:bg-[#ffd147] group-hover:text-black font-bold transition-colors">
                        $9.99 &rarr;
                      </span>
                    </div>
                    <h3 className="text-base font-normal text-white uppercase tracking-wide group-hover:text-[#ffe066] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed font-light">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Rotating 8-Expert In-Universe Commentary */}
          <ExpertPraiseRotator />

          {/* Compact Editions / Formats Row */}
          <section id="editions" className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-3 border-b border-[#ffd147]/25">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-widest text-[#ffd147]">
                  Institutional &amp; Individual Editions
                </div>
                <h2 className="text-xl sm:text-2xl font-light text-white uppercase tracking-wide mt-0.5">
                  Acquire Gregory D. Goyins&apos;s Panel Profits
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-300 uppercase tracking-wider">
                Digital &bull; Clothbound Hardcover &bull; Syndicate
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* eBook Edition */}
              <div className="p-6 rounded-xl bg-[#060b14]/75 backdrop-blur-xl book-rim-gold flex flex-col justify-between space-y-5 relative">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-[#ffd147] uppercase tracking-widest font-bold">
                      Instant Digital Download
                    </span>
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#ffd147] text-black">
                      Best Seller
                    </span>
                  </div>
                  <h3 className="text-lg font-normal text-white uppercase tracking-wide">
                    Complete eBook &amp; Field Manual
                  </h3>
                  <div className="text-3xl font-mono font-bold text-[#ffe066] flex items-baseline gap-2">
                    <span>$9.99</span>
                    <span className="text-xs font-mono line-through text-slate-400 font-normal">
                      $49.00
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-light">
                    Full 700+ page Magazine-Textbook digital edition (PDF, EPUB,
                    MOBI) with 140+ full-color archival plates and 70 dossiers.
                  </p>
                </div>
                <button
                  onClick={() =>
                    openCheckout(
                      "Complete eBook & Digital Field Manual",
                      "$9.99"
                    )
                  }
                  className="w-full py-3 rounded text-slate-950 font-mono text-xs uppercase tracking-widest font-bold transition-all cursor-pointer hover:brightness-110"
                  style={{
                    background:
                      "linear-gradient(90deg, #ffe066 0%, #fbbf24 55%, #d97706 100%)",
                    boxShadow: "0 0 16px rgba(251, 191, 36, 0.5)",
                  }}
                >
                  Instant Download ($9.99)
                </button>
              </div>

              {/* Hardcover Edition */}
              <div className="p-6 rounded-xl bg-[#060b14]/70 backdrop-blur-xl book-rim-gold flex flex-col justify-between space-y-5">
                <div className="space-y-2.5">
                  <span className="text-[10px] font-mono text-[#ffd147] uppercase tracking-widest font-bold">
                    University Hardcover
                  </span>
                  <h3 className="text-lg font-normal text-white uppercase tracking-wide">
                    Clothbound Library Edition
                  </h3>
                  <div className="text-3xl font-mono font-bold text-white">
                    $195.00
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-light">
                    Monumental 8.5&times;11&Prime; clothbound hardcover by
                    Gregory D. Goyins with foil-stamped spine and numbered
                    archival certificate.
                  </p>
                </div>
                <button
                  onClick={() =>
                    openCheckout("Clothbound Library Edition", "$195.00")
                  }
                  className="w-full py-3 rounded bg-white/10 hover:bg-white/20 text-white border border-white/20 font-mono text-xs uppercase tracking-widest font-bold transition-all cursor-pointer"
                >
                  Pre-Order Hardcover (Q1 2027)
                </button>
              </div>

              {/* Institutional Syndicate */}
              <div className="p-6 rounded-xl bg-[#060b14]/70 backdrop-blur-xl book-rim-gold flex flex-col justify-between space-y-5">
                <div className="space-y-2.5">
                  <span className="text-[10px] font-mono text-[#ffd147] uppercase tracking-widest font-bold">
                    Vault &amp; Fund Access
                  </span>
                  <h3 className="text-lg font-normal text-white uppercase tracking-wide">
                    Institutional Desk Syndicate
                  </h3>
                  <div className="text-3xl font-mono font-bold text-white">
                    $1,200.00
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-light">
                    Includes 5 hardcover copies, institutional API telemetry
                    access, and priority seats in the Q1 2027 Private Beta.
                  </p>
                </div>
                <button
                  onClick={() =>
                    openCheckout("Institutional Desk Syndicate", "$1,200.00")
                  }
                  className="w-full py-3 rounded bg-white/10 hover:bg-white/20 text-white border border-white/20 font-mono text-xs uppercase tracking-widest font-bold transition-all cursor-pointer"
                >
                  Contact Syndicate Desk
                </button>
              </div>
            </div>
          </section>

          {/* Actual 3-Page Magazine-Textbook Facsimile Reader (Pick 1 of 4 Free, Then Buy Book) */}
          <BookExcerptsShowcase onOpenCheckout={openCheckout} />
        </main>

        {/* Footer — Mirrors /podcasts */}
        <footer className="mt-16 mb-10 max-w-xl mx-auto px-6 py-4 rounded-xl border border-[#ffd147]/30 bg-[#060b14]/60 backdrop-blur-xl text-center text-xs uppercase tracking-widest text-slate-300 shadow-2xl">
          <p className="mb-1 text-slate-200">
            Panel Profits by Gregory D. Goyins &bull; Sequential Art Equities
          </p>
          <p className="text-slate-400 text-[10px]">
            Actuarial Ledger &bull; Zero Corporate Kickbacks &bull; Sovereign
            Archive
          </p>
        </footer>
      </div>

      {/* Book Order Modal (Electric Icy Blue Rimlight) */}
      <BookOrderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedFormat={selectedFormat}
        price={selectedPrice}
      />
    </div>
  );
}
