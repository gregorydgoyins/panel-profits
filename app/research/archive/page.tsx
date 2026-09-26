import Link from "next/link";
import { Archive, ArrowUpRight, Newspaper } from "lucide-react";
import { getNewsStories } from "@/lib/news/feed";
import { shortNewsSource } from "@/lib/news/feed";

export const dynamic = "force-dynamic";

export default async function NewsArchivePage() {
  const stories = await getNewsStories(60, true);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="border-b border-slate-800 pb-7">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-amber-300"><Archive className="h-3.5 w-3.5" /> Research / Archive</div>
        <h1 className="mt-3 text-3xl text-slate-100 sm:text-4xl">News archive</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Stories leave the active ticker after three days and remain available here as a research record.</p>
      </header>

      <section aria-label="Archived news stories" className="mt-8">
        <div className="mb-3 flex items-center gap-2"><Newspaper className="h-4 w-4 text-amber-300" /><h2 className="text-sm uppercase tracking-[0.16em] text-slate-200">Archived wire</h2><span className="text-[10px] uppercase tracking-[0.14em] text-slate-600">{stories.length} stories</span></div>
        <div className="divide-y divide-slate-800 border-y border-slate-800">
          {stories.map((story) => (
            <a key={story.id} href={story.url} target="_blank" rel="noreferrer" className="group flex items-center justify-between gap-4 px-3 py-4 hover:bg-[#0b0f15]">
              <img src={story.imageUrl || "/newsroom-default.svg"} alt="" className="h-12 w-16 shrink-0 object-cover" /><div className="min-w-0"><div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-slate-600"><span>{shortNewsSource(story.source)}</span></div><p className="mt-1 text-sm text-slate-200 group-hover:text-amber-200">{story.headline}</p></div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-600 group-hover:text-amber-300" />
            </a>
          ))}
          {!stories.length && <p className="px-4 py-12 text-center text-sm text-slate-500">No archived stories are available yet.</p>}
        </div>
      </section>

      <Link href="/research" className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-cyan-300 hover:text-cyan-200">Back to research <ArrowUpRight className="h-3.5 w-3.5" /></Link>
    </main>
  );
}
