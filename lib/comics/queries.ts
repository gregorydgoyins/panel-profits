import { createAdminServerClient, createCleanReadOnlyServerClient } from "@/lib/supabase/admin";
import { ComicRecord, ComicSearchParams, ComicQueryResult } from "@/lib/comics/types";
import { getComicCoverEvidence } from "@/lib/comics/covers";

export const DEFAULT_PAGE_SIZE = 24;

export async function getComics(params: ComicSearchParams): Promise<ComicQueryResult> {
  const supabase = createAdminServerClient();
  const limit = Math.min(Math.max(Number(params.limit) || DEFAULT_PAGE_SIZE, 1), 50);

  let query = supabase
    .from("comics")
    .select("*");

  const hasSearch = Boolean(params.q && params.q.trim());

  // Clean exposes series as its canonical text field; broader search fields are unavailable.
  if (hasSearch) {
    const cleanQ = params.q!.trim();
    query = query.ilike("series", `%${cleanQ.replace(/[%_]/g, "\\$&")}%`);
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

  // Keyset cursor pagination
  if (params.cursor && params.cursor.trim()) {
    query = query.gt("id", params.cursor.trim());
  }

  query = query.order("id", { ascending: true });

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

  const supabase = createAdminServerClient();
  const { data, error } = await supabase
    .from("comics")
    .select("*")
    .eq("id", id.trim())
    .maybeSingle();

  if (error) {
    console.error(`Error fetching comic with ID ${id}:`, error);
    return null;
  }

  if (data) return data as ComicRecord;

  const cleanDb = createCleanReadOnlyServerClient();
  const { data: artifact, error: cleanError } = await cleanDb
    .from("comic_instrument_market_artifacts")
    .select("id,product_name,created_at,updated_at,verification_status,edition_form")
    .eq("id", id.trim())
    .eq("verification_status", "verified")
    .maybeSingle();
  if (cleanError || !artifact) return null;

  const match = String(artifact.product_name || "").match(/^(.*?)(?:\s+#?([^#]+))?\s+\((\d{4})\)$/);
  const cover = await getComicCoverEvidence(id.trim());
  const series = match?.[1] || artifact.product_name || "Verified comic equity";
  const issueNumber = match?.[2]?.trim() || "";
  const timestamp = artifact.updated_at || artifact.created_at || new Date().toISOString();

  return {
    id: artifact.id,
    series,
    title: series,
    issue_number: issueNumber,
    volume: null,
    printing: null,
    direct_or_variant: artifact.edition_form || null,
    cover_variant: null,
    publisher: null,
    publication_date: null,
    publication_year: match?.[3] ? Number(match[3]) : null,
    upc: null,
    alt_upc: null,
    pp_source_id: null,
    comicbase_source_id: null,
    gcd_source_id: null,
    pp_grade_9_8_price: null,
    comicbase_price: null,
    baseline_grade_9_8_value: null,
    baseline_grade_9_8_sources: null,
    baseline_grade_9_8_observation_count: null,
    panel_profits_data: null,
    comicbase_data: null,
    gcd_data: null,
    search_document: null,
    created_at: artifact.created_at || timestamp,
    updated_at: timestamp,
    cover_url: cover?.image_url || null,
    cover_storage_path: cover?.storage_path || null,
    cover_source: cover?.image_source || null,
    cover_original_url: cover?.image_url || null,
    cover_retrieval_url: cover?.image_url || null,
    cover_width: null,
    cover_height: null,
    cover_sha256: cover?.checksum || null,
    cover_verified_at: cover ? timestamp : null,
  };
}

export async function getFeaturedComics(limit = 6): Promise<ComicRecord[]> {
  const supabase = createAdminServerClient();
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
