import { ArrowLeft, Newspaper } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getNewsStory, shortNewsSource } from "@/lib/news/feed";
import { findNewsEntities } from "@/lib/news/entities";
import { NewsBriefing } from "@/components/news/news-briefing";
import { NewsAnchor } from "@/components/news/news-anchor";

export const dynamic = "force-dynamic";

export default async function NewsStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const story = await getNewsStory(id);
  if (!story) redirect("/news");

  const relatedEntities = findNewsEntities(story.headline, story.summary);
  const hasEditorialImage = Boolean(story.imageUrl && !story.imageUrl.includes("google.com/s2/favicons"));
  const hasPublisherMark = Boolean(story.imageUrl?.includes("google.com/s2/favicons"));

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
      <Link href="/news" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-cyan-300 hover:text-cyan-200"><ArrowLeft className="h-3.5 w-3.5" /> Back to newsroom</Link>
      <article className="mt-6 overflow-hidden border border-amber-300/90 bg-[#0b0f15] shadow-[0_0_38px_rgba(251,191,36,0.26)]">
        {hasEditorialImage && <img src={story.imageUrl!} alt={`${story.source} story image`} className="max-h-[420px] w-full object-cover" />}
        {!hasEditorialImage && hasPublisherMark && <div className="flex min-h-40 items-center gap-5 border-b border-amber-900/50 bg-[#121722] px-6 py-8 sm:px-10"><img src={story.imageUrl!} alt={`${story.source} publisher mark`} className="h-16 w-16 object-contain" /><div><p className="text-[10px] uppercase tracking-[0.18em] text-amber-300">Publisher mark</p><p className="mt-2 text-sm text-slate-300">{story.source}</p><p className="mt-1 text-xs text-slate-500">Source attribution remains inside the Panel Profits reading frame.</p></div></div>}
        <div className="p-6 sm:p-10">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-amber-300"><Newspaper className="h-3.5 w-3.5" /> {shortNewsSource(story.source)}</div>
          <h1 className="mt-4 text-3xl leading-tight text-slate-100 sm:text-4xl">{story.headline}</h1>
          <div className="mt-6">
            <NewsAnchor headline={story.headline} summary={story.summary} source={story.source} />
          </div>
          <NewsBriefing headline={story.headline} summary={story.summary} source={story.source} sourceUrl={story.url} author={story.author} publishedAt={story.publishedAt} terms={relatedEntities} />
          {relatedEntities.length > 0 && <section className="mt-8 border-t border-slate-800 pt-5"><p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Related entity search terms</p><p className="mt-2 text-xs leading-5 text-slate-500">Clicking a term queries the catalog knowledge index (`/wiki?q=...`) to resolve matching PPCF entities and canonical issues.</p></section>}
          <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-slate-800 pt-5"><span className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Source attribution: {story.source}</span><span className="text-xs text-slate-500">Publisher URL retained in the story record.</span></div>
        </div>
      </article>
    </main>
  );
}
