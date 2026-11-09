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
  const { data } = await supabase
    .from("news_articles")
    .select("id,headline,summary,url,published_at")
    .gte("published_at", since)
    .order("published_at", { ascending: false })
    .limit(2000);
  const articles = (data ?? []) as any[];
  const outcomes = outcomesFromArticles(articles);
  return { shocks: propagate(eventsFromArticles(articles), Date.now(), outcomes), outcomes };
}

export const getShocks = createCachedQuery(fetchShocksRaw, "asset-shocks", {
  // short TTL so a new story reprices within ~2 minutes; bounded SWR so stale shocks never linger long
  ttlSeconds: 120,
  staleWhileRevalidateSeconds: 300,
  tags: ["assets", "news"],
});
