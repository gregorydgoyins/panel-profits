import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Diagnostic: runs the PriceCharting product fetch from this server and reports the outcome (no token exposed). */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") || "2412811";
  const token = process.env.PRICECHARTING_API_TOKEN;
  const out: Record<string, unknown> = { id, tokenConfigured: Boolean(token) };
  if (!token) return NextResponse.json(out);
  try {
    const res = await fetch(`https://www.pricecharting.com/api/product?t=${token}&id=${id}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    out.httpStatus = res.status;
    const text = await res.text();
    try {
      const j = JSON.parse(text);
      out.apiStatus = j.status ?? null;
      out.productName = j["product-name"] ?? null;
      out.error = j["error-message"] ?? null;
    } catch {
      out.bodyStart = text.slice(0, 200);
    }
  } catch (err) {
    out.fetchError = String(err);
  }
  return NextResponse.json(out);
}
