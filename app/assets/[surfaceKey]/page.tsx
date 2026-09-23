import Link from "next/link";
import { ArrowLeft, Boxes, Database, Gauge, Layers3 } from "lucide-react";
import { getCleanAssetSurface } from "@/lib/dashboard/queries";

export const dynamic = "force-dynamic";

export default async function AssetSurfacePage({ params }: { params: Promise<{ surfaceKey: string }> }) {
  const { surfaceKey } = await params;
  const result = await getCleanAssetSurface(surfaceKey);
  if (!result) {
    return <main className="mx-auto max-w-5xl px-4 py-16 text-sm text-slate-500">Clean asset surface not found.</main>;
  }

  const { surface, constituents } = result;
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/assets" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-orange-300 hover:text-orange-200"><ArrowLeft className="h-3.5 w-3.5" /> Asset surfaces</Link>
      <header className="mt-6 border-b border-slate-800 pb-8">
        <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-orange-300"><Boxes className="h-3.5 w-3.5" /> Clean asset surface / {surface.surface_key}</p>
        <h1 className="mt-3 text-4xl text-slate-100">{surface.surface_name}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{surface.notes || "A curated Panel Profits market surface assembled from Clean instrument relationships."}</p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[["Class", surface.asset_class, Layers3], ["Model", surface.valuation_model, Gauge], ["Cadence", surface.rebalance_cadence, Database], ["Constituents", surface.constituent_count, Boxes]].map(([label, value, Icon]) => <div key={String(label)} className="border border-orange-500/30 bg-[#0b0f15] p-5 markets-rimlight-hover"><Icon className="h-5 w-5 text-orange-300" /><p className="mt-6 text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p><p className="mt-2 text-xl text-slate-100">{String(value || "Unavailable")}</p></div>)}
      </section>

      <section className="mt-8 border border-slate-800 bg-[#0b0f15]">
        <div className="border-b border-slate-800 p-5"><h2 className="text-xl text-slate-100">Constituent structure</h2><p className="mt-1 text-xs text-slate-500">Clean relationship data, limited to the first 100 display-order constituents.</p></div>
        <div className="divide-y divide-slate-800">{constituents.map((item) => <div key={`${item.canonical_instrument_id}-${item.display_order}`} className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3 text-xs"><span className="text-slate-200">Instrument {item.canonical_instrument_id}</span><span className="text-orange-300">{(Number(item.weight || 0) * 100).toFixed(3)}%</span><span className="text-slate-500">{item.weighting_method || "WEIGHTED"}</span></div>)}{!constituents.length && <p className="p-5 text-sm text-slate-500">No active constituents are currently published for this surface.</p>}</div>
      </section>
    </main>
  );
}