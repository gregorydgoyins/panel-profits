import { createPublicServerClient } from "@/lib/supabase/server";
import { createAdminServerClient } from "@/lib/supabase/admin";
import type { VerifiedEquityRecord } from "./verified-equities-service";
import { TICKER_TO_SERIES_MAP } from "./slug";
import { formatComicEquityTicker } from "./ticker-formatting";
import { resolveProductionAge } from "./ticker-utils";
import { resolveAuthoritativePublisher } from "@/lib/comics/publisher-authority";

// Catalog search against the Supabase `verified_equities` AND `pp_comics` tables.

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

const EXTENDED_ABBREV_MAP: Record<string, string> = {
  ...TICKER_TO_SERIES_MAP,
  AF: "Amazing Fantasy",
  ASM: "Amazing Spider-Man",
  UXM: "Uncanny X-Men",
  XMN: "X-Men",
  IH: "Incredible Hulk",
  HK: "Incredible Hulk",
  HULK: "Incredible Hulk",
  FF: "Fantastic Four",
  F4: "Fantastic Four",
  TOS: "Tales of Suspense",
  TTA: "Tales to Astonish",
  JIM: "Journey into Mystery",
  STR: "Strange Tales",
  NYX: "NYX",
  SW: "Secret Wars",
  MSH: "Marvel Super-Heroes",
  WI: "What If",
  WD: "Walking Dead",
  TWD: "Walking Dead",
  INV: "Invincible",
  SSB: "Silver Surfer: Black",
  BM: "Batman",
  SM: "Superman",
  DC: "Detective Comics",
  AC: "Action Comics",
};

export interface LiveSearchFilters {
  era?: string;
  issue?: string;
  publisher?: string;
  year?: string;
  variant?: string;
}

