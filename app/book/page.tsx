import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel Profits: The Mechanism of Equities & Assets | Gregory D. Goyins",
  description:
    "The definitive textbook and institutional syllabus on sequential art valuation, physical census economics, and cultural equity by Gregory D. Goyins.",
};

const CHAPTERS = [
  {
    part: "FOUNDATION & ARCHITECTURE",
    num: "Prologue",
    title: "The Valhalla of American Gods",
    scope: "Historical Supply Attrition, Third-Party Assaying, and the Empirical Foundations of the Market",
    pages: "27 Pages",
  },
  {
    part: "FOUNDATION & ARCHITECTURE",
    num: "Chapter 1",
    title: "The Room Test",
    scope: "The Hand-Turkey Problem, Twenty Core Metrics, and the Universal Valuation Vocabulary Shared by Fine Art and Sequential Art",
    pages: "117 Pages",
  },
  {
    part: "THE METALS OF TIME",
    num: "Chapter 2",
    title: "Genesis: The Golden Age (1935–1955)",
    scope: "Newsprint Chemistry, Pulp Drives, Siegel & Shuster's $130 Release, and the Birth of the Superhero Pantheon",
    pages: "52 Pages",
  },
  {
    part: "THE METALS OF TIME",
    num: "Chapter 3",
    title: "The Other Precious Metals (1956–1991)",
    scope: "Silver Age Sci-Fi Resurgence, Bronze Age Social Realism, and the Direct Market Copper Transformation",
    pages: "128 Pages",
  },
  {
    part: "THE SPECULATIVE CRUCIBLE",
    num: "Chapter 4",
    title: "The Modern & Postmodern Ledger (1992–Present)",
    scope: "Variant Dilution, The Speculator Crash of 1993, Deathmate, and the Post-2000 Slabbed Equity Revolution",
    pages: "64 Pages",
  },
  {
    part: "THE SECULAR TEMPLE",
    num: "Chapter 5",
    title: "The Secular Temple & 25 Institutional Desks",
    scope: "Wood Pulp Kinetics, The Four Market Pathologies, Pedigree Multipliers, and Multi-Desk Risk Governance",
    pages: "7 Volumes",
  },
  {
    part: "THE SOVEREIGN FIRMAMENT",
    num: "Chapter 6",
    title: "The Tri-Index Architecture & Constituent Firmament",
    scope: "Condition Convexity, Null Singularity Governance, Options/Repo Microstructure, and 70 Verified Asset Dossiers",
    pages: "8 Volumes",
  },
  {
    part: "THE AUTONOMOUS HORIZON",
    num: "Chapter 7",
    title: "The Player's Life & The 32-Dimensional State Space",
    scope: "The Non-Linear Progression of Capital, Coupled Jacobian Manifolds, and Algorithmic Autonomous Market-Making",
    pages: "7 Volumes",
  },
];

