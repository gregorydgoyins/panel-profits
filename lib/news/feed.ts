import crypto from "node:crypto";
import { createAdminServerClient } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/errors";

export type NewsCategory = "national" | "international";
export const DEFAULT_NEWS_IMAGE = "/newsroom-default.svg";

function officialFavicon(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

function sourceFavicon(sourceUrl: string): string {
  try {
    return officialFavicon(new URL(sourceUrl).hostname.replace(/^www\./, ""));
  } catch {
    return DEFAULT_NEWS_IMAGE;
  }
}

function isEditorialImageUrl(value: string | null | undefined): value is string {
  return Boolean(value && !value.includes("google.com/s2/favicons") && value !== DEFAULT_NEWS_IMAGE);
}

function isUsableStoryImage(value: string | null | undefined): value is string {
  if (typeof value !== "string" || value === DEFAULT_NEWS_IMAGE) return false;
  return true;
}

export function newsFallbackImage(source: string, headline: string, summary: string | null): string | null {
  const text = `${source} ${headline} ${summary || ""}`;
  if (/\bmarvel\b|avengers|spider-man|x-men|wolverine|deadpool/i.test(text)) return officialFavicon("marvel.com");
  if (/\bdc comics?\b|batman|superman|wonder woman|justice league/i.test(text)) return officialFavicon("dc.com");
  if (/dark horse/i.test(text)) return officialFavicon("darkhorse.com");
  if (/\bidw\b/i.test(text)) return officialFavicon("idwpublishing.com");
  if (/boom studios|\bboom!\b/i.test(text)) return officialFavicon("boom-studios.com");
  return null;
}

export interface NewsStory {
  id: string;
  source: string;
  sourceUrl: string;
  category: NewsCategory;
  headline: string;
  author: string | null;
  summary: string | null;
  url: string;
  imageUrl: string | null;
  publishedAt: string | null;
  ingestedAt: string;
  archivedAt: string | null;
}

export function shortNewsSource(source: string): string {
  const normalized = source.trim().toLowerCase();
  const labels: Record<string, string> = {
    "ap entertainment": "AP",
    "anime news network": "ANN",
    "bleeding cool": "BLEEDING COOL",
    "comicbook.com": "COMICBOOK",
    "gamesradar": "GAMESRADAR",
    "screenrant": "SCREENRANT",
    "the beat": "THE BEAT",
    "the guardian film": "GUARDIAN",
    "the hollywood reporter": "THR",
  };
  if (labels[normalized]) return labels[normalized];
  if (source.length <= 14) return source.toUpperCase();
  return source.split(/\s+/).map((word) => word[0]).join("").slice(0, 5).toUpperCase();
}

interface NewsSource {
  name: string;
  url: string;
  category: NewsCategory;
}

const SOURCES: NewsSource[] = [
  { name: "VARIETY", url: "https://variety.com/feed/", category: "national" },
  { name: "DEADLINE", url: "https://deadline.com/feed/", category: "national" },
  { name: "THR", url: "https://www.hollywoodreporter.com/feed/", category: "national" },
  { name: "COMICBOOK", url: "https://comicbook.com/feed/", category: "national" },
  { name: "CBR", url: "https://www.cbr.com/feed/", category: "national" },
  { name: "BLEEDING COOL", url: "https://bleedingcool.com/comics/feed/", category: "national" },
  { name: "THE BEAT", url: "https://www.comicsbeat.com/feed/", category: "national" },
  { name: "AIPT", url: "https://aiptcomics.com/feed/", category: "national" },
  { name: "GAMESRADAR", url: "https://www.gamesradar.com/feeds/all/", category: "international" },
  { name: "IGN", url: "https://www.ign.com/rss/articles/feed?tags=comics", category: "international" },
  { name: "POLYGON", url: "https://www.polygon.com/rss/index.xml", category: "international" },
  { name: "ANN", url: "https://www.animenewsnetwork.com/all/rss.xml", category: "international" },
  { name: "GUARDIAN", url: "https://www.theguardian.com/books/rss", category: "international" },
  { name: "SCREENRANT", url: "https://screenrant.com/feed/", category: "international" },
  { name: "COMICS JOURNAL", url: "https://www.tcj.com/feed/", category: "international" },
  { name: "BROKEN FRONTIER", url: "https://www.brokenfrontier.com/feed/", category: "international" },
  { name: "COMICSXF", url: "https://comicsxf.com/feed/", category: "national" },
  { name: "ICV2", url: "https://icv2.com/rss", category: "national" },
  { name: "COMICBOOK INVEST", url: "https://comicbookinvest.com/feed/", category: "national" },
  { name: "OTAKU USA", url: "https://otakuusamagazine.com/feed/", category: "international" },
  { name: "ANIME HERALD", url: "https://www.animeherald.com/feed/", category: "international" },
  { name: "ANIME TRENDING", url: "https://anitrendz.net/news/feed/", category: "international" },
  { name: "CRUNCHYROLL", url: "https://cr-news-api-service.prd.crunchyrollsvc.com/v1/en-US/rss", category: "international" },
  { name: "BBC NEWS", url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", category: "international" },
  { name: "FIRSTCOMICSNEWS", url: "https://www.firstcomicsnews.com/feed/", category: "national" },
  { name: "MAJOR SPOILERS", url: "https://majorspoilers.com/feed/", category: "national" },
  { name: "COMIC VINE", url: "https://comicvine.gamespot.com/feeds/news/", category: "national" },
  { name: "NPR BOOKS", url: "https://feeds.npr.org/1032/rss.xml", category: "national" },
  { name: "SMITHSONIAN", url: "https://www.smithsonianmag.com/rss/latest_articles/", category: "national" },
];

const TERTIARY_SOURCE_NAMES = new Set(["CBR", "THR", "COMICBOOK", "BLEEDING COOL", "THE BEAT", "ICV2", "ANIME TRENDING", "ANIME HERALD", "COMICS JOURNAL", "POLYGON", "ANN"]);
const COMIC_TERMS = /comic\s*book|comic(s)?\b|superhero|super-hero|marvel|dc comics|avengers|x-men|spider-man|batman|superman|fantastic four|deadpool|wolverine|venom|manga|mangaka|anime|graphic novel|image comics|dark horse|idw|boom studios|viz media|shonen|shojo|webtoon|manhwa/i;
const COMPANY_TERMS = /disney|warner bros|warner discovery|wbd|sony pictures|universal|paramount|skydance|marvel entertainment/i;
const FINANCIAL_TERMS = /earnings|earning report|annual report|quarterly|revenue|profit|loss|shares|stock|investor|acquisition|merger|deal|buyout|results/i;
const EXCLUDE_NON_COMIC_GAMING = /\b(gameplay|playstation\s*5|ps5|xbox|nintendo switch|platinum trophy|earphones|headset|found footage|horror movie|blair witch)\b/i;

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function isRelevantComicStory(source: string, headline: string, summary: string | null): boolean {
  const text = `${headline} ${summary || ""}`;
  const isComicOrManga = COMIC_TERMS.test(text);
  const isCompanyFinance = COMPANY_TERMS.test(text) && FINANCIAL_TERMS.test(text);
  if (!isComicOrManga && !isCompanyFinance) return false;
  if (EXCLUDE_NON_COMIC_GAMING.test(headline) && !/comic|superhero|marvel|dc\b|batman|superman|avengers|manga|anime/i.test(headline)) {
    return false;
  }
  return true;
}

const REFRESH_AFTER_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 12_000;
const NEWSDATA_REFRESH_AFTER_MS = 6 * 60 * 60 * 1000;
let memoryStories: NewsStory[] = [];
let newsDataLastFetchedAt = 0;
let newsApiLastFetchedAt = 0;
let askNewsLastFetchedAt = 0;

function isTertiarySource(source: string) {
  return TERTIARY_SOURCE_NAMES.has(source) || source.startsWith("NEWSDATA") || source.startsWith("NEWSAPI") || source.startsWith("ASKNEWS");
}

function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tagValue(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? decodeEntities(match[1]) : null;
}

function attributeValue(block: string, tag: string, attribute: string): string | null {
  const match = block.match(new RegExp(`<${tag}[^>]*\\b${attribute}=["']([^"']+)["']`, "i"));
  return match?.[1] || null;
}

function isLikelyEditorialImage(value: string | null | undefined): value is string {
  if (!value || value.startsWith("data:") || value.startsWith("javascript:")) return false;
  return !/advert|banner|doubleclick|tracking|pixel|sprite|placeholder|logo-small/i.test(value);
}

function markupImage(block: string): string | null {
  const image = block.match(/<(?:img|media:content|media:thumbnail)\b[^>]*(?:src|url)=["']([^"']+)["']/i)?.[1] || null;
  return isLikelyEditorialImage(image) ? image : null;
}

async function fetchArticleImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const html = await response.text();
    const candidates = [
      html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i)?.[1],
      html.match(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i)?.[1],
      html.match(/<link[^>]+rel=["'][^"']*image_src[^"']*["'][^>]+href=["']([^"']+)["']/i)?.[1],
      markupImage(html),
    ];
    return candidates.find((candidate): candidate is string => isLikelyEditorialImage(candidate)) || null;
  } catch {
    return null;
  }
}

