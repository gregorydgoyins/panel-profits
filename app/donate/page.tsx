import React from "react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support & Fund Independent Research | The Comic Book Stock Exchange",
  description:
    "Direct patron support and academic research endowment for Panel Profits. Fund deep-dive forensic sequential art scholarship, cognitive aesthetics, and institutional market terminals.",
};

export default function DonatePage() {
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
          <span className="bg-[#c5a059] text-black font-bold px-3 py-1.5 rounded">
            Patron Endowment
          </span>
        </div>
      </nav>

      {/* Hero Header */}
      <header className="relative pt-20 pb-16 px-6 max-w-4xl mx-auto text-center border-b border-white/10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-xs font-mono tracking-widest uppercase mb-6">
          <span className="inline-block w-2 h-2 rounded-full bg-[#c5a059] animate-ping"></span>
          Direct Listener & Patron Research Fund
        </div>
        <h1 className="text-4xl md:text-6xl font-serif font-black tracking-tight text-white mb-6 leading-tight">
          KEEP THE SCHOLARSHIP <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e7c87d] via-[#c5a059] to-[#916e28]">
            INDEPENDENT & FUNDED
          </span>
        </h1>
        <p className="text-lg md:text-xl text-white/75 font-serif max-w-2xl mx-auto leading-relaxed mb-8">
          The <span className="text-[#c5a059] font-medium">Panel Profits</span> podcast and academic monograph series are produced without corporate gallery underwriting or auction house subsidies. Your support directly funds original paper chemistry research, high-res archival digitization, and unapologetic cultural critique.
        </p>

        {/* Two Ways to Support */}
        <div className="grid md:grid-cols-2 gap-8 text-left max-w-3xl mx-auto mt-12">
          {/* Option 1: Free Engagement */}
          <div className="bg-[#0d1322] border border-white/10 rounded-xl p-8 flex flex-col justify-between hover:border-[#c5a059]/40 transition-colors">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-[#c5a059] mb-2">Option 01 • Instant & Free</div>
              <h2 className="text-2xl font-serif font-bold text-white mb-4">Follow, Rate & Subscribe</h2>
              <p className="text-sm text-white/70 leading-relaxed font-sans mb-6">
                Algorithms prioritize engagement. Simply subscribing on Apple Podcasts, Spotify, YouTube, or Google Podcasts and leaving a 5-star review keeps our investigative forensic episodes at the top of cultural charts.
              </p>
              <ul className="space-y-2.5 text-xs font-mono text-white/80">
                <li className="flex items-center gap-2">
                  <span className="text-[#c5a059]">✓</span> Subscribe on Apple Podcasts
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#c5a059]">✓</span> Follow on Spotify & YouTube
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#c5a059]">✓</span> Share with fellow collectors & academics
                </li>
              </ul>
            </div>
            <div className="mt-8 pt-6 border-t border-white/10">
              <span className="text-xs font-mono text-emerald-400 block mb-2">● Takes 10 seconds</span>
              <a
                href="https://podcasts.apple.com"
                target="_blank"
                rel="noreferrer"
                className="block text-center bg-white/10 hover:bg-white/20 text-white font-mono font-bold text-xs uppercase tracking-widest py-3 px-4 rounded transition-colors"
              >
                Subscribe on Your Podcast App
              </a>
            </div>
          </div>

          {/* Option 2: Paid Patron & Endowment */}
          <div className="bg-[#0d1322] border-2 border-[#c5a059] rounded-xl p-8 flex flex-col justify-between shadow-2xl shadow-[#c5a059]/10 relative">
            <div className="absolute -top-3.5 right-6 bg-[#c5a059] text-black font-mono font-bold text-[10px] uppercase tracking-widest px-3 py-1 rounded-full">
              Patron Desk
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-[#c5a059] mb-2">Option 02 • Patron Community</div>
              <h2 className="text-2xl font-serif font-bold text-white mb-4">Patreon & Research Endowment</h2>
              <p className="text-sm text-white/70 leading-relaxed font-sans mb-6">
                Become an ongoing research patron on Patreon or through our subscriber desk. Unlock uncut bonus episodes, raw actuarial spreadsheets, high-resolution creator dossier PDFs, and submit questions directly to Marcus, Elena, and Gregory D. Goyins.
              </p>
              <ul className="space-y-2.5 text-xs font-mono text-white/80">
                <li className="flex items-center gap-2">
                  <span className="text-[#c5a059]">✓</span> Extended Uncut 60-Minute Episodes
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#c5a059]">✓</span> Raw Excel & CSV Census Cliff Models
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#c5a059]">✓</span> Priority Q&A with Gregory D. Goyins
                </li>
              </ul>
            </div>
            <div className="mt-8 pt-6 border-t border-white/10">
              <span className="text-xs font-mono text-[#c5a059] block mb-2">● Tiers from $10/mo</span>
              <a
                href="https://patreon.com"
                target="_blank"
                rel="noreferrer"
                className="block text-center bg-gradient-to-r from-[#c5a059] to-[#8a6b2d] hover:from-[#d8b368] hover:to-[#9f7d37] text-black font-mono font-bold text-xs uppercase tracking-widest py-3 px-4 rounded shadow-md transition-all"
              >
                Join Patron Desk on Patreon
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Why Independent Funding Matters */}
      <section className="py-20 px-6 max-w-4xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-4">
          Why Uncompromising Independence Matters
        </h2>
        <p className="text-sm md:text-base text-white/75 leading-relaxed font-serif max-w-2xl mx-auto mb-8">
          Traditional comic journalism is heavily compromised by advertising relationships with auction galleries, grading companies, and corporate publishing conglomerates. Panel Profits exists to provide unvarnished mathematical truth, fearless cultural criticism, and rigorous academic scholarship.
        </p>
        <blockquote className="font-serif italic text-lg text-white/90 max-w-xl mx-auto border-l-2 border-[#c5a059] pl-4 text-left">
          &ldquo;When scholarship is beholden to auction house commissions, true criticism becomes impossible. Your support preserves our freedom to tell the unabridged truth.&rdquo;
        </blockquote>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10 text-center font-mono text-xs text-white/50">
        <p className="mb-2">© 2026 The Comic Book Stock Exchange Research Foundation. All rights reserved.</p>
        <p className="text-white/30">
          Listener donations and Patreon subscriptions support independent scholarship and open-access research publications.
        </p>
      </footer>
    </div>
  );
}
