import React from "react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Beta Access Q1 2027 | The Comic Book Stock Exchange",
  description:
    "Join the private beta waitlist for The Comic Book Stock Exchange (Panel Profits). The first institutional-grade financial simulation, market depth terminal, and algorithmic grading engine for sequential art equities.",
};

export default function BetaWaitlistPage() {
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
          <Link href="/book" className="text-white/70 hover:text-[#c5a059] transition-colors">
            The Monograph
          </Link>
          <Link href="/syndicate" className="text-white/70 hover:text-[#c5a059] transition-colors">
            Collector Guild
          </Link>
          <span className="bg-[#c5a059]/20 text-[#c5a059] border border-[#c5a059]/40 px-3 py-1 rounded">
            Target Beta: Q1 2027
          </span>
        </div>
      </nav>

      {/* Hero Header */}
      <header className="relative pt-20 pb-16 px-6 max-w-5xl mx-auto text-center border-b border-white/10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-xs font-mono tracking-widest uppercase mb-6">
          <span className="inline-block w-2 h-2 rounded-full bg-[#c5a059] animate-pulse"></span>
          Institutional Financial & Simulation Architecture
        </div>
        <h1 className="text-4xl md:text-6xl font-serif font-black tracking-tight text-white mb-6 leading-tight">
          WALL STREET LIQUIDITY MEETS <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e7c87d] via-[#c5a059] to-[#916e28]">
            SEQUENTIAL ART EQUITIES
          </span>
        </h1>
        <p className="text-lg md:text-xl text-white/75 font-serif max-w-3xl mx-auto leading-relaxed mb-8">
          The Comic Book Stock Exchange (<span className="text-[#c5a059] font-medium">Panel Profits</span>) is the world&apos;s first financial simulation, real-time market depth terminal, and algorithmic portfolio engine designed exclusively for certified comic slab assets.
        </p>

        {/* Waitlist Form Card */}
        <div className="max-w-xl mx-auto bg-[#0d1322] border border-[#c5a059]/40 rounded-xl p-8 shadow-2xl shadow-[#c5a059]/10 relative overflow-hidden text-left">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#c5a059] via-[#e7c87d] to-[#916e28]"></div>
          
          <h2 className="text-xl font-serif font-bold text-white mb-2">Request Q1 2027 Beta Invitation</h2>
          <p className="text-sm text-white/60 mb-6">
            Early access invitations are released in rolling cohorts based on trading volume, grading census analysis, and portfolio size.
          </p>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-white/70 mb-1">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Marcus Vance"
                className="w-full bg-[#070b14] border border-white/15 rounded px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#c5a059]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-white/70 mb-1">
                Email Address (Institutional or Personal)
              </label>
              <input
                type="email"
                placeholder="marcus@vanceresearch.com"
                className="w-full bg-[#070b14] border border-white/15 rounded px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#c5a059]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-white/70 mb-1">
                Primary Asset Focus
              </label>
              <select className="w-full bg-[#070b14] border border-white/15 rounded px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#c5a059]">
                <option value="golden">Golden Age Keys (Action 1, Detective 27, Batman 1)</option>
                <option value="silver">Silver Age Blue Chips (AF 15, FF 1, X-Men 1, Journey Into Mystery 83)</option>
                <option value="bronze">Bronze Age High-Grade (GSX 1, Hulk 181, Tomb of Dracula 10)</option>
                <option value="copper">Modern & Direct Market High-Yield Equities</option>
                <option value="arbitrage">Grading Arbitrage & Cross-Assayer Spread Trading</option>
                <option value="fund">Institutional Fund / Family Office Allocation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-white/70 mb-1">
                Estimated Current Slabbed Portfolio Value
              </label>
              <select className="w-full bg-[#070b14] border border-white/15 rounded px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#c5a059]">
                <option value="sub25k">Under $25,000</option>
                <option value="25k-100k">$25,000 – $100,000</option>
                <option value="100k-500k">$100,000 – $500,000</option>
                <option value="500k-2m">$500,000 – $2,000,000</option>
                <option value="2m-plus">$2,000,000+</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#c5a059] to-[#8a6b2d] hover:from-[#d8b368] hover:to-[#9f7d37] text-black font-mono font-bold uppercase tracking-widest text-sm py-3 px-6 rounded shadow-lg transition-all transform active:scale-95 mt-4"
            >
              Reserve My Place on Q1 2027 Waitlist
            </button>
          </form>

          <p className="text-[11px] text-white/40 text-center font-mono mt-4">
            🔒 Strictly confidential. No SPAM. Beta releases launch Q1 2027.
          </p>
        </div>
      </header>

      {/* Terminal Capabilities Grid */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[#c5a059] font-mono text-xs uppercase tracking-widest mb-2">Core Platform Modules</p>
          <h2 className="text-3xl md:text-4xl font-serif font-black text-white">
            Built for Traders, Curators, and High-Net-Worth Collectors
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-[#0d1322] border border-white/10 rounded-lg p-6 hover:border-[#c5a059]/40 transition-colors">
            <div className="h-10 w-10 rounded bg-[#c5a059]/10 border border-[#c5a059]/30 flex items-center justify-center font-mono font-bold text-[#c5a059] mb-4">
              01
            </div>
            <h3 className="text-lg font-serif font-bold text-white mb-2">Order-Book Depth & Census Spread</h3>
            <p className="text-sm text-white/70 leading-relaxed font-sans">
              Unlike static price guides, CBEX tracks bid/ask spreads across live auction venues, private gallery brokering, and peer-to-peer registries, anchored to verified population reports.
            </p>
          </div>

          <div className="bg-[#0d1322] border border-white/10 rounded-lg p-6 hover:border-[#c5a059]/40 transition-colors">
            <div className="h-10 w-10 rounded bg-[#c5a059]/10 border border-[#c5a059]/30 flex items-center justify-center font-mono font-bold text-[#c5a059] mb-4">
              02
            </div>
            <h3 className="text-lg font-serif font-bold text-white mb-2">Algorithmic Grade Multipliers</h3>
            <p className="text-sm text-white/70 leading-relaxed font-sans">
              Dynamic pricing that honors Rule #1: Missing prices remain unpriced; non-9.8 holdings never receive a 9.8 valuation. Real-time condition convexity algorithms compute exponential scarcity premiums.
            </p>
          </div>

          <div className="bg-[#0d1322] border border-white/10 rounded-lg p-6 hover:border-[#c5a059]/40 transition-colors">
            <div className="h-10 w-10 rounded bg-[#c5a059]/10 border border-[#c5a059]/30 flex items-center justify-center font-mono font-bold text-[#c5a059] mb-4">
              03
            </div>
            <h3 className="text-lg font-serif font-bold text-white mb-2">The 25 Institutional Desks</h3>
            <p className="text-sm text-white/70 leading-relaxed font-sans">
              Run simulated portfolios across Golden, Silver, Bronze, and Alternative desks. Test repo structures, collateralized lending scenarios, and census-cliff hedging strategies.
            </p>
          </div>
        </div>
      </section>

      {/* Quote Banner */}
      <section className="py-16 px-6 bg-[#0d1322]/50 border-y border-white/10 text-center">
        <div className="max-w-3xl mx-auto">
          <blockquote className="font-serif italic text-xl md:text-2xl text-white/90 mb-4 leading-relaxed">
            &ldquo;We do not trade pieces of dead trees; we trade the mathematically certified sovereign memory of 20th-century American mythological divinity.&rdquo;
          </blockquote>
          <p className="text-xs font-mono uppercase tracking-widest text-[#c5a059]">
            — Gregory D. Goyins, Panel Profits: The Mechanism of Equities & Assets
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10 text-center font-mono text-xs text-white/50">
        <p className="mb-2">© 2026 The Comic Book Stock Exchange. All rights reserved.</p>
        <p className="text-white/30">
          Panel Profits™ is an analytical financial simulation platform. Past comic book auction performance does not guarantee future financial yields.
        </p>
      </footer>
    </div>
  );
}
