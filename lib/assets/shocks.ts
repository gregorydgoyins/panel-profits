/**
 * Live shock map: the last 30 days of news become events, which propagate across the entity graph.
 * Recomputed on every cache refresh, so each new story reprices the instruments downstream of the entities it names.
 */
import { createAdminServerClient } from "@/lib/supabase/admin";
import { createCachedQuery } from "@/lib/cache/wrapper";
import { eventsFromArticles, propagate, type ShockMap } from "./shock-propagation";
import { outcomesFromArticles, type Outcome } from "./outcomes";

export interface MarketState { shocks: ShockMap; outcomes: Outcome[] }

async function fetchShocksRaw(): Promise<MarketState> {
  const supabase = createAdminServerClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  // PostgREST caps a response at 1000 rows, so page through the window; otherwise only the newest ~1000 stories
  // (a few days) would count and "the last 30 days" would be false.
  const PAGE = 1000;
  const MAX_ROWS = 8000;
  const articles: any[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data } = await supabase
      .from("news_articles")
      .select("id,headline,summary,url,published_at")
      .gte("published_at", since)
      .order("published_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + PAGE - 1);
    const rows = (data ?? []) as any[];
    articles.push(...rows);
    if (rows.length < PAGE) break;
  }
  const outcomes = outcomesFromArticles(articles);
  return { shocks: propagate(eventsFromArticles(articles), Date.now(), outcomes), outcomes };
}

export const getShocks = createCachedQuery(fetchShocksRaw, "asset-shocks", {
  // short TTL so a new story reprices within ~2 minutes; bounded SWR so stale shocks never linger long
  ttlSeconds: 120,
  staleWhileRevalidateSeconds: 300,
  tags: ["assets", "news"],
});
