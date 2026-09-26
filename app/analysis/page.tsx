import Link from "next/link";
import { ArrowUpRight, BarChart3, GitCompareArrows } from "lucide-react";
import { getPanelTelemetry } from "@/lib/panel-profits/queries";

export const dynamic = "force-dynamic";

const recovered = [
  ["CE70", "70 constitutional seats · origin-era allocation · defined, not populated in Clean"],
  ["PPIX-60", "FMV × Census 9.8 / divisor · 60-issue capitalization benchmark · defined, not populated"],
  ["PPIX-100", "100-instrument liquidity-weighted pulse index · defined, not populated"],
  ["PPIX Composite", "Referenced historically, but no authoritative weighting formula recovered"],
  ["CE50", "Historical 50-constituent benchmark · distinct from CE70"],
];

export default async function AnalysisPage() {
  const { state, indices, recoveredIndices } = await getPanelTelemetry();
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="border-b border-slate-800 pb-7"><p className="text-[10px] uppercase tracking-[0.28em] text-emerald-300">Analysis / benchmark relationships</p><h1 className="mt-3 text-4xl text-slate-100">Read the market, not a mock chart</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Current Clean index levels are shown separately from recovered historical Panel Profits specifications.</p></header>
      <section className="mt-8 grid gap-4 lg:grid-cols-3">{indices.map((index)=><article key={index.index_id} className="border border-slate-800 bg-[#0b0f15] p-5"><BarChart3 className="h-5 w-5 text-emerald-300"/><h2 className="mt-6 text-lg text-slate-100">{index.index_name}</h2><p className="mt-1 text-xs text-slate-500">{index.index_type} · {index.constituent_count} constituents</p><div className="mt-6 flex items-end justify-between"><span className="text-xs text-slate-500">Current</span><span className="text-xl text-emerald-300">{Number(index.current_value).toFixed(2)}</span></div><div className="mt-2 flex items-end justify-between"><span className="text-xs text-slate-500">Base</span><span className="text-sm text-slate-300">{Number(index.base_value).toFixed(2)}</span></div></article>)}</section>
      <section className="mt-8 border border-slate-800 p-6"><div className="flex items-center gap-3"><GitCompareArrows className="h-5 w-5 text-cyan-300"/><h2 className="text-xl text-slate-100">Recovered historical index systems</h2></div><div className="mt-5 divide-y divide-slate-800">{recoveredIndices.map((index)=><div key={index.index_code} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"><span className="text-sm text-slate-200">{index.display_name}</span><span className="text-xs text-amber-200">{index.production_status} · {index.notes}</span></div>)}</div><Link href="/telemetry" className="mt-5 inline-flex items-center gap-2 text-xs text-cyan-200 hover:text-cyan-100">Open telemetry <ArrowUpRight className="h-3.5 w-3.5"/></Link></section>
      <p className="mt-5 text-xs text-slate-600">Live state: {state?.regime || "Unavailable"} · tick {state?.tick ?? "Unavailable"}</p>
    </main>
  );
}
