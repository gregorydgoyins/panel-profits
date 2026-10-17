import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VENUES: Record<string, string> = {
  "comics.ha.com": "heritage",
  "www.mycomicshop.com": "mycomicshop",
  "www.comiclink.com": "comiclink",
};

function plain(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&#36;/g, "$").replace(/\s+/g, " ");
}

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "Missing lot URL" }, { status: 400 });
  let url: URL;
  try { url = new URL(raw); } catch {
    return NextResponse.json({ error: "Invalid lot URL" }, { status: 400 });
  }
  const venue = VENUES[url.hostname.toLowerCase()];
  if (url.protocol !== "https:" || !venue || url.username || url.password || url.port) {
    return NextResponse.json({ error: "Unsupported auction host" }, { status: 400 });
  }
  try {
    const response = await fetch(url.toString(), {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "text/html", "User-Agent": "Mozilla/5.0 (compatible; PanelProfits/1.0; public-auction-reference)" },
    });
    if (!response.ok) return NextResponse.json({ venue, connected: false, httpStatus: response.status }, { status: 502 });
    if (!(response.headers.get("content-type") ?? "").includes("text/html")) {
      return NextResponse.json({ venue, connected: false, error: "Not an HTML auction page" }, { status: 502 });
    }
    const html = (await response.text()).slice(0, 2_000_000);
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/<[^>]*>/g, "").trim();
    const text = plain(html);
    const bidText = text.match(/(?:Current Bid|Current High Bid)\s*:?\s*\$\s*([\d,]+(?:\.\d{2})?)/i);
    const currentBid = bidText ? Number(bidText[1].replace(/,/g, "")) : null;
    // A countdown is intentionally not inferred from a generic auction date.
    // Only an explicit machine-readable closing timestamp can drive a timer.
    const endMatch = html.match(/(?:data-end-time|data-end-date|data-auction-end)=["']([^"']+)["']/i);
    const endTime = endMatch && Number.isFinite(Date.parse(endMatch[1])) ? new Date(endMatch[1]).toISOString() : null;
    return NextResponse.json({
      venue, connected: true, url: url.toString(), title,
      currentBid, endTime, checkedAt: new Date().toISOString(),
      bidVerified: currentBid !== null, timerVerified: endTime !== null,
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ venue, connected: false, error: error instanceof Error ? error.message : "Source unavailable" }, { status: 502 });
  }
}
