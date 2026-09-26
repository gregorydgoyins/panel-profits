import { NextResponse } from "next/server";
import { getNewsStories, refreshNewsStore } from "@/lib/news/feed";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const archive = url.searchParams.get("archive") === "1";
  const limit = Number(url.searchParams.get("limit") || (archive ? 60 : 24));
  const stories = await getNewsStories(limit, archive);
  return NextResponse.json({ stories, refreshedAt: new Date().toISOString() }, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
  });
}

export async function POST(request: Request) {
  try {
    await refreshNewsStore();
    const stories = await getNewsStories(24);
    return NextResponse.json({
      status: "refreshed",
      activeCount: stories.length,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
