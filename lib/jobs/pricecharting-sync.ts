/**
 * PriceCharting -> Supabase sync. Runs on Render (POST /api/jobs/pricecharting-sync),
 * scheduled nightly by Supabase pg_cron. See scripts/pricecharting-nightly.ts for the CLI.
 *
 * Per book (oldest-refreshed first, then highest sales volume):
 *   1. API product -> pp_series_rows_full grade prices, dealer bid/ask, sales volume
 *   2. Product page chart -> monthly_timeline_observations
 * Then flag_verified_sales() re-flags the sales comps.
 */
import { createAdminServerClient } from "@/lib/supabase/admin";
import { translatePriceChartingJson, type PriceChartingRawJson } from "@/lib/pricing/pricecharting-adapter";
import { PC_CHART_TRACK_TO_GRADE } from "@/lib/pricing/pc-nomenclature";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const GRADE_COLUMN: Record<string, string> = {
  RAW: "pp_price_raw", "2.0": "pp_price_2_0", "3.0": "pp_price_3_0", "4.0": "pp_price_4_0",
  "5.0": "pp_price_5_0", "6.0": "pp_price_6_0", "7.0": "pp_price_7_0", "8.0": "pp_price_8_0",
  "9.0": "pp_price_9_0", "9.2": "pp_price_9_2", "9.4": "pp_price_9_4", "9.6": "pp_price_9_6",
  "9.8": "pp_price_9_8", "9.8_sell": "pp_price_9_8_sell", "10.0": "pp_price_10_0",
};

async function fetchProduct(id: string, token: string) {
  const res = await fetch(`https://www.pricecharting.com/api/product?t=${token}&id=${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  const raw = (await res.json()) as PriceChartingRawJson;
  return raw.status === "success" ? translatePriceChartingJson(raw) : null;
}

async function fetchTimeline(id: string) {
  const res = await fetch(`https://www.pricecharting.com/game/${id}`, {
    cache: "no-store",
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

export async function runPricechartingSync(opts: { batch?: number; delayMs?: number } = {}) {
  const TOKEN = process.env.PRICECHARTING_API_TOKEN;
  if (!TOKEN) throw new Error("PRICECHARTING_API_TOKEN not set");
  const BATCH = opts.batch ?? Number(process.env.PC_SYNC_BATCH || 2500);
  const DELAY = opts.delayMs ?? Number(process.env.PC_SYNC_DELAY_MS || 700);
  const supabase = createAdminServerClient();
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
      const product = await fetchProduct(id, TOKEN);
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

  const summary = { books: books?.length ?? 0, priced, timelines, failed, minutes: Math.round((Date.now() - started) / 60000) };
  console.log("[pc-nightly] done:", summary);
  return summary;
}

