/**
 * scripts/pricecharting-nightly.ts
 *
 * Nightly PriceCharting → Supabase sync (Render cron). The comic page never calls
 * PriceCharting at render time; it reads what this job stores.
 *
 * Per book (oldest-refreshed first, then highest sales volume):
 *   1. PriceCharting API product → pp_series_rows_full.pp_price_* grade columns,
 *      dealer bid/ask, sales volume, pp_prices_refreshed_at
 *   2. PriceCharting product page chart → monthly_timeline_observations
 * Then runs flag_verified_sales() so new sales get their exclusion flags.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PRICECHARTING_API_TOKEN
 *      PC_SYNC_BATCH (default 2500), PC_SYNC_DELAY_MS (default 700)
 */
import { createClient } from "@supabase/supabase-js";
import { translatePriceChartingJson, type PriceChartingRawJson } from "../lib/pricing/pricecharting-adapter";
import { PC_CHART_TRACK_TO_GRADE } from "../lib/pricing/pc-nomenclature";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TOKEN = process.env.PRICECHARTING_API_TOKEN;
const BATCH = Number(process.env.PC_SYNC_BATCH || 2500);
const DELAY = Number(process.env.PC_SYNC_DELAY_MS || 700);

if (!SUPABASE_URL || !SUPABASE_KEY || !TOKEN) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / PRICECHARTING_API_TOKEN");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const GRADE_COLUMN: Record<string, string> = {
  RAW: "pp_price_raw", "2.0": "pp_price_2_0", "3.0": "pp_price_3_0", "4.0": "pp_price_4_0",
  "5.0": "pp_price_5_0", "6.0": "pp_price_6_0", "7.0": "pp_price_7_0", "8.0": "pp_price_8_0",
  "9.0": "pp_price_9_0", "9.2": "pp_price_9_2", "9.4": "pp_price_9_4", "9.6": "pp_price_9_6",
  "9.8": "pp_price_9_8", "9.8_sell": "pp_price_9_8_sell", "10.0": "pp_price_10_0",
};

async function fetchProduct(id: string) {
  const res = await fetch(`https://www.pricecharting.com/api/product?t=${TOKEN}&id=${id}`);
  if (!res.ok) return null;
  const raw = (await res.json()) as PriceChartingRawJson;
  return raw.status === "success" ? translatePriceChartingJson(raw) : null;
}

async function fetchTimeline(id: string) {
  const res = await fetch(`https://www.pricecharting.com/game/${id}`, {
    headers: { "User-Agent": "PanelProfitsNightly/1.0 (+https://comicbookstockexchange.com)" },
  });
  if (!res.ok) return [];
  const html = await res.text();
  if (html.match(/VGPC\.product\s*=\s*\{\s*id:\s*(\d+)/)?.[1] !== id) return [];
  const m = html.match(/VGPC\.chart_data\s*=\s*(\{[\s\S]*?\});/);
  if (!m) return [];
  let chart: Record<string, Array<[number, number]>>;
  try { chart = JSON.parse(m[1]); } catch { return []; }
  const currentMonth = new Date().toISOString().slice(0, 7);
  const out: Array<{ track_grade: string; observed_date: string; price_usd: number }> = [];
  for (const [track, grade] of Object.entries(PC_CHART_TRACK_TO_GRADE)) {
    for (const p of chart[track] ?? []) {
      if (!Array.isArray(p) || !(p[1] > 0)) continue;
      const date = new Date(p[0]).toISOString().slice(0, 10);
      if (date.slice(0, 7) > currentMonth) continue;
      out.push({ track_grade: grade, observed_date: date, price_usd: Number((p[1] / 100).toFixed(2)) });
    }
  }
  return out;
}

async function main() {
  const started = Date.now();
  const { data: books, error } = await supabase
    .from("pp_series_rows_full")
    .select("pp_id, pp_series, pp_issue")
    .order("pp_prices_refreshed_at", { ascending: true, nullsFirst: true })
    .order("pp_sales_volume", { ascending: false, nullsFirst: false })
    .limit(BATCH);
  if (error) throw error;
  console.log(`[pc-nightly] ${books?.length ?? 0} books to refresh`);

  let priced = 0, timelines = 0, failed = 0;
  for (const b of books ?? []) {
    const id = String(b.pp_id);
    try {
      const product = await fetchProduct(id);
      const update: Record<string, unknown> = { pp_prices_refreshed_at: new Date().toISOString() };
      if (product) {
        for (const [g, col] of Object.entries(GRADE_COLUMN)) {
          update[col] = (product.grades as Record<string, number | null>)[g] ?? null;
        }
        const q = product.dealerQuotes;
        Object.assign(update, {
          pp_retail_raw_buy: q.raw.bid, pp_retail_raw_sell: q.raw.ask,
          pp_retail_4_0_buy: q.grade4_0.bid, pp_retail_4_0_sell: q.grade4_0.ask,
          pp_retail_6_0_buy: q.grade6_0.bid, pp_retail_6_0_sell: q.grade6_0.ask,
          pp_sales_volume: product.salesVolumeYearly,
        });
        priced++;
      }
      const { error: upErr } = await supabase.from("pp_series_rows_full").update(update).eq("pp_id", b.pp_id);
      if (upErr) throw upErr;

      await sleep(DELAY);
      const points = await fetchTimeline(id);
      if (points.length) {
        const lookup_key = `${String(b.pp_series ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")}:${b.pp_issue ?? ""}`;
        const { error: tErr } = await supabase
          .from("monthly_timeline_observations")
          .upsert(points.map((p) => ({ ...p, catalog_id: id, lookup_key })), { onConflict: "catalog_id,track_grade,observed_date" });
        if (tErr) throw tErr;
        timelines++;
      }
    } catch (e) {
      failed++;
      console.warn(`[pc-nightly] ${id} failed:`, (e as Error).message);
    }
    await sleep(DELAY);
  }

  const { data: flags, error: flagErr } = await supabase.rpc("flag_verified_sales");
  if (flagErr) console.warn("[pc-nightly] flag_verified_sales failed:", flagErr.message);
  else console.log("[pc-nightly] sales flags:", flags);

  console.log(`[pc-nightly] done: priced ${priced}, timelines ${timelines}, failed ${failed}, ${Math.round((Date.now() - started) / 60000)} min`);
}

main().catch((e) => { console.error(e); process.exit(1); });
