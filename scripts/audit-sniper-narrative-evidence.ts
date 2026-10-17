import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const {createAdminServerClient}=await import('../lib/supabase/admin');
const {readLotResearch}=await import('../lib/sniper/local-research');
const {hydrateStoredFandom}=await import('../lib/comics/stored-fandom');
const {hydrateStoredGcdStory}=await import('../lib/comics/stored-gcd-story');
const db=createAdminServerClient(),repair=process.argv.includes('--repair');
const {data:rows,error}=await db.from('sniper_listing_writeup').select('key,title,content,written_at').not('content','is',null).limit(1000);
if(error)throw error;
let cursor=0,verified=0,flagged=0,recovered=0,failed=0;
await Promise.all(Array.from({length:3},async()=>{
 while(cursor<(rows||[]).length){const row=rows![cursor++];try{
  const content=row.content as {sources?:Array<{uri:string}>;sourceEvidenceStatus?:string;synopsis?:unknown};
  const reference=content.sources?.find(source=>source.uri.startsWith('https://comicbookstockexchange.com/api/sniper/research?'));
  const itemId=reference?new URL(reference.uri).searchParams.get('itemId'):null;
  if(!itemId)continue; // Legacy external-search briefs are not rewritten by this audit.
  const research=await readLotResearch(itemId);if(!research)throw new Error('Saved listing unavailable');
  if(content.sourceEvidenceStatus==='financial_only' && content.synopsis===null && !research.story){verified++;continue;}
  if(research.story && content.sources?.some(source=>source.uri===research.story!.sourceUrl) && content.sourceEvidenceStatus!=='needs_source'){verified++;continue;}
  flagged++;
  console.log(JSON.stringify({key:row.key,itemId,reason:research.story?'source_reference_changed':'source_missing_or_link_only',repair}));
  if(!repair)continue;
  // Record-specific annotation preserves the complete original brief for review.
  const {error:saveError}=await db.from('sniper_listing_writeup').update({content:{...content,sourceEvidenceStatus:'needs_source'}}).eq('key',row.key).eq('written_at',row.written_at);
  if(saveError)throw new Error('Source status could not be saved');
  if(!research.story){const i=research.identity,input={series:i.series,issueNumber:i.issue,year:i.year,publisher:i.publisher};if(await hydrateStoredFandom(input)||await hydrateStoredGcdStory(input,research.localResearch.ppcfId))recovered++;}
 }catch(e){failed++;console.error(JSON.stringify({key:row.key,error:(e as Error).message}));}}
}));
console.log(JSON.stringify({complete:true,verified,flagged,recovered,failed,repair}));
