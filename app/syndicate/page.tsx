import React from "react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Collector & Investor Guild | The Comic Book Stock Exchange",
  description:
    "Join the Panel Profits Collector Guild, Syndicate Deal Flow Desk, and Key-Slab Network. Private OTC liquidity, private convention summits, and institutional grading intelligence.",
};

const TIERS = [
  {
    name: "Tier I: Assayer Associate",
    badge: "Community & Data",
    price: "$49",
    period: "per month / $490 annual",
    desc: "For serious active collectors seeking daily census cliff alerts and private discord intelligence.",
    features: [
      "Access to Private Panel Profits Discord Research Desk",
      "Weekly Census Scarcity Cliff Alerts (CGC/CBCS 9.4+ population moves)",
      "Digital Access to all Monograph chapters and actuarial spreadsheets",
      "Early Beta Access to the Comic Book Stock Exchange (Q1 2027)",
      "Monthly Live Market Macro Webinar with Gregory D. Goyins & Guest Curators",
    ],
    cta: "Join Associate Tier",
    popular: false,
  },
  {
    name: "Tier II: Syndicate Desk",
    badge: "Most Popular / Liquidity",
    price: "$299",
    period: "per month / $2,990 annual",
    desc: "For high-volume dealers, portfolio managers, and blue-chip collectors seeking OTC deal flow.",
    features: [
      "All Tier I Assayer benefits included",
      "Access to Private OTC Key-Slab Network (Zero Vig peer-to-peer registry)",
      "Quarterly Co-Investment Syndicate Allocations on High-Value Pedigrees",
      "Cross-Assayer Grading Arbitrage Model & Fair-Value Spread Calculator",
      "VIP Invitation to Private Dinner Roundtables at SDCC, NYCC, & C2E2",
      "Direct Priority Q&A with Gregory D. Goyins during live research calls",
    ],
    cta: "Apply for Syndicate Desk",
    popular: true,
  },
  {
    name: "Tier III: Sovereign Patron",
    badge: "Institutional / Family Office",
    price: "$1,250",
    period: "per month / $12,500 annual",
    desc: "Dedicated white-glove provenance auditing, vault custody solutions, and bespoke acquisitions.",
    features: [
      "All Tier I & II Syndicate benefits included",
      "Custom 1-on-1 Portfolio Risk Audit & Rebalancing Advisory (Quarterly)",
      "Private Physical Vault Inspection & Micro-Spectroscopy Authentication Support",
      "Numbered, Custom-Bound Leather Hardcover Master Monograph signed by Gregory D. Goyins",
      "Permanent Founding Member Recognition on The Comic Book Stock Exchange Ledger",
      "Exclusive access to Private Pre-Auction Institutional War Rooms",
    ],
    cta: "Inquire for Sovereign Desk",
    popular: false,
  },
];

