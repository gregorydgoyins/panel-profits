"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOrderModal } from "@/components/book/book-order-modal";

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
    part: "THE MODERN OPERATING SYSTEM",
    num: "Chapter 7",
    title: "The Mechanics of Coupled State Manifolds & Non-Linear Progression",
    scope: "Empirical Backtesting, The Three Market Archetypes, Portfolio Risk Optimization, and Institutional Inflow Frontiers",
    pages: "4 Volumes",
  },
  {
    part: "THE MONUMENTAL TREATISE",
    num: "Appendix A",
    title: "Temporal-Acoustic Creation, Cognitive Ma, & The Structural Semiotics of Sequential Value",
    scope: "Unflattening, The Charged Void, 4-Track Auditory Spatialization, and Visual Music Architecture across 47 Pages",
    pages: "47 Pages",
  },
];

export default function BookPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState("Clothbound Library Edition");
  const [selectedPrice, setSelectedPrice] = useState("$195.00");

  const openCheckout = (format: string, price: string) => {
    setSelectedFormat(format);
    setSelectedPrice(price);
    setModalOpen(true);
  };

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
        <div className="flex items-center gap-4 text-xs font-mono uppercase tracking-widest">
          <Link href="/beta" className="text-white/70 hover:text-[#c5a059] transition-colors">
            Beta Terminal
          </Link>
          <Link href="/donate" className="text-white/70 hover:text-[#c5a059] transition-colors">
            Support / Sponsor
          </Link>
          <button
            onClick={() => openCheckout("Clothbound Library Edition", "$195.00")}
            className="bg-[#c5a059] text-black font-bold px-3 py-1.5 rounded hover:bg-[#d8b368] transition-all"
          >
            Pre-Order Book
          </button>
        </div>
      </nav>

      {/* Hero Header */}
      <header className="relative pt-20 pb-16 px-6 max-w-6xl mx-auto border-b border-white/10">
        <div className="grid md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-xs font-mono tracking-widest uppercase">
              The Definitive Monograph &bull; Clothbound First Edition
            </div>
            <h1 className="text-4xl sm:text-6xl font-serif font-black tracking-tight text-white leading-tight">
              PANEL PROFITS: <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e7c87d] via-[#c5a059] to-[#916e28]">
                THE ARCHITECTURE OF SEQUENTIAL ART EQUITIES
              </span>
            </h1>
            <p className="text-lg text-slate-300 font-serif leading-relaxed">
              By <strong className="text-white">Gregory D. Goyins</strong>. The landmark treatise formalizing sequential art valuation, wood-pulp physical decay kinetics, third-party certification epistemics, and institutional portfolio governance.
            </p>
            <div className="pt-2 flex flex-wrap gap-4">
              <button
                onClick={() => openCheckout("Clothbound Library Edition", "$195.00")}
                className="px-8 py-3.5 rounded bg-gradient-to-r from-[#c5a059] to-[#8a6b2d] text-black font-mono font-bold uppercase tracking-wider text-xs shadow-xl hover:from-[#d8b368] hover:to-[#9f7d37] transition-all transform active:scale-95"
              >
                Pre-Order Numbered Edition ($195.00)
              </button>
              <button
                onClick={() => openCheckout("Student & Collector Digital Edition", "$49.00")}
                className="px-6 py-3.5 rounded bg-white/10 hover:bg-white/15 text-white font-mono font-bold uppercase tracking-wider text-xs transition-all border border-white/15"
              >
                Digital Syllabus ($49.00)
              </button>
            </div>
          </div>

          <div className="md:col-span-5 flex justify-center">
            <div className="w-72 h-[420px] rounded-lg bg-gradient-to-br from-[#1a233a] to-[#0c1222] border-2 border-[#c5a059]/60 shadow-2xl p-6 flex flex-col justify-between relative transform rotate-1 hover:rotate-0 transition-transform">
              <div className="border border-[#c5a059]/30 h-full p-4 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono text-[#c5a059] tracking-widest uppercase">FIRST EDITION</div>
                  <div className="text-xl font-serif font-black text-white mt-4">PANEL PROFITS</div>
                  <div className="text-xs text-slate-400 font-serif mt-1">THE MONOGRAPH</div>
                </div>
                <div className="space-y-2">
                  <div className="h-0.5 w-12 bg-[#c5a059]"></div>
                  <div className="text-[11px] font-mono text-[#c5a059]">GREGORY D. GOYINS</div>
                  <div className="text-[9px] text-slate-500 font-mono">3.4M RECORDS &bull; 70 SOVEREIGN CONSTITUENTS</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

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
            Over 700 pages of original forensic scholarship, from the materials science of 1938 wood pulp to multi-desk algorithmic market-making across 25 institutional firms.
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
              <button
                onClick={() => openCheckout("Student & Collector Digital Edition", "$49.00")}
                className="w-full py-3 rounded bg-white/10 hover:bg-white/20 text-white font-mono text-xs uppercase tracking-wider font-bold transition-all"
              >
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
              <button
                onClick={() => openCheckout("Clothbound Library Edition", "$195.00")}
                className="w-full py-3 rounded bg-[#c5a059] hover:bg-[#d4b065] text-black font-mono text-xs uppercase tracking-wider font-bold transition-all"
              >
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
