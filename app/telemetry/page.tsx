import { Activity, AlertTriangle, BarChart3, Gauge, Radio, TrendingDown } from "lucide-react";
import { getPanelTelemetry } from "@/lib/panel-profits/queries";

export const dynamic = "force-dynamic";

export default async function TelemetryPage() {
  const { state, indices, ce50 } = await getPanelTelemetry();
  const cards = [
    ["Market tick", state?.tick ?? null, Radio],
    ["Regime", state?.regime ?? null, Activity],
    ["Market condition", state?.market_regime_4state ?? null, Gauge],
    ["Stress", state?.stress_index ?? null, AlertTriangle],
    ["Drawdown", state?.drawdown == null ? null : `${(Number(state.drawdown) * 100).toFixed(1)}%`, TrendingDown],
    ["Tectonic tier", state?.tectonic_tier ?? null, BarChart3],
  ] as const;
  return <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><header className="border-b border-slate-800 pb-7"><p className="text-[10px] uppercase tracking-[0.28em] text-cyan-300">Market systems / telemetry</p><h1 className="mt-3 text-4xl text-slate-100">Operating conditions</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Current Clean market state and populated index observations. Missing barometers stay visibly unavailable.</p></header><section className="mt-8 grid gap-px border border-slate-800 bg-slate-800 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([label,value,Icon])=><div key={label} className="bg-[#0b0f15] p-5"><Icon className="h-5 w-5 text-cyan-300"/><p className="mt-7 text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</p><p className="mt-2 text-2xl text-slate-100">{value ?? "Unavailable"}</p></div>)}</section><section className="mt-8 border border-slate-800"><div className="border-b border-slate-800 p-5"><p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Populated index family</p><h2 className="mt-2 text-xl text-slate-100">Clean market indices</h2></div><div className="divide-y divide-slate-800">{indices.map((index) => <div key={index.index_id} className="grid gap-3 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><p className="text-sm text-slate-100">{index.index_name}</p><p className="mt-1 text-xs text-slate-500">{index.index_type} · {index.constituent_count} constituents</p></div><span className="text-xs text-slate-500">Base {Number(index.base_value).toFixed(2)}</span><span className="text-sm text-emerald-300">{Number(index.current_value).toFixed(2)}</span></div>)}{ce50 && <div className="p-5"><p className="text-sm text-slate-100">CE50 base</p><p className="mt-1 text-xs text-slate-500">Raw reference value</p><p className="mt-2 text-sm text-amber-200">{Number(ce50.raw_value).toFixed(2)}</p></div>}</div></section></main>;
}
