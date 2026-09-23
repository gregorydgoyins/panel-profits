import { createCleanReadOnlyServerClient } from "@/lib/supabase/admin";

export interface ComicCoverEvidence {
  image_url: string | null;
  storage_path: string | null;
  image_source?: string | null;
  checksum?: string | null;
  quality_tier?: string | null;
}

export async function getComicCoverEvidence(comicId: string): Promise<ComicCoverEvidence | null> {
  const db = createCleanReadOnlyServerClient();
  const { data } = await db
    .from("pf_cover_evidence")
    .select("image_url,storage_path,image_source,checksum,resolution,quality_tier,status,is_broken")
    .eq("variant_id", comicId)
    .eq("is_broken", false)
    .not("image_url", "is", null)
    .order("quality_tier", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data || null;
}

export async function getComicCoverEvidenceByIds(comicIds: string[]) {
  const ids = [...new Set(comicIds.filter(Boolean))];
  if (!ids.length) return new Map<string, ComicCoverEvidence>();

  const db = createCleanReadOnlyServerClient();
  const { data, error } = await db
    .from("pf_cover_evidence")
    .select("variant_id,image_url,storage_path,image_source,quality_tier,status,is_broken")
    .in("variant_id", ids)
    .eq("is_broken", false)
    .not("image_url", "is", null)
    .order("quality_tier", { ascending: true });

  if (error) {
    console.error("Error fetching cover evidence batch:", error);
    return new Map<string, ComicCoverEvidence>();
  }

  const covers = new Map<string, ComicCoverEvidence>();
  for (const row of data || []) {
    if (!covers.has(row.variant_id)) covers.set(row.variant_id, row);
  }
  return covers;
}
