import Link from "next/link";
import type { PpcfComicRecord } from "@/lib/ppcf/queries";

export function PpcfCard({ comic }: { comic: PpcfComicRecord }) {
  return <Link href={`/wiki/${comic.ppcf_id}`} className="group flex min-h-44 flex-col justify-between border border-slate-800 bg-[#0b0f15] p-4 transition-all hover:border-pink-300/70 hover:shadow-[0_0_20px_rgba(244,114,182,0.16)]"><div><div className="flex justify-end"><span className="text-[9px] uppercase tracking-[0.12em] text-slate-600">{comic.identity_status}</span></div><h2 className="mt-4 text-sm leading-5 text-slate-100 group-hover:text-pink-100">{comic.series_name || "Untitled series"} <span className="text-slate-500">#{comic.issue_number || "?"}</span></h2><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{comic.issue_title || comic.variant_name || "Canonical edition record"}</p></div><div className="mt-5 flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-slate-600"><span>{comic.publication_date || "Date unavailable"}</span><span className="text-pink-300">Open PPedia</span></div></Link>;
}
