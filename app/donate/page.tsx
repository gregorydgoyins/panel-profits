"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CheckCircle2, HeartHandshake, Shield, Store, Radio, Sparkles } from "lucide-react";

export default function DonatePage() {
  const [selectedAmount, setSelectedAmount] = useState("$50");
  const [customAmount, setCustomAmount] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isStoreOrSponsor, setIsStoreOrSponsor] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const finalAmount = customAmount ? `$${customAmount}` : selectedAmount;

    try {
      const res = await fetch("/api/leads/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "SPONSOR_DONATION",
          name,
          email,
          organization: isStoreOrSponsor ? storeName : undefined,
          interestTier: finalAmount,
          message,
          metadata: { finalAmount, isStoreOrSponsor, storeName },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to submit sponsorship inquiry.");
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
      {/* High-Resolution Full-Page Background */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat opacity-95 transition-opacity duration-700"
        style={{
          backgroundImage: `url('/brand/cbse-donate-temple-bg.jpg?v=20261124')`,
        }}
      />
      {/* Atmospheric vignette allowing rich backdrop visibility */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-[#070b14]/50 via-transparent to-[#070b14]/85" />

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
          <Link href="/book" className="text-white/70 hover:text-[#c5a059] transition-colors">
            The Monograph
          </Link>
          <Link href="/beta" className="text-white/70 hover:text-[#c5a059] transition-colors">
            Beta Terminal
          </Link>
          <span className="bg-[#c5a059] text-black font-bold px-3 py-1.5 rounded">
            Patron Endowment
          </span>
        </div>
      </nav>

      {/* Hero Header */}
      <header className="relative pt-20 pb-16 px-6 max-w-4xl mx-auto text-center border-b border-white/10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-xs font-mono tracking-widest uppercase mb-6">
          <span className="inline-block w-2 h-2 rounded-full bg-[#c5a059] animate-ping"></span>
          Direct Listener, Sponsor & Patron Research Fund
        </div>
        
        <h1 className="text-4xl md:text-6xl font-serif font-black tracking-tight text-white mb-6 leading-tight">
          KEEP THE SCHOLARSHIP <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e7c87d] via-[#c5a059] to-[#916e28]">
            UNCOMPROMISED & INDEPENDENT
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-white/75 font-serif max-w-2xl mx-auto leading-relaxed mb-8">
          We take zero corporate sponsorship from grading conglomerates, zero auction kickbacks, and zero paid shilling. Every dollar directly funds raw archival microfilm scans, legal discovery, and census actuarial models.
        </p>

        {/* Donation & Sponsor Form Card */}
        <div className="max-w-xl mx-auto bg-[#060b14]/60 backdrop-blur-2xl border border-[#c5a059]/40 rounded-2xl p-8 shadow-2xl relative overflow-hidden text-left">
          {submitted ? (
            <div className="text-center py-8 space-y-4">
              <CheckCircle2 className="w-16 h-16 text-[#c5a059] mx-auto animate-bounce" />
              <h3 className="text-2xl font-serif font-bold text-white">Patron Pledge Recorded</h3>
              <p className="text-sm text-white/80 leading-relaxed font-sans">
                Thank you, <strong className="text-white">{name || email}</strong>! Your patronage pledge has been directly registered with the Panel Profits Research Desk.
              </p>
              <div className="p-4 bg-white/5 border border-white/10 rounded font-mono text-xs text-[#c5a059]">
                Our research coordinator will follow up directly at <strong>{email}</strong> with your official tax documentation and research desk briefing packet.
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="text-xl font-serif font-bold text-white flex items-center gap-2">
                  <HeartHandshake className="w-5 h-5 text-[#c5a059]" />
                  Patron Endowment & Episode Sponsorship
                </h3>
                <p className="text-xs text-white/60 font-sans mt-1">
                  Support as an individual patron or sponsor an upcoming podcast episode on behalf of your comic shop or firm.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 mb-4 rounded bg-red-900/30 border border-red-500/50 text-red-200 text-xs">
                  {errorMsg}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                {/* Amount Selectors */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-white/70 mb-2">
                    Contribution Tier
                  </label>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {["$25", "$50", "$100", "$500"].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => { setSelectedAmount(amt); setCustomAmount(""); }}
                        className={`py-2 text-xs font-mono font-bold rounded border transition-all ${
                          selectedAmount === amt && !customAmount
                            ? "bg-[#c5a059] text-black border-[#c5a059]"
                            : "bg-[#070b14] text-white/80 border-white/15 hover:border-[#c5a059]/50"
                        }`}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Custom amount (e.g. $1,000 for Episode Sponsor)"
                    className="w-full bg-[#070b14] border border-white/15 rounded px-4 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#c5a059]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-white/70 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Gregory Vance"
                    className="w-full bg-[#070b14] border border-white/15 rounded px-4 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#c5a059]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-white/70 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="patron@gmail.com"
                    className="w-full bg-[#070b14] border border-white/15 rounded px-4 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#c5a059]"
                    required
                  />
                </div>

                {/* Comic Shop / Sponsor Toggle */}
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-sans text-white/80">
                    <input
                      type="checkbox"
                      checked={isStoreOrSponsor}
                      onChange={(e) => setIsStoreOrSponsor(e.target.checked)}
                      className="rounded bg-[#070b14] border-white/20 text-[#c5a059] focus:ring-[#c5a059]"
                    />
                    <span>I represent a Comic Book Store, Business, or want to sponsor an episode</span>
                  </label>
                </div>

                {isStoreOrSponsor && (
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-[#c5a059] mb-1">
                      Store Name / Company / City
                    </label>
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="e.g. Golden Apple Comics (Los Angeles, CA)"
                      className="w-full bg-[#070b14] border border-[#c5a059]/40 rounded px-4 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#c5a059]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-white/70 mb-1">
                    Message or On-Air Dedication Note (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Include any on-air dedication or historical book you'd like the research desk to investigate..."
                    className="w-full bg-[#070b14] border border-white/15 rounded px-4 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#c5a059]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#c5a059] to-[#8a6b2d] hover:from-[#d8b368] hover:to-[#9f7d37] text-black font-mono font-bold uppercase tracking-widest text-sm py-3 px-6 rounded shadow-lg transition-all transform active:scale-95 mt-4 disabled:opacity-50"
                >
                  {loading ? "Submitting Pledge..." : `Pledge ${customAmount ? `$${customAmount}` : selectedAmount} Support`}
                </button>
              </form>
            </>
          )}
        </div>
      </header>

      {/* Creator & Historic Masters Photographic Wall */}
      <section className="py-20 px-6 max-w-6xl mx-auto border-t border-white/10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-xs font-mono tracking-widest uppercase">
              The Living Human Substrate &bull; Creator Preservation Archive
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white">
              The Giants Who Built The Four-Color Universe
            </h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Every dollar pledged ensures that the actual inventors, pencillers, letterers, and inkers who created multi-billion-dollar global mythologies are documented, defended, and commemorated with academic rigor.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono text-[#c5a059] border border-[#c5a059]/30 bg-[#c5a059]/5 px-3 py-1.5 rounded uppercase tracking-wider">
              Primary Archival Photography
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            {
              name: "Jerry Siegel & Joe Shuster",
              role: "Creators of Superman (1938)",
              desc: "Historic 1930s Cleveland studio photograph prior to selling the Action Comics #1 rights for $130.",
              img: "/images/fig02_siegel_shuster_cleveland.jpg",
              tag: "Genesis Creators",
            },
            {
              name: "Jack Kirby & Steve Ditko",
              role: "Architects of the Marvel Universe",
              desc: "Primary source photographic portraits documenting the pencillers behind Captain America, Spider-Man, and Fantastic Four.",
              img: "/images/fig05_kirby_ditko_portraits.jpg",
              tag: "The King & The Visionary",
            },
            {
              name: "Matt Baker & Phantom Lady",
              role: "Pioneering African American Master",
              desc: "Forensic study of Matt Baker's line work, perspective anatomy, and the pre-Code Golden Age Fox publications.",
              img: "/images/fig07_matt_baker_phantom_lady_17.jpg",
              tag: "Pre-Code Golden Age",
            },
            {
              name: "Bill Everett & Sub-Mariner",
              role: "Golden Age Wartime Dynamism",
              desc: "Original 1941 WWII propaganda composition showcasing water kinetics and pulp-era speedlines.",
              img: "/images/fig04_sub_mariner_wwii.jpg",
              tag: "Substrate Architecture",
            },
          ].map((creator, idx) => (
            <div key={idx} className="group rounded-xl overflow-hidden bg-[#060b14]/50 backdrop-blur-xl border border-white/10 hover:border-[#c5a059]/60 transition-all duration-300 flex flex-col">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/60">
                <img
                  src={creator.img}
                  alt={creator.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-85 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#060b14] via-transparent to-transparent"></div>
                <span className="absolute top-2.5 left-2.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-black/80 text-[#c5a059] px-2 py-0.5 rounded border border-[#c5a059]/30">
                  {creator.tag}
                </span>
              </div>
              <div className="p-4 space-y-1.5 flex-1 flex flex-col justify-between bg-[#060b14]/70">
                <div>
                  <h4 className="text-sm font-serif font-bold text-white group-hover:text-[#c5a059] transition-colors">
                    {creator.name}
                  </h4>
                  <div className="text-[11px] font-mono text-[#c5a059] font-medium">{creator.role}</div>
                  <p className="text-[11px] text-white/60 font-sans leading-relaxed mt-2">
                    {creator.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Archival Research Pillars Showcase */}
      <section className="py-16 px-6 max-w-6xl mx-auto border-t border-white/10">
        <div className="text-center space-y-3 mb-12">
          <div className="text-xs font-mono uppercase tracking-widest text-[#c5a059]">
            Archival Transparency &bull; Capital Allocation
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white">
            Where Independent Patron Capital Goes
          </h2>
          <p className="text-white/60 text-sm max-w-2xl mx-auto">
            Unlike retail content mills that accept paid advertorials from slab dealers, 100% of CBSE endowment funding is deployed into primary-source evidentiary research.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="rounded-xl overflow-hidden bg-[#060b14]/50 backdrop-blur-xl border border-white/10 hover:border-[#c5a059]/40 transition-all flex flex-col group">
            <div className="relative h-44 w-full overflow-hidden bg-black/60">
              <img
                src="/media/newsroom-backdrop.png"
                alt="Archival Newsroom & Microfilm Lab"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-75"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060b14] via-transparent to-transparent"></div>
              <span className="absolute top-3 left-3 text-[10px] font-mono uppercase tracking-widest bg-black/80 text-[#c5a059] px-2.5 py-1 rounded border border-[#c5a059]/30">
                Pillar 01 &bull; Primary Sources
              </span>
            </div>
            <div className="p-6 space-y-3 flex-1 flex flex-col justify-between bg-[#060b14]/70">
              <div>
                <h3 className="font-serif font-bold text-lg text-white group-hover:text-[#c5a059] transition-colors">
                  Microfilm Scans &amp; SEC Legal Discovery
                </h3>
                <p className="text-xs text-white/70 leading-relaxed mt-2">
                  Funding direct county clerk record requests, corporate liquidation transcripts from the 1993 distributor crash, and high-DPI unretouched scans of pre-Code newsstand ledger sheets.
                </p>
              </div>
              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-white/50">
                <span>Monthly Allocation</span>
                <span className="text-[#c5a059] font-bold">40% of Fund</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden bg-[#060b14]/50 backdrop-blur-xl border border-white/10 hover:border-[#c5a059]/40 transition-all flex flex-col group">
            <div className="relative h-44 w-full overflow-hidden bg-black/60">
              <img
                src="/covers/action_comics_1.jpg"
                alt="Spectrometry & Paper Chemistry"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-75"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060b14] via-transparent to-transparent"></div>
              <span className="absolute top-3 left-3 text-[10px] font-mono uppercase tracking-widest bg-black/80 text-[#c5a059] px-2.5 py-1 rounded border border-[#c5a059]/30">
                Pillar 02 &bull; Forensic Science
              </span>
            </div>
            <div className="p-6 space-y-3 flex-1 flex flex-col justify-between bg-[#060b14]/70">
              <div>
                <h3 className="font-serif font-bold text-lg text-white group-hover:text-[#c5a059] transition-colors">
                  Spectrometry &amp; Lignin Kinetic Audits
                </h3>
                <p className="text-xs text-white/70 leading-relaxed mt-2">
                  Benchmarking groundwood pulp degradation under inert gas encapsulation, micro-chamber off-gassing, and empirical UV fluorescence testing on Golden Age restorations.
                </p>
              </div>
              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-white/50">
                <span>Equipment &amp; Reagents</span>
                <span className="text-[#c5a059] font-bold">35% of Fund</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden bg-[#060b14]/50 backdrop-blur-xl border border-white/10 hover:border-[#c5a059]/40 transition-all flex flex-col group">
            <div className="relative h-44 w-full overflow-hidden bg-black/60">
              <img
                src="/media/newsdesk-poster.jpg"
                alt="Local Comic Shop Grants"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-75"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060b14] via-transparent to-transparent"></div>
              <span className="absolute top-3 left-3 text-[10px] font-mono uppercase tracking-widest bg-black/80 text-[#c5a059] px-2.5 py-1 rounded border border-[#c5a059]/30">
                Pillar 03 &bull; Retailer Ecology
              </span>
            </div>
            <div className="p-6 space-y-3 flex-1 flex flex-col justify-between bg-[#060b14]/70">
              <div>
                <h3 className="font-serif font-bold text-lg text-white group-hover:text-[#c5a059] transition-colors">
                  Brick-and-Mortar Preservation Grants
                </h3>
                <p className="text-xs text-white/70 leading-relaxed mt-2">
                  Direct micro-grants and free archival appraisal software provided to independent, family-owned comic shops protecting the physical hobby at street level.
                </p>
              </div>
              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-white/50">
                <span>Community Grants</span>
                <span className="text-[#c5a059] font-bold">25% of Fund</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Patron Tiers & Sponsor Perks */}
      <section className="py-16 px-6 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-[#060b14]/50 backdrop-blur-xl border border-white/10 rounded-lg p-6">
            <Radio className="w-8 h-8 text-[#c5a059] mb-3" />
            <h3 className="font-serif font-bold text-white text-base mb-1">Archival Supporter</h3>
            <p className="text-xs text-white/60 mb-4">$25 – $50 one-time or monthly</p>
            <p className="text-xs text-white/75 leading-relaxed">
              Funds microfilm retrieval, state corporation filings, and direct access to uncompressed podcast audio files.
            </p>
          </div>

          <div className="bg-[#060b14]/50 backdrop-blur-xl border border-white/10 rounded-lg p-6">
            <Store className="w-8 h-8 text-[#c5a059] mb-3" />
            <h3 className="font-serif font-bold text-white text-base mb-1">Local Comic Shop Sponsor</h3>
            <p className="text-xs text-white/60 mb-4">$250 – $500 per episode</p>
            <p className="text-xs text-white/75 leading-relaxed">
              Official on-air shoutout and directory spotlight on the podcast for your brick-and-mortar comic book store.
            </p>
          </div>

          <div className="bg-[#060b14]/55 backdrop-blur-xl border border-[#c5a059]/40 rounded-lg p-6">
            <Sparkles className="w-8 h-8 text-[#c5a059] mb-3" />
            <h3 className="font-serif font-bold text-white text-base mb-1">Research Fellow Endowment</h3>
            <p className="text-xs text-[#c5a059] mb-4">$1,000+ Institutional</p>
            <p className="text-xs text-white/75 leading-relaxed">
              Permanent recognition in the published Clothbound Monograph backmatter and direct advisory consultations with Gregory D. Goyins.
            </p>
          </div>
        </div>
      </section>

      {/* Floating Footer Card */}
      <footer className="mt-20 mb-10 max-w-xl mx-auto px-6 py-4 rounded-xl border border-[#c5a059]/30 bg-[#060b14]/55 backdrop-blur-2xl text-center text-xs uppercase tracking-widest text-slate-300 shadow-2xl">
        <p className="mb-1 text-slate-200">The Comic Book Stock Exchange • Research &amp; Legal Defense Fund</p>
        <p className="text-slate-400 text-[10px]">Independent Scholarship • Creator Equity Advocacy • Zero Corporate Kickbacks</p>
      </footer>
      </div>
    </div>
  );
}
