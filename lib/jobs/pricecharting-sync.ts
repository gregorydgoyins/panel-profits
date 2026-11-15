/**
 * PriceCharting -> Supabase sync. Runs on Render (POST /api/jobs/pricecharting-sync),
 * scheduled nightly by Supabase pg_cron. See scripts/pricecharting-nightly.ts for the CLI.
 *
 * PriceCharting's published terms (https://www.pricecharting.com/price-guide):
 *   - "The API is limited to 1 call every second" — more gets calls blocked and account permissions revoked.
 *   - The API returns current values only; historic prices are not available through it.
 * So: one API call at a time, at least 1.1s apart, process-wide. No product-page fetching.
 *
 * Per book (oldest-refreshed first, then highest sales volume):
 *   1. API product JSON -> pp_series_rows_full grade prices, dealer bid/ask, sales volume
 *   2. If anything changed, a dated snapshot -> pp_price_history (our own price history, built going forward)
 * flag_verified_sales() re-flags comps afterwards via its own pg_cron job.
 */
import { createAdminServerClient } from "@/lib/supabase/admin";
import { translatePriceChartingJson, type PriceChartingRawJson } from "@/lib/pricing/pricecharting-adapter";

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

/** Process-wide gate: every PriceCharting API call waits its turn, >= 1.1s after the previous one. */
const PC_API_MIN_GAP_MS = 1100;
let pcApiChain: Promise<void> = Promise.resolve();
let pcApiLastCall = 0;
function pcApiSlot(): Promise<void> {
  const next = pcApiChain.then(async () => {
    const wait = pcApiLastCall + PC_API_MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    pcApiLastCall = Date.now();
  });
  pcApiChain = next.catch(() => {});
  return next;
}

async function fetchProduct(id: string, token: string) {
  await pcApiSlot();
  const res = await fetch(`https://www.pricecharting.com/api/product?t=${token}&id=${id}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (res.status === 429 || res.status === 403) throw new RateLimited(`PriceCharting API ${res.status}`);
  if (!res.ok) return null;
  const raw = (await res.json()) as PriceChartingRawJson;
  return raw.status === "success" ? translatePriceChartingJson(raw) : null;
}

const PRICE_COLUMNS = [
  ...Object.values(GRADE_COLUMN),
  "pp_retail_raw_buy", "pp_retail_raw_sell", "pp_retail_4_0_buy", "pp_retail_4_0_sell", "pp_retail_6_0_buy", "pp_retail_6_0_sell",
  "pp_sales_volume",
];

/**
 * Refresh one book from the PriceCharting API JSON: current prices -> pp_series_rows_full.
 * When a value changed (or the book has no previous values), also writes a dated snapshot to pp_price_history.
 */
export async function refreshBook(b: { pp_id: string | number; pp_series?: string | null; pp_issue?: string | null } & Record<string, unknown>) {
  const TOKEN = process.env.PRICECHARTING_API_TOKEN;
  if (!TOKEN) throw new Error("PRICECHARTING_API_TOKEN not set");
  const supabase = createAdminServerClient();
  const id = String(b.pp_id);
  const product = await fetchProduct(id, TOKEN);
  const update: Record<string, unknown> = { pp_prices_refreshed_at: new Date().toISOString() };
  let changed = false;
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
    const num = (v: unknown) => (v == null || v === "" ? null : Number(v));
    changed = PRICE_COLUMNS.some((c) => !(c in b) || num(b[c]) !== num(update[c]));
  }
  const { error: upErr } = await withRetry(() => supabase.from("pp_series_rows_full").update(update).eq("pp_id", b.pp_id));
  if (upErr) throw upErr;
  if (product && changed) {
    const today = new Date().toISOString().slice(0, 10);
    const snapshot: Record<string, unknown> = { pp_id: id, snapshot_date: today, snapshot_label: `PriceCharting API ${today}` };
    for (const c of PRICE_COLUMNS) snapshot[c] = update[c] ?? null;
    const { error: hErr } = await withRetry(() => supabase
      .from("pp_price_history")
      .upsert(snapshot, { onConflict: "pp_id,snapshot_label", ignoreDuplicates: true }));
    if (hErr) console.warn(`[pc-sync] snapshot ${id} failed:`, hErr.message);
  }
  return { priced: Boolean(product), changed };
}

/**
 * Sync: books not refreshed within staleDays, oldest first, strictly one API call at a time (<= 1 per 1.1s).
 * `concurrency` is accepted for compatibility and ignored. On a PriceCharting refusal (429/403) it waits
 * 10 minutes; after 3 refusals the run stops so the account is never pushed.
 */
export async function runPricechartingSync(opts: { batch?: number; concurrency?: number; delayMs?: number; activeOnly?: boolean; staleDays?: number } = {}) {
  if (!process.env.PRICECHARTING_API_TOKEN) throw new Error("PRICECHARTING_API_TOKEN not set");
  const MAX = opts.batch ?? Number(process.env.PC_SYNC_BATCH || 400000);
  const CONC = 1;
  const supabase = createAdminServerClient();
  const started = Date.now();
  const runStart = new Date().toISOString();
  // Only books not refreshed within staleDays (default: anything not done this run).
  const cutoff = opts.staleDays != null ? new Date(Date.now() - opts.staleDays * 86_400_000).toISOString() : runStart;
  let done = 0, priced = 0, timelines = 0, failed = 0, rateLimitPauses = 0, stopped = false;
  let pauseUntil = 0;

  while (done < MAX && !stopped) {
    const { data: page, error } = await withRetry(() => {
      let q = supabase
        .from("pp_series_rows_full")
        .select(["pp_id", "pp_series", "pp_issue", ...PRICE_COLUMNS].join(","))
        .or(`pp_prices_refreshed_at.is.null,pp_prices_refreshed_at.lt.${cutoff}`);
      if (opts.activeOnly) q = q.gt("pp_sales_volume", 0); // books with sales in PriceCharting's last 12 months
      return q
        .order("pp_prices_refreshed_at", { ascending: true, nullsFirst: true })
        .order("pp_sales_volume", { ascending: false, nullsFirst: false })
        .limit(Math.min(2000, MAX - done));
    });
    if (error) throw error;
    if (!page?.length) break;

    const queue = [...(page as unknown as Array<Record<string, any>>)];
    const worker = async () => {
      while (queue.length && !stopped) {
        const b = queue.shift()!;
        const wait = pauseUntil - Date.now();
        if (wait > 0) await sleep(wait);
        try {
          const r = await refreshBook(b as any);
          if (r.priced) priced++;
          if (r.changed) timelines++;
        } catch (e) {
          if (e instanceof RateLimited) {
            rateLimitPauses++;
            if (rateLimitPauses >= 3) { stopped = true; break; }
            pauseUntil = Date.now() + 600_000;
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
    console.log(`[pc-sync] ${done} books (${timelines} changed, ${failed} failed)`);
  }

  // flag_verified_sales() runs inside Postgres on its own pg_cron schedule (too long for an API call).
  const summary = { books: done, priced, changed: timelines, failed, rateLimitPauses, stoppedOnRateLimit: stopped, minutes: Math.round((Date.now() - started) / 60000) };
  console.log("[pc-sync] done:", summary);
  return summary;
}
