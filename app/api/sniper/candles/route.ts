import { NextResponse } from "next/server";
import { readSalesForBook } from "@/lib/sniper/market-store";
import { buildCandles, dedupeSales, gradesTraded, pickBucket, saleStats, type Bucket } from "@/lib/sniper/candles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKETS: Bucket[] = ["day", "week", "month", "quarter", "year"];

/**
 * Candles and volume for one book at one grade, from recorded sales only.
 * GET /api/sniper/candles?series=Amazing Spider-Man&issue=300&grade=9.8[&bucket=month]
 * Returns no candles (and says so) when nothing has been recorded; it never fills a gap.
 */
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const series = sp.get("series") || "";
  const issue = sp.get("issue") || "";
  if (!series || !issue) return NextResponse.json({ success: false, error: "series and issue required" }, { status: 400 });

  const all = dedupeSales((await readSalesForBook(series, issue)).filter((s) => s.confirmed && !s.source.startsWith("benchmark:")));
  const grades = gradesTraded(all);
  const wanted = sp.get("grade") ? parseFloat(sp.get("grade")!) : NaN;
  const grade = Number.isFinite(wanted) ? wanted : grades[0]?.grade ?? null;
  const atGrade = grade == null ? [] : all.filter((s) => s.grade === grade);

  const asked = sp.get("bucket") as Bucket | null;
  const bucket = asked && BUCKETS.includes(asked) ? asked : pickBucket(atGrade);
  const candles = buildCandles(atGrade, bucket);

  const sources: Record<string, number> = {};
  for (const s of atGrade) sources[s.source] = (sources[s.source] ?? 0) + 1;

  return NextResponse.json({
    success: true,
    series, issue, grade, grades, bucket,
    candles,
    volume: candles.map((c) => ({ time: c.time, value: c.volume, dollars: c.dollars })),
    stats: saleStats(atGrade),
    sources,
    sales: atGrade.slice(-25).reverse(),
    totalSalesAllGrades: all.length,
    note: atGrade.length === 0
      ? "No sales recorded for this book at this grade yet. Only independently confirmed realized sales are charted; final bids and guide prices are excluded."
      : undefined,
  });
}
