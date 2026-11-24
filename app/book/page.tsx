"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOrderModal } from "@/components/book/book-order-modal";
import { BookExcerptsShowcase } from "@/components/book/excerpts-showcase";

const CHAPTERS = [
  {
    volume: "VOLUME I: THE ART",
    part: "HISTORICAL & MATERIAL GENESIS",
    num: "Prologue",
    title: "The Valhalla of American Gods",
    scope: "Historical Supply Attrition, Third-Party Assaying, and the Empirical Foundations of the Market",
    pages: "27 Pages",
    quote: "Every comic book that exists today is an accidental survivor of a domestic purge.",
  },
  {
    volume: "VOLUME I: THE ART",
    part: "AESTHETIC PARADIGMS",
    num: "Chapter 1",
    title: "The Room Test",
    scope: "The Hand-Turkey Problem, Twenty Core Metrics, and the Universal Valuation Vocabulary Shared by Fine Art and Sequential Art",
    pages: "117 Pages",
    quote: "If an artwork cannot command the wall of a room without an explanatory wall label, it has failed the first test of architectural sovereignty.",
  },
  {
    volume: "VOLUME I: THE ART",
    part: "THE METALS OF TIME",
    num: "Chapter 2",
    title: "Genesis: The Golden Age (1935–1955)",
    scope: "Newsprint Chemistry, Pulp Drives, Siegel & Shuster's $130 Release, and the Birth of the Superhero Pantheon",
    pages: "52 Pages",
    quote: "Two teenagers in Cleveland signed away the modern American mythology on a $130 company voucher.",
  },
  {
    volume: "VOLUME I: THE ART",
    part: "THE METALS OF TIME",
    num: "Chapter 3",
    title: "The Other Precious Metals (1956–1991)",
    scope: "Silver Age Sci-Fi Resurgence, Bronze Age Social Realism, and the Direct Market Copper Transformation",
    pages: "128 Pages",
    quote: "The direct market didn't just save comic books; it turned the comic specialty shop into an autonomous securities exchange.",
  },
  {
    volume: "VOLUME I: THE ART",
    part: "THE POP CONVERGENCE",
    num: "Chapter 18",
    title: "The Pop Vitrine, The Silkscreen Factory, & The Comic Machine",
    scope: "Andy Warhol's 1961 Bonwit Teller Windows, Ferus 32 Soup Cans, The 36-Inch Squeegee Labor, Basquiat Boxing Prizefights, Diamond Dust Optics, and Transmutation of Pulp Ephemera across 8 Volumes",
    pages: "185 Pages (8 Volumes)",
    quote: "When you seal a comic book inside an ultrasonic plastic slab with a microchamber zeolitic sheet, you are performing the exact gesture Andy Warhol performed in 1964 with the Brillo Boxes. You are declaring that the everyday commercial artifacts of industrial democracy are the permanent, sacred monuments of our civilization.",
  },
  {
    volume: "VOLUME I: THE ART",
    part: "THE SURREALIST CONVERGENCE",
    num: "Chapter 20",
    title: "The Surrealist Convergence, The Destino Synthesis, & The Sequential Dreamscape",
    scope: "Salvador Dalí's Paranoiac-Critical Method, Winsor McCay's Slumberland Architecture, Walt Disney's 1945–1946 Destino Storyboard Collisions, Basil Wolverton's Pre-Code Grotesqueries, Steranko's Op-Art Pop Surreality, Moebius and Métal Hurlant, Avida Dollars Forensic Audits, and The Comic Slab as Surrealist Object across 8 Volumes",
    pages: "200 Pages (8 Volumes)",
    quote: "When you take a ten-cent comic book printed on cheap newsprint, enclose it in virgin optical acrylic, sonically weld it shut at forty kilohertz, and crown it with a decimal grade, you are creating the supreme twentieth-century Surrealist Object: a pure, non-consumable financial and cultural talisman.",
  },
  {
    volume: "VOLUME I: THE ART",
    part: "THE POP CONVERGENCE",
    num: "Chapter 19",
    title: "The Ben-Day Mirage, The Mechanical Appropriation Cartel, & The Pop Shop Revolution",
    scope: "Roy Lichtenstein's Mechanical Stencils, Russ Heath & Tony Abruzzo Stolen Panels, Permacx Rotogravure Screens, Bocour Magna Acrylic Chemistry, and Keith Haring's Subway Democratization across 8 Volumes",
    pages: "185 Pages (8 Volumes)",
    quote: "Lichtenstein was not reproducing comic books; he was manufacturing a luxurious, artisanal fetish-object that represented mass reproduction. The wealthy elites who purchased these canvases from Leo Castelli were buying an intellectual meta-commentary that allowed them to consume working-class imagery while insulating themselves from its physical reality.",
  },
  {
    volume: "VOLUME II: THE MARKET",
    part: "THE MORAL PANIC CRUCIBLE",
    num: "Chapter 13",
    title: "The Censorship Bonfires & The 1954 Crucible",
    scope: "Parish Pyres, The Wertham Clinical Fraud, Foley Square Senate Hearings, The Comics Code Cartel, and Pre-Code Scarcity Modeling across 8 Volumes",
    pages: "192 Pages (8 Volumes)",
    quote: "The multi-million-dollar valuations on Suspense Comics #3 and Crime SuspenStories #22 are not artifacts of natural collector attrition; they are the direct mathematical consequence of state-sanctioned cultural cleansing.",
  },
  {
    volume: "VOLUME II: THE MARKET",
    part: "THE SPECULATIVE CRUCIBLE",
    num: "Chapter 4",
    title: "The Modern & Postmodern Ledger (1992–Present)",
    scope: "Variant Dilution, The Speculator Crash of 1993, Deathmate, and the Post-2000 Slabbed Equity Revolution",
    pages: "64 Pages",
    quote: "The 1993 collapse was not a failure of sequential art; it was the inevitable bursting of an uncalibrated printing press bubble.",
  },
  {
    volume: "VOLUME II: THE MARKET",
    part: "THE SECULAR TEMPLE",
    num: "Chapter 5",
    title: "The Secular Temple & 25 Institutional Desks",
    scope: "Wood Pulp Kinetics, The Four Market Pathologies, Pedigree Multipliers, and Multi-Desk Risk Governance",
    pages: "180 Pages (7 Volumes)",
    quote: "Stone groundwood pulp newsprint contains 30% unrefined lignin. At pH 4.0, every Golden Age comic book is in an active state of chemical suicide.",
  },
  {
    volume: "VOLUME III: THE MECHANISM",
    part: "THE SOVEREIGN FIRMAMENT",
    num: "Chapter 6",
    title: "The Tri-Index Architecture & Constituent Firmament",
    scope: "Condition Convexity, Null Singularity Governance, Options/Repo Microstructure, and 70 Verified Asset Dossiers",
    pages: "210 Pages (8 Volumes)",
    quote: "Condition is not a linear slider; it is an exponential parabola governed by thermodynamic decay.",
  },
  {
    volume: "VOLUME III: THE MECHANISM",
    part: "THE MODERN OPERATING SYSTEM",
    num: "Chapter 7",
    title: "The Mechanics of Coupled State Manifolds & Non-Linear Progression",
    scope: "Empirical Backtesting, The Three Market Archetypes, Portfolio Risk Optimization, and Institutional Inflow Frontiers",
    pages: "140 Pages (4 Volumes)",
    quote: "A disciplined algorithmic bourse must price the underlying paper substrate with the same physical rigor applied to industrial commodities.",
  },
  {
    volume: "VOLUME III: THE MECHANISM",
    part: "THE OPERATIONAL BOURSE",
    num: "Chapter 8",
    title: "The University & The Tactical Trading Desk",
    scope: "Four-Tier Financial Curriculum, Depth-of-Market Microstructure, Series 100–400 Licensure, Dynamic Haircut Matrices, and 45-Second Execution Telemetry",
    pages: "196 Pages (7 Volumes)",
    quote: "Floor execution requires instantaneous translation of slab certification grades into haircut discount yields.",
  },
  {
    volume: "VOLUME III: THE MECHANISM",
    part: "THE MONUMENTAL TREATISE",
    num: "Appendix A",
    title: "Temporal-Acoustic Creation, Cognitive Ma, & The Structural Semiotics of Sequential Value",
    scope: "Unflattening, The Charged Void, 4-Track Auditory Spatialization, and Visual Music Architecture across 47 Pages",
    pages: "47 Pages",
    quote: "Between the panels lies the gutter—the silent void where the reader's mind creates time and meaning.",
  },
];

