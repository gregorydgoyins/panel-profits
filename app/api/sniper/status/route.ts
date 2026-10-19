import { NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase/admin";
import { getEbayOAuthToken } from "@/lib/sniper/ebay-api";
import { LISTING_STALE_MS } from "@/lib/sniper/market-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Health of the Sniper feed: when it last ran, what eBay answered, how much is stored, and the eBay call allowance left. */
const IMPLEMENTED_COLLECTORS: Record<string, string> = {
  ebay: "browse_api",
  ebay_uk: "browse_api",
  ebay_ca: "browse_api",
  ebay_fr: "browse_api",
  ebay_de: "browse_api",
  ebay_au: "browse_api",
  comicconnect: "public_catalog",
  metropolis: "public_catalog",
  hakes: "public_catalog",
};

const SUPPORTED_VENUES = [
  "ebay", "ebay_uk", "ebay_ca", "ebay_fr", "ebay_de", "ebay_au",
  "comicconnect", "metropolis", "hakes", "heritage", "mycomicshop", "comiclink",
];

export async function GET() {
  const db: any = createAdminServerClient();
  const [runs, live, admitted, pending, sales, ticks, venueRows] = await Promise.all([
    db.from("sniper_runs").select("started_at,finished_at,ebay_calls,statuses,listings_seen,ticks_written,sales_written,note").order("id", { ascending: false }).limit(6),
    db.from("sniper_listings").select("item_id", { count: "exact", head: true }).eq("status", "live").gte("last_seen", new Date(Date.now() - LISTING_STALE_MS).toISOString()),
    db.from("sniper_listings").select("item_id", { count: "exact", head: true }).eq("status", "live").eq("admission_ready", true).gte("last_seen", new Date(Date.now() - LISTING_STALE_MS).toISOString()),
    db.from("sniper_listings").select("item_id,label,payload,last_seen").eq("status", "live").gte("last_seen", new Date(Date.now() - LISTING_STALE_MS).toISOString()).limit(5000),
    db.from("sniper_sales").select("id", { count: "exact", head: true }),
    db.from("sniper_ticks").select("id", { count: "exact", head: true }),
    db.from("sniper_listings").select("venue,last_seen").eq("status", "live")
      .gte("last_seen", new Date(Date.now() - LISTING_STALE_MS).toISOString()).limit(10000),
  ]);

  const rejectionReasons: Record<string, number> = {};
  const rejectionExamples: Array<Record<string, unknown>> = [];
  const enrichmentCounts = { inspected: 0, priced: 0, researched: 0, rejected: 0, admitted: 0 };
  for (const row of pending.data ?? []) {
    const reasons = row?.payload?.admissionEnrichment?.reasons;
    const enrichment = row?.payload?.admissionEnrichment;
    if (enrichment) {
      enrichmentCounts.inspected++;
      if (enrichment.pricing?.price > 0) enrichmentCounts.priced++;
      if (enrichment.research) enrichmentCounts.researched++;
      if (enrichment.status === "admitted") enrichmentCounts.admitted++;
      if (enrichment.status === "rejected") enrichmentCounts.rejected++;
    }
    if (Array.isArray(reasons)) for (const reason of reasons) {
      const code = String(reason?.code || "unknown");
      rejectionReasons[code] = (rejectionReasons[code] || 0) + 1;
    }
    if (Array.isArray(reasons) && reasons.length && rejectionExamples.length < 60) {
      rejectionExamples.push({
        itemId: row.item_id,
        source: row.payload?.source ?? null,
        title: row.payload?.title ?? null,
        lastSeen: row.last_seen,
        identity: row.payload?.admissionEnrichment?.identity ?? null,
        reasons,
      });
    }
  }

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

  const venueHealth = new Map<string, { liveLots: number; lastSeen: string | null }>();
  for (const row of venueRows.data ?? []) {
    const current = venueHealth.get(row.venue) ?? { liveLots: 0, lastSeen: null };
    current.liveLots += 1;
    if (!current.lastSeen || row.last_seen > current.lastSeen) current.lastSeen = row.last_seen;
    venueHealth.set(row.venue, current);
  }

  const venueConnections = SUPPORTED_VENUES.map((venue) => {
    const health = venueHealth.get(venue) ?? { liveLots: 0, lastSeen: null };
    const collector = IMPLEMENTED_COLLECTORS[venue] ?? null;
    const fresh = Boolean(health.lastSeen && Date.now() - new Date(health.lastSeen).getTime() <= LISTING_STALE_MS);
    const configured = Boolean(collector);
    return {
      venue,
      collector,
      configured,
      connected: configured && health.liveLots > 0 && fresh,
      liveLots: health.liveLots,
      lastSuccessfulCollection: health.lastSeen,
      reason: configured
        ? (health.liveLots > 0 && fresh ? null : "No fresh persisted listings from the implemented collector")
        : "No collector implemented; any stored rows are historical or externally imported",
      latestHttpStatuses: Object.entries((runs.data ?? [])[0]?.statuses ?? {})
        .filter(([key]) => key.startsWith(`${venue}_`))
        .map(([key, count]) => ({ status: key.slice(venue.length + 1), requests: count })),
    };
  });

  return NextResponse.json({
    success: true,
    liveLots: live.count ?? 0,
    admittedLots: admitted.count ?? 0,
    pendingResearchLots: Math.max(0, (live.count ?? 0) - (admitted.count ?? 0)),
    rejectionReasons,
    enrichmentCounts,
    rejectionExamples,
    recordedSales: sales.count ?? 0,
    bidHistoryRows: ticks.count ?? 0,
    lastRuns: runs.data ?? [],
    ebayBrowseQuota: quota,
    venueConnections,
  });
}
