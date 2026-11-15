/**
 * Receives one PriceCharting book page (HTML) loaded in the owner's own signed-in browser by the
 * "PriceCharting Loader" extension, parses the full book load and saves it to public.pp_chart_json.
 * Auth: Bearer GPA_INGESTION_SECRET.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase/admin";
import { parseBookPage, bookRow } from "@/lib/jobs/pricecharting-charts";

export const runtime = "nodejs";

const clean = (v?: string | null) => (v ?? "").trim().replace(/^['"]|['"]$/g, "").trim();

export async function POST(req: NextRequest) {
  const secret = clean(process.env.GPA_INGESTION_SECRET);
  const token = clean((req.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""));
  if (!secret || token !== secret) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  let body: { id?: string | number; html?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }
  const id = String(body.id ?? "").trim();
  const html = String(body.html ?? "");
  if (!/^\d+$/.test(id) || html.length < 500) return NextResponse.json({ ok: false, error: "id and html are required" }, { status: 400 });

  const book = parseBookPage(html, id);
  const row = bookRow(id, book);
  const { error } = await createAdminServerClient().from("pp_chart_json").upsert(row, { onConflict: "pp_id" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const subscriber = Object.values(book?.box ?? {}).some((b) => b.buy != null);
  return NextResponse.json({
    ok: true, matched: Boolean(book), points: row.points, sales: row.sales_count,
    guideGrades: Object.keys(row.guide).length, subscriber,
  });
}
