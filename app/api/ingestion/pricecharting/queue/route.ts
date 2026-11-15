/**
 * Next books for the PriceCharting Loader extension: catalog ids after `after` (pp_id order)
 * that do not yet have a full book load saved. Auth: Bearer GPA_INGESTION_SECRET.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const clean = (v?: string | null) => (v ?? "").trim().replace(/^['"]|['"]$/g, "").trim();

export async function GET(req: NextRequest) {
  const secret = clean(process.env.GPA_INGESTION_SECRET);
  const token = clean((req.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""));
  if (!secret || token !== secret) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const after = req.nextUrl.searchParams.get("after") || "";
  const db = createAdminServerClient();
  const { data: page, error } = await db
    .from("pp_series_rows_full").select("pp_id").gt("pp_id", after).order("pp_id", { ascending: true }).limit(1000);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!page?.length) return NextResponse.json({ ok: true, ids: [], next: after, done: true });
  const ids = [...new Set(page.map((r: any) => String(r.pp_id)))].filter((id) => /^\d+$/.test(id));
  // A full load has the sales column filled (older chart-only rows do not).
  const { data: have, error: hErr } = await db.from("pp_chart_json").select("pp_id").in("pp_id", ids).not("sales", "is", null);
  if (hErr) return NextResponse.json({ ok: false, error: hErr.message }, { status: 500 });
  const done = new Set((have ?? []).map((r: any) => String(r.pp_id)));
  return NextResponse.json({ ok: true, ids: ids.filter((id) => !done.has(id)), next: String(page[page.length - 1].pp_id), done: false });
}
