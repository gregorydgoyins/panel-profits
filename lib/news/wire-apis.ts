import crypto from "crypto";
import type { NewsCategory, NewsStory } from "./types";
import { sourceFavicon } from "./types";
import { evaluateArticleQuality, isRelevantComicStory, recordFetchFailure, recordFetchSuccess } from "./self-healing";
import { sanitizeHeadline, sanitizeSummary } from "./sanitize";

export interface WireStoryDraft {
  story_key: string;
  source: string;
  source_url: string;
  category: NewsCategory;
  headline: string;
  author: string | null;
  summary: string | null;
  url: string;
  image_url: string | null;
  published_at: string | null;
}

function generateWireKey(sourceUrl: string, itemUrl: string, title: string): string {
  return crypto.createHash("sha256").update(`${sourceUrl}|${itemUrl}|${title}`).digest("hex");
}

/**
 * 1. NewsData.io Wire Client
 */
export async function fetchNewsDataWire(limit = 25): Promise<WireStoryDraft[]> {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) return [];
  const start = Date.now();
  const sourceName = "NEWSDATA WIRE";
  const sourceUrl = "https://newsdata.io";

  try {
    const query = encodeURIComponent('"comic books" OR "graphic novel" OR "marvel comics" OR "dc comics"');
    const url = `https://newsdata.io/api/1/news?apikey=${apiKey}&q=${query}&language=en`;
    const res = await fetch(url, {
      headers: { "User-Agent": "PanelProfitsWire/1.0" },
      signal: AbortSignal.timeout(9000),
      cache: "no-store",
    });

    if (!res.ok) {
      recordFetchFailure(sourceName, sourceUrl, `HTTP ${res.status}: ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    recordFetchSuccess(sourceName, sourceUrl, Date.now() - start);

    const results = (data.results || []) as Array<{
      title?: string;
      link?: string;
      description?: string;
      pubDate?: string;
      image_url?: string;
      source_id?: string;
      creator?: string[];
    }>;

    return results
      .slice(0, limit)
      .filter((r) => {
        if (!r.title || !r.link) return false;
        const sourceLabel = `NEWSDATA: ${(r.source_id || "GLOBAL").toUpperCase()}`;
        return (
          isRelevantComicStory(sourceLabel, r.title, r.description || null) &&
          evaluateArticleQuality(r.title, r.description || null).admit
        );
      })
      .map((r) => {
        const itemUrl = r.link!;
        const headline = sanitizeHeadline(r.title);
        const author = Array.isArray(r.creator) && r.creator.length > 0 ? r.creator.join(", ") : null;
        const pubDateStr = r.pubDate;
        const published_at = pubDateStr && !Number.isNaN(Date.parse(pubDateStr)) ? new Date(pubDateStr).toISOString() : null;

        return {
          story_key: generateWireKey("https://newsdata.io", itemUrl, headline),
          source: `NEWSDATA: ${(r.source_id || "GLOBAL").toUpperCase()}`,
          source_url: itemUrl,
          category: "international",
          headline,
          author,
          summary: sanitizeSummary(r.description),
          url: itemUrl,
          image_url: r.image_url || sourceFavicon(itemUrl),
          published_at,
        };
      });
  } catch (err) {
    recordFetchFailure(sourceName, sourceUrl, (err as Error).message);
    return [];
  }
}

/**
 * 2. Perigon News API Wire Client
 */
export async function fetchPerigonWire(limit = 30): Promise<WireStoryDraft[]> {
  const apiKey = process.env.PERIGON_API_KEY;
  if (!apiKey) return [];
  const start = Date.now();
  const sourceName = "PERIGON WIRE";
  const sourceUrl = "https://api.goperigon.com";

  try {
    const query = encodeURIComponent('"comic books" OR "graphic novel" OR "superhero comics"');
    const url = `https://api.goperigon.com/v1/all?apiKey=${apiKey}&q=${query}&sortBy=date&size=${limit}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "PanelProfitsWire/1.0" },
      signal: AbortSignal.timeout(9000),
      cache: "no-store",
    });

    if (!res.ok) {
      recordFetchFailure(sourceName, sourceUrl, `HTTP ${res.status}: ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    recordFetchSuccess(sourceName, sourceUrl, Date.now() - start);

    const articles = (data.articles || []) as Array<{
      title?: string;
      url?: string;
      description?: string;
      pubDate?: string;
      imageUrl?: string;
      source?: { domain?: string };
      authorsByline?: string;
    }>;

    return articles
      .filter((a) => {
        if (!a.title || !a.url) return false;
        const domain = a.source?.domain || "perigon.io";
        const sourceLabel = `PERIGON: ${domain.replace(/^www\./, "").toUpperCase()}`;
        return (
          isRelevantComicStory(sourceLabel, a.title, a.description || null) &&
          evaluateArticleQuality(a.title, a.description || null).admit
        );
      })
      .map((a) => {
        const itemUrl = a.url!;
        const headline = sanitizeHeadline(a.title);
        const domain = a.source?.domain || "perigon.io";
        const pubDateStr = a.pubDate;
        const published_at = pubDateStr && !Number.isNaN(Date.parse(pubDateStr)) ? new Date(pubDateStr).toISOString() : null;

        return {
          story_key: generateWireKey("https://api.goperigon.com", itemUrl, headline),
          source: `PERIGON: ${domain.replace(/^www\./, "").toUpperCase()}`,
          source_url: itemUrl,
          category: "national",
          headline,
          author: a.authorsByline || null,
          summary: sanitizeSummary(a.description),
          url: itemUrl,
          image_url: a.imageUrl || sourceFavicon(itemUrl),
          published_at,
        };
      });
  } catch (err) {
    recordFetchFailure(sourceName, sourceUrl, (err as Error).message);
    return [];
  }
}

/**
 * 3. TheNewsAPI Wire Client
 */
export async function fetchTheNewsApiWire(limit = 20): Promise<WireStoryDraft[]> {
  const apiKey = process.env.THENEWSAPI_API_KEY;
  if (!apiKey) return [];
  const start = Date.now();
  const sourceName = "THENEWSAPI WIRE";
  const sourceUrl = "https://api.thenewsapi.com";

  try {
    const url = `https://api.thenewsapi.com/v1/news/all?api_token=${apiKey}&search=comics+marvel+batman&language=en&limit=${limit}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "PanelProfitsWire/1.0" },
      signal: AbortSignal.timeout(9000),
      cache: "no-store",
    });

    if (!res.ok) {
      recordFetchFailure(sourceName, sourceUrl, `HTTP ${res.status}: ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    recordFetchSuccess(sourceName, sourceUrl, Date.now() - start);

    const items = (data.data || []) as Array<{
      title?: string;
      url?: string;
      description?: string;
      published_at?: string;
      image_url?: string;
      source?: string;
    }>;

    return items
      .filter((i) => {
        if (!i.title || !i.url) return false;
        const sourceLabel = `THENEWSAPI: ${(i.source || "GLOBAL").toUpperCase()}`;
        return (
          isRelevantComicStory(sourceLabel, i.title, i.description || null) &&
          evaluateArticleQuality(i.title, i.description || null).admit
        );
      })
      .map((i) => {
        const itemUrl = i.url!;
        const headline = sanitizeHeadline(i.title);
        const sourceLabel = i.source || "THENEWSAPI";
        const pubDateStr = i.published_at;
        const published_at = pubDateStr && !Number.isNaN(Date.parse(pubDateStr)) ? new Date(pubDateStr).toISOString() : null;

        return {
          story_key: generateWireKey("https://api.thenewsapi.com", itemUrl, headline),
          source: `THENEWSAPI: ${sourceLabel.toUpperCase()}`,
          source_url: itemUrl,
          category: "international",
          headline,
          author: null,
          summary: sanitizeSummary(i.description),
          url: itemUrl,
          image_url: i.image_url || sourceFavicon(itemUrl),
          published_at,
        };
      });
  } catch (err) {
    recordFetchFailure(sourceName, sourceUrl, (err as Error).message);
    return [];
  }
}

/**
 * 4. NewsAPI.org Wire Client
 */
export async function fetchNewsApiOrgWire(limit = 30): Promise<WireStoryDraft[]> {
  const apiKey = process.env.NEWS_API_KEY || process.env.news_api_key;
  if (!apiKey) return [];
  const start = Date.now();
  const sourceName = "NEWSAPI WIRE";
  const sourceUrl = "https://newsapi.org";

  try {
    const query = encodeURIComponent('"comic books" OR "graphic novels" OR "marvel comics" OR "dc comics"');
    const url = `https://newsapi.org/v2/everything?apiKey=${apiKey}&q=${query}&language=en&sortBy=publishedAt&pageSize=${limit}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "PanelProfitsWire/1.0" },
      signal: AbortSignal.timeout(9000),
      cache: "no-store",
    });

    if (!res.ok) {
      recordFetchFailure(sourceName, sourceUrl, `HTTP ${res.status}: ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    recordFetchSuccess(sourceName, sourceUrl, Date.now() - start);

    const articles = (data.articles || []) as Array<{
      title?: string;
      url?: string;
      description?: string;
      publishedAt?: string;
      urlToImage?: string;
      source?: { name?: string };
      author?: string;
    }>;

    return articles
      .filter((a) => {
        if (!a.title || !a.url) return false;
        const sourceLabel = `NEWSAPI: ${(a.source?.name || "GLOBAL").toUpperCase()}`;
        return (
          isRelevantComicStory(sourceLabel, a.title, a.description || null) &&
          evaluateArticleQuality(a.title, a.description || null).admit
        );
      })
      .map((a) => {
        const itemUrl = a.url!;
        const headline = sanitizeHeadline(a.title);
        const sourceLabel = a.source?.name || "NEWSAPI";
        const pubDateStr = a.publishedAt;
        const published_at = pubDateStr && !Number.isNaN(Date.parse(pubDateStr)) ? new Date(pubDateStr).toISOString() : null;

        return {
          story_key: generateWireKey("https://newsapi.org", itemUrl, headline),
          source: `NEWSAPI: ${sourceLabel.toUpperCase()}`,
          source_url: itemUrl,
          category: "national",
          headline,
          author: a.author || null,
          summary: sanitizeSummary(a.description),
          url: itemUrl,
          image_url: a.urlToImage || sourceFavicon(itemUrl),
          published_at,
        };
      });
  } catch (err) {
    recordFetchFailure(sourceName, sourceUrl, (err as Error).message);
    return [];
  }
}

/**
 * 5. AskNews Wire Client (with circuit breaker & wallet recharge tolerance)
 */
export async function fetchAskNewsWire(limit = 20): Promise<WireStoryDraft[]> {
  const apiKey = process.env.ASKNEWS_API_KEY;
  if (!apiKey) return [];
  const start = Date.now();
  const sourceName = "ASKNEWS WIRE";
  const sourceUrl = "https://api.asknews.app";

  try {
    const query = encodeURIComponent("comic books marvel dc comics");
    const articleCount = Math.min(Math.max(limit, 1), 10);
    const url = `https://api.asknews.app/v1/news/search?query=${query}&n_articles=${articleCount}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "User-Agent": "PanelProfitsWire/1.0",
      },
      signal: AbortSignal.timeout(9000),
      cache: "no-store",
    });

    if (res.status === 402) {
      recordFetchFailure(sourceName, sourceUrl, "Wallet balance depleted; awaiting recharge");
      return [];
    }

    if (!res.ok) {
      recordFetchFailure(sourceName, sourceUrl, `HTTP ${res.status}: ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    recordFetchSuccess(sourceName, sourceUrl, Date.now() - start);

    const articles = ((data.as_dicts || data.articles || []) as Array<{
      title?: string;
      headline?: string;
      article_url?: string;
      summary?: string;
      pub_date?: string;
      source_id?: string;
      image_url?: string;
    }>);

    return articles
      .filter((a) => {
        const title = a.title || a.headline;
        if (!title || !a.article_url) return false;
        const sourceLabel = `ASKNEWS: ${(a.source_id || "GLOBAL").toUpperCase()}`;
        return (
          isRelevantComicStory(sourceLabel, title, a.summary || null) &&
          evaluateArticleQuality(title, a.summary || null).admit
        );
      })
      .map((a) => {
        const itemUrl = a.article_url!;
        const headline = sanitizeHeadline(a.title || a.headline);
        const sourceId = a.source_id || "ASKNEWS";
        const pubDateStr = a.pub_date;
        const published_at = pubDateStr && !Number.isNaN(Date.parse(pubDateStr)) ? new Date(pubDateStr).toISOString() : null;

        return {
          story_key: generateWireKey("https://api.asknews.app", itemUrl, headline),
          source: `ASKNEWS: ${sourceId.toUpperCase()}`,
          source_url: itemUrl,
          category: "international",
          headline,
          author: null,
          summary: sanitizeSummary(a.summary),
          url: itemUrl,
          image_url: a.image_url || sourceFavicon(itemUrl),
          published_at,
        };
      });
  } catch (err) {
    recordFetchFailure(sourceName, sourceUrl, (err as Error).message);
    return [];
  }
}

/**
 * Syndicated Wire Aggregator: executes all 5 news wire APIs in parallel.
 * Returns up to 200 high-signal comic journalism and market stories.
 */
export async function fetchAllWireStories(): Promise<WireStoryDraft[]> {
  const wireResults = await Promise.allSettled([
    fetchNewsDataWire(30),
    fetchPerigonWire(40),
    fetchTheNewsApiWire(20),
    fetchNewsApiOrgWire(40),
    fetchAskNewsWire(20),
  ]);

  const allDrafts: WireStoryDraft[] = [];
  const seenKeys = new Set<string>();

  for (const r of wireResults) {
    if (r.status === "fulfilled") {
      for (const draft of r.value) {
        if (!seenKeys.has(draft.story_key)) {
          seenKeys.add(draft.story_key);
          allDrafts.push(draft);
        }
      }
    }
  }

  return allDrafts;
}
