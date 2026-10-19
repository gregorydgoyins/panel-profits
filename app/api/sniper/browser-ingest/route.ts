import { NextRequest, NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase/admin";
import { listingToRow } from "@/lib/sniper/market-store";
import type { RawAuctionListing } from "@/lib/sniper/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOSTS: Record<string, string[]> = {
  heritage: ["comics.ha.com"],
  mycomicshop: ["www.mycomicshop.com", "mycomicshop.com"],
  comiclink: ["www.comiclink.com", "comiclink.com"],
  pristine: ["www.pristineauction.com", "pristineauction.com"],
  goldin: ["goldin.co", "www.goldin.co"],
};

function authorized(req: NextRequest): boolean {
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
  const configured = [process.env.SNIPER_BROWSER_INGEST_SECRET, process.env.CRON_SECRET, process.env.GPA_INGESTION_SECRET].filter(Boolean);
  return configured.length > 0 && configured.includes(bearer);
}

function validateListing(value: unknown): { ok: true; listing: RawAuctionListing } | { ok: false; reason: string } {
  if (!value || typeof value !== "object") return { ok: false, reason: "record is not an object" };
  const listing = value as RawAuctionListing;
  if (!listing.id || !listing.title || !listing.url || !listing.imageUrl) return { ok: false, reason: "id, title, url, and imageUrl are required" };
  if (!(listing.source in HOSTS)) return { ok: false, reason: "browser ingestion supports only authorized auction venues" };
  let parsed: URL;
  try { parsed = new URL(listing.url); } catch { return { ok: false, reason: "invalid source URL" }; }
  if (parsed.protocol !== "https:" || !HOSTS[listing.source].includes(parsed.hostname.toLowerCase())) return { ok: false, reason: "source URL host does not match venue" };
  if (!Number.isFinite(listing.currentBid) || listing.currentBid <= 0) return { ok: false, reason: "current bid must be positive" };
  if (!Number.isFinite(listing.secondsRemaining) || listing.secondsRemaining <= 0) return { ok: false, reason: "a live countdown/deadline is required" };
  if (!Number.isInteger(listing.bidCount) || listing.bidCount < 0) return { ok: false, reason: "bid count is invalid" };
  return { ok: true, listing };
}

/**
 * Receives rendered, browser-captured lots from an authorized worker. It never
 * scrapes or bypasses a venue itself: the browser supplies the rendered source
 * evidence, while this endpoint validates the exact venue URL and persists the
 * lot through the same Clean snapshot row shape as scheduled collectors.
 */
export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "Unauthorized browser ingestion" }, { status: 401 });
  let body: { records?: unknown[]; hipcomic?: unknown[] };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

  const rawRecords = Array.isArray(body.records) ? body.records : [];
  const validated = rawRecords.map(validateListing);
  const rejected = validated.flatMap((v, index) => v.ok ? [] : [{ index, reason: v.reason }]);
  const records = validated.flatMap((v) => v.ok ? [v.listing] : []);
  const unique = new Map(records.map((r) => [r.id, r]));
  const nowMs = Date.now();
  const rows = Array.from(unique.values()).map((listing) => listingToRow({
    ...listing,
    payload: {
      ...(listing as any).payload,
      browserCapture: true,
      captureMethod: "opera_browser_connector",
      capturedAt: (listing as any).capturedAt ?? new Date(nowMs).toISOString(),
    },
  } as RawAuctionListing, nowMs));

  const db: any = createAdminServerClient();
  let persisted = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await db.from("sniper_listings").upsert(rows.slice(i, i + 100), { onConflict: "item_id" });
    if (error) return NextResponse.json({ ok: false, error: error.message, persisted, rejected }, { status: 500 });
    persisted += rows.slice(i, i + 100).length;
  }

  // HipComic guide observations are intentionally separate from auction rows
  // and confirmed sales. They use the existing attributed-observation table.
  const guide = Array.isArray(body.hipcomic) ? body.hipcomic.filter((x): x is Record<string, unknown> => Boolean(x && typeof x === "object")) : [];
  let guidePersisted = 0;
  if (guide.length > 0) {
    const guideRows = guide.flatMap((g) => {
      const ppcfId = typeof g.ppcfId === "string" ? g.ppcfId : null;
      const sourceRecordId = typeof g.sourceRecordId === "string" ? g.sourceRecordId : null;
      const amount = typeof g.amount === "number" ? g.amount : null;
      const locator = typeof g.sourceLocator === "string" ? g.sourceLocator : null;
      if (!ppcfId || !sourceRecordId || !locator || !locator.startsWith("https://www.hipcomic.com/price-guide") || amount == null || amount < 0) return [];
      return [{ ppcf_id: ppcfId, source_system: "hipcomic_price_guide", source_record_id: sourceRecordId, price_field: "guide_value", grade_label: typeof g.gradeLabel === "string" ? g.gradeLabel : "RAW", amount, currency: "USD", observed_at: typeof g.observedAt === "string" ? g.observedAt : new Date(nowMs).toISOString().slice(0, 10), source_locator: locator, dedupe_key: `hipcomic_price_guide|${sourceRecordId}|${g.gradeLabel ?? "RAW"}`, created_at: new Date(nowMs).toISOString() }];
    });
    if (guideRows.length > 0) {
      const { error } = await db.from("ppcf_price_observations").upsert(guideRows, { onConflict: "dedupe_key" });
      if (error) return NextResponse.json({ ok: false, error: error.message, persisted, guidePersisted, rejected }, { status: 500 });
      guidePersisted = guideRows.length;
    }
  }

  return NextResponse.json({ ok: true, received: rawRecords.length, accepted: records.length, deduplicated: records.length - unique.size, persisted, guideReceived: guide.length, guidePersisted, rejected }, { headers: { "cache-control": "no-store" } });
}
