"use client";

import * as React from "react";
import { TradingViewChart } from "@/components/charts/tradingview-chart";

interface Candle { time: string; open: number; high: number; low: number; close: number; volume: number; dollars: number }
interface CandlesResponse {
  success: boolean;
  grade: number | null;
  grades: Array<{ grade: number; count: number }>;
  bucket: string;
  candles: Candle[];
  stats: { n: number; last: { price: number; date: string } | null; low: number | null; high: number | null; median: number | null; median90d: number | null };
  sources: Record<string, number>;
  sales: Array<{ date: string; price: number; grade: number | null; venue: string; source: string; confirmed: boolean; url?: string }>;
  lot?: { ticks: Array<{ time: string; price: number; bids: number }> };
  note?: string;
}

const usd = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }));

// The complete 14-point PriceCharting/PP numerical ladder. RAW is a separate
// intrinsic-value input, never a certified auction grade.
const PP_GRADE_POINTS = [2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 9.2, 9.4, 9.6, 9.8, 9.9, 10.0] as const;

function sourceLabel(src: string, confirmed: boolean): string {
  if (src === "ebay_last_bid") return "eBay last bid seen";
  if (src === "ebay_insights") return "eBay sold";
  if (src === "graded_sales_observations") return "graded register";
  if (src.startsWith("benchmark")) return confirmed ? "CGC / GPA record" : "market observation";
  return src;
}

