import Link from "next/link";
import { ArrowUpRight, Database, Search } from "lucide-react";
import { getMarketIntelligence } from "@/lib/dashboard/queries";
import { getFirms } from "@/lib/panel-profits/queries";

export const dynamic = "force-dynamic";

export default async function ResearchPage() {
  const [assets, rawFirms] = await Promise.all([getMarketIntelligence(30), getFirms()]);
  const firms = rawFirms.filter(Boolean);

  return (
    <div className="relative min-h-screen text-[#e0e6ed] font-sans antialiased selection:bg-sky-500 selection:text-black">
      {/* High-Resolution Quantitative Archives Full-Page Background */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat opacity-35 transition-opacity duration-700"
        style={{
          backgroundImage: `url('/brand/cbse-research-archives-bg.jpg?v=20261124')`,
        }}
      />
      {/* Atmospheric vignette allowing rich backdrop visibility */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-[#070b14]/75 via-[#070b14]/65 to-[#070b14]/90" />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="border-b border-slate-800 pb-7">
        <p className="text-[10px] uppercase tracking-[0.28em] text-sky-300">Research terminal / Quantitative & Literature Hub</p>
        <h1 className="mt-3 text-4xl text-slate-100 font-bold">Investigate the Operating World</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Access institutional white papers, scholarly literature, active news archives, video broadcasts, catalog records, and firm identity systems.
        </p>
      </header>

      {/* Research Literature & Archives Hub */}
      <section className="mt-8 border-b border-slate-800 pb-8">
        <h2 className="text-sm font-mono uppercase tracking-[0.16em] text-slate-400 mb-4">Research & Literature Hub</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/research/white-papers"
            className="p-5 rounded border border-slate-800 bg-[#080C14] hover:border-sky-500/50 hover:bg-[#0B101C] transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-sky-300">White Papers</span>
              <ArrowUpRight className="h-4 w-4 text-sky-400" />
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-100">Institutional Models</p>
            <p className="mt-1 text-xs text-slate-400">Quantitative frameworks & valuation methodologies.</p>
          </Link>

          <Link
            href="/research/scholarly-papers"
            className="p-5 rounded border border-slate-800 bg-[#080C14] hover:border-purple-500/50 hover:bg-[#0B101C] transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-purple-300">Scholarly Papers</span>
              <ArrowUpRight className="h-4 w-4 text-purple-400" />
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-100">Academic Economics</p>
            <p className="mt-1 text-xs text-slate-400">Peer-reviewed literature & census float dynamics.</p>
          </Link>

          <Link
            href="/research/archive"
            className="p-5 rounded border border-slate-800 bg-[#080C14] hover:border-cyan-500/50 hover:bg-[#0B101C] transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">News Archive</span>
              <ArrowUpRight className="h-4 w-4 text-cyan-400" />
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-100">Historical Wire</p>
            <p className="mt-1 text-xs text-slate-400">Archived narrative intelligence & newsroom stories.</p>
          </Link>

          <Link
            href="/video-archive"
            className="p-5 rounded border border-slate-800 bg-[#080C14] hover:border-rose-500/50 hover:bg-[#0B101C] transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-rose-300">Video Archive</span>
              <ArrowUpRight className="h-4 w-4 text-rose-400" />
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-100">Broadcast Reports</p>
            <p className="mt-1 text-xs text-slate-400">Anchor floor recordings & video presenter briefs.</p>
          </Link>
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Database className="h-4 w-4 text-sky-300" />
            <h2 className="text-sm uppercase tracking-[0.16em] text-slate-200">Catalog assets</h2>
          </div>
          <div className="divide-y divide-slate-800 border-y border-slate-800">
            {assets.map((asset) => (
              <Link key={asset.id} href={`/comics/${asset.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-[#0b0f15]">
                <div>
                  <p className="text-sm text-slate-100">{asset.series} <span className="text-slate-500">#{asset.issueNumber}</span></p>
                  <p className="mt-1 text-xs text-slate-500">{asset.publisher || "Publisher unlisted"} · {asset.source || "Clean catalog"}</p>
                </div>
                <span className="flex items-center gap-2 text-xs text-emerald-300">
                  {asset.indexValue === null ? "Unpriced" : `$${asset.indexValue.toFixed(2)}`}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
            {!assets.length && <p className="p-5 text-sm text-slate-500">No Clean catalog records are available.</p>}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <Search className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm uppercase tracking-[0.16em] text-slate-200">Firm identities</h2>
          </div>
          <div className="divide-y divide-slate-800 border-y border-slate-800">
            {firms.map((firm) => (
              <Link key={firm!.firm_id} href={`/firms/${firm!.firm_id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-[#0b0f15]">
                <div>
                  <p className="text-sm text-slate-100">{firm!.firm_name}</p>
                  <p className="mt-1 text-xs text-slate-500">Institutional firm identity · {firm!.total_brokers} brokers</p>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-600" />
              </Link>
            ))}
            {!firms.length && <p className="p-5 text-sm text-slate-500">No Clean firm identity records are available.</p>}
          </div>
        </section>
      </div>
    </main>
    </div>
  );
}