export default function SyndicatePage() {
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
          <Link href="/beta" className="text-white/70 hover:text-[#c5a059] transition-colors">
            Beta Terminal
          </Link>
          <span className="bg-[#c5a059] text-black font-bold px-3 py-1.5 rounded">
            Guild Membership
          </span>
        </div>
      </nav>

      {/* Hero Header */}
      <header className="relative pt-20 pb-16 px-6 max-w-5xl mx-auto text-center border-b border-white/10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-xs font-mono tracking-widest uppercase mb-6">
          <span className="inline-block w-2 h-2 rounded-full bg-[#c5a059]"></span>
          Private Collector Guild & Syndicate Desk
        </div>
        <h1 className="text-4xl md:text-6xl font-serif font-black tracking-tight text-white mb-6 leading-tight">
          THE PANEL PROFITS <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e7c87d] via-[#c5a059] to-[#916e28]">
            INVESTOR GUILD & SYNDICATE
          </span>
        </h1>
        <p className="text-lg md:text-xl text-white/75 font-serif max-w-3xl mx-auto leading-relaxed mb-8">
          A private network of accredited investors, serious collectors, and research fellows. Unlock institutional-grade census intelligence, private OTC deal flow, and the zero-vig Key-Slab Network app.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono uppercase tracking-wider text-white/80">
          <div className="flex items-center gap-2 bg-[#0d1322] border border-white/10 px-4 py-2 rounded">
            <span className="text-[#c5a059]">✓</span> Zero 20% Auction Vig
          </div>
          <div className="flex items-center gap-2 bg-[#0d1322] border border-white/10 px-4 py-2 rounded">
            <span className="text-[#c5a059]">✓</span> Private Convention Dinners
          </div>
          <div className="flex items-center gap-2 bg-[#0d1322] border border-white/10 px-4 py-2 rounded">
            <span className="text-[#c5a059]">✓</span> OTC Key-Slab App
          </div>
          <div className="flex items-center gap-2 bg-[#0d1322] border border-white/10 px-4 py-2 rounded">
            <span className="text-[#c5a059]">✓</span> Private Deal Syndication
          </div>
        </div>
      </header>

      {/* Pricing / Tiers Section */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[#c5a059] font-mono text-xs uppercase tracking-widest mb-2">Membership Allocation</p>
          <h2 className="text-3xl md:text-4xl font-serif font-black text-white">
            Choose Your Level of Market Access
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {TIERS.map((tier, idx) => (
            <div
              key={idx}
              className={`bg-[#0d1322] rounded-xl p-8 flex flex-col justify-between relative transition-all duration-300 ${
                tier.popular
                  ? "border-2 border-[#c5a059] shadow-2xl shadow-[#c5a059]/20 transform md:-translate-y-2"
                  : "border border-white/10 hover:border-white/20"
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-[#c5a059] to-[#916e28] text-black font-mono font-bold text-[10px] uppercase tracking-widest px-4 py-1 rounded-full shadow-md">
                  Most Popular
                </div>
              )}

              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-[#c5a059] mb-1">
                  {tier.badge}
                </p>
                <h3 className="text-xl font-serif font-bold text-white mb-3">
                  {tier.name}
                </h3>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-serif font-black text-white">{tier.price}</span>
                  <span className="text-xs font-mono text-white/50">{tier.period}</span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed font-sans mb-6 pt-2 border-t border-white/10">
                  {tier.desc}
                </p>

                <div className="space-y-3 mb-8">
                  {tier.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2.5 text-xs text-white/80">
                      <span className="text-[#c5a059] font-bold mt-0.5">✓</span>
                      <span className="leading-snug">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <button
                  type="button"
                  className={`w-full py-3 px-4 rounded text-xs font-mono font-bold uppercase tracking-widest transition-all ${
                    tier.popular
                      ? "bg-gradient-to-r from-[#c5a059] to-[#8a6b2d] hover:from-[#d8b368] hover:to-[#9f7d37] text-black shadow-lg"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                >
                  {tier.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* The Key-Slab App Spotlight */}
      <section className="py-20 px-6 bg-[#0a0f1c] border-y border-white/10">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-xs font-mono tracking-widest uppercase mb-4">
              Proprietary Member Tool
            </div>
            <h2 className="text-3xl md:text-4xl font-serif font-black text-white mb-6 leading-tight">
              The Key-Slab Network App: <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e7c87d] via-[#c5a059] to-[#916e28]">
                Bypassing the 20% Auction Vig
              </span>
            </h2>
            <p className="text-sm md:text-base text-white/75 leading-relaxed font-sans mb-4">
              When a $100,000 blue-chip slab hammers at a traditional auction house, the buyer pays 20% vig ($20,000) and the seller gives up another 5% to 10%. Over a quarter of the equity evaporates into administrative friction.
            </p>
            <p className="text-sm md:text-base text-white/75 leading-relaxed font-sans mb-6">
              The Key-Slab Network is an encrypted peer-to-peer registry exclusively for Guild members. List verified certification serial numbers, verify census authenticity in real time, and execute direct escrow settlements without paying millions in auction house commissions.
            </p>

            <ul className="space-y-2 text-xs font-mono text-white/80 mb-8">
              <li className="flex items-center gap-2">
                <span className="text-[#c5a059]">❖</span> Instant CGC/CBCS API certification verification
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#c5a059]">❖</span> Encrypted member-to-member direct messaging
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#c5a059]">❖</span> Integrated third-party escrow and insured transit
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#c5a059]">❖</span> Convention meetup scheduling and private viewing rooms
              </li>
            </ul>

            <Link
              href="#tiers"
              className="inline-block bg-[#c5a059] hover:bg-[#d8b368] text-black font-mono font-bold text-xs uppercase tracking-widest py-3 px-6 rounded shadow-md transition-colors"
            >
              Get Access Via Guild Membership
            </Link>
          </div>

          <div className="bg-[#070b14] border border-[#c5a059]/30 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                <span className="ml-2 font-mono text-xs text-white/50">key-slab.network (OTC Terminal)</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                LIVE DESK
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="bg-[#0d1322] border border-white/10 rounded p-3 flex justify-between items-center">
                <div>
                  <span className="text-white font-bold block">Amazing Fantasy #15</span>
                  <span className="text-white/40 text-[11px]">CGC 6.5 OW/W • Cert #3948201002</span>
                </div>
                <div className="text-right">
                  <span className="text-[#c5a059] font-bold block">$245,000 OTC</span>
                  <span className="text-emerald-400 text-[10px]">Zero Vig (Saved ~$49,000)</span>
                </div>
              </div>

              <div className="bg-[#0d1322] border border-white/10 rounded p-3 flex justify-between items-center">
                <div>
                  <span className="text-white font-bold block">Incredible Hulk #181</span>
                  <span className="text-white/40 text-[11px]">CGC 9.8 White • Cert #4102941011</span>
                </div>
                <div className="text-right">
                  <span className="text-[#c5a059] font-bold block">$110,000 OTC</span>
                  <span className="text-emerald-400 text-[10px]">Zero Vig (Saved ~$22,000)</span>
                </div>
              </div>

              <div className="bg-[#0d1322] border border-white/10 rounded p-3 flex justify-between items-center">
                <div>
                  <span className="text-white font-bold block">X-Men #1 (1963)</span>
                  <span className="text-white/40 text-[11px]">CGC 9.2 White • Cert #2093847005</span>
                </div>
                <div className="text-right">
                  <span className="text-[#c5a059] font-bold block">$185,000 OTC</span>
                  <span className="text-emerald-400 text-[10px]">Zero Vig (Saved ~$37,000)</span>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 rounded bg-[#c5a059]/10 border border-[#c5a059]/20 text-center">
              <p className="text-xs font-mono text-[#c5a059]">
                🔒 Verified Escrow Settlement • Insured Carrier Transit Guaranteed
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Convention VIP Schedule */}
      <section className="py-20 px-6 max-w-5xl mx-auto text-center">
        <p className="text-[#c5a059] font-mono text-xs uppercase tracking-widest mb-2">Private Meetups & Salon Calendar</p>
        <h2 className="text-3xl md:text-4xl font-serif font-black text-white mb-6">
          2026–2027 Private Convention Roundtables
        </h2>
        <p className="text-sm md:text-base text-white/70 max-w-2xl mx-auto mb-12">
          Guild members gather in private dining suites and vault viewings adjacent to major comic conventions to discuss high-grade private placements and macro market trends.
        </p>

        <div className="grid md:grid-cols-3 gap-6 text-left">
          <div className="bg-[#0d1322] border border-white/10 rounded-lg p-6">
            <span className="text-xs font-mono text-[#c5a059] block mb-2">SAN DIEGO</span>
            <h3 className="font-serif font-bold text-white text-lg mb-1">SDCC Private Vault Dinner</h3>
            <p className="text-xs font-mono text-white/50 mb-3">July 2026 • Private Dining Room</p>
            <p className="text-xs text-white/70">
              Exclusive keynote on Golden Age sovereign survival rates with Gregory D. Goyins.
            </p>
          </div>

          <div className="bg-[#0d1322] border border-white/10 rounded-lg p-6">
            <span className="text-xs font-mono text-[#c5a059] block mb-2">NEW YORK CITY</span>
            <h3 className="font-serif font-bold text-white text-lg mb-1">NYCC Institutional Roundtable</h3>
            <p className="text-xs font-mono text-white/50 mb-3">October 2026 • Midtown Manhattan</p>
            <p className="text-xs text-white/70">
              Analysis of post-auction market microstructure and family office allocations.
            </p>
          </div>

          <div className="bg-[#0d1322] border border-white/10 rounded-lg p-6">
            <span className="text-xs font-mono text-[#c5a059] block mb-2">CHICAGO</span>
            <h3 className="font-serif font-bold text-white text-lg mb-1">C2E2 Blue-Chip Syndicate Salon</h3>
            <p className="text-xs font-mono text-white/50 mb-3">Spring 2027 • The Loop</p>
            <p className="text-xs text-white/70">
              Preview of CBEX Terminal live trading execution and algorithmic arbitrage desks.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10 text-center font-mono text-xs text-white/50">
        <p className="mb-2">© 2026 The Comic Book Stock Exchange. All rights reserved.</p>
        <p className="text-white/30">
          The Collector & Investor Guild is an analytical community and private intelligence service. It does not provide registered broker-dealer or investment advisory services.
        </p>
      </footer>
    </div>
  );
}
