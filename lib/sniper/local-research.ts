import {hasNarrativeText} from '@/lib/comics/narrative-text';
import {usdCoverPrice} from "./eligibility";
import {guideHistory,type GuideSnapshot} from "./guide-history";
import { createAdminServerClient } from "@/lib/supabase/admin";
import { panelProfitsGrades } from "@/lib/pricing/source-ladder";
import type { ComicRecord } from "@/lib/comics/types";
import type { StorySummary } from "@/lib/comics/story-summary";
import { writeupSchema, type ListingWriteup } from "./writeup-schema";
import { exactStoredEdition, storedPrices, type EditionRow, type PriceObservation } from "./stored-market-evidence";
import { matchCompletedComicSale } from "./completed-sale-match";
import { dedupeSales, type SaleObs } from "./candles";
import type { EbayHistoryResult } from "./ebay-history";
import type { GradeCensus } from "./census-population";
import type { LotResearch, LocalLotResearch } from "./research-types";
import type { SniperVideo } from "./videos";
export type { LocalLotResearch } from "./research-types";
const normalize=(value:string|null|undefined)=>(value || "").toLowerCase().replace(/[^a-z0-9]/g,"");
export function matchingLocalComic(rows:ComicRecord[],edition:string|null):ComicRecord|null {
  if(rows.length>=50) return null;
  const matches=rows.filter(row=>normalize(row.cover_variant)===normalize(edition)
    && (!row.printing || /^(?:1|1st|first)$/i.test(row.printing.trim()))
    && (edition || !row.direct_or_variant || /^(?:direct|standard|regular|base)$/i.test(row.direct_or_variant.trim())));
  return matches.length===1?matches[0]:null;
}
interface CensusRow { title:string; issue_number:string; year?:number; series_year?:number; publisher?:string; total:number; pop?:Record<string,number>; grades?:Record<string,number> }
export interface LotEvidence {
  identity:LotResearch["identity"] & {label?:{title?:string;issueDate?:string;publisher?:string}};
  editions:EditionRow[]; comics:ComicRecord[]; observations:PriceObservation[];
  story:{summary:string|null;source:string;source_url:string;license:string|null}|null;
  authored:{content:ListingWriteup|null;failed_at:string|null;written_at:string|null}|null;
  census:CensusRow[]; gocollect:Array<{slug:string;grader:string;label_type:string;grade:string;last_sold_price:number|null;last_sold_date:string|null}>;
  videoSets:SniperVideo[][];
  sales:Array<{item_id:string|null;sold_at:string;price_usd:number;grade:number|null;grader:string;venue:string;source:string;url:string|null;edition?:string|null;publication_year?:number|null}>;
  guideSnapshots?:GuideSnapshot[];
  history:EbayHistoryResult|null;
}
function storyFrom(row:LotEvidence["story"]):StorySummary|null {
  if(!row?.summary) return null;
  try {const parsed=JSON.parse(row.summary);if(!hasNarrativeText(parsed.text) || /(?:^|\n)\s*\|\s*\w+\s*=/.test(parsed.text)) return null;return {...parsed,source:row.source,sourceUrl:row.source_url,license:row.license};}catch{return null;}
}
function censusFrom(rows:CensusRow[],identity:LotResearch["identity"]):GradeCensus|null {
  const exact=rows.filter(row=>identity.grader==="PSA" ? (!identity.year || (row.series_year!=null && row.series_year<=identity.year)) : row.year===identity.year);
  if(exact.length!==1) return null;
  const row=exact[0];const byGrade:Record<string,number>={};
  for(const [key,count] of Object.entries(row.pop || row.grades || {})){const label=key.replace("_",".");if(/^\d+(?:\.\d+)?$/.test(label)) byGrade[Number(label).toFixed(1)]=Number(count);}
  const grade=identity.grade;const entries=Object.entries(byGrade);
  return {title:row.title,issue:row.issue_number,year:row.year || row.series_year || null,total:row.total,byGrade,...(grade!=null && entries.length>0?{...(byGrade[grade.toFixed(1)]!=null?{atGrade:byGrade[grade.toFixed(1)]}:{}),higher:entries.filter(([g])=>Number(g)>grade).reduce((n,[,v])=>n+v,0),lower:entries.filter(([g])=>Number(g)<grade).reduce((n,[,v])=>n+v,0),atOrAbove:entries.filter(([g])=>Number(g)>=grade).reduce((n,[,v])=>n+v,0)}:{})};
}
/** Pure assembly of original source rows. No cache, hydration, remote research or generated prices. */
export function assembleLotResearch(raw:LotEvidence):LotResearch {
  const {label,...identity}=raw.identity;identity.grade=identity.grade==null?null:Number(identity.grade);
  const editionUnknown=!label?.title && !identity.edition && /\bvariant|virgin|exclusive|incentive|newsstand|reprint|second print|third print|cover [b-z]\b/i.test(identity.title);
  const exactCase=raw.editions.filter(row=>row.series_name===identity.series);
  let comic=!editionUnknown?matchingLocalComic(raw.comics.filter(row=>row.series===identity.series),identity.edition) || matchingLocalComic(raw.comics,identity.edition):null;
  if(!comic && /^(?:variant|variant edition)$/i.test(identity.edition || '')){
    const title=normalize(identity.title);
    const covers=raw.comics.filter(row=>row.cover_variant && row.panel_profits_data?.['PP Source ID'] && normalize(row.cover_variant).length>=5 && title.includes(normalize(row.cover_variant)));
    if(covers.length===1){comic=covers[0];identity.edition=comic.cover_variant;}
  }
  const marketYear=comic?.publication_year || identity.year;
  const sourceId=comic?.panel_profits_data?.["PP Source ID"] || comic?.panel_profits_data?.["PriceCharting ID"];
  const linkedIds=new Set(raw.observations.filter(r=>sourceId && r.source_system==="PANEL_PROFITS" && String(r.source_record_id)===String(sourceId)).map(r=>r.ppcf_id));
  const linked=raw.editions.filter(r=>linkedIds.has(r.ppcf_id) && r.publication_date?.match(/\b(?:18|19|20)\d{2}\b/)?.[0]===String(marketYear));
  const edition=identity.year && !editionUnknown?(exactStoredEdition(exactCase.length?exactCase:raw.editions,marketYear!,identity.edition) || (linked.length===1?linked[0]:null)):null;
  const prices=storedPrices(raw.observations,edition);
  for(const [grade,amount] of Object.entries(comic?panelProfitsGrades({...comic,panel_profits_data:comic.panel_profits_data || {}}):{})) {
    if(!amount || prices.some(p=>p.grade===grade && p.source.startsWith("PriceCharting") && sourceId)) continue;
    prices.push({grade,amount,source:sourceId?`PriceCharting #${sourceId} via Panel Profits · stored guide`:"Panel Profits · stored guide",basis:"Stored grade-specific guide estimate; observation date unavailable",kind:"guide",currency:"USD",url:`/comics/${encodeURIComponent(comic!.id)}`});
  }
  if(!editionUnknown && !identity.edition && new Set(raw.gocollect.map(row=>row.slug)).size===1) {
    const row=raw.gocollect[0];if(row?.last_sold_price && row.last_sold_date) prices.push({grade:row.grade,amount:Number(row.last_sold_price),source:`GoCollect · ${row.grader} ${row.label_type} last sale`,url:edition?`/wiki/${edition.ppcf_id}`:"https://gocollect.com/comics",observedAt:row.last_sold_date,currency:"USD",kind:"sale",basis:"Provider-reported last completed sale"});
  }
  const guidePoints=guideHistory(raw.guideSnapshots || [],comic);
  const latestGuides=new Map<string,(typeof guidePoints)[number]>();
  for(const point of guidePoints)latestGuides.set(point.grade,point);
  for(const [grade,point] of latestGuides){
    const sourceUrl=prices.find(p=>p.grade===grade && /^https:\/\/www\.pricecharting\.com\//.test(p.url))?.url || point.url;
    for(let i=prices.length-1;i>=0;i--)if(prices[i].grade===grade && prices[i].kind==='guide' && /PriceCharting|PANEL_PROFITS|Panel Profits/.test(prices[i].source))prices.splice(i,1);
    prices.push({grade,amount:point.price,source:'PriceCharting · dated guide',observedAt:point.date,url:sourceUrl,currency:'USD',kind:'guide',basis:'Published grade-specific guide; not a completed sale'});
  }
  prices.sort((a,b)=>Number(b.kind==="guide" && Number(b.grade)===identity.grade)-Number(a.kind==="guide" && Number(a.grade)===identity.grade) || Number(a.grade)-Number(b.grade));
  const story=storyFrom(raw.story);const census=editionUnknown?null:censusFrom(raw.census,identity);
  const content=raw.authored?.content;const parsed=writeupSchema.safeParse(content);
  const grounded=content?.sourceEvidenceStatus==='financial_only' && parsed.success && parsed.data.synopsis===null || story && content?.sources?.some(source=>source.uri===story.sourceUrl);
  const writeup=grounded && content?.sourceEvidenceStatus!=="needs_source" && parsed.success && Array.isArray(content?.sources)?{...content,...parsed.data}:null;
  const ebayId=(value:string|null|undefined)=>value?.match(/^(?:ebay-|(?:ebay-)?v1\|)?(\d{9,14})(?:\|0)?$/)?.[1];
  const currentEbayId=ebayId(identity.itemId);
  const sales:SaleObs[]=!editionUnknown?raw.sales.filter(row=>row.item_id!==identity.itemId && !(currentEbayId && row.venue.toLowerCase().startsWith("ebay") && ebayId(row.item_id)===currentEbayId) && (row.grade==null || !identity.grader || normalize(row.grader)===normalize(identity.grader)) && normalize(row.edition)===normalize(identity.edition) && (row.publication_year==null ? !identity.edition : row.publication_year===marketYear)).map(row=>({itemId:row.item_id || undefined,date:row.sold_at,price:Number(row.price_usd),grade:row.grade==null?null:Number(row.grade),venue:row.venue,source:row.source,confirmed:true,url:row.url || undefined})):[];
  const terms=identity.edition?identity.edition.toLowerCase().split(/[^a-z0-9]+/).filter(t=>t.length>=2):[];
  if(!editionUnknown) for(const item of raw.history?.items || []) {
    if(item.itemId===identity.itemId || currentEbayId && ebayId(item.itemId)===currentEbayId)continue;
    const match=matchCompletedComicSale(String(item.title || ""),identity.series,identity.issue,terms);
    const price=Number(item.lastSoldPrice?.value);const date=item.lastSoldDate;
    if(!match || match.gradingCompany!==identity.grader || !(price>0) || item.lastSoldPrice?.currency!=="USD" || !date || !Number.isFinite(Date.parse(date))) continue;
    sales.push({itemId:item.itemId,date,price,grade:match.grade,venue:"eBay",source:raw.history?.provider==="ebay_marketplace_insights"?"ebay_insights":"ebay_history",confirmed:true,url:item.itemWebUrl});
  }
  const allVideos=raw.videoSets.flat().filter((v,i,a)=>/^[a-zA-Z0-9_-]{11}$/.test(v.videoId) && a.findIndex(other=>other.videoId===v.videoId)===i);
  const related=allVideos.filter(v=>v.kind!=="explainer").slice(0,2);const explainer=allVideos.find(v=>v.kind==="explainer");
  const localResearch:LocalLotResearch={story,census,prices,ppcfId:edition?.ppcf_id || null,pricechartingId:sourceId?String(sourceId):undefined,pricechartingYear:comic?.publication_year || undefined,comicId:comic?.id,coverPrice:usdCoverPrice((comic as ComicRecord & {original_cover_price?:string})?.original_cover_price) ?? undefined,missing:[...(!story?["synopsis"]:[]),...(!census?["census"]:[]),...(!prices.length?["prices"]:[])]};
  return {version:2,identity,writeup,story,localResearch,guideHistory:guidePoints,sales:dedupeSales(sales),videos:[...related,...(explainer?[explainer]:[])],history:{available:Boolean(raw.history?.available),message:raw.history?.message || "No separately acquired eBay history. Source-reported sales remain in the ledger.",checkedAt:raw.history?.checkedAt,hasMore:raw.history?.hasMore},state:writeup?"ready":"pending",researchError:null};
}
/** One live database read transaction per selected lot. No rendered-response store or TTL. */
export async function readLotResearch(itemId:string,signal?:AbortSignal):Promise<LotResearch|null> {
  const {data,error}=await createAdminServerClient().rpc("sniper_lot_evidence_v2",{p_item_id:itemId},{get:true})
    .abortSignal(signal || AbortSignal.timeout(10000));
  if(error) throw new Error(`Stored issue evidence could not be read (${error.code || "transport"})`);
  return data?assembleLotResearch(data as LotEvidence):null;
}
export async function readLocalLotResearch(itemId:string):Promise<LocalLotResearch|null> {
  return (await readLotResearch(itemId))?.localResearch || null;
}
