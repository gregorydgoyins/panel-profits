// Nightly PriceCharting load, runs inside Supabase (scheduled by pg_cron via pg_net).
// ONE secret: PRICECHARTING_CSV_URL (the account's download-custom link). The category is forced to comic-books here.
// The edge worker only hands the link to Postgres (pp_fetch_stage), which downloads, keeps Comic Books rows, parses and
// maps columns. Then: sanity-check row count -> commit in slices (append a dated snapshot to pp_price_history,
// refresh current prices in pp_series_rows_full where values changed).
import { createClient } from "npm:@supabase/supabase-js@2";

const MIN_ROWS = 300000, PARTS = 8, CONC = 2;
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "content-type": "application/json" } });

Deno.serve(async (req) => {
  const force = new URL(req.url).searchParams.get("force") === "1";
  const secret = Deno.env.get("PRICECHARTING_CSV_URL");
  if (!secret) return json({ ok: false, error: "secret PRICECHARTING_CSV_URL is not set" }, 500);
  const u = new URL(secret);
  u.searchParams.set("category", "comic-books");
  const src = u.toString();
  const clean = (s: string) => s.replaceAll(src, "<link>").replaceAll(secret, "<link>");
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const today = new Date().toISOString().slice(0, 10);
  const label = `PriceCharting nightly ${today}`;
  try {
    const { data: done, error: e1 } = await sb.from("pp_price_history").select("pp_id").eq("snapshot_label", label).limit(1);
    if (e1) throw new Error("history check: " + e1.message);
    if (done && done.length && !force) return json({ ok: true, skipped: "already loaded today", label });
    const { data: busy, error: e2 } = await sb.from("pp_price_stage").select("created_at").eq("run_label", label).order("created_at", { ascending: false }).limit(1);
    if (e2) throw new Error("stage check: " + e2.message);
    if (busy && busy.length) {
      if (Date.now() - new Date(busy[0].created_at).getTime() < 30 * 60 * 1000) return json({ ok: false, skipped: "a run for today is already in progress", label }, 409);
      await sb.from("pp_price_stage").delete().eq("run_label", label);
    }

    const { data: fetched, error: e3 } = await sb.rpc("pp_fetch_stage", { p_url: src, p_label: label });
    if (e3) throw new Error("fetch/stage: " + clean(e3.message));
    if (!fetched?.ok) throw new Error("download step failed: " + clean(JSON.stringify(fetched)));
    const n = Number(fetched.comic_rows_staged || 0);

    const { data: prev } = await sb.rpc("pp_prev_snapshot_rows");
    const prevN = Number(prev ?? 0);
    if (n < MIN_ROWS || (prevN > 0 && n * 100 < prevN * 90)) {
      await sb.from("pp_price_stage").delete().eq("run_label", label);
      return json({ ok: false, error: `file rejected: ${n} comic rows (previous snapshot ${prevN}); nothing committed`, fetched, label }, 422);
    }

    const results: unknown[] = [];
    for (let part = 0; part < PARTS; part += CONC) {
      const slice = Array.from({ length: CONC }, (_, i) => part + i).filter((p) => p < PARTS);
      const out = await Promise.all(slice.map((p) => sb.rpc("pp_commit_prices", { p_label: label, p_snap: today, p_part: p, p_parts: PARTS })));
      for (const o of out) { if (o.error) throw new Error("commit: " + o.error.message); results.push(o.data); }
    }
    await sb.from("pp_price_stage").delete().eq("run_label", label);
    return json({ ok: true, label, rows: n, previous_rows: prevN, fetched, slices: results });
  } catch (err) {
    await sb.from("pp_price_stage").delete().eq("run_label", label).then(() => {}, () => {});
    return json({ ok: false, error: clean(String((err as Error).message || err)) }, 500);
  }
});
