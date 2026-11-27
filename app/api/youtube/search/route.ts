import { NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface YTVideo {
  videoId: string;
  title: string;
  channel: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  youtubeUrl: string;
}

// Real results from the YouTube Data API (YOUTUBE_API_KEY). No page scraping, no made-up fallback videos:
// when nothing can be fetched the list is empty and the caller shows its own search links.
// A search costs 100 of the key's 10,000 daily units, so each answer is kept for 24 hours.
const TTL_MS = 24 * 3600_000;
const cache = new Map<string, { at: number; videos: YTVideo[] }>();

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');

const YT_STOP_WORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "comic", "comics", "book", "books",
  "issue", "review", "cgc", "cbcs", "pgx", "key", "value", "market", "vol", "volume", "not", "does",
  "les", "des", "une", "aventures", "adventures",
]);

function isRelevantVideo(video: YTVideo, seriesHint: string): boolean {
  const cleanSeries = seriesHint.toLowerCase().replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleanSeries) return true;
  const haystack = `${video.title} ${video.description}`.toLowerCase().replace(/[^a-z0-9\s]+/g, " ");
  if (haystack.includes(cleanSeries)) return true;
  const tokens = cleanSeries.split(" ").filter((t) => t.length >= 3 && !YT_STOP_WORDS.has(t));
  if (tokens.length === 0) return true;
  const needed = tokens.length >= 2 ? 2 : 1;
  let hits = 0;
  for (const t of tokens) {
    if (new RegExp(`\\b${t}\\b`, "i").test(haystack)) hits++;
  }
  return hits >= needed;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "comic review CGC market value").slice(0, 160);
  const seriesHint = (searchParams.get("series") || "").slice(0, 120);
  const issueHint = (searchParams.get("issue") || "").slice(0, 40);
  const maxResults = Math.min(6, Math.max(1, parseInt(searchParams.get("maxResults") || "4", 10)));
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
  const empty = (error: string) => NextResponse.json({ success: true, source: "fallback", videos: [], searchUrl, error }, { headers: { "cache-control": "no-store" } });

  const key = `${q}|${seriesHint}|${issueHint}|${maxResults}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return NextResponse.json({ success: true, source: "youtube-api", videos: hit.videos, searchUrl }, { headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
  }

  // 0. Check curated/cached verified videos in Supabase `sniper_video_cache` first
  if (seriesHint) {
    try {
      const cleanSeries = seriesHint.toLowerCase().trim();
      const cleanIssue = issueHint.toLowerCase().replace(/^#/, "").trim();
      const candidateKeys = cleanIssue
        ? [`v1:${cleanSeries}#${cleanIssue}`]
        : [`v1:${cleanSeries}#1`];
      const supabase = createAdminServerClient();
      const { data: cachedRows } = await supabase
        .from("sniper_video_cache")
        .select("videos")
        .in("key", candidateKeys)
        .limit(1);
      const rawCached = cachedRows?.[0]?.videos;
      if (Array.isArray(rawCached) && rawCached.length > 0) {
        const mapped: YTVideo[] = rawCached
          .filter((v: any) => v?.videoId && v?.title)
          .slice(0, maxResults)
          .map((v: any) => ({
            videoId: String(v.videoId),
            title: decode(String(v.title)),
            channel: String(v.channel || "YouTube"),
            description: decode(String(v.description || "")),
            thumbnail: String(v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`),
            publishedAt: String(v.publishedAt || ""),
            youtubeUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
          }));
        if (mapped.length > 0) {
          cache.set(key, { at: Date.now(), videos: mapped });
          return NextResponse.json({ success: true, source: "youtube-api", videos: mapped, searchUrl }, { headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
        }
      }
    } catch {
      // Fall through to live YouTube search
    }
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    try {
      const url = new URL("https://www.googleapis.com/youtube/v3/search");
      url.searchParams.set("part", "snippet");
      url.searchParams.set("type", "video");
      url.searchParams.set("videoEmbeddable", "true");
      url.searchParams.set("safeSearch", "strict");
      url.searchParams.set("relevanceLanguage", "en");
      url.searchParams.set("maxResults", String(maxResults));
      url.searchParams.set("q", q);
      url.searchParams.set("key", apiKey);
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const json = (await res.json()) as { items?: any[] };
        const videos: YTVideo[] = [];
        for (const it of json.items ?? []) {
          const id = it?.id?.videoId;
          const sn = it?.snippet;
          if (!id || !sn?.title) continue;
          videos.push({
            videoId: id,
            title: decode(sn.title),
            channel: sn.channelTitle ?? "",
            description: decode(sn.description ?? ""),
            thumbnail: sn.thumbnails?.medium?.url ?? sn.thumbnails?.high?.url ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
            publishedAt: sn.publishedAt ?? "",
            youtubeUrl: `https://www.youtube.com/watch?v=${id}`,
          });
        }
        const relevant = videos.filter((v) => isRelevantVideo(v, seriesHint));
        if (relevant.length > 0) {
          cache.set(key, { at: Date.now(), videos: relevant });
          if (cache.size > 300) cache.delete(cache.keys().next().value as string);
          return NextResponse.json({ success: true, source: "youtube-api", videos: relevant, searchUrl }, { headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
        }
        return empty("no relevant videos");
      }
    } catch {
      // Fall through to live YouTube search HTML extraction
    }
  }

  // Fallback to live YouTube search extraction when YOUTUBE_API_KEY is absent or quota-limited
  try {
    const res = await fetch(searchUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "accept-language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return empty(`youtube html ${res.status}`);
    const html = await res.text();
    const matches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})","thumbnail":.*?"title":\{"runs":\[\{"text":"([^"]+)"/g)];
    const seen = new Set<string>();
    const videos: YTVideo[] = [];
    for (const m of matches) {
      const id = m[1];
      const title = decode(m[2]);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      videos.push({
        videoId: id,
        title,
        channel: "YouTube",
        description: "",
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        publishedAt: "",
        youtubeUrl: `https://www.youtube.com/watch?v=${id}`,
      });
      if (videos.length >= maxResults) break;
    }
    const relevantHtml = videos.filter((v) => isRelevantVideo(v, seriesHint));
    if (relevantHtml.length === 0) return empty("no relevant results");
    cache.set(key, { at: Date.now(), videos: relevantHtml });
    if (cache.size > 300) cache.delete(cache.keys().next().value as string);
    return NextResponse.json({ success: true, source: "youtube-api", videos: relevantHtml, searchUrl }, { headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch {
    return empty("youtube request failed");
  }
}