export function parseSmartComicSearch(
  rawQuery: string,
  explicitFilters?: LiveSearchFilters
): {
  seriesTerm: string;
  expandedSeries: string | null;
  issueNumber: string | null;
  year: number | null;
  publisher: string | null;
  variant: string | null;
  rawTickerCandidate: string | null;
} {
  let text = (rawQuery || "").trim().replace(/[%_*"']/g, " ").replace(/\s+/g, " ");
  let issueNumber: string | null = explicitFilters?.issue?.trim().replace(/^#/, "") || null;
  let year: number | null = explicitFilters?.year && /^\d{4}$/.test(explicitFilters.year.trim())
    ? parseInt(explicitFilters.year.trim(), 10)
    : null;
  const publisher: string | null = explicitFilters?.publisher?.trim() || null;
  const variant: string | null = explicitFilters?.variant?.trim() || null;

  // 1. Extract 4-digit year (1930-2029) from query if not explicitly set, e.g. "asm 1 1963" or "Batman (1940) #1"
  const yearRegex = /(?:^|\s|\()((?:19[3-9]\d|20[0-2]\d))(?:\)|\s|$)/;
  const yearMatch = text.match(yearRegex);
  if (yearMatch) {
    if (!year) year = parseInt(yearMatch[1], 10);
    text = text.replace(yearMatch[0], " ").replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
  }

  // 2. Check compact ticker/code like "ASM1", "ASM01", "ASM300", "AF15", "HK181", "SSB01"
  const compactMatch = text.match(/^\$?([A-Za-z]{2,5})[- ]?0*(\d+[A-Za-z]?)$/);
  if (compactMatch) {
    const prefix = compactMatch[1].toUpperCase();
    const num = compactMatch[2];
    const mapped = EXTENDED_ABBREV_MAP[prefix];
    if (mapped) {
      return {
        seriesTerm: mapped,
        expandedSeries: mapped,
        issueNumber: issueNumber || num,
        year,
        publisher,
        variant,
        rawTickerCandidate: `${prefix}${num.padStart(2, "0")}`,
      };
    }
  }

  // 3. Extract explicit issue number (#1, issue 1, no. 1, or trailing number like "Amazing Spider-Man 1" / "asm 1")
  const explicitHashMatch = text.match(/^(.*?)\s*(?:#|\bissue\b|\bno\.?\b)\s*0*(\d+[A-Za-z0-9./]*)(?:\s+.*)?$/i);
  if (explicitHashMatch && explicitHashMatch[1].trim()) {
    text = explicitHashMatch[1].trim();
    if (!issueNumber) issueNumber = explicitHashMatch[2].trim();
  } else {
    const trailingIssueMatch = text.match(/^(.*\S)\s+0*(\d+[A-Za-z./]*)$/);
    if (trailingIssueMatch && trailingIssueMatch[1].trim() && isNaN(Number(trailingIssueMatch[1].trim()))) {
      const candidateNum = trailingIssueMatch[2].trim();
      // Don't treat "Vol 1" or "Part 2" as issue number if preceded by Vol/Volume/Part
      if (!/\b(?:vol|volume|part|book|phase)\.?$/i.test(trailingIssueMatch[1].trim())) {
        text = trailingIssueMatch[1].trim();
        if (!issueNumber) issueNumber = candidateNum;
      }
    }
  }

  // Clean trailing "Vol 1" if present
  text = text.replace(/\s+\b(?:vol|volume)\.?\s*\d+$/i, "").trim();

  // 4. Expand standalone abbreviation if the remaining series term is a known shorthand (e.g. "asm", "ff", "uf", "tmnt")
  const upperText = text.toUpperCase().replace(/^\$/, "");
  const expandedSeries = EXTENDED_ABBREV_MAP[upperText] || null;

  const rawTickerCandidate = ! text.includes(" ") && text.length >= 2 && text.length <= 12
    ? upperText
    : null;

  return {
    seriesTerm: expandedSeries || text,
    expandedSeries,
    issueNumber,
    year,
    publisher,
    variant,
    rawTickerCandidate,
  };
}

export async function searchVerifiedEquitiesLive(
  queryText = "",
  limit = 48,
  eraOrFilters?: string | LiveSearchFilters,
): Promise<VerifiedEquityRecord[]> {
  const supabase = createPublicServerClient();
  const adminDb = createAdminServerClient();

  const filters: LiveSearchFilters =
    typeof eraOrFilters === "string" ? { era: eraOrFilters } : (eraOrFilters || {});

  const clean = queryText.trim();
  const cleanEra = filters.era && filters.era !== "all" ? filters.era.toLowerCase().trim() : null;
  const years = cleanEra ? ERA_YEARS[cleanEra] : undefined;

  const parsed = parseSmartComicSearch(clean, filters);
  const hasAnyFilter = Boolean(
    clean || parsed.issueNumber || parsed.year || parsed.publisher || parsed.variant
  );

  const applyVeFilters = (q: any) => {
    if (cleanEra) {
      if (years) {
        if (years[0] != null) q = q.gte("publication_year", years[0]);
        if (years[1] != null) q = q.lte("publication_year", years[1]);
        q = q.in("publisher", PREMIER_PUBLISHERS);
      } else {
        q = q.or(`production_age.ilike.${cleanEra},origin_era.ilike.${cleanEra}`);
      }
    }
    if (parsed.year) {
      q = q.eq("publication_year", parsed.year);
    }
    if (parsed.publisher) {
      q = q.ilike("publisher", `%${parsed.publisher}%`);
    }
    if (parsed.variant) {
      if (parsed.variant.toLowerCase() === "direct") {
        q = q.is("variant", null);
      } else {
        q = q.ilike("variant", `%${parsed.variant}%`);
      }
    }
    return q;
  };

  if (!hasAnyFilter) {
    const { data, error } = await applyVeFilters(supabase.from("verified_equities").select("*"))
      .order("fmv_usd", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as VerifiedEquityRecord[];
  }

  const resultsMap = new Map<string, VerifiedEquityRecord>();
  const addVeRow = (r: VerifiedEquityRecord) => {
    const key = `${(r.series || "").toLowerCase().replace(/^the\s+/, "")}|${r.issue_number}|${r.publication_year || ""}|${r.variant || ""}`;
    if (!resultsMap.has(key)) {
      resultsMap.set(key, r);
    }
  };

  // 1. Direct ID or Ticker lookup if query is a single token
  if (parsed.rawTickerCandidate) {
    const { data: tickerRows } = await applyVeFilters(
      supabase.from("verified_equities").select("*")
    )
      .or(`ticker.ilike.${parsed.rawTickerCandidate},id.eq.${clean},source_product_id.eq.${clean}`)
      .order("fmv_usd", { ascending: false })
      .limit(limit);
    for (const r of (tickerRows || []) as VerifiedEquityRecord[]) addVeRow(r);
  }

  // 2. Search verified_equities by series + issue + year
  if (parsed.seriesTerm || parsed.issueNumber) {
    let veQ = applyVeFilters(supabase.from("verified_equities").select("*"));
    if (parsed.seriesTerm) {
      const sTerm = parsed.seriesTerm.replace(/[,()]/g, " ").trim();
      veQ = veQ.or(`series.ilike.*${sTerm}*,title.ilike.*${sTerm}*,ticker.ilike.*${sTerm}*`);
    }
    if (parsed.issueNumber) {
      veQ = veQ.eq("issue_number", parsed.issueNumber);
    }
    const { data: veRows } = await veQ.order("fmv_usd", { ascending: false }).limit(limit);
    for (const r of (veRows || []) as VerifiedEquityRecord[]) addVeRow(r);
  }

  // 3. Also search pp_comics (355,692 canonical comics) so every book in the database is searchable and prioritized
  try {
    const buildPpQuery = (exactSeries = false) => {
      let q = adminDb
        .from("pp_comics")
        .select("id,series,title,issue_number,publication_year,variant,cover_url,pp_grade_9_8_price,raw,sales_volume");
      if (parsed.seriesTerm) {
        const stripped = parsed.seriesTerm.replace(/^The\s+/i, "").trim();
        if (exactSeries) {
          q = q.or(`series.ilike.${stripped},series.ilike.The ${stripped},series.ilike.${stripped} (%`);
        } else {
          q = q.ilike("series", `%${stripped}%`);
        }
      }
      if (parsed.issueNumber) {
        q = q.eq("issue_number", parsed.issueNumber);
      }
      if (parsed.year) {
        q = q.eq("publication_year", parsed.year);
      } else if (cleanEra && years) {
        if (years[0] != null) q = q.gte("publication_year", years[0]);
        if (years[1] != null) q = q.lte("publication_year", years[1]);
      }
      if (parsed.variant) {
        if (parsed.variant.toLowerCase() === "direct") {
          q = q.is("variant", null);
        } else {
          q = q.ilike("variant", `%${parsed.variant}%`);
        }
      }
      return q;
    };

    // Fetch exact series matches first so "Batman" isn't drowned out by "Batman Beyond", then broader substring matches
    const [exactRes, broadRes] = await Promise.all([
      parsed.seriesTerm ? buildPpQuery(true).limit(60) : Promise.resolve({ data: [] as any[] }),
      buildPpQuery(false).limit(80),
    ]);
    const ppRows = [...(exactRes.data || []), ...(broadRes.data || [])];
    if (ppRows.length > 0) {
      for (const row of ppRows as any[]) {
        const fmv98 = Number(row.pp_grade_9_8_price || row["9.8"] || 0);
        const rawVal = Number(row.raw || 0);
        const fmv = fmv98 > 0 ? fmv98 : rawVal;
        const pub = resolveAuthoritativePublisher(row.series, null, row.publication_year);
        if (parsed.publisher && !pub.toLowerCase().includes(parsed.publisher.toLowerCase())) {
          continue;
        }
        const era = row.publication_year ? resolveProductionAge(Number(row.publication_year)).toUpperCase() : "MODERN";
        const key = `${(row.series || "").toLowerCase().replace(/^the\s+/, "")}|${row.issue_number}|${row.publication_year || ""}|${row.variant || ""}`;
        const existing = resultsMap.get(key);
        const record: VerifiedEquityRecord = {
          id: String(row.id),
          series: row.series,
          issue_number: String(row.issue_number),
          title: row.title || `${row.series} #${row.issue_number}`,
          publication_year: row.publication_year,
          publisher: pub,
          fmv_usd: fmv,
          price_formatted: fmv > 0 ? `$${fmv.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Unpriced",
          cover_url: row.cover_url || existing?.cover_url || "",
          ticker: formatComicEquityTicker(row.series, row.issue_number),
          origin_era: era,
          production_age: era,
          reference_grade: fmv98 > 0 ? "9.8" : "RAW",
          gregory_score: 90,
          delta_percent: 0,
          status: "ACTIVE",
          variant: row.variant || null,
          source_product_id: String(row.id),
        };
        // Prefer canonical numeric pp_comics IDs (like 2314818) or higher FMV over hash rows
        if (!existing || (/^\d+$/.test(String(row.id)) && !/^\d+$/.test(existing.id)) || record.fmv_usd > existing.fmv_usd) {
          resultsMap.set(key, record);
        }
      }
    }
  } catch (err) {
    console.warn("pp_comics search supplement warning:", err);
  }

  const targetSeriesNorm = parsed.seriesTerm ? parsed.seriesTerm.toLowerCase().replace(/^the\s+/, "").trim() : "";
  const isExactSeries = (s: string) => {
    if (!targetSeriesNorm) return false;
    const norm = (s || "").toLowerCase().replace(/^the\s+/, "").replace(/\s*\([^)]*\)\s*$/, "").trim();
    return norm === targetSeriesNorm;
  };

  return Array.from(resultsMap.values())
    .sort((a, b) => {
      const aExact = isExactSeries(a.series) ? 1 : 0;
      const bExact = isExactSeries(b.series) ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      return (b.fmv_usd || 0) - (a.fmv_usd || 0);
    })
    .slice(0, limit);
}
