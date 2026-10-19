import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  try {
    let cleanUrl = decodeURIComponent(targetUrl).trim();
    if (cleanUrl.startsWith("//")) {
      cleanUrl = "https:" + cleanUrl;
    }

    const parsed = new URL(cleanUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return new NextResponse("Invalid protocol", { status: 400 });
    }

    // Direct redirect for our own Supabase storage CDN
    // The Panel Profits host is exact-match only. A substring check would
    // allow lookalike domains such as comicbookstockexchange.com.evil.test.
    if (parsed.hostname.endsWith("supabase.co") ||
      (parsed.protocol === "https:" && parsed.hostname === "comicbookstockexchange.com")) {
      return NextResponse.redirect(cleanUrl, {
        status: 307,
        headers: {
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    }

    const res = await fetch(cleanUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        Referer: parsed.origin,
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return new NextResponse(`Upstream returned ${res.status}`, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await res.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, stale-while-revalidate=2592000",
      },
    });
  } catch (err: any) {
    return new NextResponse(err?.message || "Failed to proxy cover image", { status: 502 });
  }
}
