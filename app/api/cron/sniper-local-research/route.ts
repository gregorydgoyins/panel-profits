import { auditLocalResearch } from "@/lib/sniper/research-worker";
import { backfillListingWriteups } from '@/lib/sniper/writeup-backfill';
export const runtime = "nodejs";
export const maxDuration = 240;
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { const started=Date.now();const writeups=await backfillListingWriteups();const remaining=210000-(Date.now()-started);return Response.json({ ok: true, writeups,...await auditLocalResearch(15,remaining) }); }
  catch { return Response.json({ ok: false, error: "Local research audit failed" }, { status: 503 }); }
}
/** Owner maintenance uses the same server-only database credential already held by local workers. */
export async function POST(request:Request) {
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY;
 if(!secret || request.headers.get('authorization')!==`Bearer ${secret}`)return Response.json({error:'Unauthorized'},{status:401});
 try{
  const input=await request.json();
  const venue=typeof input.venue==='string' && /^[a-z_]{3,24}$/.test(input.venue)?input.venue:undefined;
  const provider=input.provider==='gemini'?'gemini':input.provider==='gateway'?'gateway':undefined;
  const itemIds=Array.isArray(input.itemIds)?input.itemIds.filter((id:unknown):id is string=>typeof id==='string' && id.length>0 && id.length<=240).slice(0,10):undefined;
  const limit=Math.max(1,Math.min(60,Number(input.limit)||40));
  return Response.json({ok:true,...await backfillListingWriteups(limit,190000,venue,provider,itemIds)});
 }catch{return Response.json({ok:false,error:'Saved research backfill failed'},{status:503});}
}