function parseItems(xml: string): Array<{ title: string; url: string; summary: string | null; imageUrl: string | null; publishedAt: string | null; author: string | null }> {
  const blocks = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map((match) => match[0]);
  return blocks.flatMap((block) => {
    const title = tagValue(block, "title");
    const url = tagValue(block, "link") || attributeValue(block, "link", "href");
    if (!title || !url) return [];
    const summary = tagValue(block, "content:encoded") || tagValue(block, "description") || tagValue(block, "summary") || tagValue(block, "content");
    const author = tagValue(block, "dc:creator") || tagValue(block, "author");
    const imageUrl =
      attributeValue(block, "media:content", "url") ||
      attributeValue(block, "media:thumbnail", "url") ||
      (attributeValue(block, "enclosure", "type")?.startsWith("image/") ? attributeValue(block, "enclosure", "url") : null) ||
      markupImage(block);
    const publishedAt = tagValue(block, "pubDate") || tagValue(block, "published") || tagValue(block, "updated");
    return [{ title, url, summary, imageUrl, publishedAt, author }];
  });
}

function storyKey(sourceUrl: string, url: string, title: string): string {
  return crypto.createHash("sha256").update(`${sourceUrl}|${url}|${title}`).digest("hex");
}

interface NewsFeedRow {
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

async function fetchSource(source: NewsSource): Promise<NewsFeedRow[]> {
  const response = await fetch(source.url, {
    headers: { accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const items = parseItems(await response.text()).slice(0, 12);
  return Promise.all(items.map(async (item) => ({
    story_key: storyKey(source.url, item.url, item.title),
    source: source.name,
    source_url: source.url,
    category: source.category,
    headline: item.title.slice(0, 500),
    author: item.author || null,
    summary: item.summary?.slice(0, 12000) || null,
    url: item.url,
    image_url: item.imageUrl || await fetchArticleImage(item.url) || newsFallbackImage(source.name, item.title, item.summary) || sourceFavicon(source.url),
    published_at: item.publishedAt && !Number.isNaN(Date.parse(item.publishedAt)) ? new Date(item.publishedAt).toISOString() : null,
  })));
}

async function fetchNewsDataSource(): Promise<NewsFeedRow[]> {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey || Date.now() - newsDataLastFetchedAt < NEWSDATA_REFRESH_AFTER_MS) return [];
  newsDataLastFetchedAt = Date.now();
  const params = new URLSearchParams({
    apikey: apiKey,
    q: "comics OR superhero OR manga OR anime",
    language: "en",
    size: "10",
  });
  const response = await fetch(`https://newsdata.io/api/1/latest?${params.toString()}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`NewsData ${response.status} ${response.statusText}`);
  const payload = await response.json() as { results?: Array<Record<string, unknown>> };
  return (payload.results || []).map((item) => ({
    story_key: storyKey("newsdata.io", String(item.link || ""), String(item.title || "")),
    source: `NEWSDATA / ${String(item.source_name || "NewsData")}`,
    source_url: "https://newsdata.io/",
    category: "international" as NewsCategory,
    headline: String(item.title || "").slice(0, 500),
    author: Array.isArray(item.creator) ? String(item.creator[0] || "") || null : item.creator ? String(item.creator) : null,
    summary: item.description ? String(item.description).slice(0, 2000) : null,
    url: String(item.link || ""),
    image_url: item.image_url ? String(item.image_url) : null,
    published_at: item.pubDate && !Number.isNaN(Date.parse(String(item.pubDate))) ? new Date(String(item.pubDate)).toISOString() : null,
  }));
}

async function fetchNewsApiSource(): Promise<NewsFeedRow[]> {
  const apiKey = process.env.news_api_key || process.env.NEWSAPI_API_KEY;
  if (!apiKey || Date.now() - newsApiLastFetchedAt < NEWSDATA_REFRESH_AFTER_MS) return [];
  newsApiLastFetchedAt = Date.now();
  const params = new URLSearchParams({
    apiKey,
    q: "(comics OR superhero OR manga OR anime)",
    language: "en",
    sortBy: "publishedAt",
    pageSize: "20",
  });
  const response = await fetch(`https://newsapi.org/v2/everything?${params.toString()}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`NewsAPI ${response.status} ${response.statusText}`);
  const payload = await response.json() as { articles?: Array<Record<string, unknown>> };
  return (payload.articles || []).map((item) => ({
    story_key: storyKey("newsapi.org", String(item.url || ""), String(item.title || "")),
    source: `NEWSAPI / ${String((item.source as Record<string, unknown> | undefined)?.name || "NewsAPI")}`,
    source_url: "https://newsapi.org/",
    category: "international" as NewsCategory,
    headline: String(item.title || "").slice(0, 500),
    author: item.author ? String(item.author) : null,
    summary: item.content ? String(item.content).slice(0, 12000) : item.description ? String(item.description).slice(0, 2000) : null,
    url: String(item.url || ""),
    image_url: item.urlToImage ? String(item.urlToImage) : null,
    published_at: item.publishedAt && !Number.isNaN(Date.parse(String(item.publishedAt))) ? new Date(String(item.publishedAt)).toISOString() : null,
  }));
}

async function fetchAskNewsSource(): Promise<NewsFeedRow[]> {
  const apiKey = process.env.ASKNEWS_API_KEY;
  if (!apiKey || Date.now() - askNewsLastFetchedAt < NEWSDATA_REFRESH_AFTER_MS) return [];
  askNewsLastFetchedAt = Date.now();
  const params = new URLSearchParams({
    query: "comic books superhero manga anime collectibles",
    n_articles: "10",
    return_type: "dicts",
    method: "kw",
    categories: "Entertainment",
    diversify_sources: "true",
    hours_back: "48",
  });
  const response = await fetch(`https://api.asknews.app/v1/news/search?${params.toString()}`, {
    headers: { accept: "application/json", Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`AskNews ${response.status} ${response.statusText}`);
  const payload = await response.json() as { as_dicts?: Array<Record<string, unknown>> };
  return (payload.as_dicts || []).map((item) => ({
    story_key: storyKey("asknews.app", String(item.article_url || ""), String(item.title || item.eng_title || "")),
    source: `ASKNEWS / ${String(item.source_id || item.domain_url || "AskNews")}`,
    source_url: "https://asknews.app/",
    category: "international" as NewsCategory,
    headline: String(item.title || item.eng_title || "").slice(0, 500),
    author: Array.isArray(item.authors) ? String((item.authors[0] as Record<string, unknown>)?.name || "") || null : null,
    summary: item.summary ? String(item.summary).slice(0, 12000) : null,
    url: String(item.article_url || ""),
    image_url: item.image_url ? String(item.image_url) : null,
    published_at: item.pub_date && !Number.isNaN(Date.parse(String(item.pub_date))) ? new Date(String(item.pub_date)).toISOString() : null,
  }));
}

let newsRefreshInFlight: Promise<void> | null = null;

export async function refreshNewsStore(): Promise<void> {
  if (newsRefreshInFlight) return newsRefreshInFlight;
  newsRefreshInFlight = refreshNewsStoreInternal().catch((error) => {
    console.warn("Background news refresh failed:", error instanceof Error ? error.message : error);
  }).finally(() => {
    newsRefreshInFlight = null;
  });
  return newsRefreshInFlight;
}

async function refreshNewsStoreInternal(): Promise<void> {
  const db = createAdminServerClient();
  const { data: latest, error: latestError } = await db
    .from("pp_news_stories")
    .select("ingested_at")
    .is("archived_at", null)
    .order("ingested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError && isMissingTableError(latestError) && memoryStories.length) return;

  if (latest?.ingested_at && Date.now() - Date.parse(latest.ingested_at) < REFRESH_AFTER_MS) return;

  const batches = await Promise.allSettled([...shuffle(SOURCES).map(fetchSource), fetchNewsDataSource(), fetchNewsApiSource(), fetchAskNewsSource()]);
  const rows = batches.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const relevantRows = rows.filter((row) => isRelevantComicStory(row.source, row.headline, row.summary) && Boolean(row.summary && row.summary.replace(/\s+/g, " ").trim().length >= 280) && isUsableStoryImage(row.image_url));
  memoryStories = relevantRows.map((row) => ({
    id: row.story_key,
    source: row.source,
    sourceUrl: row.source_url,
    category: row.category,
    headline: row.headline,
    author: row.author,
    summary: row.summary,
    url: row.url,
    imageUrl: row.image_url,
    publishedAt: row.published_at,
    ingestedAt: new Date().toISOString(),
    archivedAt: null,
  }));
  if (relevantRows.length) {
    const refreshedAt = new Date().toISOString();
    const activeRows = relevantRows.map((row) => ({ ...row, ingested_at: refreshedAt, archived_at: null }));
    const { error } = await db.from("pp_news_stories").upsert(activeRows, { onConflict: "story_key", ignoreDuplicates: false });
    if (error) {
      if (isMissingTableError(error)) {
        console.warn("News store table is not deployed in the live Clean project.");
        return;
      }
      console.error("News store upsert failed:", error.message);
    }
  }

  const { error: archiveError } = await db.rpc("archive_old_news_stories");
  if (archiveError) {
    if (isMissingTableError(archiveError)) {
      console.warn("News archive function is not deployed in the live Clean project.");
      return;
    }
    console.error("News archive update failed:", archiveError.message);
  }
}

function mapStory(row: Record<string, unknown>): NewsStory {
  return {
    id: String(row.id),
    source: String(row.source),
    sourceUrl: String(row.source_url),
    category: row.category === "national" ? "national" : "international",
    headline: String(row.headline),
    author: row.author ? String(row.author) : null,
    summary: row.summary ? decodeEntities(String(row.summary)) : null,
    url: String(row.url),
    imageUrl: row.image_url ? String(row.image_url) : null,
    publishedAt: row.published_at ? String(row.published_at) : null,
    ingestedAt: String(row.ingested_at),
    archivedAt: row.archived_at ? String(row.archived_at) : null,
  };
}

function diversifyStories(stories: NewsStory[], limit: number): NewsStory[] {
  const remaining = shuffle(stories);
  const sourceCounts = new Map<string, number>();
  const result: NewsStory[] = [];
  const maxStoriesPerSource = 2;
  while (remaining.length && result.length < limit) {
    const eligible = remaining.filter((story) => (sourceCounts.get(story.source) || 0) < maxStoriesPerSource);
    if (!eligible.length) break;
    const minTier = Math.min(...eligible.map((story) => isTertiarySource(story.source) ? 1 : 0));
    const tierCandidates = eligible.filter((story) => (isTertiarySource(story.source) ? 1 : 0) === minTier);
    const minCount = Math.min(...new Set(tierCandidates.map((story) => sourceCounts.get(story.source) || 0)));
    const candidates = tierCandidates.filter((story) => (sourceCounts.get(story.source) || 0) === minCount);
    const weightedCandidates = candidates.flatMap((story) => isTertiarySource(story.source) ? [story] : [story, story, story]);
    const selected = weightedCandidates[crypto.randomInt(weightedCandidates.length)];
    const index = remaining.indexOf(selected);
    if (index < 0) break;
    remaining.splice(index, 1);
    sourceCounts.set(selected.source, (sourceCounts.get(selected.source) || 0) + 1);
    result.push(selected);
  }
  return result;
}

export async function getNewsStories(limit = 24, includeArchive = false): Promise<NewsStory[]> {
  void refreshNewsStore();
  const db = createAdminServerClient();
  const query = db
    .from("pp_news_stories")
    .select("id,source,source_url,category,headline,author,summary,url,image_url,published_at,ingested_at,archived_at")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("ingested_at", { ascending: false })
    .limit(300);

  const { data, error } = includeArchive
    ? await query.not("archived_at", "is", null)
    : await query.is("archived_at", null);
  if (error || !data) {
    if (error && isMissingTableError(error)) {
      console.warn("News store table is not deployed in the live Clean project.");
      return includeArchive ? [] : shuffle(memoryStories).slice(0, Math.min(Math.max(limit, 1), 100));
    }
    if (error) console.error("News store read failed:", error.message);
    return includeArchive ? [] : shuffle(memoryStories).slice(0, Math.min(Math.max(limit, 1), 100));
  }
  const stories = data.map(mapStory).filter((story) => isRelevantComicStory(story.source, story.headline, story.summary) && isUsableStoryImage(story.imageUrl));
  return diversifyStories(stories, Math.min(Math.max(limit, 1), 100));
}

export async function getNewsStory(id: string): Promise<NewsStory | null> {
  const cachedStory = memoryStories.find((story) => story.id === id);
  if (cachedStory) return cachedStory;

  const db = createAdminServerClient();
  const { data: directStory, error: directStoryError } = await db
    .from("pp_news_stories")
    .select("id,source,source_url,category,headline,author,summary,url,image_url,published_at,ingested_at,archived_at")
    .eq("id", id)
    .maybeSingle();
  if (!directStoryError && directStory && isUsableStoryImage(directStory.image_url ? String(directStory.image_url) : null)) return mapStory(directStory);

  const activeStories = await getNewsStories(100);
  const activeStory = activeStories.find((story) => story.id === id);
  if (activeStory) return activeStory;

  const archivedStories = await getNewsStories(100, true);
  return archivedStories.find((story) => story.id === id) || null;
}
