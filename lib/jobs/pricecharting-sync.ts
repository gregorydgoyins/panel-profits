/**
 * PriceCharting -> Supabase sync. Runs on Render (POST /api/jobs/pricecharting-sync),
 * scheduled nightly by Supabase pg_cron. See scripts/pricecharting-nightly.ts for the CLI.
 *
 * Per book (oldest-refreshed first, then highest sales volume):
 *   1. API product -> pp_series_rows_full grade prices, dealer bid/ask, sales volume
 *   2. Product page chart -> monthly_timeline_observations
 * flag_verified_sales() re-flags comps afterwards via its own pg_cron job.
 */
import { createAdminServerClient } from "@/lib/supabase/admin";
import { translatePriceChartingJson, type PriceChartingRawJson } from "@/lib/pricing/pricecharting-adapter";
import { PC_CHART_TRACK_TO_GRADE } from "@/lib/pricing/pc-nomenclature";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Retry a Supabase call through brief database spikes (statement timeouts, 5xx). */
async function withRetry<T extends { error: any }>(fn: () => PromiseLike<T>, tries = 4): Promise<T> {
  let last: T | null = null;
  for (let i = 0; i < tries; i++) {
    last = await fn();
    if (!last.error) return last;
    await sleep(2000 * (i + 1));
  }
  return last!;
}

const GRADE_COLUMN: Record<string, string> = {
  RAW: "pp_price_raw", "2.0": "pp_price_2_0", "3.0": "pp_price_3_0", "4.0": "pp_price_4_0",
  "5.0": "pp_price_5_0", "6.0": "pp_price_6_0", "7.0": "pp_price_7_0", "8.0": "pp_price_8_0",
  "9.0": "pp_price_9_0", "9.2": "pp_price_9_2", "9.4": "pp_price_9_4", "9.6": "pp_price_9_6",
  "9.8": "pp_price_9_8", "9.8_sell": "pp_price_9_8_sell", "10.0": "pp_price_10_0",
};

class RateLimited extends Error {}

async function fetchProduct(id: string, token: string) {
  const res = await fetch(`https://www.pricecharting.com/api/product?t=${token}&id=${id}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (res.status === 429) throw new RateLimited("PriceCharting API 429");
  if (!res.ok) return null;
  const raw = (await res.json()) as PriceChartingRawJson;
  return raw.status === "success" ? translatePriceChartingJson(raw) : null;
}

async function fetchTimeline(id: string) {
  const res = await fetch(`https://www.pricecharting.com/game/${id}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: { "User-Agent": "PanelProfitsNightly/1.0 (+https://comicbookstockexchange.com)" },
  });
  if (res.status === 429) throw new RateLimited("PriceCharting page 429");
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

/**
 * Refresh one book: API prices -> pp_series_rows_full, 60-month chart JSON -> monthly_timeline_observations.
 * Also used by the comic page when a book has no saved chart yet (fetch once, save, never again).
 */
export async function refreshBook(b: { pp_id: string | number; pp_series?: string | null; pp_issue?: string | null }) {
  const TOKEN = process.env.PRICECHARTING_API_TOKEN;
  if (!TOKEN) throw new Error("PRICECHARTING_API_TOKEN not set");
  const supabase = createAdminServerClient();
  const id = String(b.pp_id);
  const [product, points] = await Promise.all([fetchProduct(id, TOKEN), fetchTimeline(id)]);
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
  }
  const { error: upErr } = await withRetry(() => supabase.from("pp_series_rows_full").update(update).eq("pp_id", b.pp_id));
  if (upErr) throw upErr;
  if (points.length) {
    const lookup_key = `${String(b.pp_series ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")}:${b.pp_issue ?? ""}`;
    const { error: tErr } = await withRetry(() => supabase
      .from("monthly_timeline_observations")
      .upsert(points.map((p) => ({ ...p, catalog_id: id, lookup_key })), { onConflict: "catalog_id,track_grade,observed_date" }));
    if (tErr) throw tErr;
  }
  return { priced: Boolean(product), points };
}

/**
 * Full sync: every book not refreshed since this run started, newest-unrefreshed first,
 * `concurrency` books in flight at once. Backs off for 60s on a PriceCharting 429.
 */
export async function runPricechartingSync(opts: { batch?: number; concurrency?: number; delayMs?: number; activeOnly?: boolean; staleDays?: number } = {}) {
  if (!process.env.PRICECHARTING_API_TOKEN) throw new Error("PRICECHARTING_API_TOKEN not set");
  const MAX = opts.batch ?? Number(process.env.PC_SYNC_BATCH || 400000);
  const CONC = Math.max(1, opts.concurrency ?? Number(process.env.PC_SYNC_CONCURRENCY || 12));
  const supabase = createAdminServerClient();
  const started = Date.now();
  const runStart = new Date().toISOString();
  // Only books not refreshed within staleDays (default: anything not done this run).
  const cutoff = opts.staleDays != null ? new Date(Date.now() - opts.staleDays * 86_400_000).toISOString() : runStart;
  let done = 0, priced = 0, timelines = 0, failed = 0, rateLimitPauses = 0;
  let pauseUntil = 0;

  while (done < MAX) {
    const { data: page, error } = await withRetry(() => {
      let q = supabase
        .from("pp_series_rows_full")
        .select("pp_id, pp_series, pp_issue")
        .or(`pp_prices_refreshed_at.is.null,pp_prices_refreshed_at.lt.${cutoff}`);
      if (opts.activeOnly) q = q.gt("pp_sales_volume", 0); // books with sales in PriceCharting's last 12 months
      return q
        .order("pp_prices_refreshed_at", { ascending: true, nullsFirst: true })
        .order("pp_sales_volume", { ascending: false, nullsFirst: false })
        .limit(Math.min(2000, MAX - done));
    });
    if (error) throw error;
    if (!page?.length) break;

    const queue = [...page];
    const worker = async () => {
      while (queue.length) {
        const b = queue.shift()!;
        const wait = pauseUntil - Date.now();
        if (wait > 0) await sleep(wait);
        try {
          const r = await refreshBook(b);
          if (r.priced) priced++;
          if (r.points.length) timelines++;
        } catch (e) {
          if (e instanceof RateLimited) {
            rateLimitPauses++;
            pauseUntil = Date.now() + 60_000;
            queue.push(b); // retry this book after the pause
            continue;
          }
          failed++;
          console.warn(`[pc-sync] ${b.pp_id} failed:`, (e as Error).message);
        }
        done++;
        if (opts.delayMs) await sleep(opts.delayMs);
      }
    };
    await Promise.all(Array.from({ length: CONC }, worker));
    console.log(`[pc-sync] ${done} books (${timelines} charts, ${failed} failed)`);
  }

  // flag_verified_sales() runs inside Postgres on its own pg_cron schedule (too long for an API call).
  const summary = { books: done, priced, timelines, failed, rateLimitPauses, minutes: Math.round((Date.now() - started) / 60000) };
  console.log("[pc-sync] done:", summary);
  return summary;
}
