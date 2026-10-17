import { parse, type HTMLElement } from 'node-html-parser';
import type { RawAuctionListing } from './types';

export const PUBLIC_CATALOGS = {
  comiclink: 'https://www.comiclink.com/auctions/preview.asp?code=2026oct',
  mycomicshop: 'https://www.mycomicshop.com/auctions?agid=829',
  heritage: 'https://comics.ha.com/c/search/results.zx?dept=1938&mode=live&auction_name=47182',
} as const;
export type PublicVenue = keyof typeof PUBLIC_CATALOGS;
export type CatalogLot = RawAuctionListing & {
  auctionEndsAt: string; auctionStartsAt?: string; observedAt: string;
  bidKind: 'current' | 'starting'; shippingKnown: boolean;
};
// Heritage inserts its descriptive condition between the grader and numeric grade.
const slabGrade = /\b(CGC|CBCS|PSA|PGX|EGS)\s+(?:(?:[A-Z][A-Z+\/-]*)(?:\s+[A-Z][A-Z+\/-]*){0,2}\s+)?([0-9]\.[0-9]|10\.0)\b/i;
const compact = (s: string) => s.replace(/\s+/g, ' ').trim();
const blocked = /captcha-delivery\.com|_Incapsula_Resource|incapsula incident|verify (?:that )?you are human|access denied|please enable js and disable any ad blocker/i;
function absolute(href: string, base: string): string | null {
  try { const u = new URL(href, base); return u.protocol === 'https:' && u.hostname === new URL(base).hostname ? u.href : null; } catch { return null; }
}
export function lotId(venue: PublicVenue, url: string): string | null {
  const u = new URL(url);
  if (venue === 'comiclink' && /\/auctions\/item\.asp$/i.test(u.pathname)) return u.searchParams.get('id');
  if (venue === 'mycomicshop' && /^\/search\d?$/i.test(u.pathname)) return [...u.searchParams].find(([k]) => k.toLowerCase() === 'itemid')?.[1] || null;
  if (venue === 'heritage') return u.pathname.match(/\/a\/(\d+-\d+)\.s$/)?.[1] || null;
  return null;
}
/** Convert the site's explicitly stated local wall time, including daylight saving transitions. */
export function auctionTimestamp(value: string, zone?: string): string | null {
  const iso = value.match(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})\b/)?.[0];
  if (iso && Number.isFinite(Date.parse(iso))) return new Date(iso).toISOString();
  const m = value.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)\s*(ET|EST|EDT|CT|CST|CDT)?\b/i);
  if (!m) return null;
  const z = m[8]?.toUpperCase();
  const tz = z?.startsWith('E') ? 'America/New_York' : z?.startsWith('C') ? 'America/Chicago' : zone;
  if (!tz) return null;
  const month=+m[1], day=+m[2], year=+m[3], hour=(+m[4]%12)+(m[7].toUpperCase()==='PM'?12:0), minute=+m[5], second=+(m[6]||0);
  if (+m[4]<1 || +m[4]>12 || month>12 || day>31 || minute>59 || second>59) return null;
  const target=Date.UTC(year,month-1,day,hour,minute,second);
  const validDate=new Date(target);
  if(validDate.getUTCMonth()!==month-1 || validDate.getUTCDate()!==day)return null;
  const fmt=new Intl.DateTimeFormat('en-US',{timeZone:tz,year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric',hourCycle:'h23'});
  let candidate=target;
  for(let i=0;i<3;i++) {
    const p=Object.fromEntries(fmt.formatToParts(candidate).map(p=>[p.type,p.value]));
    const local=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);
    if(local===target) return new Date(candidate).toISOString();
    candidate+=target-local;
  }
  return null;
}
function deadline(node: HTMLElement, text: string, venue: PublicVenue): string | null {
  for (const el of [node,...node.querySelectorAll('[itemprop="endDate"][datetime],[data-end-time],[data-end-date]')]) {
    for(const attr of ['datetime','data-end-time','data-end-date']) {
      const v=el.getAttribute(attr); if(v){const t=auctionTimestamp(v);if(t)return t;}
    }
  }
  const v=text.match(/(?:Ends(?:\s+At)?|End(?:ing)?\s+(?:Date|Time)|Auction\s+Ends|Closing\s+(?:Date|Time))\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)(?:\s*(?:ET|EST|EDT|CT|CST|CDT))?)/i)?.[1];
  // ComicLink explicitly labels the auction catalog ET. Other sites need an explicit zone.
  return v ? auctionTimestamp(v,venue==='comiclink'?'America/New_York':undefined) : null;
}
export function parsePublicCatalog(html: string, url: string, venue: PublicVenue, now=Date.now()) {
  if(blocked.test(html)) throw new Error(`${venue}: public catalog returned a browser security challenge`);
  const root=parse(html); root.querySelectorAll('script,style,noscript').forEach(n=>n.remove());
  const anchors=root.querySelectorAll('a[href]'); const items=new Map<string,CatalogLot>();
  let candidates=0,missingDeadline=0,missingPrice=0;
  for(const a of anchors) {
    const href=absolute(a.getAttribute('href')||'',url); if(!href)continue;
    const id=lotId(venue,href); if(!id || items.has(id))continue;
    let node:HTMLElement|null=a; let chosen:HTMLElement|null=null;
    for(let depth=0;node && depth<12;depth++,node=node.parentNode) {
      const text=compact(node.structuredText); if(text.length>18000)break;
      const ids=new Set(node.querySelectorAll('a[href]').map(n=>absolute(n.getAttribute('href')||'',url)).filter((u):u is string=>!!u).map(u=>lotId(venue,u)).filter(Boolean));
      if(ids.size>1) break;
      if(slabGrade.test(text))chosen=node;
      if(chosen && deadline(node,text,venue) && /(?:Current\s+Bid|Starting\s+Bid|Starts\s+At|High\s+Bid)\s*:/i.test(text)){chosen=node;break;}
    }
    if(!chosen)continue;
    const text=compact(chosen.textContent), grade=text.match(slabGrade);
    if(!grade || +grade[2]<8.5 || /\b(original art|lot of|group lot|restored|qualified|signature series|signed|facsimile|reprint)\b/i.test(text))continue;
    candidates++;
    const end=deadline(chosen,text,venue); if(!end){missingDeadline++;continue;}
    if(Date.parse(end)<=now)continue;
    const current=text.match(/(?:Current\s+Bid|High\s+Bid)\s*:\s*\$([\d,]+(?:\.\d{2})?)/i);
    const starting=text.match(/(?:Starting\s+Bid|Starts\s+At)\s*:\s*\$([\d,]+(?:\.\d{2})?)/i);
    const price=current||starting; if(!price){missingPrice++;continue;}
    const heading=chosen.querySelector('h1,h2,h3,h4');
    const rawTitle=compact((a.textContent.includes('#') || slabGrade.test(a.textContent) ? a.textContent : heading?.textContent)||'');
    const title=venue==='mycomicshop' ? rawTitle.replace(/(\))\s+(\d+[A-Za-z]?)\s+(?=CGC|CBCS|PSA|PGX|EGS)/i,'$1 #$2 ') : rawTitle;
    if(!/#\s*\d/.test(title))continue;
    const year=text.match(/\b((?:19|20)\d{2})\s*[,)]/)?.[1] || title.match(/\(((?:19|20)\d{2})\b/)?.[1];
    const fullTitle=`${title}${/\b(?:CGC|CBCS|PSA|PGX|EGS)\s+[0-9]/i.test(title)?'':` ${grade[1].toUpperCase()} ${grade[2]}`}${year && !title.includes(year)?` (${year})`:''}`;
    const image=chosen.querySelector('img'); const src=image?.getAttribute('data-src')||image?.getAttribute('src');
    const starts=text.match(/Starts(?:\s+At)?\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)(?:\s*ET)?)/i)?.[1];
    const startsAt=starts?auctionTimestamp(starts,'America/New_York'):null;
    if(!current && (!startsAt || Date.parse(startsAt)<=now)){missingPrice++;continue;}
    const seconds=Math.max(0,Math.floor((Date.parse(end)-now)/1000));
    items.set(id,{id:`${venue}-${id}`,source:venue,title:fullTitle,year:year?+year:undefined,currentBid:Number(price[1].replace(/,/g,'')),originalBid:Number(price[1].replace(/,/g,'')),bidKind:current?'current':'starting',
      shippingCost:0,shippingKnown:false,bidCount:Number(text.match(/(?:Bid\s+Count|Number\s+Of\s+Bids)\s*:\s*(\d+)/i)?.[1]||0),secondsRemaining:seconds,timeLeftStr:`${Math.floor(seconds/86400)}d ${Math.floor(seconds%86400/3600)}h ${Math.floor(seconds%3600/60)}m`,
      auctionEndsAt:end,auctionStartsAt:startsAt||undefined,observedAt:new Date(now).toISOString(),
      url:href,imageUrl:src?new URL(src,url).href:'',isBuyItNow:false,listingType:'Auction',currency:'USD',internationalRegion:'US',resolvedGrade:+grade[2],gradingCompany:grade[1].toUpperCase() as CatalogLot['gradingCompany']});
  }
  const next=anchors.find(a=>a.getAttribute('rel')==='next'||/^(?:next(?:\s+page)?|next\s*[»›>]|[»›])$/i.test(compact(a.textContent)) || /next page/i.test(a.getAttribute('title')||a.getAttribute('aria-label')||''));
  const nextUrl=next?absolute(next.getAttribute('href')||'',url):null;
  if(nextUrl && !sameCatalog(nextUrl,venue,url))throw new Error(`${venue}: pagination left the requested auction`);
  const text=compact(root.structuredText);
  const empty=/\b(?:no (?:items|lots|results|auctions) (?:found|available)|auction (?:has )?(?:closed|ended))\b/i.test(text);
  if(!candidates && !empty && !anchors.some(a=>{const u=absolute(a.getAttribute('href')||'',url);return u&&lotId(venue,u);}))throw new Error(`${venue}: catalog structure unrecognized; no lot links found`);
  return {items:[...items.values()],nextUrl,candidates,missingDeadline,missingPrice};
}
export function sameCatalog(url:string,venue:PublicVenue,seed=PUBLIC_CATALOGS[venue] as string) {
  const a=new URL(url),b=new URL(seed); const key=venue==='comiclink'?'code':venue==='mycomicshop'?'agid':'auction_name';
  return a.protocol==='https:' && a.hostname===b.hostname && a.pathname.toLowerCase()===b.pathname.toLowerCase() && a.searchParams.get(key)===b.searchParams.get(key);
}
export type CatalogTransport=(url:string)=>Promise<{html:string;observedAt:number}>;
export const fetchPublicHtml:CatalogTransport=async url=>{
  const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(20000),headers:{Accept:'text/html','User-Agent':'PanelProfitsResearch/2.0 (+https://comicbookstockexchange.com)'}});
  if(!r.ok)throw new Error(`Public catalog HTTP ${r.status}`);
  return {html:await r.text(),observedAt:Date.now()};
};
/** Follow links actually published by the source; never invent page offsets or deadlines. */
export async function collectPublicCatalog(venue:PublicVenue,opts:{transport?:CatalogTransport;startUrl?:string;maxPages?:number;deadlineMs?:number;onPage?:(page:ReturnType<typeof parsePublicCatalog>,url:string)=>Promise<void>}={}) {
  let url:string|null=opts.startUrl||PUBLIC_CATALOGS[venue];const visited=new Set<string>();let pages=0;const items=new Map<string,CatalogLot>();
  while(url && pages<(opts.maxPages??500)) {
    if(opts.deadlineMs && Date.now()>opts.deadlineMs)break;
    if(!sameCatalog(url,venue))throw new Error('Catalog URL outside configured auction');
    if(visited.has(url))throw new Error(`${venue}: pagination loop at ${url}`);visited.add(url);
    const response=await(opts.transport||fetchPublicHtml)(url),page=parsePublicCatalog(response.html,url,venue,response.observedAt);
    for(const item of page.items)items.set(item.id,item);
    await opts.onPage?.(page,url);pages++;url=page.nextUrl;
  }
  return {items:[...items.values()],pages,nextUrl:url,complete:url===null};
}
