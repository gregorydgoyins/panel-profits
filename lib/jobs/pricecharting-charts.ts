/**
 * PriceCharting chart JSON -> Supabase. Each product page embeds `VGPC.chart_data`: the monthly price
 * series per condition (50-60 months). This job reads that JSON for every book that has none saved yet
 * and stores it as one compact row per book in public.pp_chart_json.
 *
 * Guard rails: a fixed number of pages in flight, and the whole run STOPS the moment PriceCharting
 * refuses or challenges a request (403 / 429 / 503 / Cloudflare page). It never retries into a block.
 */
import { createAdminServerClient } from "@/lib/supabase/admin";
import { PC_CHART_TRACK_TO_GRADE, PC_SOLD_TABLE_TO_GRADE } from "@/lib/pricing/pc-nomenclature";

/** Every PriceCharting chart track -> grade: all 14 grade tracks (hyphens are dropped in the chart JSON keys). */
const TRACK_TO_GRADE: Record<string, string> = {
  ...Object.fromEntries(Object.entries(PC_SOLD_TABLE_TO_GRADE).map(([slug, grade]) => [slug.replace(/-/g, ""), grade])),
  ...PC_CHART_TRACK_TO_GRADE,
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
class Refused extends Error {}

export type ChartJson = Record<string, Array<[string, number]>>; // grade -> [[YYYY-MM-DD, usd], ...]

async function fetchChart(id: string): Promise<ChartJson | null> {
  const res = await fetch(`https://www.pricecharting.com/game/${id}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
    headers: { "User-Agent": "PanelProfits/1.0 (+https://comicbookstockexchange.com)" },
  });
  if ([403, 429, 503].includes(res.status)) throw new Refused(`PriceCharting page ${res.status}`);
  if (!res.ok) return null;
  const html = await res.text();
  if (/just a moment|attention required|error 1015|rate limited/i.test(html.slice(0, 3000))) throw new Refused("PriceCharting challenge page");
  if (html.match(/VGPC\.product\s*=\s*\{\s*id:\s*(\d+)/)?.[1] !== id) return null;
  const m = html.match(/VGPC\.chart_data\s*=\s*(\{[\s\S]*?\});/);
  if (!m) return null;
  let chart: Record<string, Array<[number, number]>>;
  try { chart = JSON.parse(m[1]); } catch { return null; }
  const currentMonth = new Date().toISOString().slice(0, 7);
  const out: ChartJson = {};
  for (const [track, series] of Object.entries(chart)) {
    if (!Array.isArray(series)) continue;
    // Known tracks are stored under their grade; anything unrecognised is kept under its own name, never dropped.
    const grade = TRACK_TO_GRADE[track] ?? `pc:${track}`;
    const pts: Array<[string, number]> = [];
    for (const p of series) {
      if (!Array.isArray(p) || !(p[1] > 0)) continue;
      const date = new Date(p[0]).toISOString().slice(0, 10);
      if (date.slice(0, 7) > currentMonth) continue;
      pts.push([date, Number((p[1] / 100).toFixed(2))]);
    }
    if (pts.length) out[grade] = pts;
  }
  return out;
}

export async function runPricechartingCharts(opts: { batch?: number; concurrency?: number; gapMs?: number } = {}) {
  const MAX = opts.batch ?? 400000;
  const CONC = Math.min(16, Math.max(1, opts.concurrency ?? 8));
  const GAP = Math.max(0, opts.gapMs ?? 250); // pause each worker takes between pages
  const supabase = createAdminServerClient();
  const started = Date.now();
  let seen = 0, fetched = 0, withChart = 0, noChart = 0, failed = 0;
  let refusal: string | null = null;
  let lastId = "";

  while (fetched + failed < MAX && !refusal) {
    // Walk the catalog by pp_id; skip books that already have a saved chart row.
    const { data: page, error } = await supabase
      .from("pp_series_rows_full").select("pp_id").gt("pp_id", lastId).order("pp_id", { ascending: true }).limit(1000);
    if (error) throw error;
    if (!page?.length) break;
    lastId = String(page[page.length - 1].pp_id);
    const ids = [...new Set(page.map((r: any) => String(r.pp_id)))];
    seen += ids.length;
    const { data: have, error: hErr } = await supabase.from("pp_chart_json").select("pp_id").in("pp_id", ids);
    if (hErr) throw hErr;
    const done = new Set((have ?? []).map((r: any) => String(r.pp_id)));
    const queue = ids.filter((id) => !done.has(id));

    const rows: Array<{ pp_id: string; chart: ChartJson; points: number; fetched_at: string }> = [];
    const worker = async () => {
      while (queue.length && !refusal) {
        const id = queue.shift()!;
        try {
          const chart = await fetchChart(id);
          fetched++;
          const points = chart ? Object.values(chart).reduce((n, a) => n + a.length, 0) : 0;
          if (points) withChart++; else noChart++;
          rows.push({ pp_id: id, chart: chart ?? {}, points, fetched_at: new Date().toISOString() });
        } catch (e) {
          if (e instanceof Refused) { refusal = e.message; break; }
          failed++;
        }
        if (GAP) await sleep(GAP);
      }
    };
    await Promise.all(Array.from({ length: CONC }, worker));
    for (let i = 0; i < rows.length; i += 200) {
      const { error: wErr } = await supabase.from("pp_chart_json").upsert(rows.slice(i, i + 200), { onConflict: "pp_id" });
      if (wErr) throw wErr;
    }
    console.log(`[pc-charts] scanned ${seen}, fetched ${fetched} (${withChart} with chart), failed ${failed}`);
  }

  const secs = Math.max(1, Math.round((Date.now() - started) / 1000));
  return { scanned: seen, fetched, withChart, noChart, failed, stoppedOnRefusal: refusal, minutes: Math.round(secs / 60), pagesPerSecond: Number((fetched / secs).toFixed(2)) };
}
