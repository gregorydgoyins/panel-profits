/**
 * PriceCharting full book load -> Supabase. One request for a book's page returns everything PriceCharting
 * publishes for it (layout verified on Amazing Spider-Man #1, product 2314818, 2026-11-15):
 *   - chart:   VGPC.chart_data, monthly price series per track (ASM #1: 6 tracks x 83 months, Jan 2020 on)
 *   - pop:     VGPC.pop_data.cgc, CGC population for the 14 grades
 *   - guide:   "Full Price Guide" table, current price for all 14 grades
 *   - box:     headline price + change since last update for the six headline grades
 *   - details: key issue flag, release date, publisher, print run, notes, UPC, ePID, comics.org ID
 *   - sales:   every sold listing on the page, per grade table (date, price, list price, venue, title, id, url)
 * Stored as one compact row per book in public.pp_chart_json.
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
export interface BookSale { d: string; p: number; lp: number | null; g: string; v: string; t: string; id: string; u: string | null }
export interface BookLoad {
  chart: ChartJson; points: number;
  pop: Record<string, number> | null;
  guide: Record<string, number>;
  box: Record<string, { price: number | null; change: number | null }>;
  details: Record<string, string>;
  sales: BookSale[];
}

const GRADE_ORDER = ["RAW", "2.0", "3.0", "4.0", "5.0", "6.0", "7.0", "8.0", "9.0", "9.2", "9.4", "9.6", "9.8", "10.0"];
const BOX_IDS: Record<string, string> = {
  used_price: "RAW", complete_price: "4.0", new_price: "6.0", graded_price: "8.0", box_only_price: "9.2", manual_only_price: "9.8",
};
const money = (s: string | undefined | null) => {
  const m = String(s ?? "").replace(/&nbsp;/g, " ").match(/-?\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/);
  return m ? Number(m[1].replace(/,/g, "")) : null;
};
const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();

/** Parse one PriceCharting product page. Returns null when the page is not the requested product. */
export function parseBookPage(html: string, id: string): BookLoad | null {
  if (html.match(/VGPC\.product\s*=\s*\{\s*id:\s*(\d+)/)?.[1] !== id) return null;

  // chart
  const chart: ChartJson = {};
  const cm = html.match(/VGPC\.chart_data\s*=\s*(\{[\s\S]*?\});/);
  if (cm) {
    try {
      const raw = JSON.parse(cm[1]) as Record<string, Array<[number, number]>>;
      const currentMonth = new Date().toISOString().slice(0, 7);
      for (const [track, series] of Object.entries(raw)) {
        if (!Array.isArray(series)) continue;
        const grade = TRACK_TO_GRADE[track] ?? `pc:${track}`;
        const pts: Array<[string, number]> = [];
        for (const p of series) {
          if (!Array.isArray(p) || !(p[1] > 0)) continue;
          const date = new Date(p[0]).toISOString().slice(0, 10);
          if (date.slice(0, 7) > currentMonth) continue;
          pts.push([date, Number((p[1] / 100).toFixed(2))]);
        }
        if (pts.length) chart[grade] = pts;
      }
    } catch { /* leave chart empty */ }
  }

  // CGC population, 14 grades in PriceCharting's order (Ungraded/lowest ... 10)
  let pop: Record<string, number> | null = null;
  const pm = html.match(/VGPC\.pop_data\s*=\s*(\{[\s\S]*?\});/);
  if (pm) {
    try {
      const cgc = (JSON.parse(pm[1]) as { cgc?: number[] }).cgc;
      if (Array.isArray(cgc) && cgc.length) pop = Object.fromEntries(cgc.map((n, i) => [GRADE_ORDER[i] ?? `g${i}`, Number(n) || 0]));
    } catch { /* none */ }
  }

  // full price guide (14 grades)
  const guide: Record<string, number> = {};
  const fp = html.match(/<div id="full-prices">([\s\S]*?)<\/table>/)?.[1] ?? "";
  for (const m of fp.matchAll(/<td>\s*([^<]+?)\s*<\/td>\s*<td class="price js-price">\s*([^<]*)<\/td>/g)) {
    const label = m[1].trim();
    const grade = /ungraded/i.test(label) ? "RAW" : /^10$/.test(label) ? "10.0" : label;
    const v = money(m[2]);
    if (v != null && v > 0) guide[grade] = v;
  }

  // headline box: price + change since last update
  const box: BookLoad["box"] = {};
  for (const [domId, grade] of Object.entries(BOX_IDS)) {
    const cell = html.match(new RegExp(`<td id="${domId}"[^>]*>([\\s\\S]*?)</td>`))?.[1];
    if (!cell) continue;
    const price = money(cell.match(/class="price js-price">\s*([^<]*)</)?.[1]);
    const ch = cell.match(/class="change"[^>]*>\s*([-+]?)\s*<span class="js-price">\s*([^<]*)</);
    const change = ch ? (money(ch[2]) ?? 0) * (ch[1] === "-" ? -1 : 1) : null;
    box[grade] = { price, change };
  }

  // details table
  const details: Record<string, string> = {};
  const at = html.match(/<table id="attribute">([\s\S]*?)<\/table>/)?.[1] ?? "";
  for (const m of at.matchAll(/<td class="title">\s*([^<]*?):?\s*<\/td>\s*<td class="details"[^>]*>([\s\S]*?)<\/td>/g)) {
    const k = m[1].replace(/:$/, "").trim();
    const v = text(m[2]).replace(/\s*\bedit\b\s*$/i, "").trim();
    if (k && v && !/^(none|n\/a)$/i.test(v)) details[k] = v;
  }

  // sold listings, one table per grade
  const sales: BookSale[] = [];
  const heads = [...html.matchAll(/<div class="completed-auctions-([a-z-]+)"[^>]*>/g)];
  for (let i = 0; i < heads.length; i++) {
    const slug = heads[i][1];
    const grade = PC_SOLD_TABLE_TO_GRADE[slug];
    if (!grade) continue;
    const body = html.slice(heads[i].index! + heads[i][0].length, i + 1 < heads.length ? heads[i + 1].index! : heads[i].index! + 400000);
    for (const r of body.matchAll(/<tr id="([^"]+)">([\s\S]*?)<\/tr>/g)) {
      const row = r[2];
      const d = row.match(/<td class="date">\s*(\d{4}-\d{2}-\d{2})/)?.[1];
      const a = row.match(/<td class="title">\s*<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>\s*(?:\[([^\]]+)\])?/);
      const p = money(row.match(/<td class="numeric">\s*<span class="js-price">\s*([^<]*)</)?.[1]);
      const lp = money(row.match(/<td class="numeric listed-price">\s*(?:<span[^>]*>)?\s*([^<]*)</)?.[1]);
      if (!d || p == null || !(p > 0)) continue;
      sales.push({ d, p, lp, g: grade, v: (a?.[3] ?? r[1].split("-")[0]).trim(), t: a ? text(a[2]) : "", id: r[1], u: a ? a[1].replace(/&amp;/g, "&").split("?")[0] : null });
    }
  }

  return { chart, points: Object.values(chart).reduce((n, x) => n + x.length, 0), pop, guide, box, details, sales };
}

