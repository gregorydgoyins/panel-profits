import { redirect } from "next/navigation";
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {createPublicServerClient} from '@/lib/supabase/server';
import {wikiCategories} from '@/lib/wiki/structure';
import {wikiPlainText} from '@/lib/wiki/article-text';
export const dynamic='force-dynamic';
export default async function CategoryPage({params,searchParams}:{params:Promise<{category:string}>;searchParams:Promise<{page?:string;q?:string}>}) {
 const {category}=await params;const match=wikiCategories[category as keyof typeof wikiCategories];if(!match)redirect("/wiki/categories");
 const args=await searchParams;const page=Math.min(10000,Math.max(1,Number.parseInt(args.page || '1',10)||1));const q=(args.q || '').trim().slice(0,120);
 let query=createPublicServerClient().from('ppcf_wiki_pages').select('slug,display_title,universe,page_type').in(match.column,[...match.values]).order('display_title').order('slug').range((page-1)*48,page*48);
 if(q)query=query.ilike('display_title',`%${q.replace(/[%_]/g,'')}%`);
 const {data,error}=await query;if(error)throw new Error('Wiki category could not be read');const rows=data || [];const hasMore=rows.length>48;
 return <main className="wiki-page"><nav className="wiki-breadcrumb"><Link href="/wiki">Wiki</Link><span>/</span><Link href="/wiki/categories">Categories</Link></nav><h1>{match.title}</h1><p className="wiki-lead">Browse the {match.title.toLowerCase()} collection. Each link opens its stored article within Panel Profits Wiki.</p><form className="wiki-search mt-7"><input name="q" defaultValue={q} aria-label={`Search ${match.title}`} placeholder={`Find an article in ${match.title}`}/><button>Find article</button></form><div className="wiki-rule"/><div className="wiki-card-grid">{rows.slice(0,48).map(row=><Link className="wiki-card" key={row.slug} href={`/wiki/entry/${encodeURIComponent(row.slug)}?universe=${encodeURIComponent(row.universe)}`}><span className="wiki-tag">{row.universe.replace(/_/g,' ')} · {row.page_type.toLowerCase()}</span><h3>{wikiPlainText(row.display_title)}</h3></Link>)}</div>{!rows.length && <p className="wiki-lead">No stored articles matched this page or search.</p>}<nav aria-label="Category pages" className="wiki-pagination">{page>1 && <Link href={`?page=${page-1}&q=${encodeURIComponent(q)}`}>← Previous</Link>}<span>Page {page}</span>{hasMore && <Link href={`?page=${page+1}&q=${encodeURIComponent(q)}`}>Next →</Link>}</nav></main>;
}
