import { createServerClient, createPublicServerClient } from "@/lib/supabase/server";
import { Profile, Collection, CollectionItem, WatchlistItem } from "./types";
import { ComicRecord } from "@/lib/comics/types";

export async function getCurrentUser() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getUserProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return {
      id: user.id,
      display_name: user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || null,
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      created_at: user.created_at,
      updated_at: user.created_at,
    };
  }

  return data as Profile;
}

export async function getUserCollections(): Promise<Collection[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  // If user has no collections, create default one
  if (data.length === 0) {
    const defaultCol = await ensureDefaultCollection(user.id);
    if (defaultCol) return [defaultCol];
    return [];
  }

  return data as Collection[];
}

export async function ensureDefaultCollection(userId: string): Promise<Collection | null> {
  const supabase = await createServerClient();
  
  // Check if exists
  const { data: existing } = await supabase
    .from("collections")
    .select("*")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();

  if (existing) return existing as Collection;

  const { data: created, error } = await supabase
    .from("collections")
    .insert({
      user_id: userId,
      name: "My Collection",
      description: "Default comic collection",
      is_default: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to ensure default collection:", error);
    return null;
  }

  return created as Collection;
}

export interface CollectionItemsQueryOptions {
  cursor?: string | null;
  limit?: number;
  q?: string;
  sortBy?: "recent" | "series" | "issue" | "cost" | "date";
  sortOrder?: "asc" | "desc";
}

export interface CollectionItemsResult {
  items: CollectionItem[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}

export async function getCollectionItems(
  collectionId: string,
  options: CollectionItemsQueryOptions = {}
): Promise<CollectionItemsResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { items: [], nextCursor: null, hasMore: false, totalCount: 0 };
  }

  const supabase = await createServerClient();
  const limit = Math.min(Math.max(Number(options.limit) || 24, 1), 50);

  let query = supabase
    .from("collection_items")
    .select("*, comic:comics(*)", { count: "exact" })
    .eq("collection_id", collectionId)
    .eq("user_id", user.id);

  if (options.cursor) {
    query = query.gt("id", options.cursor);
  }

  query = query.order("id", { ascending: true }).limit(limit + 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("Error fetching collection items:", error);
    return { items: [], nextCursor: null, hasMore: false, totalCount: 0 };
  }

  let items = (data as CollectionItem[]) || [];

  // Client-side text filter on comic title/series if provided
  if (options.q && options.q.trim()) {
    const q = options.q.trim().toLowerCase();
    items = items.filter((item) => {
      const c = item.comic;
      if (!c) return false;
      return (
        c.series?.toLowerCase().includes(q) ||
        c.title?.toLowerCase().includes(q) ||
        c.publisher?.toLowerCase().includes(q) ||
        c.issue_number?.toLowerCase().includes(q)
      );
    });
  }

  const hasMore = items.length > limit;
  const slicedItems = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore && slicedItems.length > 0 ? slicedItems[slicedItems.length - 1].id : null;

  return {
    items: slicedItems,
    nextCursor,
    hasMore,
    totalCount: count || items.length,
  };
}

export interface WatchlistQueryOptions {
  cursor?: string | null;
  limit?: number;
}

export interface WatchlistResult {
  items: WatchlistItem[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}

export async function getWatchlistItems(
  options: WatchlistQueryOptions = {}
): Promise<WatchlistResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { items: [], nextCursor: null, hasMore: false, totalCount: 0 };
  }

  const supabase = await createServerClient();
  const limit = Math.min(Math.max(Number(options.limit) || 24, 1), 50);

  let query = supabase
    .from("watchlist_items")
    .select("*, comic:comics(*)", { count: "exact" })
    .eq("user_id", user.id);

  if (options.cursor) {
    query = query.gt("id", options.cursor);
  }

  query = query.order("id", { ascending: true }).limit(limit + 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("Error fetching watchlist items:", error);
    return { items: [], nextCursor: null, hasMore: false, totalCount: 0 };
  }

  const items = (data as WatchlistItem[]) || [];
  const hasMore = items.length > limit;
  const slicedItems = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore && slicedItems.length > 0 ? slicedItems[slicedItems.length - 1].id : null;

  return {
    items: slicedItems,
    nextCursor,
    hasMore,
    totalCount: count || items.length,
  };
}

export interface ComicUserStatus {
  isInCollection: boolean;
  collectionItem: CollectionItem | null;
  isInWatchlist: boolean;
  watchlistItem: WatchlistItem | null;
}

export async function getComicUserStatus(comicId: string): Promise<ComicUserStatus> {
  const user = await getCurrentUser();
  if (!user || !comicId) {
    return {
      isInCollection: false,
      collectionItem: null,
      isInWatchlist: false,
      watchlistItem: null,
    };
  }

  const supabase = await createServerClient();

  const [colRes, watchRes] = await Promise.all([
    supabase
      .from("collection_items")
      .select("*")
      .eq("user_id", user.id)
      .eq("comic_id", comicId)
      .maybeSingle(),
    supabase
      .from("watchlist_items")
      .select("*")
      .eq("user_id", user.id)
      .eq("comic_id", comicId)
      .maybeSingle(),
  ]);

  return {
    isInCollection: Boolean(colRes.data),
    collectionItem: (colRes.data as CollectionItem) || null,
    isInWatchlist: Boolean(watchRes.data),
    watchlistItem: (watchRes.data as WatchlistItem) || null,
  };
}
