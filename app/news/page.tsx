import Link from "next/link";
import { Activity, ArrowUpRight, Database, LineChart, Radio, ShieldCheck } from "lucide-react";
import { getCleanNewsIntelligence } from "@/lib/dashboard/queries";
import { getNewsData } from "@/lib/panel-profits/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Market Intelligence | Panel Profits",
  description: "Live catalog and market-index intelligence from Panel Profits Clean.",
};

export default async function NewsPage() {
  const [items, newsData] = await Promise.all([getCleanNewsIntelligence(32), getNewsData(20)]);
  const priced = items.filter((item) => item.indexValue !== null);
  const averageIndex = priced.length
    ? priced.reduce((sum, item) => sum + (item.indexValue || 0), 0) / priced.length
    : null;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="border-b border-slate-800 pb-7">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-emerald-300">
              <Radio className="h-3.5 w-3.5" /> Market intelligence / live catalog signal
            </div>
            <h1 className="mt-3 text-3xl tracking-tight text-slate-100 sm:text-4xl">What changed in the universe</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">A compact read on the latest authoritative catalog records and market-index observations. This surface reports verified data, not generated headlines.</p>
          </div>
          <Link href="/comics" className="flex w-fit items-center gap-2 border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.12em] text-slate-300 hover:border-cyan-300 hover:text-cyan-200">Investigate catalog <ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </div>
      </header>

      <section aria-label="Market intelligence summary" className="grid border-b border-slate-800 sm:grid-cols-3">
        <div className="border-b border-slate-800 py-5 sm:border-b-0 sm:border-r sm:pr-6"><p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Signals received</p><p className="mt-2 text-2xl text-slate-100">{items.length}</p><p className="mt-1 text-xs text-slate-500">Latest Clean catalog records</p></div>
        <div className="border-b border-slate-800 py-5 sm:border-b-0 sm:px-6 sm:border-r"><p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Indexed observations</p><p className="mt-2 text-2xl text-slate-100">{priced.length}</p><p className="mt-1 text-xs text-slate-500">Records with a market index</p></div>
        <div className="py-5 sm:pl-6"><p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Sample index average</p><p className="mt-2 text-2xl text-slate-100">{averageIndex === null ? "Unpriced" : `$${averageIndex.toFixed(2)}`}</p><p className="mt-1 text-xs text-slate-500">No value inferred for missing records</p></div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
        <section aria-label="Live market intelligence" className="min-w-0">
          <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-emerald-300" /><h2 className="text-sm uppercase tracking-[0.16em] text-slate-200">Latest verified signals</h2></div><span className="text-[10px] uppercase tracking-[0.16em] text-slate-600">Clean / read-only</span></div>
          <div className="divide-y divide-slate-800 border-y border-slate-800">
            {items.map((item) => (
              <a key={item.id} href={item.url || "/news"} target={item.url ? "_blank" : undefined} rel={item.url ? "noreferrer" : undefined} className="group grid gap-3 py-4 transition-colors hover:bg-[#0d1118] sm:grid-cols-[1fr_auto] sm:items-center sm:px-3">
                <div className="min-w-0"><div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-slate-600"><span>{item.source || "Catalog"}</span><span>·</span><span>{item.publisher || "Publisher unlisted"}</span></div><p className="mt-1 truncate text-base text-slate-100 group-hover:text-cyan-200">{item.series} <span className="text-slate-500">#{item.issueNumber}</span></p><p className="mt-1 text-xs text-slate-500">New authoritative record → inspect identity, provenance, and available market data</p></div>
                <div className="flex items-center gap-4 text-right"><div><p className="text-[10px] uppercase tracking-[0.16em] text-slate-600">Index</p><p className="mt-1 text-sm text-emerald-300">{item.indexValue === null ? "Unpriced" : `$${item.indexValue.toFixed(2)}`}</p></div><ArrowUpRight className="h-4 w-4 text-slate-600 transition-colors group-hover:text-cyan-300" /></div>
              </a>
            ))}
            {!items.length && <div className="px-4 py-12 text-center text-sm text-slate-500">No verified intelligence is available right now.</div>}
          </div>
          <section className="mt-8"><div className="mb-3 flex items-center gap-2"><Radio className="h-4 w-4 text-amber-300"/><h2 className="text-sm uppercase tracking-[0.16em] text-slate-200">Market news / 25 records</h2></div><div className="divide-y divide-slate-800 border-y border-slate-800">{newsData.news.map((item)=><article key={item.news_id} className="p-4"><div className="flex gap-2 text-[10px] uppercase tracking-[0.16em] text-slate-600"><span>{item.category || "Market"}</span><span>·</span><span>Impact {item.impact_score ?? "—"}</span></div><h3 className="mt-1 text-sm text-slate-100">{item.headline}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{item.article_body || item.ticker_text || "No expanded body is published."}</p></article>)}{!newsData.news.length&&<p className="p-5 text-sm text-slate-500">No market-news records are available.</p>}</div></section>
          <section className="mt-8"><div className="mb-3 flex items-center gap-2"><Database className="h-4 w-4 text-purple-300"/><h2 className="text-sm uppercase tracking-[0.16em] text-slate-200">PPIB stories / 8,696 records</h2></div><div className="divide-y divide-slate-800 border-y border-slate-800">{newsData.stories.slice(0,12).map((story)=><article key={story.id} className="p-4"><div className="text-[10px] uppercase tracking-[0.16em] text-slate-600">{story.source_name || "PPIB"} · {story.story_type || story.event_type || "story"}</div><h3 className="mt-1 text-sm text-slate-100">{story.headline}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{story.normalized_summary || "Reference available in the PPIB story ledger."}</p></article>)}</div></section>
        </section>

        <aside className="space-y-4">
          <section className="border border-slate-800 bg-[#0b0f15] p-5"><Database className="h-5 w-5 text-cyan-300" /><p className="mt-6 text-[10px] uppercase tracking-[0.2em] text-slate-500">Data posture</p><h2 className="mt-2 text-lg text-slate-100">Evidence before narrative</h2><p className="mt-3 text-xs leading-6 text-slate-500">The current Clean integration exposes catalog and index observations. Firm, broker, sentiment, and event headlines remain hidden until their player-safe read contracts exist.</p></section>
          <section className="border border-slate-800 p-5"><ShieldCheck className="h-5 w-5 text-purple-300" /><p className="mt-6 text-[10px] uppercase tracking-[0.2em] text-slate-500">Investigation path</p><ul className="mt-3 space-y-3 text-xs text-slate-400"><li className="flex gap-2"><LineChart className="h-3.5 w-3.5 shrink-0 text-slate-600" /> Compare indexed records in the catalog</li><li className="flex gap-2"><Database className="h-3.5 w-3.5 shrink-0 text-slate-600" /> Open the underlying record for provenance</li></ul></section>
        </aside>
      </div>
    </main>
  );
}