/** This lot's own bid history: one point each time its price moved, from the tracker. */
function BidHistory({ ticks }: { ticks: Array<{ time: string; price: number; bids: number }> }) {
  if (ticks.length < 2) return null;
  const w = 320, h = 56, pad = 4;
  const t0 = new Date(ticks[0].time).getTime(), t1 = new Date(ticks[ticks.length - 1].time).getTime();
  const lo = Math.min(...ticks.map((t) => t.price)), hi = Math.max(...ticks.map((t) => t.price));
  const x = (t: string) => pad + ((new Date(t).getTime() - t0) / Math.max(1, t1 - t0)) * (w - pad * 2);
  const y = (p: number) => h - pad - ((p - lo) / Math.max(0.01, hi - lo)) * (h - pad * 2);
  // price holds until the next bid: draw as steps
  let d = `M ${x(ticks[0].time)} ${y(ticks[0].price)}`;
  for (let i = 1; i < ticks.length; i++) d += ` L ${x(ticks[i].time)} ${y(ticks[i - 1].price)} L ${x(ticks[i].time)} ${y(ticks[i].price)}`;
  return (
    <div className="rounded-lg border border-slate-800 bg-black/40 p-2">
      <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
        <span>THIS LOT'S BIDS ({ticks.length} moves seen)</span>
        <span>{usd(ticks[0].price)} → <span className="text-emerald-300">{usd(ticks[ticks.length - 1].price)}</span></span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14" preserveAspectRatio="none" role="img" aria-label="Bid history for this lot">
        <path d={d} fill="none" stroke="#34d399" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

/**
 * Candles and volume for a book at a grade, built only from recorded sales; plus this lot's bid history.
 * Shows what exists and says plainly when nothing does.
 */
export function LotMarketChart({ series, issue, grade, itemId, ticker, currentBid }: {
  series: string; issue: string; grade?: number | null; itemId?: string; ticker: string; currentBid: number;
}) {
  const [pick, setPick] = React.useState<number | null>(grade ?? null);
  const [data, setData] = React.useState<CandlesResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => { setPick(grade ?? null); }, [series, issue, grade]);

  React.useEffect(() => {
    let live = true;
    setLoading(true);
    const q = new URLSearchParams({ series, issue });
    if (pick != null) q.set("grade", String(pick));
    if (itemId) q.set("item", itemId);
    fetch(`/api/sniper/candles?${q}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (live) { setData(j?.success ? j : null); setLoading(false); } })
      .catch(() => { if (live) { setData(null); setLoading(false); } });
    return () => { live = false; };
  }, [series, issue, pick, itemId]);

  const candles = data?.candles ?? [];
  const first = candles[0]?.close, last = candles[candles.length - 1]?.close;
  const delta = first && last ? ((last - first) / first) * 100 : 0;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono" aria-label="Select numerical grade for market history">
        <span className="text-slate-500 uppercase">Grade</span>
        {PP_GRADE_POINTS.map((g) => {
          const count = data?.grades.find((record) => record.grade === g)?.count;
          return (
            <button
              type="button"
              key={g}
              onClick={() => setPick(g)}
              aria-pressed={pick === g}
              className={`px-2 py-1 rounded border cursor-pointer ${pick === g ? "bg-cyan-600 border-cyan-400 text-white font-bold" : "bg-slate-900 border-slate-700 text-slate-300 hover:border-cyan-500"}`}
              title={count != null ? `${count} recorded sales` : `Select grade ${g.toFixed(1)}`}
            >
              {g.toFixed(1)}{count != null ? <span className="opacity-60"> · {count}</span> : null}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="p-6 text-center text-xs font-mono text-slate-500 animate-pulse">Loading recorded sales…</div>
      ) : candles.length > 0 ? (
        <>
          <TradingViewChart
            ticker={ticker}
            series={series}
            issueNumber={issue}
            currentPrice={last ?? currentBid}
            deltaPercent={delta}
            areaData={candles.map((c) => ({ time: c.time, value: c.close }))}
            candlestickData={candles.map((c) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume }))}
            volumeData={candles.map((c) => ({ time: c.time, value: c.volume, color: c.close >= c.open ? "rgba(16, 185, 129, 0.45)" : "rgba(244, 63, 94, 0.45)" }))}
            height={300}
          />
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center font-mono">
            {[
              ["Sales", String(data?.stats.n ?? 0)],
              ["Last", usd(data?.stats.last?.price)],
              ["Median 90d", usd(data?.stats.median90d)],
              ["Low", usd(data?.stats.low)],
              ["High", usd(data?.stats.high)],
            ].map(([k, v]) => (
              <div key={k} className="rounded bg-slate-900/70 border border-slate-800 py-1.5">
                <div className="text-[9px] text-slate-500 uppercase">{k}</div>
                <div className="text-xs font-bold text-white">{v}</div>
              </div>
            ))}
          </div>
          <div className="text-[10px] font-mono text-slate-500">
            One candle per {data?.bucket}; volume is the number of sales. Sources: {Object.entries(data?.sources ?? {}).map(([s, n]) => `${sourceLabel(s, true)} ${n}`).join(" · ")}
          </div>
        </>
      ) : (
        <div className="p-4 text-center text-xs font-mono text-slate-400 bg-black/40 rounded-lg border border-slate-800 space-y-1">
          <div>No recorded sales for this book{pick != null ? ` at ${pick.toFixed(1)}` : ""} yet.</div>
          <div className="text-slate-500">{data?.note ?? "Every auction the tracker watches close is recorded; the chart fills in from there."}</div>
        </div>
      )}

      {data?.lot?.ticks && <BidHistory ticks={data.lot.ticks} />}

      {data && data.sales.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] font-mono text-left">
            <thead>
              <tr className="text-slate-500 border-b border-slate-800 text-[10px] uppercase">
                <th className="pb-1 font-bold">Date</th><th className="pb-1 font-bold">Grade</th>
                <th className="pb-1 font-bold">Source</th><th className="pb-1 font-bold text-right">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data.sales.slice(0, 10).map((s, i) => (
                <tr key={i} className="text-slate-300">
                  <td className="py-1">{s.date.slice(0, 10)}</td>
                  <td>{s.grade != null ? s.grade.toFixed(1) : "—"}</td>
                  <td className={s.confirmed ? "" : "text-amber-300/80"}>
                    {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted">{sourceLabel(s.source, s.confirmed)}</a> : sourceLabel(s.source, s.confirmed)}
                  </td>
                  <td className="text-right font-bold text-white">{usd(s.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
