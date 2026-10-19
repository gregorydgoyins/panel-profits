import { NextRequest, NextResponse } from "next/server";
import { runSnapshot } from "@/lib/sniper/market-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Pulls the current eBay comic auctions into the Sniper store (about 6–8 Browse calls of up to 200 lots each).
 * Safe to call from anywhere: the store allows one run per 4 minutes and goes quiet for 20 minutes after an eBay 429,
 * so extra callers cannot spend the eBay quota. `?force=1` skips that only with the cron secret.
 */
export async function GET(req: NextRequest) {
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
  const secrets = [process.env.CRON_SECRET, process.env.GPA_INGESTION_SECRET].filter(Boolean);
  if (secrets.length > 0 && !secrets.includes(bearer)) {
    return NextResponse.json({ ok: false, error: "Unauthorized scheduled worker" }, { status: 401 });
  }
  const force = req.nextUrl.searchParams.get("force") === "1" && !!bearer && secrets.includes(bearer);
  try {
    const result = await runSnapshot({ force });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
