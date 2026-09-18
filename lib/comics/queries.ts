import { createPublicServerClient } from "@/lib/supabase/server";
import { ComicRecord, ComicSearchParams, ComicQueryResult } from "@/lib/comics/types";

export const DEFAULT_PAGE_SIZE = 24;

export async function getComics(params: ComicSearchParams): Promise<ComicQueryResult> {
  const supabase = createPublicServerClient();
  const limit = Math.min(Math.max(Number(params.limit) || DEFAULT_PAGE_SIZE, 1), 50);

  let query = supabase
    .from("comics")
    .select("*");

  const hasSearch = Boolean(params.q && params.q.trim());

  // Full-text indexed search by series, title, issue, or terms
  if (hasSearch) {
    const cleanQ = params.q!.trim();
    query = query.textSearch("search_document", cleanQ, {
      type: "websearch",
      config: "english",
    });
  }

  // Exact issue number filter
  if (params.issue && params.issue.trim()) {
    query = query.eq("issue_number", params.issue.trim());
  }

  // Publisher filter
  if (params.publisher && params.publisher.trim()) {
    const cleanPub = params.publisher.trim().replace(/[%_]/g, "\\$&");
    query = query.ilike("publisher", `%${cleanPub}%`);
  }

  // Publication year filter
  if (params.year && params.year.trim()) {
    const yearNum = parseInt(params.year.trim(), 10);
    if (!isNaN(yearNum)) {
      query = query.eq("publication_year", yearNum);
    }
  }

  // Direct, Newsstand, Variant filter
  if (params.variant && params.variant.trim()) {
    const variantType = params.variant.trim().toLowerCase();
    if (variantType === "direct") {
      query = query.ilike("direct_or_variant", "%direct%");
    } else if (variantType === "newsstand") {
      query = query.ilike("direct_or_variant", "%newsstand%");
    } else if (variantType === "variant") {
      query = query.or("cover_variant.neq.,direct_or_variant.ilike.%variant%");
    }
  }

  // Keyset cursor pagination
  if (params.cursor && params.cursor.trim()) {
    query = query.gt("id", params.cursor.trim());
  }

  // Only apply explicit B-Tree ordering when not doing GIN fulltext search to avoid query planner sort timeouts
  if (!hasSearch) {
    query = query.order("id", { ascending: true });
  }

  query = query.limit(limit + 1);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching comics from Supabase:", error);
    throw new Error(`Failed to query comics catalog: ${error.message}`);
  }

  const items: ComicRecord[] = (data as ComicRecord[]) || [];
  const hasMore = items.length > limit;
  const comics = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore && comics.length > 0 ? comics[comics.length - 1].id : null;

  return {
    comics,
    nextCursor,
    prevCursor: params.cursor || null,
    hasMore,
  };
}

export async function getComicById(id: string): Promise<ComicRecord | null> {
  if (!id || typeof id !== "string") return null;

  const supabase = createPublicServerClient();
  const { data, error } = await supabase
    .from("comics")
    .select("*")
    .eq("id", id.trim())
    .maybeSingle();

  if (error) {
    console.error(`Error fetching comic with ID ${id}:`, error);
    return null;
  }

  return (data as ComicRecord) || null;
}

export async function getFeaturedComics(limit = 6): Promise<ComicRecord[]> {
  const supabase = createPublicServerClient();
  const { data, error } = await supabase
    .from("comics")
    .select("*")
    .not("comicbase_price", "is", null)
    .gt("comicbase_price", 50)
    .order("id", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Error fetching featured comics:", error);
    return [];
  }

  return (data as ComicRecord[]) || [];
}
