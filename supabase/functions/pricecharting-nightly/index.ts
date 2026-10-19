import { createClient } from "npm:@supabase/supabase-js@2";

// PriceCharting blocks cloud-origin CSV downloads intermittently. This worker keeps the
// existing Clean-database pipeline, but emits progress heartbeats so a successful large
// import is not killed by the Supabase edge idle timeout.
const MIN_ROWS = 300_000;
const PARTS = 8;
const CONCURRENCY = 2;
const CHUNK_BYTES = 1_500_000;
const EXPECTED_HEADER =
  "id,console-name,product-name,loose-price,cib-price,new-price,graded-price,box-only-price,manual-only-price,bgs-10-price,condition-9-price,condition-10-price,condition-13-price,condition-14-price,condition-15-price,condition-16-price,condition-17-price,condition-18-price,condition-19-price,condition-20-price,condition-21-price,condition-22-price,gamestop-price,gamestop-trade-price,retail-loose-buy,retail-loose-sell,retail-cib-buy,retail-cib-sell,retail-new-buy,retail-new-sell,upc,sales-volume,genre,tcg-id,asin,epid,release-date";

const headers = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
  accept: "text/csv,text/plain,application/octet-stream,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
};

const cleanError = (source: string, secret: string) => source.replaceAll(secret, "<redacted>");
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function openCsv(url: string, secret: string) {
  let last = "";
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(110_000), headers });
      if (response.ok && response.body) return response;
      last = `HTTP ${response.status} ${cleanError((await response.text().catch(() => "")).slice(0, 240), secret)}`;
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) {
      last = cleanError(String((error as Error).message || error), secret);
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  throw new Error(`download failed: ${last}`);
}

async function runLoad(force: boolean) {
  const secret = Deno.env.get("PRICECHARTING_CSV_URL")?.trim();
  if (!secret) throw new Error("PRICECHARTING_CSV_URL is not configured");
  let source: URL;
  try {
    source = new URL(secret);
  } catch {
    throw new Error("PRICECHARTING_CSV_URL is not a valid URL");
  }
  source.searchParams.set("category", "comic-books");
  const csvUrl = source.toString();
  const clean = (value: string) => cleanError(value, secret);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const today = new Date().toISOString().slice(0, 10);
  const label = `PriceCharting nightly ${today}`;

  const { data: existing, error: existingError } = await supabase.from("pp_price_history").select("pp_id").eq("snapshot_label", label).limit(1);
  if (existingError) throw new Error(`history check: ${existingError.message}`);
  if (existing?.length && !force) return { ok: true, skipped: "already loaded today", label };

  const { data: activeStage, error: stageError } = await supabase.from("pp_price_stage").select("created_at").eq("run_label", label).order("created_at", { ascending: false }).limit(1);
  if (stageError) throw new Error(`stage check: ${stageError.message}`);
  if (activeStage?.length && Date.now() - new Date(activeStage[0].created_at).getTime() < 30 * 60_000) {
    return { ok: false, skipped: "a run for today is already in progress", label };
  }
  if (activeStage?.length) await supabase.from("pp_price_stage").delete().eq("run_label", label);

  try {
    const response = await openCsv(csvUrl, secret);
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let first = true;
    let staged = 0;
    let bytes = 0;
    let pieces = 0;
    const stage = async (piece: string) => {
      if (first) {
        const withoutBom = piece.replace(/^﻿/, "");
        const newline = withoutBom.indexOf("\n");
        const actual = withoutBom.slice(0, newline < 0 ? withoutBom.length : newline).replace(/[\r ]+$/g, "");
        if (actual !== EXPECTED_HEADER) throw new Error("header differs from the 37-column layout");
        piece = withoutBom;
      }
      const { data, error } = await supabase.rpc("pp_stage_csv_chunk", {
        p_label: label,
        p_chunk: piece,
        p_skip_header: first,
      });
      if (error) throw new Error(`stage: ${error.message}`);
      staged += Number(data || 0);
      pieces += 1;
      first = false;
    };

    while (true) {
      const { done, value } = await reader.read();
      if (value) {
        bytes += value.byteLength;
        buffer += decoder.decode(value, { stream: true });
      }
      if (done) buffer += decoder.decode();
      while (buffer.length >= CHUNK_BYTES) {
        const cut = buffer.lastIndexOf("\n", CHUNK_BYTES);
        if (cut < 0) break;
        await stage(buffer.slice(0, cut + 1));
        buffer = buffer.slice(cut + 1);
      }
      if (done) break;
    }
    if (buffer) await stage(buffer);

    const { data: previous } = await supabase.rpc("pp_prev_snapshot_rows");
    const previousRows = Number(previous || 0);
    if (staged < MIN_ROWS || (previousRows > 0 && staged * 100 < previousRows * 90)) {
      return { ok: false, error: `file rejected: ${staged} comic rows (previous snapshot ${previousRows}); nothing committed`, label, rows: staged, previous_rows: previousRows, bytes, pieces };
    }

    const commits: unknown[] = [];
    for (let part = 0; part < PARTS; part += CONCURRENCY) {
      const slice = Array.from({ length: CONCURRENCY }, (_, offset) => part + offset).filter((value) => value < PARTS);
      const results = await Promise.all(slice.map((value) => supabase.rpc("pp_commit_prices", { p_label: label, p_snap: today, p_part: value, p_parts: PARTS })));
      for (const result of results) {
        if (result.error) throw new Error(`commit: ${result.error.message}`);
        commits.push(result.data);
      }
    }
    return { ok: true, label, rows: staged, previous_rows: previousRows, bytes, pieces, slices: commits };
  } catch (error) {
    throw new Error(clean(String((error as Error).message || error)));
  } finally {
    await supabase.from("pp_price_stage").delete().eq("run_label", label);
  }
}

function longResponse(task: Promise<unknown>) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('{"ok":true,"state":"running"}\n'));
      const heartbeat = setInterval(() => controller.enqueue(encoder.encode('{"state":"running"}\n')), 10_000);
      task.then((result) => {
        clearInterval(heartbeat);
        controller.enqueue(encoder.encode(`${JSON.stringify(result)}\n`));
        controller.close();
      }).catch((error) => {
        clearInterval(heartbeat);
        controller.enqueue(encoder.encode(`${JSON.stringify({ ok: false, error: String((error as Error).message || error) })}\n`));
        controller.close();
      });
    },
  }), { headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" } });
}

Deno.serve(async (request) => {
  const query = new URL(request.url).searchParams;
  const secret = Deno.env.get("PRICECHARTING_CSV_URL")?.trim() || "";
  if (query.get("probe") === "1") {
    if (!secret) return json({ ok: false, error: "PRICECHARTING_CSV_URL is not configured" }, 500);
    const url = new URL(secret);
    url.searchParams.set("category", "comic-books");
    const started = Date.now();
    try {
      const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(110_000), headers });
      return json({ probe: true, status: response.status, elapsed_ms: Date.now() - started, host: url.host, path: url.pathname, parameter_names: [...url.searchParams.keys()], token_length: (url.searchParams.get("t") || "").length });
    } catch (error) {
      return json({ probe: true, elapsed_ms: Date.now() - started, error: cleanError(String((error as Error).message || error), secret) }, 502);
    }
  }
  return longResponse(runLoad(query.get("force") === "1"));
});
