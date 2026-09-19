import Link from "next/link";
import { ArrowUpRight, BookOpen, Layers3, Search } from "lucide-react";
import { getCurrentUser, getUserCollections, getUserAllCollectionItems, getWatchlistItems } from "@/lib/account/queries";
import { calculateHoldingsSummary } from "@/lib/account/calculations";
import { getFeaturedUniverseComics } from "@/lib/dashboard/queries";
import { ComicCover } from "@/components/comics/comic-cover";
import { CatalogEntrySurface } from "@/components/dashboard/catalog-entry-surface";
import { AuthenticatedSnapshot } from "@/components/dashboard/authenticated-snapshot";

export const dynamic = "force-dynamic";

function money(value: number | string | null | undefined) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount)
    : null;
}

export default async function DashboardPage() {
  const [user, comics] = await Promise.all([getCurrentUser(), getFeaturedUniverseComics(18)]);
  const featured = comics[0];
  const grades = featured?.panel_profits_data;
  let snapshot = null;
  if (user) {
    const [collections, items, watchlist] = await Promise.all([
      getUserCollections(), getUserAllCollectionItems(), getWatchlistItems({ limit: 8 }),
    ]);
    snapshot = <AuthenticatedSnapshot user={user} collections={collections} recentItems={items}
      watchlistItems={watchlist.items} watchlistCount={watchlist.totalCount}
      holdingsSummary={calculateHoldingsSummary(items)} />;
  }

  return <div className="mx-auto max-w-7xl space-y-8 px-4 pb-20 pt-8 sm:px-6 lg:px-8">
    {snapshot}
    <header className="border-b border-slate-700/70 pb-7 sm:flex sm:items-end sm:justify-between">
      <div>
        <p className="mb-3 text-[11px] uppercase tracking-[.3em] text-amber-400">Panel Profits / The market desk</p>
        <h1 className="text-4xl font-light leading-[1.12] tracking-tight text-[#F4F4F2] sm:text-6xl">Every book has a story.<br /><span className="text-slate-400">Follow its evidence.</span></h1>
      </div>
      <Link href="/comics" className="mt-6 inline-flex items-center gap-2 border-b border-amber-500/60 pb-1 text-sm text-amber-300 hover:text-amber-100 sm:mt-0">Explore the comic universe <ArrowUpRight size={16} /></Link>
    </header>

    {featured && <section aria-label="Featured comic record" className="grid overflow-hidden rounded-xl border border-slate-700/70 bg-[#11151D] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col justify-between gap-12 p-6 sm:p-10">
        <div>
          <p className="mb-6 text-[11px] uppercase tracking-[.25em] text-amber-400">From the verified cover collection</p>
          <h2 className="max-w-2xl text-4xl font-light leading-tight text-white sm:text-5xl">{featured.series} <span className="text-amber-400">#{featured.issue_number}</span></h2>
          <p className="mt-3 text-sm text-slate-300">{[featured.publisher, featured.publication_year, featured.cover_variant].filter(Boolean).join(" · ")}</p>
          {featured.title && featured.title !== featured.series && <p className="mt-2 text-sm text-slate-400">{featured.title}</p>}
        </div>
        <div>
          <div className="grid max-w-xl gap-3 border-t border-slate-700/70 pt-5 sm:grid-cols-2">
            <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Panel Profits · grade 9.8 price</p><p className="mt-1 text-2xl text-white">{money(featured.pp_grade_9_8_price) ?? "No price recorded"}</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-slate-400">ComicBase · source price</p><p className="mt-1 text-2xl text-white">{money(featured.comicbase_price) ?? "No price recorded"}</p></div>
          </div>
          {grades && <div className="mt-6 grid grid-cols-4 gap-2 border-t border-slate-700/70 pt-5" aria-label="Panel Profits grade prices">
            {(["9.4", "9.6", "9.8", "10.0"] as const).map(grade => <div key={grade}>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">PP grade {grade}</p>
              <p className="mt-1 text-sm tabular-nums text-amber-200 sm:text-base">{money(grades[`PP - Grade ${grade} Market Price`]) ?? "—"}</p>
            </div>)}
          </div>}
          <p className="mt-4 max-w-lg text-xs leading-relaxed text-slate-400">These are separate source prices for the comic record. They are not live trades or offers.</p>
          <p className="mt-2 text-xs text-slate-500">Source links: Panel Profits {featured.pp_source_id ? "connected" : "unlinked"} · ComicBase {featured.comicbase_source_id ? "connected" : "unlinked"} · GCD {featured.gcd_source_id ? "connected" : "unlinked"}</p>
          <Link href={`/comics/${featured.id}`} className="mt-6 inline-flex items-center gap-2 rounded-md bg-amber-500 px-5 py-3 text-sm font-medium text-[#14100A] hover:bg-amber-400">Open the full record <ArrowUpRight size={16} /></Link>
        </div>
      </div>
      <Link href={`/comics/${featured.id}`} className="flex min-h-[360px] items-center justify-center bg-[#080A0F] p-6" aria-label={`View ${featured.series} issue ${featured.issue_number}`}>
        <div className="w-full max-w-[250px] shadow-[0_28px_70px_rgba(0,0,0,.65)]"><ComicCover coverUrl={featured.cover_url} storagePath={featured.cover_storage_path} series={featured.series} issueNumber={featured.issue_number} publisher={featured.publisher} size="lg" /></div>
      </Link>
    </section>}

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
      <section className="rounded-xl border border-slate-700/70 bg-[#0D1017] p-5 sm:p-7">
        <div className="mb-5 flex items-center justify-between border-b border-slate-800 pb-4"><h2 className="text-lg text-white">Continue exploring</h2><Link href="/comics" className="text-xs text-amber-400 hover:text-amber-200">All comics →</Link></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{comics.slice(1, 7).map(comic => <Link key={comic.id} href={`/comics/${comic.id}`} className="group min-w-0 rounded-lg border border-slate-800 bg-[#141821] p-3 hover:border-amber-500/70">
          <div className="mx-auto mb-3 max-w-[115px]"><ComicCover coverUrl={comic.cover_url} storagePath={comic.cover_storage_path} series={comic.series} issueNumber={comic.issue_number} publisher={comic.publisher} size="md" /></div>
          <p className="truncate text-sm text-slate-100 group-hover:text-amber-300">{comic.series}</p><p className="mt-1 text-xs text-slate-400">#{comic.issue_number}{comic.publication_year ? ` · ${comic.publication_year}` : ""}</p>
        </Link>)}</div>
      </section>
      <section className="rounded-xl border border-slate-700/70 bg-[#0D1017] p-5 sm:p-7">
        <p className="mb-5 text-[11px] uppercase tracking-[.2em] text-amber-400">The research path</p>
        <div className="space-y-5">
          <Link href="/comics" className="group flex gap-4 border-b border-slate-800 pb-5"><Search className="mt-1 shrink-0 text-amber-400" size={21} /><span><strong className="block font-normal text-white group-hover:text-amber-300">Find the exact edition</strong><span className="mt-1 block text-sm text-slate-400">Search the series, issue, year, and variant together.</span></span></Link>
          {featured && <Link href={`/comics/${featured.id}`} className="group flex gap-4 border-b border-slate-800 pb-5"><BookOpen className="mt-1 shrink-0 text-amber-400" size={21} /><span><strong className="block font-normal text-white group-hover:text-amber-300">Read the source record</strong><span className="mt-1 block text-sm text-slate-400">Trace its identity, cover, and separate price evidence.</span></span></Link>}
          <Link href="/collection" className="group flex gap-4"><Layers3 className="mt-1 shrink-0 text-amber-400" size={21} /><span><strong className="block font-normal text-white group-hover:text-amber-300">Build your collection</strong><span className="mt-1 block text-sm text-slate-400">Keep the books you own connected to their records.</span></span></Link>
        </div>
      </section>
    </div>
    <CatalogEntrySurface />
  </div>;
}
