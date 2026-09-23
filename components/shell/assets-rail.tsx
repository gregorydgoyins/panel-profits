import Link from "next/link";
import Image from "next/image";
import { Boxes } from "lucide-react";
import { CleanAssetSurfaceItem } from "@/lib/dashboard/queries";

export function AssetsRail({ items }: { items: CleanAssetSurfaceItem[] }) {
  if (!items.length) return null;
  return (
    <aside aria-label="Assets rail" className="border-b border-slate-800/80 bg-[#080b10] px-4 py-1.5 text-xs text-slate-300">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <div className="flex shrink-0 items-center gap-1.5 border-r border-slate-800 pr-3 text-[10px] uppercase tracking-[0.15em] text-orange-300"><Boxes className="h-3.5 w-3.5" /> ASSETS</div>
        <div className="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto py-0.5">
          {items.slice(0, 12).map((item) => <Link key={item.id} href={`/assets/${encodeURIComponent(item.issueNumber)}`} className="group flex shrink-0 items-center gap-2 border border-slate-800/70 bg-[#0c1118] px-2.5 py-1 text-[10px] hover:border-orange-300/60">{item.coverUrl ? <Image src={item.coverUrl} alt="" width={16} height={24} className="h-6 w-4 object-cover" /> : <span className="h-6 w-4 border border-slate-700 bg-slate-900" />}<span className="max-w-[170px] truncate text-slate-300 group-hover:text-orange-200">{item.series}</span><span className="text-slate-600">{item.assetSubclass || item.assetClass || "SURFACE"}</span><span className="text-orange-300">{item.constituentCount} CONSTITUENTS</span></Link>)}
        </div>
      </div>
    </aside>
  );
}