export default function BookLandingPage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-[#e0e6ed] font-sans antialiased selection:bg-[#c5a059] selection:text-black">
      {/* Top Banner Navigation */}
      <nav className="border-b border-white/10 bg-[#0d1322]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-sm bg-gradient-to-br from-[#c5a059] to-[#8a6b2d] flex items-center justify-center font-serif font-black text-black text-xl shadow-lg shadow-[#c5a059]/20">
            P
          </div>
          <Link href="/" className="text-white font-serif tracking-wider font-bold text-lg hover:text-[#c5a059] transition-colors">
            THE COMIC BOOK STOCK EXCHANGE
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/waitlist"
            className="text-xs uppercase tracking-widest font-mono text-[#c5a059] border border-[#c5a059]/40 px-3 py-1.5 rounded hover:bg-[#c5a059]/10 transition-colors"
          >
            Beta Q1 2027
          </Link>
          <Link
            href="#order-now"
            className="text-xs uppercase tracking-widest font-mono font-bold bg-[#c5a059] text-black px-4 py-2 rounded shadow-md hover:bg-[#d8b368] transition-colors"
          >
            Get the Monograph
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 py-20 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Copy & Value Proposition */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-xs font-mono tracking-widest uppercase">
            <span>Canonical Master Monograph</span>
            <span>&bull;</span>
            <span>Institutional Textbook Edition</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-black tracking-tight text-white leading-[1.1]">
            Panel Profits: <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c5a059] via-[#e5c580] to-[#c5a059]">
              The Mechanism of Equities &amp; Assets
            </span>
          </h1>

          <p className="text-xl font-serif italic text-slate-300">
            By Gregory D. Goyins
          </p>

          <p className="text-base text-slate-400 leading-relaxed font-normal max-w-2xl">
            Ninety years of sequential art publishing—from Great Depression wood-pulp newsstands and Manhattan work-for-hire bullpens to the 1960 postal disclosure rule and tamper-evident certified acrylic encapsulations—codified for the first time as a measurable, sovereign capital asset class.
          </p>

          <div className="p-4 rounded-lg bg-[#0e172a] border border-white/10 flex flex-col sm:flex-row items-center gap-6 justify-between">
            <div className="space-y-1">
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Companion Audiobook Miniseries
              </div>
              <div className="text-sm font-semibold text-white">
                Listen along with Marcus Vance &amp; Elena Rostova on Google NotebookLM
              </div>
            </div>
            <Link
              href="#companion-podcast"
              className="text-xs font-mono text-[#c5a059] underline underline-offset-4 hover:text-white"
            >
              Explore Episode Guide &rarr;
            </Link>
          </div>

          <div className="pt-4 flex flex-wrap gap-4 items-center">
            <a
              id="order-now"
              href="#editions"
              className="px-8 py-4 rounded font-mono font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-[#c5a059] to-[#a88238] text-black shadow-xl hover:brightness-110 transition-all cursor-pointer"
            >
              Order Library &amp; Student Editions
            </a>
            <a
              href="#table-of-contents"
              className="px-6 py-4 rounded font-mono text-sm tracking-wider border border-white/20 text-slate-300 hover:bg-white/5 transition-all"
            >
              Review Syllabus (8 Books)
            </a>
          </div>
        </div>

        {/* Right Column: 3D Monumental Book Mockup */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="relative group perspective-1000">
            {/* Ambient Gold Glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-[#c5a059]/20 to-cyan-500/10 rounded-2xl blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-70"></div>

            {/* Book Object */}
            <div className="relative w-[320px] sm:w-[360px] h-[480px] sm:h-[530px] rounded-r-xl rounded-l-sm bg-[#091122] border-t-2 border-r-2 border-b-2 border-white/20 shadow-2xl shadow-black p-8 flex flex-col justify-between overflow-hidden">
              {/* Spine shadow overlay */}
              <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
              
              {/* Top Foil Stamp */}
              <div className="space-y-2 border-b border-[#c5a059]/30 pb-4">
                <div className="text-[10px] tracking-[0.3em] font-mono text-[#c5a059] uppercase">
                  CBSE Canonical Monograph
                </div>
                <div className="text-xs font-serif tracking-widest text-slate-400">
                  BOOK I &ndash; III &bull; TEXTBOOK EDITION
                </div>
              </div>

              {/* Title Block */}
              <div className="space-y-3 my-auto">
                <h2 className="text-3xl sm:text-4xl font-serif font-black text-white leading-tight">
                  PANEL <br />
                  <span className="text-[#c5a059]">PROFITS</span>
                </h2>
                <div className="w-12 h-1 bg-[#c5a059]"></div>
                <p className="text-xs font-serif italic text-slate-300 leading-snug">
                  The Mechanism of Equities &amp; Assets
                </p>
              </div>

              {/* Author & Insignia Footer */}
              <div className="pt-4 border-t border-white/10 flex items-end justify-between">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Author</div>
                  <div className="text-sm font-serif font-bold text-white tracking-wide">Gregory D. Goyins</div>
                </div>
                <div className="text-[10px] font-mono text-[#c5a059] border border-[#c5a059]/40 px-2 py-0.5 rounded">
                  FIN/SIM V5
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Author Profile Section */}
      <section className="border-t border-white/10 bg-[#0a0f1d] py-16 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-10">
          <div className="relative w-44 h-44 rounded-full overflow-hidden border-2 border-[#c5a059]/60 shadow-xl flex-shrink-0 bg-slate-800">
            <Image
              src="/media/anchor-face.jpg"
              alt="Gregory D. Goyins"
              fill
              className="object-cover object-top"
            />
          </div>
          <div className="space-y-4 text-left">
            <div className="text-xs font-mono uppercase tracking-widest text-[#c5a059]">
              About the Author &amp; Chief Architect
            </div>
            <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white">
              Gregory D. Goyins
            </h3>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Gregory D. Goyins is the founder and architect of <strong>The Comic Book Stock Exchange</strong> and the author of the <em>Panel Profits</em> institutional canon. Goyins engineered the platform’s 32-dimensional state space, condition convexity algorithms, and postal census forensics to solve the chronic market pathologies that have distorted comic valuations for nearly a century.
            </p>
            <div className="text-xs font-mono text-slate-400 italic">
              &ldquo;The eye sees a painting. The mind sees a comic. But institutional capital demands an unyielding balance sheet.&rdquo;
            </div>
          </div>
        </div>
      </section>

      {/* The 8 Books Table of Contents */}
      <section id="table-of-contents" className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center space-y-3 mb-16">
          <div className="text-xs font-mono uppercase tracking-widest text-[#c5a059]">
            Complete Course Curriculum &amp; Monograph Syllabus
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white">
            Table of Contents
          </h2>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto">
            From the materials science of 1938 wood pulp to multi-desk algorithmic market-making across 25 institutional firms.
          </p>
        </div>

        <div className="space-y-4">
          {CHAPTERS.map((ch, idx) => (
            <div
              key={idx}
              className="p-6 rounded-lg bg-[#0e1628] border border-white/10 hover:border-[#c5a059]/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
            >
              <div className="space-y-1.5 md:max-w-3xl">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-[#c5a059] font-bold tracking-wider">
                    {ch.num}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                    {ch.part}
                  </span>
                </div>
                <h4 className="text-lg font-serif font-bold text-white group-hover:text-[#c5a059] transition-colors">
                  {ch.title}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {ch.scope}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xs font-mono px-3 py-1 rounded bg-white/5 border border-white/10 text-slate-300">
                  {ch.pages}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Editions & Pre-Orders */}
      <section id="editions" className="py-20 px-6 border-t border-white/10 bg-[#090e1a]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <div className="text-xs font-mono uppercase tracking-widest text-[#c5a059]">
              Institutional &amp; Individual Allocations
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white">
              Available Formats
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Student Edition */}
            <div className="p-8 rounded-xl bg-[#0f182c] border border-white/10 space-y-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="text-xs font-mono text-[#c5a059] uppercase tracking-wider">Digital Syllabus</div>
                <h3 className="text-xl font-serif font-bold text-white">Student &amp; Collector Digital Edition</h3>
                <div className="text-3xl font-mono font-bold text-white">$49.00</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Full searchable digital PDF &amp; HTML textbook files (Prologue through Chapter 7), complete with high-resolution visual plates and formulas.
                </p>
              </div>
              <button className="w-full py-3 rounded bg-white/10 hover:bg-white/20 text-white font-mono text-xs uppercase tracking-wider font-bold transition-all">
                Purchase Digital Download
              </button>
            </div>

            {/* Hardcover Textbook */}
            <div className="p-8 rounded-xl bg-[#121c35] border-2 border-[#c5a059] space-y-6 flex flex-col justify-between relative shadow-2xl shadow-[#c5a059]/10">
              <div className="absolute -top-3 right-6 bg-[#c5a059] text-black text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                Most Popular
              </div>
              <div className="space-y-3">
                <div className="text-xs font-mono text-[#c5a059] uppercase tracking-wider">University Hardcover</div>
                <h3 className="text-xl font-serif font-bold text-white">Clothbound Library Edition</h3>
                <div className="text-3xl font-mono font-bold text-[#c5a059]">$195.00</div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Monumental 8.5&times;11&Prime; clothbound hardcover edition with foil-stamped spine, full-color archival plates, and complete 70-constituent market dossiers.
                </p>
              </div>
              <button className="w-full py-3 rounded bg-[#c5a059] hover:bg-[#d4b065] text-black font-mono text-xs uppercase tracking-wider font-bold transition-all">
                Pre-Order Hardcover (Ships Q1 2027)
              </button>
            </div>

            {/* Institutional Syndicate */}
            <div className="p-8 rounded-xl bg-[#0f182c] border border-white/10 space-y-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="text-xs font-mono text-[#c5a059] uppercase tracking-wider">Vault &amp; Fund Access</div>
                <h3 className="text-xl font-serif font-bold text-white">Institutional Desk Syndicate</h3>
                <div className="text-3xl font-mono font-bold text-white">$1,200.00</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Includes 5 hardcover copies, institutional API key for real-time market telemetry, and priority access to The Comic Book Stock Exchange Q1 2027 Beta.
                </p>
              </div>
              <button className="w-full py-3 rounded bg-white/10 hover:bg-white/20 text-white font-mono text-xs uppercase tracking-wider font-bold transition-all">
                Contact Syndicate Desk
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#060a12] py-12 px-6 text-center text-xs font-mono text-slate-500">
        <div className="max-w-4xl mx-auto space-y-4">
          <p>
            &copy; 2026 The Comic Book Stock Exchange &bull; Panel Profits. All rights reserved.
          </p>
          <p className="text-[11px] text-slate-600">
            Published under the authority of Gregory D. Goyins. Missing prices remain unpriced; non-9.8 holdings never receive a 9.8 valuation.
          </p>
        </div>
      </footer>
    </div>
  );
}
