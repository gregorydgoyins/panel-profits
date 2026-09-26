import Link from "next/link";
import { BookOpen, Search } from "lucide-react";
import { PpcfCard } from "@/components/ppcf/ppcf-card";
import { searchPpcfComics } from "@/lib/ppcf/queries";

export const dynamic = "force-dynamic";

export default async function ComicsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const query = params.q?.trim() || "";
  const comics = await searchPpcfComics(query, 48);

  return <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10"><header className="border-b border-pink-300/60 pb-7 shadow-[0_4px_22px_rgba(244,114,182,0.1)]"><div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-pink-300"><BookOpen className="h-3.5 w-3.5" /> PPCF catalog</div><h1 className="mt-3 text-3xl text-slate-100 sm:text-4xl">Explore the Panel Profits encyclopedia</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Every result is a new PPCF identity. Source IDs remain provenance, while editions, variants, covers, relationships, and pricing attach to the PPedia record.</p></header><form className="mt-6 flex max-w-xl items-center gap-2 border border-slate-800 bg-[#0b0f15] p-2"><Search className="ml-2 h-4 w-4 text-pink-300" /><input name="q" defaultValue={query} placeholder="Search series, issue, or PPCF ID" className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600" /><button className="border border-pink-300/60 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-pink-200">Search</button></form><div className="mt-8 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-slate-600"><span>{query ? `Results for ${query}` : "Latest PPCF records"}</span><Link href="/wiki" className="text-pink-300 hover:text-pink-200">Open encyclopedia index</Link></div>{comics.length ? <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{comics.map((comic) => <PpcfCard key={comic.ppcf_id} comic={comic} />)}</div> : <div className="mt-3 border-y border-slate-800 px-4 py-16 text-center text-sm text-slate-500">No PPCF records matched that search.</div>}</main>;
}
