import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ImageOff } from "lucide-react";
import { displayIssue, displaySeries } from "@/lib/comics/display";

type Asset = { id: string; series: string; issue_number: string | null; publisher: string | null; index_value: number | null; source: string | null; cover: { image_url: string | null; storage_path: string | null } | null };

export function AssetCard({ asset }: { asset: Asset }) {
  const series = displaySeries(asset.series, asset.issue_number);
  const issue = displayIssue(asset.issue_number);
  const coverUrl = asset.cover?.image_url || (asset.cover?.storage_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${asset.cover.storage_path}` : null);
  return <Link href={`/comics/${asset.id}`} className="group grid grid-cols-[88px_1fr] gap-4 border border-slate-800 bg-[#0b0f15] p-3 transition-colors hover:border-orange-300/70"><div className="relative aspect-[2/3] overflow-hidden border border-slate-800 bg-[#07090d]">{coverUrl ? <Image src={coverUrl} alt={`${series} ${issue}`} fill sizes="88px" className="object-cover transition-transform duration-300 group-hover:scale-105"/> : <div className="flex h-full flex-col items-center justify-center gap-2 p-2 text-center text-slate-600"><ImageOff className="h-5 w-5"/><span className="text-[9px] uppercase tracking-[0.12em]">Cover unavailable</span></div>}</div><div className="min-w-0 py-1"><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] uppercase tracking-[0.16em] text-orange-300">Asset / {asset.source || "Clean"}</p><h2 className="mt-2 line-clamp-2 text-base text-slate-100 group-hover:text-orange-200">{series} <span className="text-slate-500">{issue}</span></h2></div><ArrowUpRight className="h-4 w-4 shrink-0 text-slate-600 group-hover:text-orange-200"/></div><p className="mt-3 text-xs text-slate-500">{asset.publisher || "Publisher unlisted"}</p><div className="mt-8 border-t border-slate-800 pt-3"><p className="text-[10px] uppercase tracking-[0.16em] text-slate-600">Market index</p><p className="mt-1 text-sm text-emerald-300">{asset.index_value == null ? "Unpriced" : `$${Number(asset.index_value).toFixed(2)}`}</p></div></div></Link>;
}
