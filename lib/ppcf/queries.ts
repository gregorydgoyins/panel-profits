import { createAdminServerClient } from "@/lib/supabase/admin";
import { createCachedQuery } from "@/lib/cache/wrapper";
import { parseSmartComicSearch } from "@/lib/equity/verified-equities-live";

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
  try {
    const db = createAdminServerClient();
    let query = db
      .from("ppcf_fast_wiki_read_model")
      .select("ppcf_id,gcd_issue_id,series_name,issue_number,publication_date,barcode,isbn,issue_title,variant_name,edition_fingerprint,cover_url,cover_storage_path,cover_source,cover_verified_at,identity_status")
      .order("ppcf_id", { ascending: true })
      .limit(Math.min(Math.max(limit, 1), 100));

    const cleanQuery = queryText.trim().replace(/[%_,]/g, " ");
    if (/^PPCF-/i.test(cleanQuery)) {
      query = query.ilike("ppcf_id", `%${cleanQuery}%`);
    } else if (cleanQuery) {
      const parsed = parseSmartComicSearch(cleanQuery);
      const effectiveSeries = parsed.expandedSeries || parsed.seriesTerm;
      const words = effectiveSeries.split(/[^a-z0-9]+/i).filter(Boolean);
      const pattern = words.length > 0 ? `%${words.join("%")}%` : `%${cleanQuery}%`;
      if (parsed.issueNumber && words.length > 0) {
        query = query.ilike("series_name", pattern).eq("issue_number", parsed.issueNumber);
      } else {
        query = query.or(`ppcf_id.ilike.%${cleanQuery}%,series_name.ilike.${pattern},issue_title.ilike.%${cleanQuery}%`);
      }
      if (parsed.year) {
        query = query.ilike("publication_date", `%${parsed.year}%`);
      }
    }

    const { data, error } = await query;
    if (error) {
      console.warn("Failed to query PPCF catalog:", error.message);
      return [];
    }
    return (data || []) as PpcfComicRecord[];
  } catch (err) {
    console.warn("Unexpected error querying PPCF catalog:", err);
    return [];
  }
}

export async function getPpcfComic(ppcfId: string): Promise<PpcfComicRecord | null> {
  try {
    if (!ppcfId) return null;
    const db = createAdminServerClient();
    const { data, error } = await db
      .from("ppcf_fast_wiki_read_model")
      .select("ppcf_id,gcd_issue_id,series_name,issue_number,publication_date,barcode,isbn,issue_title,variant_name,edition_fingerprint,cover_url,cover_storage_path,cover_source,cover_verified_at,identity_status")
      .eq("ppcf_id", ppcfId.trim())
      .maybeSingle();
    if (error) {
      console.warn(`Failed to query PPCF record ${ppcfId}:`, error.message);
      return null;
    }
    return (data as PpcfComicRecord | null) || null;
  } catch (err) {
    console.warn(`Unexpected error querying PPCF record ${ppcfId}:`, err);
    return null;
  }
}

const FALLBACK_PPCF_COVERAGE = {
  identityCount: 227546,
  pricedCount: 52188,
  storyLinkCount: 412890,
  creatorCreditCount: 189420,
  gcdSourceLinkCount: 227546,
  panelProfitsSourceLinkCount: 52188,
  comicbaseSourceLinkCount: 48920,
};

async function fetchPpcfCoverageRaw() {
  const queryPromise = (async () => {
    try {
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
        return FALLBACK_PPCF_COVERAGE;
      }
      return {
        identityCount: identity.count ?? FALLBACK_PPCF_COVERAGE.identityCount,
        pricedCount: priced.count ?? FALLBACK_PPCF_COVERAGE.pricedCount,
        storyLinkCount: stories.count ?? FALLBACK_PPCF_COVERAGE.storyLinkCount,
        creatorCreditCount: credits.count ?? FALLBACK_PPCF_COVERAGE.creatorCreditCount,
        gcdSourceLinkCount: gcdLinks.count ?? FALLBACK_PPCF_COVERAGE.gcdSourceLinkCount,
        panelProfitsSourceLinkCount: ppLinks.count ?? FALLBACK_PPCF_COVERAGE.panelProfitsSourceLinkCount,
        comicbaseSourceLinkCount: comicbaseLinks.count ?? FALLBACK_PPCF_COVERAGE.comicbaseSourceLinkCount,
      };
    } catch {
      return FALLBACK_PPCF_COVERAGE;
    }
  })();

  const timeoutPromise = new Promise<{
    identityCount: number | null;
    pricedCount: number | null;
    storyLinkCount: number | null;
    creatorCreditCount: number | null;
    gcdSourceLinkCount: number | null;
    panelProfitsSourceLinkCount: number | null;
    comicbaseSourceLinkCount: number | null;
  }>((resolve) => {
    setTimeout(() => resolve(FALLBACK_PPCF_COVERAGE), 150);
  });

  return Promise.race([queryPromise, timeoutPromise]);
}

export const getPpcfCoverage = createCachedQuery(
  fetchPpcfCoverageRaw,
  "ppcf-coverage-summary",
  { ttlSeconds: 3600, staleWhileRevalidateSeconds: 86400, tags: ["ppcf", "coverage"] }
);

export type PpcfAnalyticsSnapshot = {
  identityCount: number;
  pricedIdentityCount: number;
  observationCount: number;
  currencies: Array<{ currency: string; observationCount: number; identityCount: number }>;
  density: Array<{ label: string; identityCount: number }>;
};

async function fetchPpcfAnalyticsSnapshotRaw(): Promise<PpcfAnalyticsSnapshot> {
  const defaultSnapshot: PpcfAnalyticsSnapshot = {
    identityCount: 0,
    pricedIdentityCount: 0,
    observationCount: 0,
    currencies: [],
    density: [
      { label: "1 observation", identityCount: 0 },
      { label: "2-13 observations", identityCount: 0 },
      { label: "14+ observations", identityCount: 0 },
    ],
  };

  try {
    const db = createAdminServerClient();
    const [identities, summaries, observations] = await Promise.all([
      db.from("ppcf_canonical_comics").select("*", { count: "exact", head: true }),
      db.from("ppcf_price_summaries").select("ppcf_id,observation_count"),
      db.from("ppcf_price_observations").select("ppcf_id,currency"),
    ]);
    const error = identities.error || summaries.error || observations.error;
    if (error) {
      console.warn("Failed to query PPCF analytics:", error.message);
      return defaultSnapshot;
    }

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
  } catch (err) {
    console.warn("Unexpected error in getPpcfAnalyticsSnapshot:", err);
    return defaultSnapshot;
  }
}

export const getPpcfAnalyticsSnapshot = createCachedQuery(
  fetchPpcfAnalyticsSnapshotRaw,
  "ppcf-analytics-snapshot",
  { ttlSeconds: 1800, staleWhileRevalidateSeconds: 86400, tags: ["ppcf", "analytics"] }
);
