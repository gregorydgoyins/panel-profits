// Nightly PriceCharting load, runs inside Supabase (scheduled by pg_cron via pg_net).
// Needs ONE secret: PRICECHARTING_CSV_URL (the account's API/Download link for the comics price guide).
// Flow: download (streamed) -> validate 37-column header -> stage -> sanity-check row count -> commit in slices:
// append a dated snapshot to pp_price_history and refresh current prices in pp_series_rows_full (changed values only).
import { createClient } from "npm:@supabase/supabase-js@2";
import { translate, type StageRow } from "./translate.ts";

const MIN_ROWS = 300000, BATCH = 3000, PARTS = 8, STAGE_CONCURRENCY = 4;
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "content-type": "application/json" } });

Deno.serve(async (req) => {
  const force = new URL(req.url).searchParams.get("force") === "1";
  const src = Deno.env.get("PRICECHARTING_CSV_URL");
  if (!src) return json({ ok: false, error: "secret PRICECHARTING_CSV_URL is not set" }, 500);
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
      // a run staged within the last 30 minutes is still in progress; older leftovers are from a crashed run
      if (Date.now() - new Date(busy[0].created_at).getTime() < 30 * 60 * 1000) return json({ ok: false, skipped: "a run for today is already in progress", label }, 409);
      await sb.from("pp_price_stage").delete().eq("run_label", label);
    }

    let res: Response;
    try { res = await fetch(src); } catch (_) { throw new Error("download failed (network)"); }
    if (!res.ok || !res.body) throw new Error(`download failed: HTTP ${res.status}`);

    let n = 0, batch: StageRow[] = [];
    const pending = new Set<Promise<void>>();
    const flush = async () => {
      const b = batch; batch = [];
      if (!b.length) return;
      const p: Promise<void> = Promise.resolve(sb.from("pp_price_stage").insert(b)).then(({ error }) => { if (error) throw new Error("stage insert: " + error.message); });
      pending.add(p);
      p.then(() => pending.delete(p), () => {});
      if (pending.size >= STAGE_CONCURRENCY) await Promise.race(pending);
    };
    for await (const row of translate(res.body, label)) {
      batch.push(row); n++;
      if (batch.length >= BATCH) await flush();
    }
    await flush();
    await Promise.all(pending);

    const { data: prev } = await sb.rpc("pp_prev_snapshot_rows");
    const prevN = Number(prev ?? 0);
    if (n < MIN_ROWS || (prevN > 0 && n * 100 < prevN * 90)) {
      await sb.from("pp_price_stage").delete().eq("run_label", label);
      return json({ ok: false, error: `file rejected: ${n} rows (previous snapshot ${prevN}); nothing committed`, label }, 422);
    }

    const results: unknown[] = [];
    for (let part = 0; part < PARTS; part += 2) {
      const slice = [part, part + 1].filter((p) => p < PARTS);
      const out = await Promise.all(slice.map((p) => sb.rpc("pp_commit_prices", { p_label: label, p_snap: today, p_part: p, p_parts: PARTS })));
      for (const o of out) { if (o.error) throw new Error("commit: " + o.error.message); results.push(o.data); }
    }
    await sb.from("pp_price_stage").delete().eq("run_label", label);
    return json({ ok: true, label, rows: n, previous_rows: prevN, slices: results });
  } catch (err) {
    await sb.from("pp_price_stage").delete().eq("run_label", label).then(() => {}, () => {});
    return json({ ok: false, error: String((err as Error).message || err) }, 500);
  }
});
