/**
 * Next books for the PriceCharting Loader extension.
 * Phase 1: the priority list in public.pp_load_queue (most-traded books first), by rank.
 * Phase 2 (after the list is done, or if it is empty): the rest of the catalog in pp_id order.
 * Books that already have a full load saved are left out. Auth: Bearer GPA_INGESTION_SECRET.
 * Cursor: "r:<rank>" while on the priority list, "c:<pp_id>" on the catalog walk.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const clean = (v?: string | null) => (v ?? "").trim().replace(/^['"]|['"]$/g, "").trim();
const PAGE = 200;

export async function GET(req: NextRequest) {
  const secret = clean(process.env.GPA_INGESTION_SECRET);
  const token = clean((req.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""));
  if (!secret || token !== secret) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const after = req.nextUrl.searchParams.get("after") || "";
  const db = createAdminServerClient();
  let ids: string[] = [];
  let next = after;
  let phase: "priority" | "catalog" = "priority";

  if (!after.startsWith("c:")) {
    const rank = Number(after.replace(/^r:/, "")) || 0;
    const { data, error } = await db.from("pp_load_queue").select("rank, pp_id").gt("rank", rank).order("rank", { ascending: true }).limit(PAGE);
    if (!error && data?.length) {
      ids = data.map((r: any) => String(r.pp_id));
      next = `r:${data[data.length - 1].rank}`;
    } else {
      phase = "catalog";
      next = "c:";
    }
  } else phase = "catalog";

  if (phase === "catalog") {
    const last = next.replace(/^c:/, "");
    const { data: page, error } = await db
      .from("pp_series_rows_full").select("pp_id").gt("pp_id", last).order("pp_id", { ascending: true }).limit(PAGE);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!page?.length) return NextResponse.json({ ok: true, ids: [], next, phase, done: true });
    ids = [...new Set(page.map((r: any) => String(r.pp_id)))].filter((id) => /^\d+$/.test(id));
    next = `c:${page[page.length - 1].pp_id}`;
  }

  // A full load has the sales column filled (older chart-only rows do not).
  const { data: have, error: hErr } = await db.from("pp_chart_json").select("pp_id").in("pp_id", ids).not("sales", "is", null);
  if (hErr) return NextResponse.json({ ok: false, error: hErr.message }, { status: 500 });
  const done = new Set((have ?? []).map((r: any) => String(r.pp_id)));
  return NextResponse.json({ ok: true, ids: ids.filter((id) => !done.has(id)), next, phase, done: false });
}
