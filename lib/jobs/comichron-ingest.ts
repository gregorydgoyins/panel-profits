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

/**
 * Parse one monthly chart page. Only a column whose header reads as estimated units
 * ("Est. units", "Overall DM Units (est.)") is stored as copies. Pre-1997 pages that only
 * publish Diamond's "Order Index" (relative to a benchmark issue = 100) yield no rows:
 * an index is not a copy count.
 */
export function parseMonthlyChart(html: string): ChartRow[] {
  const out: ChartRow[] = [];
  const rows = html.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? [];
  // Header = first row with <th> cells, else first row whose cells are all non-numeric.
  let header: string[] | null = null;
  for (const tr of rows) {
    const th = (tr.match(/<th\b[\s\S]*?<\/th>/gi) ?? []).map(text);
    if (th.length >= 4) { header = th; break; }
    const td = (tr.match(/<td\b[\s\S]*?<\/td>/gi) ?? []).map(text);
    if (td.length >= 4 && td.every((c) => num(c) == null) && td.some((c) => /title/i.test(c))) { header = td; break; }
  }
  if (!header) return out;
  const col = (re: RegExp) => header!.findIndex((h) => re.test(h));
  const unitsIdx = header.findIndex((h) => /units/i.test(h) && /est/i.test(h));
  if (unitsIdx < 0) return out; // index-only chart
  const titleIdx = col(/title/i);
  const issueIdx = col(/^issue/i);
  const priceIdx = col(/price/i);
  const saleIdx = col(/on sale/i);
  const pubIdx = col(/publisher/i);
  if (titleIdx < 0) return out;

  for (const tr of rows) {
    const cells = (tr.match(/<td\b[\s\S]*?<\/td>/gi) ?? []).map(text);
    if (cells.length < header.length - 1) continue;
    const units = num(cells[unitsIdx] ?? "");
    const rank = num(cells[0] ?? "");
    const title = cells[titleIdx];
    if (units == null || units <= 0 || rank == null || !title) continue;
    const rawIssue = issueIdx >= 0 ? cells[issueIdx] ?? null : null;
    let on_sale: string | null = null;
    const dateCell = saleIdx >= 0 ? cells[saleIdx] : null;
    if (dateCell && /^\d{2}\/\d{2}\/\d{2,4}$/.test(dateCell)) {
      const [mm, dd, yy] = dateCell.split("/");
      const year = yy.length === 2 ? (Number(yy) > 50 ? 1900 + Number(yy) : 2000 + Number(yy)) : Number(yy);
      on_sale = `${year}-${mm}-${dd}`;
    }
    const is_combined = /\(all\)/i.test(rawIssue ?? "");
    const issue = rawIssue ? rawIssue.replace(/\(all\)/i, "").replace(/\*/g, "").trim() : null;
    out.push({
      rank_units: rank, title, issue,
      price_usd: priceIdx >= 0 ? num(cells[priceIdx] ?? "") : null,
      on_sale, publisher: pubIdx >= 0 ? cells[pubIdx] || null : null,
      est_units: Math.round(units), is_combined,
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
  // compute_comic_print_runs() runs inside Postgres on its own pg_cron schedule (too long for an API call).
  return { rows: total };
}