async function fetchBook(id: string): Promise<BookLoad | null> {
  const res = await fetch(`https://www.pricecharting.com/game/${id}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
    headers: { "User-Agent": "PanelProfits/1.0 (+https://comicbookstockexchange.com)" },
  });
  if ([403, 429, 503].includes(res.status)) throw new Refused(`PriceCharting page ${res.status}`);
  if (!res.ok) return null;
  const html = await res.text();
  if (/just a moment|attention required|error 1015|rate limited/i.test(html.slice(0, 3000))) throw new Refused("PriceCharting challenge page");
  return parseBookPage(html, id);
}

export async function runPricechartingCharts(opts: { batch?: number; concurrency?: number; gapMs?: number; ids?: string[] } = {}) {
  const MAX = opts.batch ?? 400000;
  const CONC = Math.min(16, Math.max(1, opts.concurrency ?? 8));
  const GAP = Math.max(0, opts.gapMs ?? 250); // pause each worker takes between pages
  const supabase = createAdminServerClient();
  const started = Date.now();
  let seen = 0, fetched = 0, withChart = 0, noChart = 0, failed = 0, salesSaved = 0;
  let idsDone = false;
  let refusal: string | null = null;
  let lastId = "";

  while (fetched + failed < MAX && !refusal) {
    let queue: string[];
    if (opts.ids?.length) {
      // Explicit books: always (re)load these.
      if (idsDone) break;
      idsDone = true;
      queue = [...new Set(opts.ids.map(String))];
      seen += queue.length;
    } else {
      // Walk the catalog by pp_id; skip books that already have a saved row.
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
      queue = ids.filter((id) => !done.has(id));
    }

    const rows: Array<Record<string, unknown>> = [];
    const worker = async () => {
      while (queue.length && !refusal) {
        const id = queue.shift()!;
        try {
          const book = await fetchBook(id);
          fetched++;
          if (book?.points) withChart++; else noChart++;
          salesSaved += book?.sales.length ?? 0;
          rows.push({
            pp_id: id, chart: book?.chart ?? {}, points: book?.points ?? 0,
            pop: book?.pop ?? null, guide: book?.guide ?? {}, box: book?.box ?? {}, details: book?.details ?? {},
            sales: book?.sales ?? [], sales_count: book?.sales.length ?? 0, fetched_at: new Date().toISOString(),
          });
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
  return { scanned: seen, fetched, withChart, noChart, salesSaved, failed, stoppedOnRefusal: refusal, minutes: Math.round(secs / 60), pagesPerSecond: Number((fetched / secs).toFixed(2)) };
}
