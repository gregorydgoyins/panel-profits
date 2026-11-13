/**
 * Comichron monthly Diamond charts -> Supabase (comichron_monthly_estimates), then
 * compute_comic_print_runs(). Runs on Render (POST /api/jobs/comichron-ingest),
 * scheduled monthly by Supabase pg_cron.
 * Source: https://www.comichron.com/monthlycomicssales/YYYY/YYYY-MM.html
 */
import { createAdminServerClient } from "@/lib/supabase/admin";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const text = (html: string) =>
  html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
const num = (s: string) => {
  const n = Number(s.replace(/[$,*]/g, "").trim());
  return Number.isFinite(n) ? n : null;
};

export interface ChartRow {
  rank_units: number | null; title: string; issue: string | null; price_usd: number | null;
  on_sale: string | null; publisher: string | null; est_units: number; is_combined: boolean;
}

/** Parse one monthly chart page. Column layout varies by year, so cells are read by shape. */
export function parseMonthlyChart(html: string): ChartRow[] {
  const out: ChartRow[] = [];
  for (const tr of html.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? []) {
    const cells = (tr.match(/<td\b[\s\S]*?<\/td>/gi) ?? []).map(text);
    if (cells.length < 5) continue;
    const units = num(cells[cells.length - 1]);
    const rank = num(cells[0]);
    if (units == null || units <= 0 || rank == null) continue;
    const priceIdx = cells.findIndex((c) => /^\$\d/.test(c));
    // Title = first cell after the leading rank columns that is not a number.
    let ti = 1;
    while (ti < cells.length && (num(cells[ti]) != null || /^n\.?a\.?$/i.test(cells[ti]))) ti++;
    const title = cells[ti];
    if (!title || ti >= cells.length - 2) continue;
    const rawIssue = priceIdx > ti + 1 ? cells[ti + 1] : null;
    const dateCell = cells.find((c) => /^\d{2}\/\d{2}\/\d{2,4}$/.test(c)) ?? null;
    let on_sale: string | null = null;
    if (dateCell) {
      const [mm, dd, yy] = dateCell.split("/");
      const year = yy.length === 2 ? (Number(yy) > 50 ? 1900 + Number(yy) : 2000 + Number(yy)) : Number(yy);
      on_sale = `${year}-${mm}-${dd}`;
    }
    const publisher = cells[cells.length - 2] && num(cells[cells.length - 2]) == null && !/^\d{2}\//.test(cells[cells.length - 2])
      ? cells[cells.length - 2] : null;
    const is_combined = /\(all\)/i.test(rawIssue ?? "");
    const issue = rawIssue ? rawIssue.replace(/\(all\)/i, "").replace(/\*/g, "").trim() : null;
    out.push({
      rank_units: rank, title, issue, price_usd: priceIdx >= 0 ? num(cells[priceIdx]) : null,
      on_sale, publisher, est_units: Math.round(units), is_combined,
    });
  }
  return out;
}

export async function runComichronIngest(opts: { from?: string; to?: string; delayMs?: number } = {}) {
  const supabase = createAdminServerClient();
  const DELAY = opts.delayMs ?? 1500;
  const now = new Date();
  const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const [fy, fm] = (opts.from || "1991-01").split("-").map(Number);
  const to = opts.to || `${lastMonth.getUTCFullYear()}-${String(lastMonth.getUTCMonth() + 1).padStart(2, "0")}`;
  const [ty, tm] = to.split("-").map(Number);
  let total = 0;
  for (let y = fy, m = fm; y < ty || (y === ty && m <= tm); m === 12 ? (y++, m = 1) : m++) {
    const url = `https://www.comichron.com/monthlycomicssales/${y}/${y}-${String(m).padStart(2, "0")}.html`;
    try {
      const res = await fetch(url, { cache: "no-store", headers: { "User-Agent": "PanelProfitsResearch/1.0 (+https://comicbookstockexchange.com)" } });
      if (!res.ok) { console.log(`[comichron] ${y}-${m}: HTTP ${res.status}`); await sleep(DELAY); continue; }
      const rows = parseMonthlyChart(await res.text());
      if (rows.length) {
        const payload = rows.map((r) => ({
          ...r, chart_year: y, chart_month: m, title_key: key(r.title), issue_key: r.issue ? key(r.issue) : null, source_url: url,
        }));
        for (let i = 0; i < payload.length; i += 500) {
          const { error } = await supabase.from("comichron_monthly_estimates")
            .upsert(payload.slice(i, i + 500), { onConflict: "chart_year,chart_month,title_key,issue,price_usd,est_units", ignoreDuplicates: true });
          if (error) throw error;
        }
        total += rows.length;
      }
      console.log(`[comichron] ${y}-${String(m).padStart(2, "0")}: ${rows.length} rows`);
    } catch (e) {
      console.warn(`[comichron] ${y}-${m} failed:`, (e as Error).message);
    }
    await sleep(DELAY);
  }
  console.log(`[comichron] loaded ${total} chart rows`);
  const { data, error } = await supabase.rpc("compute_comic_print_runs");
  if (error) console.warn("[comichron] compute_comic_print_runs failed:", error.message);
  else console.log("[comichron] print runs:", data);
  return { rows: total, printRuns: data ?? null };
}

