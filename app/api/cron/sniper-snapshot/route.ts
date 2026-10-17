import { after, NextRequest, NextResponse } from "next/server";
import { auditLocalResearch } from "@/lib/sniper/research-worker";
import { runSnapshot } from "@/lib/sniper/market-store";
import { importPublicAuctionCatalogs } from "@/lib/sniper/public-auction-import";
import { backfillListingWriteups } from '@/lib/sniper/writeup-backfill';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 240;

/**
 * Pulls the current eBay comic auctions into the Sniper store (about 6–8 Browse calls of up to 200 lots each).
 * Safe to call from anywhere: the store allows one run per 4 minutes and goes quiet for 20 minutes after an eBay 429,
 * so extra callers cannot spend the eBay quota. `?force=1` skips that only with the cron secret.
 */
export async function GET(req: NextRequest) {
  const started=Date.now();
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
  const secrets = [process.env.CRON_SECRET, process.env.GPA_INGESTION_SECRET].filter(Boolean);
  const force = req.nextUrl.searchParams.get("force") === "1" && !!bearer && secrets.includes(bearer);
  try {
    const result = await runSnapshot({ force });
    // After the snapshot is answered, write the research for the slabs now listed so opening a lot is a table read.
    after(async () => {
      await backfillListingWriteups(40,Math.max(0,170000-(Date.now()-started))).catch((e)=>console.warn('[sniper] writeup backfill failed:',(e as Error).message));
      await importPublicAuctionCatalogs(1).catch((e) => console.warn("[sniper] public auction catalog import failed:", (e as Error).message));
      const remaining=Math.max(0,210000-(Date.now()-started));
      if(remaining>10000)await auditLocalResearch(30,remaining).catch((e) => console.warn("[sniper] saved research enrichment failed:", (e as Error).message));
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
