import { notFound } from "next/navigation";
import { Activity, ArrowLeft, BarChart3, CircleGauge, Database, Gauge, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { getCleanEquityDetail } from "@/lib/panel-profits/assets";

export const dynamic = "force-dynamic";
const metricIcons = [Activity, BarChart3, CircleGauge, Database, Gauge, BarChart3];
type HistoryPoint = { price: number | null; source: string | null; snapshot_date: string; grade: string | null };

export default async function EquityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getCleanEquityDetail(id);
  if (!detail) notFound();
  const { truth: equity, artifact, currentPrice, history, cover, series, issueNumber, publicationYear } = detail;
  const metrics = [
    ["Current market price", currentPrice?.current_price == null ? "Unpriced" : `$${Number(currentPrice.current_price).toFixed(2)}`],
    ["Bid / ask", currentPrice?.bid_price == null || currentPrice?.ask_price == null ? "Unavailable" : `$${Number(currentPrice.bid_price).toFixed(2)} / $${Number(currentPrice.ask_price).toFixed(2)}`],
    ["Day change", currentPrice?.day_change_percent == null ? "Unavailable" : `${Number(currentPrice.day_change_percent).toFixed(2)}%`],
    ["Anchor confidence", equity.anchor_confidence || "Unavailable"],
    ["Census total", equity.census_total_graded ?? "Unavailable"],
    ["Census 9.8", equity.census_9_8 ?? "Unavailable"],
    ["Scarcity tier", equity.scarcity_tier || "Unavailable"],
    ["Verified instrument", artifact.verification_status || "Unavailable"],
  ];
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/equities" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-emerald-300 hover:text-emerald-200"><ArrowLeft className="h-3.5 w-3.5" /> Equity desk</Link>
      <header className="mt-6 border-b border-slate-800 pb-8"><p className="text-[10px] uppercase tracking-[0.28em] text-emerald-300">Clean equity detail / {equity.asset_class || "verified entity"}</p><h1 className="mt-3 text-4xl text-slate-100">{series} #{issueNumber}</h1><p className="mt-3 text-sm text-slate-400">{artifact.edition_form || "Edition unlisted"} · {publicationYear || "Year unavailable"} · Clean instrument verified</p></header>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{metrics.map(([label, value], index) => { const Icon = metricIcons[index] || Activity; return <section key={label} className="border border-slate-800 bg-[#0b0f15] p-5"><Icon className="h-5 w-5 text-emerald-300" /><p className="mt-6 text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p><p className="mt-2 text-xl text-slate-100">{value}</p></section>; })}</div>
      <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]"><div className="border border-slate-800 bg-[#0b0f15] p-6"><div className="flex items-center gap-3"><BarChart3 className="h-5 w-5 text-cyan-300" /><h2 className="text-xl text-slate-100">Clean price history</h2></div><p className="mt-4 text-sm leading-7 text-slate-400">Historical observations are sourced from Clean and remain separate from the current anchor and census evidence.</p>{history.length ? <div className="mt-8 flex h-48 items-end gap-1 border-b border-l border-slate-700 px-3 pb-1">{(history as HistoryPoint[]).map((point, index) => { const max = Math.max(...(history as HistoryPoint[]).map((item) => Number(item.price || 0)), 1); const height = Math.max(4, (Number(point.price || 0) / max) * 170); return <div key={`${point.snapshot_date}-${index}`} className="group relative flex-1 bg-cyan-400/70 transition-colors hover:bg-emerald-300" style={{ height }} title={`${point.source || "Clean"} · $${Number(point.price || 0).toFixed(2)}`} />; })}</div> : <div className="mt-8 flex h-44 items-center justify-center border border-dashed border-slate-700 text-xs uppercase tracking-[0.16em] text-slate-600">No matching Clean price history</div>}</div><aside className="border border-slate-800 p-6"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" /><p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Reference evidence</p></div><ul className="mt-4 space-y-3 text-xs leading-5 text-slate-400"><li>Anchor benchmark: {equity.anchor_price_usd ?? "Unavailable"}</li><li>Sovereign benchmark: {equity.sov_price_usd ?? "Unavailable"}</li><li>Grade spread 9.9: {equity.price_9_9_usd ?? "Unavailable"}</li><li>Grade spread 10.0: {equity.price_10_0_usd ?? "Unavailable"}</li><li>Price source: {currentPrice?.price_source || "Clean truth layer"}</li><li>Cover evidence: {cover?.image_source || "Unavailable"}</li></ul></aside></section>
    </main>
  );
}
