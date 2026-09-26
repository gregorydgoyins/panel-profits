import { createAdminServerClient } from "@/lib/supabase/admin";

export interface PpcfComicRecord {
  ppcf_id: string;
  gcd_issue_id: number | null;
  series_name: string | null;
  issue_number: string | null;
  publication_date: string | null;
  barcode: string | null;
  isbn: string | null;
  issue_title: string | null;
  variant_name: string | null;
  edition_fingerprint: string;
  cover_url: string | null;
  cover_storage_path: string | null;
  cover_source: string | null;
  cover_verified_at: string | null;
  identity_status: "GCD_CONFIRMED" | "SOURCE_ONLY_PROVISIONAL" | "NEEDS_REVIEW";
}

export async function searchPpcfComics(queryText = "", limit = 24): Promise<PpcfComicRecord[]> {
  const db = createAdminServerClient();
  let query = db
    .from("ppcf_fast_wiki_read_model")
    .select("ppcf_id,gcd_issue_id,series_name,issue_number,publication_date,barcode,isbn,issue_title,variant_name,edition_fingerprint,cover_url,cover_storage_path,cover_source,cover_verified_at,identity_status")
    .order("ppcf_id", { ascending: true })
    .limit(Math.min(Math.max(limit, 1), 100));

  const cleanQuery = queryText.trim().replace(/[%_,]/g, " ");
  if (cleanQuery) query = query.or(`ppcf_id.ilike.%${cleanQuery}%,series_name.ilike.%${cleanQuery}%,issue_title.ilike.%${cleanQuery}%`);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to query PPCF catalog: ${error.message}`);
  return (data || []) as PpcfComicRecord[];
}

export async function getPpcfComic(ppcfId: string): Promise<PpcfComicRecord | null> {
  const db = createAdminServerClient();
  const { data, error } = await db
    .from("ppcf_fast_wiki_read_model")
    .select("ppcf_id,gcd_issue_id,series_name,issue_number,publication_date,barcode,isbn,issue_title,variant_name,edition_fingerprint,cover_url,cover_storage_path,cover_source,cover_verified_at,identity_status")
    .eq("ppcf_id", ppcfId)
    .maybeSingle();
  if (error) throw new Error(`Failed to query PPCF record: ${error.message}`);
  return (data as PpcfComicRecord | null) || null;
}

export async function getPpcfCoverage() {
  const db = createAdminServerClient();
  const [identity, priced, stories, credits, gcdLinks, ppLinks, comicbaseLinks] = await Promise.all([
    db.from("ppcf_canonical_comics").select("*", { count: "exact", head: true }),
    db.from("ppcf_price_summaries").select("*", { count: "exact", head: true }),
    db.from("ppcf_story_links").select("*", { count: "exact", head: true }),
    db.from("ppcf_creator_links").select("*", { count: "exact", head: true }),
    db.from("ppcf_source_links").select("*", { count: "exact", head: true }).eq("source_system", "GCD"),
    db.from("ppcf_source_links").select("*", { count: "exact", head: true }).eq("source_system", "PANEL_PROFITS"),
    db.from("ppcf_source_links").select("*", { count: "exact", head: true }).eq("source_system", "COMICBASE"),
  ]);
  const error = identity.error || priced.error || stories.error || credits.error || gcdLinks.error || ppLinks.error || comicbaseLinks.error;
  if (error) {
    console.warn("PPCF coverage read unavailable:", error.message || error);
  }
  return {
    identityCount: identity.error ? null : identity.count,
    pricedCount: priced.error ? null : priced.count,
    storyLinkCount: stories.error ? null : stories.count,
    creatorCreditCount: credits.error ? null : credits.count,
    gcdSourceLinkCount: gcdLinks.error ? null : gcdLinks.count,
    panelProfitsSourceLinkCount: ppLinks.error ? null : ppLinks.count,
    comicbaseSourceLinkCount: comicbaseLinks.error ? null : comicbaseLinks.count,
  };
}

export type PpcfAnalyticsSnapshot = {
  identityCount: number;
  pricedIdentityCount: number;
  observationCount: number;
  currencies: Array<{ currency: string; observationCount: number; identityCount: number }>;
  density: Array<{ label: string; identityCount: number }>;
};

export async function getPpcfAnalyticsSnapshot(): Promise<PpcfAnalyticsSnapshot> {
  const db = createAdminServerClient();
  const [identities, summaries, observations] = await Promise.all([
    db.from("ppcf_canonical_comics").select("*", { count: "exact", head: true }),
    db.from("ppcf_price_summaries").select("ppcf_id,observation_count"),
    db.from("ppcf_price_observations").select("ppcf_id,currency"),
  ]);
  const error = identities.error || summaries.error || observations.error;
  if (error) throw new Error(`Failed to query PPCF analytics: ${error.message}`);

  const summaryRows = summaries.data || [];
  const observationRows = observations.data || [];
  const currencyMap = new Map<string, { observationCount: number; identities: Set<string> }>();
  for (const row of observationRows) {
    const currency = row.currency || "UNSPECIFIED";
    const entry = currencyMap.get(currency) || { observationCount: 0, identities: new Set<string>() };
    entry.observationCount += 1;
    entry.identities.add(row.ppcf_id);
    currencyMap.set(currency, entry);
  }

  const densityBuckets = [
    { label: "1 observation", identityCount: 0 },
    { label: "2-13 observations", identityCount: 0 },
    { label: "14+ observations", identityCount: 0 },
  ];
  for (const row of summaryRows) {
    const count = row.observation_count || 0;
    if (count === 1) densityBuckets[0].identityCount += 1;
    else if (count < 14) densityBuckets[1].identityCount += 1;
    else densityBuckets[2].identityCount += 1;
  }

  return {
    identityCount: identities.count || 0,
    pricedIdentityCount: summaryRows.length,
    observationCount: observationRows.length,
    currencies: [...currencyMap.entries()]
      .map(([currency, value]) => ({ currency, observationCount: value.observationCount, identityCount: value.identities.size }))
      .sort((a, b) => b.observationCount - a.observationCount),
    density: densityBuckets,
  };
}
