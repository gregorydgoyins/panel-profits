"use client";
import {FinancialText} from "./FinancialText";
import type { ResearchLoad } from "./useLotResearch";
import type { StorySummary } from "@/lib/comics/story-summary";
import type { ListingWriteup } from "@/lib/sniper/listing-writeup";

type Props = { research: ResearchLoad; series: string; issueNumber: string; grader?: string; grade?: number };
function Refs({ refs, sources }: { refs?: number[]; sources: ListingWriteup["sources"] }) {
  return <>{(refs ?? []).map(n => sources[n] ? <a key={n} href={sources[n].uri} target="_blank" rel="noopener noreferrer" title={`Research reference ${n + 1}`} className="ml-1 align-super text-[10px] text-cyan-300 hover:underline">[{n + 1}]</a> : null)}</>;
}
function LinkedSynopsis({ story }: { story: StorySummary }) {
  const links = new Map(Object.values(story.entities ?? {}).flatMap(entries => entries ?? []).map(entity => [entity.label, entity.url]));
  if (!links.size) return <>{story.text}</>;
  const names = [...links.keys()].sort((a,b) => b.length-a.length).map(name => name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));
  return <>{story.text.split(new RegExp(`(${names.join("|")})`,"g")).map((part,i) => links.has(part) ? <a key={i} href={links.get(part)} className="text-cyan-300 underline underline-offset-4">{part}</a> : part)}</>;
}
export function SniperListingResearch(p: Props) {
  const {data,loading,error,retry}=p.research;
  const localResearch=data?.localResearch;
  const story=data?.story;
  const writeup=data?.writeup;
  const dossier = localResearch?.ppcfId ? `/wiki/${localResearch.ppcfId}` : `/comics?q=${encodeURIComponent(`${p.series} #${p.issueNumber}`)}`;
  const characters = [...(story?.entities?.featuredCharacters || []),...(story?.entities?.antagonists || []),...(story?.entities?.otherCharacters || [])].filter((e,i,a)=>a.findIndex(other=>other.url===e.url)===i).slice(0,3);
  const publicationDate = localResearch?.prices.find(price=>price.publicationDate)?.publicationDate;
  return <section className="space-y-5 text-sm text-slate-300 leading-6">
    {loading && <p role="status" className="text-xs text-cyan-300">Reading this issue’s research…</p>}
    {error && <p role="alert" className="text-xs text-amber-300">{error} <button onClick={retry} className="underline">Retry research</button></p>}
    {writeup && <section className="space-y-3"><h3 className="text-lg font-semibold text-emerald-300">{writeup.investment.heading}</h3><p className="text-xs text-slate-500">Panel Profits analysis · {writeup.edition}{Number.isFinite(Date.parse(writeup.writtenAt)) && <> · Evidence as of {new Date(writeup.writtenAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"})}</>}</p>{writeup.investment.points.map((point,i)=><div key={i}><h4 className="font-semibold text-white">{point.label}</h4><p><FinancialText text={point.text}/><Refs refs={point.refs} sources={writeup.sources}/></p></div>)}</section>}
    {!!writeup?.learning?.length && <nav aria-label="Financial concepts in this research" className="flex flex-wrap gap-3 text-xs">{writeup.learning.map(term=><a key={term.url} href={term.url.replace("/lexicon/","/wiki/terms/")} title={term.definition} className="text-cyan-300 underline">{term.term}</a>)}</nav>}
    {localResearch && <section className="space-y-3 border-t border-slate-800 pt-4">
      <h3 className="font-semibold text-white">Price comparisons &amp; graded population</h3>
      <p className="text-xs text-slate-400">This lot: {p.grader || "grader unverified"} {p.grade?.toFixed(1) || "grade unverified"}. A guide for another grade is context, not this slab’s selling price.</p>
      {publicationDate && <p className="text-xs text-slate-400">Publication date: {new Date(`${publicationDate.slice(0,10)}T12:00:00Z`).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric",timeZone:"UTC"})}. Price observation date is not established by publication.</p>}
      {localResearch.prices.length>0 && <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-slate-400"><tr><th className="py-2 pr-3">Grade / basis</th><th className="pr-3">Value</th><th>Evidence</th></tr></thead><tbody>{localResearch.prices.map((price,i)=><tr key={`${price.source}-${i}`} className="border-t border-slate-800"><td className="py-3 pr-3">{price.basis?.startsWith("ComicBase") ? "Catalog reference" : price.grade}</td><td className="pr-3 whitespace-nowrap">{price.amount.toLocaleString("en-US",{style:"currency",currency:price.currency || "USD"})}</td><td className="py-3"><a href={price.url} className="text-cyan-300 underline">{price.source}</a><span className="block text-slate-400">{price.basis || (price.kind==="sale" ? "Recorded completed sale" : "Guide reference; not a completed sale")}</span><span className="block text-slate-500">{price.observedAt ? `Observed ${price.observedAt.slice(0,10)}` : "Price observation date unavailable"}</span></td></tr>)}</tbody></table></div>}
      {localResearch.census && <p>Recorded graded population: <strong>{localResearch.census.total.toLocaleString()}</strong> across label types{localResearch.census.atGrade!=null ? ` · ${localResearch.census.atGrade.toLocaleString()} at this grade` : ""}. {localResearch.census.title} #{localResearch.census.issue} ({localResearch.census.year}). Population alone does not prove demand.</p>}
    </section>}
    {(writeup || story) && <section className="space-y-3 border-t border-slate-800 pt-4"><h3 className="text-lg font-semibold text-white">Story: {story?.storyTitle || p.series}</h3>{writeup ? <><p>{writeup.synopsis.intro}</p>{writeup.synopsis.points.map((point,i)=><p key={i}><strong className="text-white">{point.label}. </strong><FinancialText text={point.text}/><Refs refs={point.refs} sources={writeup.sources}/></p>)}</> : story && <p className="whitespace-pre-line"><LinkedSynopsis story={story}/></p>}
      <div className="flex flex-wrap gap-2">{characters.map(entity=><a key={entity.url} href={entity.url} className="rounded border border-slate-700 px-2 text-xs text-cyan-300">{entity.label}</a>)}</div>
      <a href={dossier} className="text-xs text-cyan-300 underline">Panel Profits Wiki · issue dossier ↗</a>
      {story && <details className="text-xs text-slate-500"><summary className="cursor-pointer">Underlying story reference &amp; attribution</summary><a href={story.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline">Original text reference · {story.license || "Source reference"}</a></details>}
    </section>}
    {!loading && !writeup && !story && <p className="text-xs text-slate-400">No issue-specific narrative is available in the stored research.</p>}
    <nav aria-label="Research learning links" className="flex flex-wrap gap-3 border-t border-slate-800 pt-4 text-xs"><a href="/learn#sniper-practice" className="text-cyan-300 underline">Practice syllabus</a><a href="/wiki/terms" className="text-cyan-300 underline">Financial dictionary</a></nav>
  </section>;
}
