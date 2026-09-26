import Link from "next/link";
import type { PpcfComicRecord } from "@/lib/ppcf/queries";

export function PpcfCard({ comic }: { comic: PpcfComicRecord }) {
  return (
    <Link
      href={`/wiki/${comic.ppcf_id}`}
      className="group flex min-h-[170px] flex-col justify-between border border-slate-800 bg-[#0b0f15] p-4 transition-all hover:border-pink-300/70 hover:shadow-[0_0_20px_rgba(244,114,182,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[9px] text-slate-500 group-hover:text-pink-300 transition-colors">
            {comic.ppcf_id}
          </span>
          <span className="text-[9px] uppercase tracking-[0.12em] text-slate-600 border border-slate-800/80 px-1.5 py-0.5 rounded">
            {comic.identity_status}
          </span>
        </div>
        <h2 className="mt-3 text-sm font-medium leading-snug text-slate-100 group-hover:text-pink-100 transition-colors">
          {comic.series_name || "Untitled Series"}{" "}
          <span className="text-slate-400">#{comic.issue_number || "?"}</span>
        </h2>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
          {comic.issue_title || comic.variant_name || "Canonical edition record"}
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-800/60 pt-2.5 text-[10px] uppercase tracking-[0.12em] text-slate-500">
        <span>{comic.publication_date || "Publication Date Unavailable"}</span>
        <span className="text-pink-300 font-medium group-hover:underline">Open PPedia</span>
      </div>
    </Link>
  );
}
