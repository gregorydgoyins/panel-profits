import { createPublicServerClient } from "@/lib/supabase/server";
import type { VerifiedEquityRecord } from "./verified-equities-service";

// Catalog search against the Supabase `verified_equities` table.
// (The previous search read a local SQLite file that is not deployed, so it always returned nothing.)

const PREMIER_PUBLISHERS = [
  "Marvel", "DC", "DC Comics", "Marvel Comics", "Image", "Dark Horse", "Quality Comics",
  "Fawcett", "Valiant", "Eclipse", "Mirage Studios", "IDW Publishing", "Independent",
];

const ERA_YEARS: Record<string, [number | null, number | null]> = {
  platinum: [null, 1937],
  golden: [1938, 1945],
  atomic: [1946, 1955],
  silver: [1956, 1969],
  bronze: [1970, 1983],
  copper: [1984, 1991],
  modern: [1992, 2001],
  independent: [2002, 2016],
  postmodern: [2017, null],
};

export async function searchVerifiedEquitiesLive(
  queryText = "",
  limit = 48,
  era?: string,
): Promise<VerifiedEquityRecord[]> {
  const supabase = createPublicServerClient();
  const clean = queryText.trim();
  const cleanEra = era && era !== "all" ? era.toLowerCase().trim() : null;
  const years = cleanEra ? ERA_YEARS[cleanEra] : undefined;

  const base = () => {
    let q = supabase.from("verified_equities").select("*");
    if (cleanEra) {
      if (years) {
        if (years[0] != null) q = q.gte("publication_year", years[0]);
        if (years[1] != null) q = q.lte("publication_year", years[1]);
        q = q.in("publisher", PREMIER_PUBLISHERS);
      } else {
        q = q.or(`production_age.ilike.${cleanEra},origin_era.ilike.${cleanEra}`);
      }
    }
    return q;
  };

  if (!clean) {
    const { data, error } = await base().order("fmv_usd", { ascending: false }).limit(limit);
    if (error) throw error;
    return (data ?? []) as VerifiedEquityRecord[];
  }

  const ticker = await base().ilike("ticker", clean).limit(limit);
  if (ticker.error) throw ticker.error;
  if (ticker.data && ticker.data.length > 0) return ticker.data as VerifiedEquityRecord[];

  const term = clean.replace(/[%_*,()"]/g, " ").replace(/\s+/g, " ").trim();

  // "Series Name #12" or "Series Name 12" → series match + exact issue number
  const issueMatch = term.match(/^(.*\S)\s*(?:#|\bissue\b|\bno\.?\b|\s+)\s*([0-9A-Za-z.]+)$/i);
  if (issueMatch && issueMatch[1].trim() && isNaN(Number(issueMatch[1]))) {
    const candidateSeries = issueMatch[1].trim();
    const candidateIssue = issueMatch[2].trim();
    const { data, error } = await base()
      .or(`series.ilike.*${candidateSeries}*,title.ilike.*${candidateSeries}*,ticker.ilike.*${candidateSeries}*`)
      .eq("issue_number", candidateIssue)
      .order("fmv_usd", { ascending: false })
      .limit(limit);
    if (!error && data && data.length > 0) return data as VerifiedEquityRecord[];
  }

  const p = `*${term}*`;
  const { data, error } = await base()
    .or(`series.ilike.${p},title.ilike.${p},ticker.ilike.${p},publisher.ilike.${p}`)
    .order("fmv_usd", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as VerifiedEquityRecord[];
}
