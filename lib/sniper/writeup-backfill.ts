import {createAdminServerClient} from '@/lib/supabase/admin';
import {readLotResearch} from './local-research';
import {makeListingWriteup,writeupKey,writeupProviderCoolingDown} from './listing-writeup';
import {hydrateStoredFandom} from '@/lib/comics/stored-fandom';
import {hydrateStoredGcdStory} from '@/lib/comics/stored-gcd-story';

/** Resumable from the saved write-ups themselves: no second research cache or copied market store. */
export async function backfillListingWriteups(limit=40,budgetMs=180000,venue?:string,provider?:"gemini"|"gateway",itemIds?:string[]) {
 const db=createAdminServerClient(),start=Date.now(),leaseKey='sniper-writeup-backfill:v1';
 const {data:lease}=await db.from('sniper_vendor_fetch').select('fetched_at,status').eq('key',leaseKey).maybeSingle();
 if(lease?.status==='running' && start-Date.parse(lease.fetched_at)<240000)return {busy:true,checked:0,written:0,missingStory:0,failed:0};
 const stamp=new Date(start).toISOString();
 if(lease){const {data,error}=await db.from('sniper_vendor_fetch').update({fetched_at:stamp,status:'running'}).eq('key',leaseKey).eq('fetched_at',lease.fetched_at).select('key');if(error)throw error;if(!data?.length)return {busy:true,checked:0,written:0,missingStory:0,failed:0};}
 else {const {error}=await db.from('sniper_vendor_fetch').insert({key:leaseKey,fetched_at:stamp,status:'running',items:0,sales:0});if(error?.code==='23505')return {busy:true,checked:0,written:0,missingStory:0,failed:0};if(error)throw error;}
 const out={busy:false,checked:0,written:0,missingStory:0,failed:0,attempted:0,providerBlocked:false};
 try {
  let query=db.from('sniper_listings').select('item_id,title,grader,grade,label').eq('status','live').gte('grade',8.5).not('research_comic_id','is',null).gt('end_time',new Date().toISOString()).order('last_seen',{ascending:false}).limit(1000);
  if(venue)query=query.eq('venue',venue);if(itemIds?.length)query=query.in('item_id',itemIds);
  const {data:lots,error}=await query;
  if(error)throw error;
  const {data:saved,error:savedError}=await db.from('sniper_listing_writeup').select('key,source_status:content->>sourceEvidenceStatus').not('content','is',null).limit(1000);if(savedError)throw savedError;
  const {data:recentFailures,error:failureError}=await db.from('sniper_listing_writeup').select('key').is('content',null).gt('failed_at',new Date(Date.now()-5*60000).toISOString()).limit(1000);if(failureError)throw failureError;
  const done=new Set([...(saved||[]).filter(r=>r.source_status!=='needs_source'),...(recentFailures||[])].map(r=>r.key));
  const queue=(lots||[]).filter(l=>{const label=l.label as {grade?:string;grader?:string}|null;const key=writeupKey({...l,grader:label?.grader||l.grader,grade:label?.grade?Number(label.grade):l.grade});if(done.has(key))return false;done.add(key);return true;});let cursor=0,attempted=0;
  await Promise.all(Array.from({length:Math.min(3,limit,queue.length)},async()=>{
   while(!out.providerBlocked && cursor<queue.length && attempted<Math.min(limit,60) && Date.now()-start<budgetMs-95000){
    const item=queue[cursor++];out.checked++;
    try{
     let research=await readLotResearch(item.item_id);if(!research){out.failed++;continue;}
     if(!research.story){const input={series:research.identity.series,issueNumber:research.identity.issue,year:research.identity.year,publisher:research.identity.publisher};const story=await hydrateStoredFandom(input)||await hydrateStoredGcdStory(input,research.localResearch.ppcfId);if(story)research={...research,story};}
     if(!research.story){out.missingStory++;if(!research.localResearch.prices.length && !research.sales.length && !research.localResearch.census){await db.from('sniper_listing_writeup').upsert({key:writeupKey(research.identity),title:research.identity.title.slice(0,300),failed_at:new Date().toISOString()});continue;}}
     if(attempted>=limit)break;attempted++;out.attempted++;
     const written=await makeListingWriteup(research.identity,research.story,research,{provider,probe:provider==='gemini' && limit===1});
     if(written)out.written++;else out.failed++;
     out.providerBlocked=writeupProviderCoolingDown(provider);
    }catch{out.failed++;}
   }
  }));
  return out;
 }finally{
  await db.from('sniper_vendor_fetch').update({status:out.failed?'partial':'ok',items:out.checked,sales:out.written}).eq('key',leaseKey).eq('fetched_at',stamp);
 }
}
