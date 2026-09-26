import { createCleanReadOnlyServerClient } from "@/lib/supabase/admin";
import { resolveComicCover } from "@/lib/comics/cover-resolver";

export interface ComicCoverEvidence {
  image_url: string | null;
  storage_path: string | null;
  image_source?: string | null;
  checksum?: string | null;
  quality_tier?: string | null;
  source_tier?: string | null;
  is_fallback?: boolean;
}

export async function getComicCoverEvidence(comicId: string): Promise<ComicCoverEvidence | null> {
  const db = createCleanReadOnlyServerClient();
  const { data } = await db
    .from("comics")
    .select(
      "id,series,issue_number,publisher,publication_year,cover_url,cover_storage_path,cover_source,cover_sha256,cover_verified_at,cover_original_url,cover_retrieval_url,gcd_source_id,comicbase_data,gcd_data"
    )
    .eq("id", comicId)
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const resolved = resolveComicCover(data);
  return {
    image_url: resolved.url,
    storage_path: data.cover_storage_path || null,
    image_source: data.cover_source || resolved.sourceTier,
    checksum: data.cover_sha256 || null,
    quality_tier: resolved.qualityTier,
    source_tier: resolved.sourceTier,
    is_fallback: resolved.isFallback,
  };
}

export async function getComicCoverEvidenceByIds(comicIds: string[]) {
  const ids = [...new Set(comicIds.filter(Boolean))];
  if (!ids.length) return new Map<string, ComicCoverEvidence>();

  const db = createCleanReadOnlyServerClient();
  const { data, error } = await db
    .from("comics")
    .select(
      "id,series,issue_number,publisher,publication_year,cover_url,cover_storage_path,cover_source,cover_sha256,cover_verified_at,cover_original_url,cover_retrieval_url,gcd_source_id,comicbase_data,gcd_data"
    )
    .in("id", ids);

  if (error) {
    console.error("Error fetching cover evidence batch:", error);
    return new Map<string, ComicCoverEvidence>();
  }

  const covers = new Map<string, ComicCoverEvidence>();
  for (const row of data || []) {
    if (!covers.has(row.id)) {
      const resolved = resolveComicCover(row);
      covers.set(row.id, {
        image_url: resolved.url,
        storage_path: row.cover_storage_path || null,
        image_source: row.cover_source || resolved.sourceTier,
        checksum: row.cover_sha256 || null,
        quality_tier: resolved.qualityTier,
        source_tier: resolved.sourceTier,
        is_fallback: resolved.isFallback,
      });
    }
  }
  return covers;
}
