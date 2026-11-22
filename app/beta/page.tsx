"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Lock } from "lucide-react";

export default function BetaPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [assetFocus, setAssetFocus] = useState("golden");
  const [portfolioValue, setPortfolioValue] = useState("sub25k");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/leads/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "BETA_WAITLIST",
          name,
          email,
          interestTier: portfolioValue,
          metadata: { assetFocus, portfolioValue },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to submit waitlist reservation.");
      }

      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-[#e0e6ed] font-sans antialiased selection:bg-[#c5a059] selection:text-black">
      {/* Top Banner Navigation */}
      <nav className="border-b border-white/10 bg-[#0d1322]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-sm bg-gradient-to-br from-[#c5a059] to-[#8a6b2d] flex items-center justify-center font-serif font-black text-black text-xl shadow-lg shadow-[#c5a059]/20">
            P
          </div>
          <span className="text-white font-serif tracking-wider font-bold text-lg">
            THE COMIC BOOK STOCK EXCHANGE
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono uppercase tracking-widest">
          <Link href="/book" className="text-white/70 hover:text-[#c5a059] transition-colors">
            The Monograph
          </Link>
          <Link href="/donate" className="text-white/70 hover:text-[#c5a059] transition-colors">
            Support / Sponsor
          </Link>
          <span className="bg-[#c5a059]/20 text-[#c5a059] border border-[#c5a059]/40 px-3 py-1 rounded">
            Target Beta: Q1 2027
          </span>
        </div>
      </nav>

      {/* Hero Header & Lead Gate */}
      <header className="relative pt-20 pb-16 px-6 max-w-5xl mx-auto text-center border-b border-white/10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-xs font-mono tracking-widest uppercase mb-6">
          <span className="inline-block w-2 h-2 rounded-full bg-[#c5a059] animate-pulse"></span>
          Private Beta Gate — Priority Access Q1 2027
        </div>
        
        <h1 className="text-4xl md:text-6xl font-serif font-black tracking-tight text-white mb-6 leading-tight">
          WALL STREET LIQUIDITY MEETS <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e7c87d] via-[#c5a059] to-[#916e28]">
            SEQUENTIAL ART EQUITIES
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-white/75 font-serif max-w-3xl mx-auto leading-relaxed mb-8">
          The Comic Book Stock Exchange (<span className="text-[#c5a059] font-medium">Panel Profits</span>) is the first institutional financial simulation, market depth terminal, and algorithmic portfolio engine designed exclusively for certified comic slab assets.
        </p>

        {/* Lead Capture Form Card */}
        <div className="max-w-xl mx-auto bg-[#0d1322] border border-[#c5a059]/30 rounded-xl p-8 shadow-2xl relative overflow-hidden text-left">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#c5a059]/5 rounded-bl-full pointer-events-none"></div>

          {submitted ? (
            <div className="text-center py-8 space-y-4">
              <CheckCircle2 className="w-16 h-16 text-[#c5a059] mx-auto animate-bounce" />
              <h3 className="text-2xl font-serif font-bold text-white">Access Reservation Confirmed</h3>
              <p className="text-sm text-white/80 leading-relaxed font-sans">
                Thank you, <strong className="text-white">{name || email}</strong>. Your reservation on the Q1 2027 Private Beta waitlist has been officially recorded.
              </p>
              <div className="p-4 bg-white/5 border border-white/10 rounded font-mono text-xs text-[#c5a059]">
                Confirmation and onboarding credentials will be dispatched to <strong>{email}</strong> prior to platform launch.
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="text-xl font-serif font-bold text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-[#c5a059]" />
                  Request Private Terminal Clearance
                </h3>
                <p className="text-xs text-white/60 font-sans mt-1">
                  Public access is strictly closed until official rollout. Enter your credentials to apply for the early Q1 2027 cohort.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 mb-4 rounded bg-red-900/30 border border-red-500/50 text-red-200 text-xs">
                  {errorMsg}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-white/70 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="marcus@vanceresearch.com"
                    className="w-full bg-[#070b14] border border-white/15 rounded px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#c5a059]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-white/70 mb-1">
                    Primary Asset Focus
                  </label>
                  <select
                    value={assetFocus}
                    onChange={(e) => setAssetFocus(e.target.value)}
                    className="w-full bg-[#070b14] border border-white/15 rounded px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#c5a059]"
                  >
                    <option value="golden">Golden Age Keys (Action 1, Detective 27, Batman 1)</option>
                    <option value="silver">Silver Age Blue Chips (AF 15, FF 1, X-Men 1, JIM 83)</option>
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
                  <select
                    value={portfolioValue}
                    onChange={(e) => setPortfolioValue(e.target.value)}
                    className="w-full bg-[#070b14] border border-white/15 rounded px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#c5a059]"
                  >
                    <option value="sub25k">Under $25,000</option>
                    <option value="25k-100k">$25,000 – $100,000</option>
                    <option value="100k-500k">$100,000 – $500,000</option>
                    <option value="500k-2m">$500,000 – $2,000,000</option>
                    <option value="2m-plus">$2,000,000+</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#c5a059] to-[#8a6b2d] hover:from-[#d8b368] hover:to-[#9f7d37] text-black font-mono font-bold uppercase tracking-widest text-sm py-3 px-6 rounded shadow-lg transition-all transform active:scale-95 mt-4 disabled:opacity-50"
                >
                  {loading ? "Registering Clearance..." : "Reserve My Place on Q1 2027 Waitlist"}
                </button>
              </form>

              <p className="text-[11px] text-white/40 text-center font-mono mt-4">
                🔒 Strictly confidential. No SPAM. Access dispatched strictly in order of receipt.
              </p>
            </>
          )}
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
            <h3 className="text-lg font-serif font-bold text-white mb-2">Real-Time Market Depth & Comps</h3>
            <p className="text-sm text-white/65 leading-relaxed">
              Consolidates 2.2 million verified transactions across heritage houses, private exchanges, and peer-to-peer registries with automated outlier suppression.
            </p>
          </div>

          <div className="bg-[#0d1322] border border-white/10 rounded-lg p-6 hover:border-[#c5a059]/40 transition-colors">
            <div className="h-10 w-10 rounded bg-[#c5a059]/10 border border-[#c5a059]/30 flex items-center justify-center font-mono font-bold text-[#c5a059] mb-4">
              02
            </div>
            <h3 className="text-lg font-serif font-bold text-white mb-2">Sovereign Options & Derivatives</h3>
            <p className="text-sm text-white/65 leading-relaxed">
              Black-Scholes option pricing models adapted for non-linear condition convexity and physical vault bailment custody.
            </p>
          </div>

          <div className="bg-[#0d1322] border border-white/10 rounded-lg p-6 hover:border-[#c5a059]/40 transition-colors">
            <div className="h-10 w-10 rounded bg-[#c5a059]/10 border border-[#c5a059]/30 flex items-center justify-center font-mono font-bold text-[#c5a059] mb-4">
              03
            </div>
            <h3 className="text-lg font-serif font-bold text-white mb-2">Census Cliff & Scarcity Alerts</h3>
            <p className="text-sm text-white/65 leading-relaxed">
              Algorithmic surveillance of CGC and CBCS census shifts, detecting population grade cliffs before the broad market prices in scarcity.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
