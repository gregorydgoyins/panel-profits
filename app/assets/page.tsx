import { Boxes, SlidersHorizontal } from "lucide-react";
import { getAssetRegistry } from "@/lib/panel-profits/assets";
import { AssetCard } from "@/components/assets/asset-card";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const assets = await getAssetRegistry(48);
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="border-b border-slate-800 pb-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-orange-300"><Boxes className="h-3.5 w-3.5" /> Asset universe / cover-led registry</p>
            <h1 className="mt-3 text-4xl text-slate-100">Assets outside the equity layer</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Physical comic identity, Clean cover evidence, and operational asset surfaces live here. Equities have their own desk and detail surface.</p>
          </div>
          <div className="flex items-center gap-2 border border-slate-800 px-3 py-2 text-xs text-slate-500"><SlidersHorizontal className="h-3.5 w-3.5" /> {assets.length} latest records</div>
        </div>
      </header>
      <section className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{assets.map((asset) => <AssetCard key={asset.id} asset={asset} />)}</section>
      {!assets.length && <p className="mt-10 border border-slate-800 p-8 text-sm text-slate-500">No asset records are available.</p>}
    </main>
  );
}
