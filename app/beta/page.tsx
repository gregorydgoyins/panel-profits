"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Lock } from "lucide-react";
import EditorialStickyNav from "@/components/navigation/EditorialStickyNav";

export default function BetaPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [assetFocus, setAssetFocus] = useState("golden");
  const [portfolioValue, setPortfolioValue] = useState("sub25k");
  const [isComicBusiness, setIsComicBusiness] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("retail_shop");
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
          isComicBusiness,
          businessName: isComicBusiness ? businessName : undefined,
          businessType: isComicBusiness ? businessType : undefined,
          organization: isComicBusiness ? businessName : undefined,
          metadata: {
            assetFocus,
            portfolioValue,
            isComicBusiness,
            businessName,
            businessType,
            podcastAlertsOptIn: true,
          },
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
    <div className="relative min-h-screen text-[#e0e6ed] font-sans antialiased selection:bg-[#c5a059] selection:text-black">
      {/* High-Resolution Monolithic Trading Floor Full-Page Background */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat opacity-95 transition-opacity duration-700"
        style={{
          backgroundImage: `url('/brand/cbse-beta-terminal-monolith-bg.jpg?v=20261123')`,
        }}
      />
      {/* Atmospheric vignette allowing rich backdrop visibility */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-[#070b14]/50 via-transparent to-[#070b14]/85" />

      {/* Main interactive page container */}
      <div className="relative z-10">
        {/* Shared Sticky Parallax Header — 3 glowing sibling pills (Podcasts · Monograph / Book · Donate) */}
        <EditorialStickyNav currentPage="beta" />

      {/* Hero Header & Lead Gate */}
      <header className="relative pt-20 pb-16 px-6 max-w-5xl mx-auto text-center border-b border-white/10">
        <div className="p-8 md:p-12 rounded-3xl bg-[#060b14]/55 backdrop-blur-2xl border border-[#c5a059]/30 shadow-2xl shadow-black/80 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-xs font-mono tracking-widest uppercase mb-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#c5a059] animate-pulse"></span>
            Private Beta Gate — Priority Access Q1 2027
          </div>
          
          <h1 className="text-4xl md:text-6xl font-serif font-black tracking-tight text-white mb-4 leading-tight drop-shadow-lg">
            WALL STREET LIQUIDITY MEETS <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e7c87d] via-[#c5a059] to-[#916e28]">
              SEQUENTIAL ART EQUITIES
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/80 font-serif max-w-3xl mx-auto leading-relaxed mb-6 drop-shadow">
            The Comic Book Stock Exchange (<span className="text-[#c5a059] font-medium">Panel Profits</span>) is the first institutional financial simulation, market depth terminal, and algorithmic portfolio engine designed exclusively for certified comic slab assets.
          </p>

          {/* Lead Capture Form Card — Electric Icy Blue Unlock Gate */}
          <div className="max-w-xl mx-auto bg-[#040d18]/85 backdrop-blur-2xl rounded-2xl p-8 relative overflow-hidden text-left unlock-rim-ice">

          {submitted ? (
            <div className="relative z-10 text-center py-8 space-y-4">
              <CheckCircle2 className="w-16 h-16 text-[#38f6ff] mx-auto animate-bounce" />
              <h3 className="text-2xl font-serif font-bold text-white">Access Reservation Confirmed</h3>
              <p className="text-sm text-white/80 leading-relaxed font-sans">
                Thank you, <strong className="text-white">{name || email}</strong>. Your reservation on the Q1 2027 Private Beta waitlist has been officially recorded.
              </p>
              <div className="p-4 bg-[#38f6ff]/10 border border-[#38f6ff]/40 rounded font-mono text-xs text-[#a5f3fc]">
                Confirmation and onboarding credentials will be dispatched to <strong>{email}</strong> prior to platform launch.
              </div>
            </div>
          ) : (
            <div className="relative z-10">
              <div className="mb-6">
                <h3 className="text-xl font-serif font-bold text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-[#38f6ff]" />
                  Request Private Terminal Clearance
                </h3>
                <p className="text-xs text-cyan-100/70 font-sans mt-1">
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
                  <label className="block text-xs font-mono uppercase tracking-wider text-cyan-100/80 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Marcus Vance"
                    className="w-full bg-[#040c18] border border-cyan-400/25 rounded px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#38f6ff]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-cyan-100/80 mb-1">
                    Email Address (Institutional or Personal)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="marcus@vanceresearch.com"
                    className="w-full bg-[#040c18] border border-cyan-400/25 rounded px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#38f6ff]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-cyan-100/80 mb-1">
                    Primary Asset Focus
                  </label>
                  <select
                    value={assetFocus}
                    onChange={(e) => setAssetFocus(e.target.value)}
                    className="w-full bg-[#040c18] border border-cyan-400/25 rounded px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#38f6ff]"
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
                  <label className="block text-xs font-mono uppercase tracking-wider text-cyan-100/80 mb-1">
                    Estimated Current Slabbed Portfolio Value
                  </label>
                  <select
                    value={portfolioValue}
                    onChange={(e) => setPortfolioValue(e.target.value)}
                    className="w-full bg-[#040c18] border border-cyan-400/25 rounded px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#38f6ff]"
                  >
                    <option value="sub25k">Under $25,000</option>
                    <option value="25k-100k">$25,000 – $100,000</option>
                    <option value="100k-500k">$100,000 – $500,000</option>
                    <option value="500k-2m">$500,000 – $2,000,000</option>
                    <option value="2m-plus">$2,000,000+</option>
                  </select>
                </div>

                {/* Comic Business & Podcast Advertising Opt-in */}
                <div className="pt-2 border-t border-cyan-400/20 space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer text-xs text-white/80">
                    <input
                      type="checkbox"
                      checked={isComicBusiness}
                      onChange={(e) => setIsComicBusiness(e.target.checked)}
                      className="mt-0.5 rounded bg-[#040c18] border-cyan-400/35 text-[#38f6ff] focus:ring-[#38f6ff]"
                    />
                    <span>
                      <strong className="text-white block font-serif">I own or represent a Comic Business &amp; want to advertise on the P4 Panel Podcast</strong>
                      <span className="text-[11px] text-white/60 font-sans block mt-0.5">
                        Feature your store, online inventory, or convention booth on YouTube, Spotify, Apple Podcasts, and SoundCloud.
                      </span>
                    </span>
                  </label>

                  {isComicBusiness && (
                    <div className="p-4 bg-cyan-950/30 border border-[#38f6ff]/40 rounded-lg space-y-3 animate-fadeIn">
                      <div>
                        <label className="block text-[11px] font-mono uppercase tracking-wider text-[#7df9ff] mb-1">
                          Comic Business Name
                        </label>
                        <input
                          type="text"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="e.g. Golden Apple Comics / Mile High Comics"
                          className="w-full bg-[#040c18] border border-[#38f6ff]/40 rounded px-3.5 py-2 text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#38f6ff]"
                          required={isComicBusiness}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono uppercase tracking-wider text-[#7df9ff] mb-1">
                          Type of Business
                        </label>
                        <select
                          value={businessType}
                          onChange={(e) => setBusinessType(e.target.value)}
                          className="w-full bg-[#040c18] border border-cyan-400/25 rounded px-3.5 py-2 text-white text-xs focus:outline-none focus:border-[#38f6ff]"
                        >
                          <option value="retail_shop">Brick &amp; Mortar Comic Book Store</option>
                          <option value="online_store">Online Comic Shop / Whatnot / eBay Power Seller</option>
                          <option value="con_dealer">Convention Traveling Dealer / Exhibitor</option>
                          <option value="grading_service">Pressing, Cleaning &amp; Consignment Service</option>
                          <option value="publisher">Indie Comic Publisher / Creator Imprint</option>
                          <option value="supplies">Vault Supplies / Slabs / Protective Gear</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="text-[11px] font-mono text-[#a5f3fc] bg-[#38f6ff]/10 border border-[#38f6ff]/30 rounded p-2.5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#38f6ff] animate-pulse"></span>
                    <span>All subscribers receive direct email blasts whenever new episodes drop on YouTube, Spotify, Apple, SoundCloud &amp; Pandora.</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-[#03101a] font-mono font-bold uppercase tracking-widest text-sm py-3 px-6 rounded transition-all transform active:scale-95 mt-4 disabled:opacity-50 hover:brightness-110 cursor-pointer"
                  style={{
                    background: "linear-gradient(90deg, #7df9ff 0%, #00e5ff 50%, #38bdf8 100%)",
                    boxShadow: "0 0 22px rgba(0, 229, 255, 0.55)",
                  }}
                >
                  {loading ? "Registering Clearance..." : "Reserve My Place on Q1 2027 Waitlist"}
                </button>
              </form>

              <p className="text-[11px] text-cyan-100/55 text-center font-mono mt-4">
                🔒 Strictly confidential. No SPAM. Access dispatched strictly in order of receipt.
              </p>
            </div>
          )}
          </div>
        </div>
      </header>

      {/* Live Terminal Architecture Preview */}
      <section className="py-16 px-6 max-w-6xl mx-auto border-t border-white/10">
        <div className="p-8 md:p-12 rounded-3xl bg-[#060b14]/55 backdrop-blur-2xl border border-[#c5a059]/30 shadow-2xl shadow-black/80 space-y-12">
          <div className="text-center space-y-3">
            <div className="text-xs font-mono uppercase tracking-widest text-[#c5a059]">
              The Institutional Trading Floor &bull; Production Terminal Preview
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white drop-shadow-lg">
              High-Frequency Sequential Art Architecture
            </h2>
            <p className="text-white/70 text-sm max-w-2xl mx-auto leading-relaxed">
              The first Bloomberg-grade command center built specifically for high-conviction sequential art portfolios, slabbed derivative desks, and physical vault custodians.
            </p>
          </div>

          {/* Mock Glass Terminal Frame */}
          <div className="relative rounded-2xl overflow-hidden bg-[#070b14]/70 backdrop-blur-2xl border-2 border-[#c5a059]/40 shadow-2xl shadow-[#c5a059]/10">
            {/* Terminal Window Header Bar */}
            <div className="bg-[#0e1628] border-b border-white/10 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
                <span className="text-xs font-mono text-white/50 ml-3 hidden sm:inline-block">
                  CBSE // TERMINAL.STIX.PROD.NODE-04 // LATENCY: 12ms
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded uppercase">
                  DOM FEED: LIVE
                </span>
                <span className="text-[10px] font-mono text-[#c5a059] bg-[#c5a059]/10 border border-[#c5a059]/30 px-2 py-0.5 rounded uppercase">
                  STIX 500: +4.82%
                </span>
              </div>
            </div>

            {/* Terminal Interior Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-0 border-b border-white/10">
              {/* Visual Trading Engine 1: Longitudinal Valuation Trajectory & Benchmark Return */}
              <div className="md:col-span-12 bg-[#060a12] p-4 sm:p-6 border-b border-white/10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl sm:text-2xl font-serif font-black text-white">AVENGERS ANNUAL #10</span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/50 font-bold">
                        CGC 9.8 UNIVERSAL BLUE LABEL
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-500/40">
                        1ST ROGUE (X-MEN)
                      </span>
                    </div>
                    <div className="text-xs font-mono text-slate-400 mt-1">
                      TICKER: AVA10 &bull; BENCHMARK SEED &bull; HISTORICAL AVERAGE: $865.10 &bull; SOVEREIGN FREEPORT CUSTODY
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl sm:text-3xl font-mono font-bold text-cyan-300">$923.62</div>
                    <div className="text-[11px] font-mono text-emerald-400 font-bold">NET CYCLE RETURN: +41.6% (+$23.87)</div>
                  </div>
                </div>

                {/* High-Resolution Neon Blue Trajectory Canvas */}
                <div className="mt-4 rounded-xl overflow-hidden border border-cyan-500/30 bg-black/80 shadow-2xl relative aspect-[16/8]">
                  <img
                    src="/brand/cbse-screen-neon-valuation-trajectory.png"
                    alt="Longitudinal Valuation Trajectory - Neon Blue Historical Waveform"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1 rounded border border-cyan-500/40 text-[10px] font-mono text-cyan-300 font-bold uppercase tracking-wider">
                    Longitudinal Valuation Trajectory &bull; Multi-Year Cycle Curve
                  </div>
                  <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md px-3 py-1 rounded border border-white/10 text-[10px] font-mono text-slate-300">
                    ATH: $1,637.15 &bull; FLOOR: $514.68 &bull; CURRENT: $923.62
                  </div>
                </div>
              </div>

              {/* Visual Trading Engine 2: Grade Census, Liquidity Wheels & Capital Allocation */}
              <div className="md:col-span-12 bg-[#080d1a] p-4 sm:p-6 border-b border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div className="text-xs font-mono uppercase tracking-widest text-[#c5a059]">
                    Grade Census &amp; Liquidity Breakdown &bull; Algorithmic Capital Distribution
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Velocity &bull; AUM Concentration &bull; Spread Drag
                  </div>
                </div>

                {/* High-Resolution Colored Wheels Plate */}
                <div className="rounded-xl overflow-hidden border border-[#c5a059]/30 bg-black/80 shadow-2xl relative aspect-[16/7]">
                  <img
                    src="/brand/cbse-screen-colored-wheels-liquidity.png"
                    alt="Colored Wheels Liquidity & Capital Distribution Breakdown"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1 rounded border border-[#c5a059]/40 text-[10px] font-mono text-[#c5a059] font-bold uppercase tracking-wider">
                    Visual Liquidity Rings: Sales Volume (235 Trades) &bull; Capital Weight ($2,182 AUM) &bull; Spread Drag (26%)
                  </div>
                </div>
              </div>

              {/* Visual Trading Engine 3: 24-Month Candlestick Technical Simulation & Terminal Player Controls */}
              <div className="md:col-span-12 bg-[#060a12] p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div className="text-xs font-mono uppercase tracking-widest text-emerald-400">
                    24-Month Technical Simulation Engine &bull; Interactive Player &amp; Telemetry Rails
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Japanese Candlesticks &bull; Moving Averages &bull; Multi-Market Telemetry Controls
                  </div>
                </div>

                {/* High-Resolution Candlestick Simulation & Player Controls Canvas */}
                <div className="rounded-xl overflow-hidden border border-emerald-500/30 bg-black/80 shadow-2xl relative aspect-[16/8]">
                  <img
                    src="/brand/cbse-screen-japanese-candlestick-player-controls.png"
                    alt="24-Month Japanese Candlestick Simulation Engine & Terminal Player Controls"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1 rounded border border-emerald-500/40 text-[10px] font-mono text-emerald-300 font-bold uppercase tracking-wider">
                    Japanese Candlestick Technical Engine &bull; Player Controls &amp; Dashboard Telemetry
                  </div>
                  <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md px-3 py-1 rounded border border-white/10 text-[10px] font-mono text-slate-300">
                    REGIME: CALM &bull; STRESS: 0.24 &bull; LIVE EXECUTION SIMULATION
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Production App Screenshots Gallery */}
      <section className="py-20 px-6 max-w-6xl mx-auto border-t border-white/10">
        <div className="p-8 md:p-12 rounded-3xl bg-[#060b14]/55 backdrop-blur-2xl border border-[#c5a059]/30 shadow-2xl shadow-black/80 space-y-12">
          <div className="text-center space-y-3">
            <div className="text-xs font-mono uppercase tracking-widest text-[#c5a059]">
              Subscriber Dashboard Preview &bull; High-Fidelity Interface
            </div>
            <h2 className="text-3xl sm:text-5xl font-serif font-black text-white drop-shadow-lg">
              What The Platform Delivers To Subscribers
            </h2>
            <p className="text-slate-200 text-sm max-w-3xl mx-auto leading-relaxed font-light drop-shadow">
              An inside look at the core operating surfaces designed for institutional funds, family offices, and high-conviction sequential art underwriters.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Alpha Terminal & Sovereign Basis Ledger */}
          <div className="rounded-2xl border border-white/10 bg-[#070b14]/60 backdrop-blur-xl overflow-hidden hover:border-[#c5a059]/50 transition-all shadow-xl group">
            <div className="aspect-[16/10] overflow-hidden bg-black/60 relative border-b border-white/10">
              <img
                src="/brand/cbse-screen-alpha-terminal-ledger.png"
                alt="Alpha Terminal & Sovereign Basis Ledger"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold uppercase">
                Alpha Terminal &amp; Replacement Ledger
              </div>
            </div>
            <div className="p-5 space-y-2">
              <h3 className="text-base font-serif font-bold text-white group-hover:text-[#c5a059] transition-colors">
                Grading Arbitrage &amp; Replacement Cost Ledger
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-light">
                Institutional multi-phase portfolio accounting. Calculates capitalized cost basis layers, holding drag over 180 days, net liquidation yields, and alpha profit margins per certified specimen.
              </p>
            </div>
          </div>

          {/* Card 2: Valuation Intelligence & RSI Momentum */}
          <div className="rounded-2xl border border-white/10 bg-[#070b14]/60 backdrop-blur-xl overflow-hidden hover:border-[#c5a059]/50 transition-all shadow-xl group">
            <div className="aspect-[16/10] overflow-hidden bg-black/60 relative border-b border-white/10">
              <img
                src="/brand/cbse-screen-valuation-intelligence-rsi.png"
                alt="Valuation Intelligence & RSI Momentum Gauges"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold uppercase">
                RSI Momentum &amp; Scarcity Index
              </div>
            </div>
            <div className="p-5 space-y-2">
              <h3 className="text-base font-serif font-bold text-white group-hover:text-[#c5a059] transition-colors">
                Valuation Intelligence &amp; Risk Widgets
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-light">
                Synchronized quantitative valuation, structured investment thesis ledgers, scarcity dials (40/100 scale), and TradingView-styled RSI technical momentum telemetry.
              </p>
            </div>
          </div>

          {/* Card 3: Grade Distribution & Valuation Tier Inspection */}
          <div className="rounded-2xl border border-white/10 bg-[#070b14]/60 backdrop-blur-xl overflow-hidden hover:border-[#c5a059]/50 transition-all shadow-xl group">
            <div className="aspect-[16/10] overflow-hidden bg-black/60 relative border-b border-white/10">
              <img
                src="/brand/cbse-screen-grade-distribution-bars.png"
                alt="Grade Distribution & Valuation Tier Inspection"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-mono font-bold uppercase">
                Grade Distribution &amp; Census Pop
              </div>
            </div>
            <div className="p-5 space-y-2">
              <h3 className="text-base font-serif font-bold text-white group-hover:text-[#c5a059] transition-colors">
                Grade Distribution &amp; Valuation Tier Ladder
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-light">
                Full-spectrum grade tier population bars (0.5 to 9.8), FMV pricing anchors, 90-day momentum (-75.16% pullback detection), and collector liquidity profiles.
              </p>
            </div>
          </div>

          {/* Card 4: Raw-to-Slab Arbitrage Scatter & Basis Spread */}
          <div className="rounded-2xl border border-white/10 bg-[#070b14]/60 backdrop-blur-xl overflow-hidden hover:border-[#c5a059]/50 transition-all shadow-xl group">
            <div className="aspect-[16/10] overflow-hidden bg-black/60 relative border-b border-white/10">
              <img
                src="/brand/cbse-screen-arbitrage-scatter.png"
                alt="Raw to Slab Arbitrage & Basis Mechanics"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-mono font-bold uppercase">
                Arbitrage &amp; Grading Spread
              </div>
            </div>
            <div className="p-5 space-y-2">
              <h3 className="text-base font-serif font-bold text-white group-hover:text-[#c5a059] transition-colors">
                Raw-to-Slab Arbitrage &amp; Capitalized Spread
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-light">
                Live scatter regression analyzing raw acquisition cost versus certified slab yield. Quantifies submission fees, pressing upside, and net capitalized profit margins.
              </p>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* Floating Footer Card */}
      <footer className="mt-20 mb-10 max-w-xl mx-auto px-6 py-4 rounded-xl border border-[#c5a059]/30 bg-[#060b14]/55 backdrop-blur-2xl text-center text-xs uppercase tracking-widest text-slate-300 shadow-2xl">
        <p className="mb-1 text-slate-200">Comic Book Stock Exchange • Private Beta Gate</p>
        <p className="text-slate-400 text-[10px]">Actuarial Ledger • Zero Corporate Kickbacks • High-Frequency Sequential Equities</p>
      </footer>
      </div>
    </div>
  );
}
