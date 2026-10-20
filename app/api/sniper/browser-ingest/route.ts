import { NextRequest, NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase/admin";
import { listingToRow } from "@/lib/sniper/market-store";
import type { RawAuctionListing } from "@/lib/sniper/types";
import { validateBrowserListing } from "@/lib/sniper/browser-capture-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
  const configured = [process.env.SNIPER_BROWSER_INGEST_SECRET, process.env.CRON_SECRET, process.env.GPA_INGESTION_SECRET].filter(Boolean);
  return configured.length > 0 && configured.includes(bearer);
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
  const validated = rawRecords.map(validateBrowserListing);
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
