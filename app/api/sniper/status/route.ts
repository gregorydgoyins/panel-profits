import { NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase/admin";
import { getEbayOAuthToken } from "@/lib/sniper/ebay-api";
import { LISTING_STALE_MS } from "@/lib/sniper/market-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Health of the Sniper feed: when it last ran, what eBay answered, how much is stored, and the eBay call allowance left. */
export async function GET() {
  const db: any = createAdminServerClient();
  const [runs, live, sales, ticks] = await Promise.all([
    db.from("sniper_runs").select("started_at,finished_at,ebay_calls,statuses,listings_seen,ticks_written,sales_written,note").order("id", { ascending: false }).limit(6),
    db.from("sniper_listings").select("item_id", { count: "exact", head: true }).eq("status", "live").gte("last_seen", new Date(Date.now() - LISTING_STALE_MS).toISOString()),
    db.from("sniper_sales").select("id", { count: "exact", head: true }),
    db.from("sniper_ticks").select("id", { count: "exact", head: true }),
  ]);

  let quota: unknown = null;
  try {
    const token = await getEbayOAuthToken();
    if (token) {
      const r = await fetch("https://api.ebay.com/developer/analytics/v1_beta/rate_limit/?api_context=buy&api_name=Browse", {
        headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(6000),
      });
      quota = r.ok ? (await r.json()).rateLimits?.[0]?.resources?.[0]?.rates?.[0] ?? null : { status: r.status };
    }
  } catch {}

  return NextResponse.json({
    success: true,
    liveLots: live.count ?? 0,
    recordedSales: sales.count ?? 0,
    bidHistoryRows: ticks.count ?? 0,
    lastRuns: runs.data ?? [],
    ebayBrowseQuota: quota,
    venueConnections: [
      { venue: "ebay", collector: "browse_api", configured: true },
      { venue: "comicconnect", collector: "public_catalog", configured: true },
      { venue: "metropolis", collector: "public_catalog", configured: true },
      { venue: "hakes", collector: "public_catalog", configured: true },
      { venue: "heritage", collector: null, configured: false, reason: "No authenticated collector implemented" },
      { venue: "mycomicshop", collector: null, configured: false, reason: "No authenticated collector implemented" },
      { venue: "comiclink", collector: null, configured: false, reason: "No authenticated collector implemented" },
    ].map((venue) => ({
      ...venue,
      latestHttpStatuses: Object.entries((runs.data ?? [])[0]?.statuses ?? {})
        .filter(([key]) => key.startsWith(`${venue.venue}_`))
        .map(([key, count]) => ({ status: key.slice(venue.venue.length + 1), requests: count })),
    })),
  });
}
