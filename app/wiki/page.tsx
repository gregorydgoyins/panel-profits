import Link from "next/link";
import { BookOpen, Search } from "lucide-react";
import { searchPpcfComics } from "@/lib/ppcf/queries";

export const dynamic = "force-dynamic";

export default async function WikiPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const queryText = params.q?.trim() || "";
  const comics = await searchPpcfComics(queryText, 24);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="border-b border-slate-800 pb-7">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-pink-300"><BookOpen className="h-3.5 w-3.5" /> Panel Profits Encyclopedia</div>
        <h1 className="mt-3 text-3xl text-slate-100 sm:text-4xl">The comic knowledge index</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">PPCF is the Panel Profits identity. GCD, Panel Profits, and ComicBase remain visible as provenance behind each record.</p>
      </header>
      <form className="mt-6 flex max-w-xl items-center gap-2 border border-slate-800 bg-[#0b0f15] p-2"><Search className="ml-2 h-4 w-4 text-pink-300" /><input name="q" defaultValue={queryText} placeholder="Search PPCF ID or series" className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600" /><button className="border border-pink-300/60 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-pink-200">Search</button></form>
      <section className="mt-8" aria-label="PPCF encyclopedia results">
        <div className="mb-3 text-[10px] uppercase tracking-[0.18em] text-slate-500">Canonical PPCF records</div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(comics || []).map((comic) => <Link key={comic.ppcf_id} href={`/wiki/${comic.ppcf_id}`} className="border border-slate-800 bg-[#0b0f15] p-4 transition-colors hover:border-pink-300/70 hover:shadow-[0_0_18px_rgba(244,114,182,0.16)]"><div className="flex justify-end"><span className="text-[9px] uppercase tracking-[0.12em] text-slate-600">{comic.identity_status}</span></div><h2 className="mt-3 text-base text-slate-100">{comic.series_name || "Untitled series"} <span className="text-slate-500">#{comic.issue_number || "?"}</span></h2><p className="mt-2 text-xs text-slate-500">{comic.publication_date || "Date unavailable"}{comic.variant_name ? ` · ${comic.variant_name}` : ""}</p></Link>)}
        </div>
        {!comics?.length && <p className="border-y border-slate-800 px-4 py-12 text-center text-sm text-slate-500">No PPCF records matched that search.</p>}
      </section>
    </main>
  );
}