export default function BookPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState("Complete eBook & Digital Field Manual");
  const [selectedPrice, setSelectedPrice] = useState("$9.99");

  const openCheckout = (format: string, price: string) => {
    setSelectedFormat(format);
    setSelectedPrice(price);
    setModalOpen(true);
  };

  return (
    <div className="relative min-h-screen text-[#e0e6ed] font-sans antialiased selection:bg-[#c5a059] selection:text-black">
      {/* High-Resolution Grail Vault Full-Page Background */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat opacity-95 transition-opacity duration-700"
        style={{
          backgroundImage: `url('/brand/cbse-grail-vault-bg.jpg?v=20261123')`,
        }}
      />
      {/* Atmospheric vignette allowing rich backdrop visibility */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-[#070b14]/40 via-transparent to-[#070b14]/75" />

      {/* Main interactive page container */}
      <div className="relative z-10">
        {/* Top Banner Navigation */}
        <nav className="border-b border-white/10 bg-[#060b14]/50 backdrop-blur-xl sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-sm bg-gradient-to-br from-[#c5a059] to-[#8a6b2d] flex items-center justify-center font-serif font-black text-black text-xl shadow-lg shadow-[#c5a059]/20">
            P
          </div>
          <Link href="/" className="text-white font-serif tracking-wider font-bold text-lg hover:text-[#c5a059] transition-colors">
            THE COMIC BOOK STOCK EXCHANGE
          </Link>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono uppercase tracking-widest">
          <Link href="/beta" className="text-white/70 hover:text-[#c5a059] transition-colors">
            Beta Terminal
          </Link>
          <Link href="/donate" className="text-white/70 hover:text-[#c5a059] transition-colors">
            Support / Sponsor
          </Link>
          <button
            onClick={() => openCheckout("Complete eBook & Digital Field Manual", "$9.99")}
            className="bg-[#c5a059] text-black font-bold px-3 py-1.5 rounded hover:bg-[#d8b368] transition-all"
          >
            Get eBook &bull; $9.99
          </button>
        </div>
      </nav>

      {/* Hero Header */}
      <header className="relative pt-20 pb-16 px-6 max-w-6xl mx-auto border-b border-white/10">
        <div className="grid md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-xs font-mono tracking-widest uppercase">
              Immediate Instant Download &bull; EPUB + PDF + Kindle
            </div>
            <h1 className="text-4xl sm:text-6xl font-serif font-black tracking-tight text-white leading-tight">
              PANEL PROFITS: <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e7c87d] via-[#c5a059] to-[#916e28]">
                THE ARCHITECTURE OF SEQUENTIAL ART EQUITIES
              </span>
            </h1>
            <p className="text-lg text-slate-300 font-serif leading-relaxed">
              By <strong className="text-white">Gregory D. Goyins</strong>. The definitive field guide and master textbook that reads like gripping non-fiction history and an authoritative financial economics manual—formalizing sequential art valuation, wood-pulp decay kinetics, third-party certification epistemics, and institutional portfolio governance.
            </p>

            {/* eBook Purchase Highlight Box */}
            <div className="p-5 rounded-xl bg-[#060b14]/55 backdrop-blur-2xl border-2 border-[#c5a059] space-y-3 shadow-xl shadow-[#c5a059]/10">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-[#c5a059] font-bold">Official Digital Edition</div>
                  <div className="text-3xl font-mono font-bold text-white flex items-baseline gap-2">
                    <span>$9.99</span>
                    <span className="text-xs font-mono line-through text-slate-500 font-normal">Regular $49.00</span>
                    <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">80% OFF LAUNCH SPECIAL</span>
                  </div>
                </div>
                <button
                  onClick={() => openCheckout("Complete eBook & Digital Field Manual", "$9.99")}
                  className="px-8 py-3.5 rounded bg-gradient-to-r from-[#c5a059] to-[#8a6b2d] text-black font-mono font-bold uppercase tracking-wider text-xs shadow-xl hover:from-[#d8b368] hover:to-[#9f7d37] transition-all transform active:scale-95"
                >
                  Buy Now &amp; Download ($9.99)
                </button>
              </div>
              <p className="text-xs text-slate-300 font-sans">
                ✓ Instant delivery to your inbox &bull; Includes PDF, EPUB, mobi, full 70-constituent market dossiers, and the 196-Page Chapter 8 Tactical Monograph.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap gap-4 items-center">
              <button
                onClick={() => openCheckout("Clothbound Library Edition", "$195.00")}
                className="px-6 py-2.5 rounded bg-white/10 hover:bg-white/15 text-white font-mono font-bold uppercase tracking-wider text-xs transition-all border border-white/15"
              >
                Pre-Order Hardcover ($195.00)
              </button>
              <a
                href="#whats-included"
                className="text-xs font-mono uppercase tracking-wider text-[#c5a059] hover:underline"
              >
                See What&apos;s Included Inside &darr;
              </a>
            </div>
          </div>

          <div className="md:col-span-5 flex flex-col items-center">
            <div className="relative group">
              {/* Outer ambient glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-[#c5a059] via-[#e7c87d] to-[#916e28] rounded-xl blur-lg opacity-30 group-hover:opacity-60 transition duration-700"></div>
              
              {/* Master Textbook 3D Spine & Cover Card */}
              <div className="relative w-72 sm:w-80 h-[440px] rounded-lg bg-[#0b101d] border-2 border-[#c5a059]/70 shadow-2xl overflow-hidden flex flex-col justify-between p-5 transform -rotate-1 hover:rotate-0 transition-all duration-500">
                <div className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-luminosity" style={{ backgroundImage: "url('/covers/detective_comics_27.jpg')" }}></div>
                
                <div className="relative z-10 border border-[#c5a059]/40 h-full p-5 flex flex-col justify-between bg-[#070b14]/85 backdrop-blur-xs">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-[#c5a059] tracking-[0.25em] uppercase font-bold">MONUMENTAL FIRST EDITION</span>
                      <span className="text-[9px] font-mono text-white/60 bg-white/10 px-2 py-0.5 rounded">196-PAGE CH.8</span>
                    </div>
                    <h2 className="text-2xl font-serif font-black text-white mt-4 tracking-tight leading-tight">
                      PANEL PROFITS
                    </h2>
                    <p className="text-[11px] text-[#e7c87d] font-serif tracking-widest uppercase mt-0.5 font-bold">
                      THE MECHANISM OF EQUITIES &amp; ASSETS
                    </p>
                    <p className="text-[10px] text-slate-400 font-serif italic mt-2 leading-relaxed">
                      The authoritative financial simulator and epistemological operating system for sequential art capital.
                    </p>
                  </div>

                  {/* Micro Visual Plates Grid */}
                  <div className="grid grid-cols-4 gap-1.5 py-3 my-2 border-y border-white/10">
                    <img src="/covers/amazing_fantasy_15.jpg" alt="AF15" className="h-14 w-full object-cover rounded border border-[#c5a059]/40 shadow" />
                    <img src="/covers/action_comics_1.jpg" alt="ACT1" className="h-14 w-full object-cover rounded border-[#c5a059]/40 shadow" />
                    <img src="/covers/incredible_hulk_181.jpg" alt="HUL181" className="h-14 w-full object-cover rounded border-[#c5a059]/40 shadow" />
                    <img src="/covers/x_men_1.jpg" alt="XMN1" className="h-14 w-full object-cover rounded border-[#c5a059]/40 shadow" />
                  </div>

                  <div className="space-y-1.5">
                    <div className="h-0.5 w-16 bg-gradient-to-r from-[#c5a059] to-transparent"></div>
                    <div className="text-xs font-mono font-bold text-[#c5a059] tracking-wider">GREGORY D. GOYINS</div>
                    <div className="text-[9px] text-slate-400 font-mono tracking-tight flex items-center justify-between">
                      <span>CIMA FOUNDING CHARTER</span>
                      <span>STIX TWO MATH EDITION</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-caption below book */}
            <div className="mt-4 flex items-center gap-3 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Hardcover Clothbound</span>
              <span>&bull;</span>
              <span>Numbered Archive Certificate</span>
            </div>
          </div>
        </div>
      </header>

      {/* What's Included Inside Section */}
      <section id="whats-included" className="py-20 px-6 max-w-6xl mx-auto border-t border-white/10 bg-[#060b14]/50 backdrop-blur-2xl rounded-3xl my-12 border border-white/10 shadow-2xl">
        <div className="text-center space-y-3 mb-16">
          <div className="text-xs font-mono uppercase tracking-widest text-[#c5a059]">
            The Master Curriculum &bull; Complete Inside Breakdown
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-black text-white">
            What&apos;s Included In The $9.99 eBook
          </h2>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto">
            Get instant, unconditional access to the entire 700+ page body of work, all 10 volumes, mathematical models, and forensic dossiers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-[#060b14]/50 backdrop-blur-xl border border-white/10 hover:border-[#c5a059]/40 transition-all space-y-3">
            <div className="text-[#c5a059] font-mono text-2xl font-bold">01</div>
            <h3 className="text-lg font-serif font-bold text-white">The Complete 700+ Page Text</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Uncut, unabridged text spanning the Prologue through Chapter 8, plus Appendix A on Structural Semiotics and Visual Music Architecture.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#060b14]/50 backdrop-blur-xl border border-white/10 hover:border-[#c5a059]/40 transition-all space-y-3">
            <div className="text-[#c5a059] font-mono text-2xl font-bold">02</div>
            <h3 className="text-lg font-serif font-bold text-white">196-Page Chapter 8 Monograph</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The entire Tactical Trading Desk manual: Series 100–400 licensing curricula, dynamic margin haircut matrices, and 45-second order telemetry.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#060b14]/50 backdrop-blur-xl border border-white/10 hover:border-[#c5a059]/40 transition-all space-y-3">
            <div className="text-[#c5a059] font-mono text-2xl font-bold">03</div>
            <h3 className="text-lg font-serif font-bold text-white">Over 140 High-Res Archival Plates</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Full-color, 300 DPI forensic cover plates, microscopic fiber spectrometry scans, spine stress analyses, and verified pedigree logs.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#060b14]/50 backdrop-blur-xl border border-white/10 hover:border-[#c5a059]/40 transition-all space-y-3">
            <div className="text-[#c5a059] font-mono text-2xl font-bold">04</div>
            <h3 className="text-lg font-serif font-bold text-white">70 Constituent Equities Dossiers</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Exhaustive actuarial and market dossiers on every sovereign comic asset: census survival curves, condition convexity, and fair market valuation.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#060b14]/50 backdrop-blur-xl border border-white/10 hover:border-[#c5a059]/40 transition-all space-y-3">
            <div className="text-[#c5a059] font-mono text-2xl font-bold">05</div>
            <h3 className="text-lg font-serif font-bold text-white">The Seven Canonical Trading Rules</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The unvarnished, raw laws of physical capital: &ldquo;Never shoot the fucking dog,&rdquo; &ldquo;All profit is narrative,&rdquo; and &ldquo;Karma is a scalpel.&rdquo;
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#060b14]/50 backdrop-blur-xl border border-white/10 hover:border-[#c5a059]/40 transition-all space-y-3">
            <div className="text-[#c5a059] font-mono text-2xl font-bold">06</div>
            <h3 className="text-lg font-serif font-bold text-white">Multi-Format Instant Download</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Delivered immediately in searchable PDF (desktop/tablet), EPUB (iPad/iPhone/Android), and MOBI/Kindle formats with lifetime digital updates.
            </p>
          </div>
        </div>

        {/* Call to Action Banner */}
        <div className="mt-12 p-8 rounded-2xl bg-[#060b14]/60 backdrop-blur-2xl border-2 border-[#c5a059] flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2 text-center md:text-left">
            <h4 className="text-2xl font-serif font-bold text-white">
              Ready to Master Sequential Art Equities?
            </h4>
            <p className="text-xs text-slate-300">
              Instant access upon checkout. 100% digital download available immediately.
            </p>
          </div>
          <button
            onClick={() => openCheckout("Complete eBook & Digital Field Manual", "$9.99")}
            className="px-8 py-3.5 rounded bg-[#c5a059] hover:bg-[#d8b368] text-black font-mono font-bold uppercase tracking-wider text-xs shadow-xl transition-all flex-shrink-0"
          >
            Get the eBook for $9.99 &rarr;
          </button>
        </div>
      </section>

      {/* Visual Archival Plates & Forensic Folio Showcase */}
      <section className="py-20 px-6 max-w-6xl mx-auto border-t border-white/10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-xs font-mono tracking-widest uppercase">
              Full-Color Archival Gallery &bull; Over 140 High-Res Plates
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white">
              Forensic Plates &amp; Asset Portfolios
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Every chapter is anchored by high-resolution photographic evidence: microscopic fiber spectrometry, spine stress fractures, ink bleed signatures, and verified pedigrees from Church to White Mountain.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono text-[#c5a059] border border-[#c5a059]/30 bg-[#c5a059]/5 px-3 py-1.5 rounded uppercase tracking-wider">
              300 DPI Archival Press
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { title: "Detective Comics #27", sub: "1939 • First Batman", src: "/covers/detective_comics_27.jpg", tag: "Golden Age Benchmark" },
            { title: "Action Comics #1", sub: "1938 • First Superman", src: "/covers/action_comics_1.jpg", tag: "Genesis Substrate" },
            { title: "Amazing Fantasy #15", sub: "1962 • First Spider-Man", src: "/covers/amazing_fantasy_15.jpg", tag: "Silver Age Anchor" },
            { title: "Incredible Hulk #181", sub: "1974 • First Wolverine", src: "/covers/incredible_hulk_181.jpg", tag: "Bronze Age Crucible" },
            { title: "Showcase #4", sub: "1956 • First Silver Age Flash", src: "/covers/showcase_4.jpg", tag: "Modern Era Catalyst" },
            { title: "Tintin: Objectif Lune", sub: "1953 • Hergé Ligne Claire", src: "/covers/tintin_objectif_lune_1.jpg", tag: "Franco-Belgian Master" },
            { title: "X-Men #1", sub: "1963 • First Mutants", src: "/covers/x_men_1.jpg", tag: "Franchise Sovereign" },
            { title: "Amazing Spider-Man #300", sub: "1988 • First Venom", src: "/covers/amazing_spider_man_300.jpg", tag: "Copper Age Titan" },
            { title: "Batman: Dark Knight Returns #1", sub: "1986 • Frank Miller", src: "/covers/batman_the_dark_knight_returns_1.jpg?v=20261123", tag: "Deconstruction Apex" },
            { title: "All-Star Comics #8", sub: "1941 • First Wonder Woman", src: "/covers/all_star_comics_8.jpg", tag: "Trinity Cornerstone" },
            { title: "Giant-Size X-Men #1", sub: "1975 • International Team", src: "/covers/giant_size_x_men_1.jpg", tag: "Bronze Momentum" },
            { title: "Captain America #1", sub: "1941 • Jack Kirby / Simon", src: "/covers/captain_america_comics_1.jpg", tag: "War Bond Icon" },
          ].map((item, idx) => (
            <div key={idx} className="group relative rounded-lg overflow-hidden bg-[#060b14]/50 backdrop-blur-xl border border-white/10 hover:border-[#c5a059]/60 transition-all duration-300 flex flex-col">
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#080c16]">
                <img
                  src={item.src}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>
                <div className="absolute top-2 left-2 right-2">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-black/75 backdrop-blur-xs text-[#c5a059] px-2 py-0.5 rounded border border-[#c5a059]/30 block truncate">
                    {item.tag}
                  </span>
                </div>
              </div>
              <div className="p-3 space-y-1 flex-1 flex flex-col justify-end bg-[#070b14]/70">
                <h4 className="text-xs font-serif font-bold text-white group-hover:text-[#c5a059] transition-colors truncate">
                  {item.title}
                </h4>
                <p className="text-[10px] text-slate-400 font-mono truncate">
                  {item.sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* The 8 Books Table of Contents */}
      <section id="table-of-contents" className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center space-y-3 mb-16">
          <div className="text-xs font-mono uppercase tracking-widest text-[#c5a059]">
            Complete Course Curriculum &amp; Textbook Syllabus
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white">
            Table of Contents
          </h2>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto">
            Over 700 pages of original forensic scholarship, from the materials science of 1938 wood pulp to multi-desk algorithmic market-making across 25 institutional firms.
          </p>
        </div>

        <div className="space-y-4">
          {CHAPTERS.map((ch, idx) => (
            <div
              key={idx}
              className="p-6 rounded-lg bg-[#060b14]/50 backdrop-blur-xl border border-white/10 hover:border-[#c5a059]/50 transition-all flex flex-col justify-between gap-4 group shadow-lg shadow-black/20"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e7c87d] font-bold tracking-wider">
                    {ch.volume}
                  </span>
                  <span className="text-xs font-mono text-[#c5a059] font-bold tracking-wider">
                    {ch.num}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                    &bull; {ch.part}
                  </span>
                </div>
                <span className="text-xs font-mono px-3 py-1 rounded bg-white/5 border border-white/10 text-slate-300 self-start md:self-auto font-medium">
                  {ch.pages}
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="text-xl font-serif font-bold text-white group-hover:text-[#c5a059] transition-colors">
                  {ch.title}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {ch.scope}
                </p>
              </div>

              {ch.quote && (
                <div className="p-3.5 rounded bg-black/40 border-l-2 border-[#c5a059] text-xs font-serif italic text-slate-300 flex items-start gap-2.5">
                  <span className="text-[#c5a059] text-base leading-none select-none">“</span>
                  <span className="leading-relaxed">{ch.quote}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Editions & Pre-Orders */}
      <section id="editions" className="py-20 px-6 border-t border-white/10 bg-[#060b14]/50 backdrop-blur-2xl rounded-3xl my-12 border border-white/10 shadow-2xl max-w-6xl mx-auto">
        <div className="space-y-12">
          <div className="text-center space-y-3">
            <div className="text-xs font-mono uppercase tracking-widest text-[#c5a059]">
              Institutional &amp; Individual Allocations
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white">
              Available Formats
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* eBook Edition */}
            <div className="p-8 rounded-xl bg-[#060b14]/60 backdrop-blur-xl border-2 border-[#c5a059] space-y-6 flex flex-col justify-between relative shadow-2xl shadow-[#c5a059]/10">
              <div className="absolute -top-3 right-6 bg-[#c5a059] text-black text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                Best Seller &bull; $9.99
              </div>
              <div className="space-y-3">
                <div className="text-xs font-mono text-[#c5a059] uppercase tracking-wider">Instant Digital Download</div>
                <h3 className="text-xl font-serif font-bold text-white">Complete eBook &amp; Field Manual</h3>
                <div className="text-3xl font-mono font-bold text-[#c5a059] flex items-baseline gap-2">
                  <span>$9.99</span>
                  <span className="text-sm font-mono line-through text-slate-500 font-normal">$49.00</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Full 700+ page searchable digital edition (PDF, EPUB, MOBI) including the complete 196-Page Chapter 8 Tactical Monograph, 140+ color plates, and 70 asset dossiers.
                </p>
              </div>
              <button
                onClick={() => openCheckout("Complete eBook & Digital Field Manual", "$9.99")}
                className="w-full py-3.5 rounded bg-[#c5a059] hover:bg-[#d4b065] text-black font-mono text-xs uppercase tracking-wider font-bold transition-all shadow-lg"
              >
                Instant Download ($9.99)
              </button>
            </div>

            {/* Hardcover Textbook */}
            <div className="p-8 rounded-xl bg-[#060b14]/50 backdrop-blur-xl border border-white/10 space-y-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="text-xs font-mono text-[#c5a059] uppercase tracking-wider">University Hardcover</div>
                <h3 className="text-xl font-serif font-bold text-white">Clothbound Library Edition</h3>
                <div className="text-3xl font-mono font-bold text-white">$195.00</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Monumental 8.5&times;11&Prime; clothbound hardcover edition with foil-stamped spine, full-color archival plates, and complete 70-constituent market dossiers.
                </p>
              </div>
              <button
                onClick={() => openCheckout("Clothbound Library Edition", "$195.00")}
                className="w-full py-3 rounded bg-white/10 hover:bg-white/20 text-white font-mono text-xs uppercase tracking-wider font-bold transition-all"
              >
                Pre-Order Hardcover (Ships Q1 2027)
              </button>
            </div>

            {/* Institutional Syndicate */}
            <div className="p-8 rounded-xl bg-[#060b14]/50 backdrop-blur-xl border border-white/10 space-y-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="text-xs font-mono text-[#c5a059] uppercase tracking-wider">Vault &amp; Fund Access</div>
                <h3 className="text-xl font-serif font-bold text-white">Institutional Desk Syndicate</h3>
                <div className="text-3xl font-mono font-bold text-white">$1,200.00</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Includes 5 hardcover copies, institutional API key for real-time market telemetry, and priority access to The Comic Book Stock Exchange Q1 2027 Beta.
                </p>
              </div>
              <button
                onClick={() => openCheckout("Institutional Desk Syndicate", "$1,200.00")}
                className="w-full py-3 rounded bg-white/10 hover:bg-white/20 text-white font-mono text-xs uppercase tracking-wider font-bold transition-all"
              >
                Contact Syndicate Desk
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Rotating Book Excerpts & Forensic Reader */}
      <BookExcerptsShowcase />

      {/* Footer */}
      <footer className="mt-20 mb-10 max-w-xl mx-auto px-6 py-4 rounded-xl border border-[#c5a059]/30 bg-[#060b14]/55 backdrop-blur-2xl text-center text-xs uppercase tracking-widest text-slate-300 shadow-2xl">
        <p className="mb-1 text-slate-200">Panel Profits: The Architecture of Sequential Art Equities</p>
        <p className="text-slate-400 text-[10px]">Actuarial Ledger • Zero Corporate Kickbacks • Sovereign Archive</p>
      </footer>
      </div>

      {/* Book Order Modal */}
      <BookOrderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedFormat={selectedFormat}
        price={selectedPrice}
      />
    </div>
  );
}
