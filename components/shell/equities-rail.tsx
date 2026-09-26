import Link from "next/link";
import Image from "next/image";
import { CandlestickChart } from "lucide-react";
import { ValuationRailItem } from "@/lib/dashboard/queries";

export function EquitiesRail({ items }: { items: ValuationRailItem[] }) {
  return (
    <aside aria-label="Equity index rail" className="border-b border-slate-800/80 bg-[#070a0f] px-4 py-1.5 text-xs text-slate-300">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <div className="flex shrink-0 items-center gap-1.5 border-r border-slate-800 pr-3 text-[10px] uppercase tracking-[0.15em] text-blue-300"><CandlestickChart className="h-3.5 w-3.5" /> EQUITIES / CLEAN PORT</div>
        <div className="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto py-0.5">
          {items.length ? items.slice(0, 12).map((item) => <Link key={item.id} href={`/comics/${item.id}`} className="group flex shrink-0 items-center gap-2 border border-slate-800/70 px-2.5 py-1 text-[10px] hover:border-blue-300/60">{item.coverUrl ? <Image src={item.coverUrl} alt={`${item.series} #${item.issueNumber}`} width={16} height={24} className="h-6 w-4 object-cover" /> : <span className="h-6 w-4 border border-slate-700 bg-slate-900" />}<span className="max-w-[170px] truncate text-slate-300 group-hover:text-blue-200">{item.series}</span><span className="text-slate-600">#{item.issueNumber}</span><span className="text-emerald-300">{item.priceFormatted}</span></Link>) : <span className="border border-blue-900/50 bg-blue-950/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-blue-300">Awaiting verified Clean equity port</span>}
        </div>
      </div>
    </aside>
  );
}