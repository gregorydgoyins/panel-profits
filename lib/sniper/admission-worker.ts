import { createAdminServerClient } from "@/lib/supabase/admin";
import { resolveComicLoreDossier } from "./lore-dossier";
import { calculateSniperFinancials, buyerPremiumForSource } from "./financials";
import { parseAndFilterListing } from "./anti-bullshit";
import { resolvePPGradeBenchmark, type PPGrade, type PPPriceRow } from "./pp-grade-benchmarks";

const OCTOBER_6 = "2026-10-06";
const EDITION_WORDS = /\b(?:variant|newsstand|direct|foil|sketch|virgin|incentive|exclusive|facsimile|reprint|(?:1st|first|2nd|second)\s+print(?:ing)?|printing|cover\s+[a-z])\b/i;

type Rejection = { code: string; detail: string };
type CertificationCheck = {
  verified: boolean;
  source: "cgc_dealer_api" | "persisted" | "unavailable" | "mismatch";
  sourceUrl?: string;
  checkedAt: string;
  responseStatus?: number;
  response?: Record<string, unknown>;
  detail?: string;
  certNumber?: string;
};

function gradeKey(value: unknown): PPGrade | null {
  const n = Number(value);
  const allowed = ["RAW", "2.0", "3.0", "4.0", "5.0", "6.0", "7.0", "8.0", "9.0", "9.2", "9.4", "9.6", "9.8", "10.0"] as const;
  return allowed.includes(String(n) as PPGrade) ? String(n) as PPGrade : value == null ? "RAW" : null;
}

function exactEditionText(title: string, edition: unknown): string {
  return String(edition ?? (EDITION_WORDS.test(title) ? title.match(EDITION_WORDS)?.[0] : "direct") ?? "")
    .trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizedEdition(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ");
}

function catalogEdition(c: any): string {
  return normalizedEdition([c.printing, c.direct_or_variant, c.cover_variant].filter(Boolean).join(" ")) || "direct";
}

function editionMatches(requested: string, catalog: string): boolean {
  if (requested === "direct") return /(^| )(direct|base)( |$)/.test(catalog) || catalog === "direct";
  if (/newsstand/.test(requested)) return /newsstand/.test(catalog);
  if (/(?:2nd|second)\s+print/.test(requested)) return /(^| )(2|2nd|second)( |$)/.test(catalog) || /2nd|second/.test(catalog);
  if (/(?:1st|first)\s+print/.test(requested)) return /(^| )(1|1st|first)( |$)/.test(catalog) || /1st|first/.test(catalog);
  return catalog === requested || catalog.includes(requested) || requested.includes(catalog);
}

function comparable(value: unknown): string {
  return normalizedEdition(value).replace(/\b(the|comic|comics)\b/g, " ").replace(/\s+/g, " ").trim();
}

async function verifyCGCCertification(certNumber: string | null, series: string, issue: string, grade: number, stored: any): Promise<CertificationCheck> {
  const checkedAt = new Date().toISOString();
  const apiToken = process.env.CGC_DEALER_API_TOKEN?.trim();
  const sourceUrl = certNumber ? `https://dealer-api.collectiblesgroup.com/comics/certifications/v3/lookup/${encodeURIComponent(certNumber)}` : undefined;
  if (!certNumber) return { verified: false, source: "unavailable", checkedAt, detail: "No certification number was transcribed." };
  if (!apiToken) {
    if (stored?.verified === true && stored?.source === "cgc_dealer_api" && stored?.certNumber === certNumber && stored?.response) {
      return { ...stored, source: "persisted", checkedAt };
    }
    return { verified: false, source: "unavailable", checkedAt, sourceUrl, certNumber, detail: "CGC dealer API token is not configured; a parsed certificate is not verification." };
  }
  try {
    const response = await fetch(`${sourceUrl}?include=pop`, { headers: { Authorization: `Bearer ${apiToken}`, Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
    const body = await response.json().catch(() => null) as Record<string, any> | null;
    const actualCert = String(body?.certNumber ?? "").trim();
    const actualGrade = Number(body?.grade?.displayGrade);
    const actualTitle = comparable(body?.collectible?.title);
    const actualIssue = String(body?.collectible?.issue ?? "").replace(/^#/, "").trim();
    const titleMatches = actualTitle.length > 0 && (actualTitle.includes(comparable(series)) || comparable(series).includes(actualTitle));
    const exact = response.ok && actualCert === certNumber && actualIssue === issue && actualGrade === grade && titleMatches;
    return { verified: exact, source: exact ? "cgc_dealer_api" : "mismatch", checkedAt, sourceUrl, responseStatus: response.status, response: body ?? undefined, detail: exact ? undefined : `CGC response did not exactly match cert, title, issue, or grade (HTTP ${response.status}).`, certNumber };
  } catch (error) {
    return { verified: false, source: "unavailable", checkedAt, sourceUrl, certNumber, detail: `CGC dealer API request failed: ${error instanceof Error ? error.message : "unknown error"}` };
  }
}

async function resolvePanelProfits(db: any, series: string, issue: string, year: number | null, grade: PPGrade, labelEdition: string | null): Promise<{ benchmark?: ReturnType<typeof resolvePPGradeBenchmark>; rejection?: Rejection }> {
  let q = db.from("comics").select("pp_source_id,series,issue_number,publication_year,printing,direct_or_variant,cover_variant").eq("series", series).eq("issue_number", issue);
  if (year) q = q.eq("publication_year", year);
  const { data: comics, error } = await q.limit(25);
  if (error) return { rejection: { code: "pp_identity_lookup_failed", detail: error.message } };
  if (!comics?.length) return { rejection: { code: "pp_identity_not_found", detail: `${series} #${issue}${year ? ` (${year})` : ""}` } };
  const requestedEdition = normalizedEdition(exactEditionText(`${series} #${issue}`, labelEdition));
  const candidates = comics.filter((c: any) => {
    const edition = catalogEdition(c);
    return editionMatches(requestedEdition, edition);
  });
  const identityGroups = new Map<string, any[]>();
  for (const candidate of candidates) {
    const key = [candidate.series, candidate.issue_number, candidate.publication_year ?? "", candidate.printing ?? "", candidate.direct_or_variant ?? "", candidate.cover_variant ?? ""].join("|");
    identityGroups.set(key, [...(identityGroups.get(key) ?? []), candidate]);
  }
  const usableGroups = [...identityGroups.values()].map((group) => {
    const withSource = group.filter((candidate) => candidate.pp_source_id);
    return withSource.length === 1 ? withSource : group;
  });
  const resolvedCandidates = usableGroups.length === 1 ? usableGroups[0] : usableGroups.flat();
  if (resolvedCandidates.length !== 1 || !resolvedCandidates[0].pp_source_id) {
    return { rejection: { code: resolvedCandidates.length > 1 ? "pp_identity_ambiguous" : "pp_source_id_missing", detail: `${resolvedCandidates.length} exact edition candidates for ${series} #${issue}` } };
  }
  const ppId = String(resolvedCandidates[0].pp_source_id).replace(/^pp-/i, "");
  const { data: rows, error: historyError } = await db.from("pp_price_history").select("*").eq("pp_id", ppId).eq("snapshot_date", OCTOBER_6).limit(2);
  if (historyError) return { rejection: { code: "pp_snapshot_lookup_failed", detail: historyError.message } };
  if (!rows?.length) return { rejection: { code: "pp_october_6_snapshot_missing", detail: `No ${OCTOBER_6} row for ${ppId}` } };
  const benchmark = resolvePPGradeBenchmark(rows[0] as PPPriceRow, ppId, grade);
  return benchmark ? { benchmark } : { rejection: { code: "pp_exact_grade_missing", detail: `No exact ${grade} value in ${OCTOBER_6} row for ${ppId}` } };
}

export async function runAdmissionEnrichment(limit = 20): Promise<{ inspected: number; priced: number; researched: number; admitted: number; rejected: number; rejectionReasons: Record<string, number> }> {
  const db: any = createAdminServerClient();
  const { data, error } = await db.from("sniper_listings")
    .select("item_id,payload,price_usd,bid_count,end_time,last_seen,label,census,census_at,admission_evidence")
    .eq("status", "live").order("last_seen", { ascending: false }).limit(limit);
  if (error) throw new Error(`admission candidate query failed: ${error.message}`);
  const rows: any[] = data ?? [];
  const summary = { inspected: rows.length, priced: 0, researched: 0, admitted: 0, rejected: 0, rejectionReasons: {} as Record<string, number> };
  for (const row of rows) {
    const payload = (row.payload && typeof row.payload === "object") ? row.payload : {};
    const parsed = parseAndFilterListing(String(payload.title || ""));
    const label = row.label || payload.label || null;
    const reasons: Rejection[] = [];
    const add = (r: Rejection) => { reasons.push(r); summary.rejectionReasons[r.code] = (summary.rejectionReasons[r.code] || 0) + 1; };
    const series = String(label?.title || parsed.extractedSeries || "").trim();
    const issue = String(label?.issueNumber || parsed.extractedIssue || "").replace(/^#/, "").trim();
    const grade = Number(label?.grade ?? parsed.grade);
    const yearMatch = String(label?.issueDate || payload.year || parsed.extractedYear || "").match(/(?:19|20)\d{2}/);
    const year = yearMatch ? Number(yearMatch[0]) : null;
    const certificationVerification = await verifyCGCCertification(label?.certNumber ? String(label.certNumber) : null, series, issue, grade, payload.certificationVerification);
    const certVerified = certificationVerification.verified === true;
    const verifiedEdition = label?.edition || (certificationVerification.response as any)?.collectible?.variant || null;
    if (!label?.certNumber || !certVerified) add({ code: "certification_not_verified", detail: certificationVerification.detail || "A label transcription plus an exact CGC dealer API response is required." });
    if (!series || !issue || !Number.isFinite(grade)) add({ code: "identity_incomplete", detail: "Exact title, issue, and numeric grade are required." });
    if (EDITION_WORDS.test(String(payload.title || "")) && !verifiedEdition) add({ code: "edition_unresolved", detail: "Listing text identifies an edition/variant but neither the slab label nor verified CGC response identifies it." });
    if (label?.edition && !String(label.edition).trim()) add({ code: "edition_unresolved", detail: "Empty edition transcription cannot establish exact identity." });

    let benchmark: ReturnType<typeof resolvePPGradeBenchmark> | undefined;
    if (!reasons.some((r) => r.code === "identity_incomplete" || r.code === "edition_unresolved")) {
      const pp = await resolvePanelProfits(db, series, issue, year, gradeKey(grade) as PPGrade, verifiedEdition);
      if (pp.rejection) add(pp.rejection); else benchmark = pp.benchmark;
    }
    if (benchmark) summary.priced++;

    const dossier = series && issue ? resolveComicLoreDossier(series, issue, payload.graderNotes, label?.publisher, year ?? undefined) : null;
    const researched = Boolean(dossier?.historicalSignificance && dossier?.collectorHoldingThesis && dossier.gcdMetadata.writers.length && dossier.gcdMetadata.pencilers.length);
    if (researched) summary.researched++; else add({ code: "issue_research_incomplete", detail: "No stored issue-specific significance, creator, and collector thesis dossier." });
    const { data: sales, error: salesError } = await db.from("sniper_sales")
      .select("sold_at,price_usd,grade,grader,venue,url,confirmed")
      .eq("series", series).eq("issue", issue).eq("grade", grade).eq("grader", "CGC").eq("confirmed", true)
      .order("sold_at", { ascending: false }).limit(30);
    if (salesError) add({ code: "historical_sales_lookup_failed", detail: salesError.message });
    const exactSales = (sales || []).filter((s: any) => Number(s.price_usd) > 0).map((s: any) => ({
      date: String(s.sold_at).slice(0, 10), price: Number(s.price_usd), grade: Number(s.grade), venue: String(s.venue || ""), url: s.url || undefined,
    }));
    if (exactSales.length < 2) add({ code: "verified_sales_insufficient", detail: `Requires at least 2 confirmed same-grade CGC sales; found ${exactSales.length}.` });
    if (!row.census_at || !row.census) add({ code: "census_unverified", detail: "Exact census lookup is missing." });
    if (!certVerified) add({ code: "certification_registry_unverified", detail: certificationVerification.detail || "No exact CGC certification response is persisted for this run." });
    if (!benchmark) add({ code: "financial_exit_unavailable", detail: "Financial scenarios require the exact October 6 PP grade price." });

    const financials = benchmark ? {
      auction: calculateSniperFinancials({ purchasePrice: Number(row.price_usd), shipping: Number(payload.shippingCost || 0), buyerPremium: buyerPremiumForSource(String(payload.source || "")), exitPrice: benchmark.price }),
      dealer: calculateSniperFinancials({ purchasePrice: Number(row.price_usd), shipping: Number(payload.shippingCost || 0), buyerPremium: buyerPremiumForSource(String(payload.source || "")), exitPrice: benchmark.price * 0.75 }),
      collector: calculateSniperFinancials({ purchasePrice: Number(row.price_usd), shipping: Number(payload.shippingCost || 0), buyerPremium: buyerPremiumForSource(String(payload.source || "")), exitPrice: benchmark.price }),
    } : null;
    const evidence = {
      version: 1, generatedAt: new Date().toISOString(), status: reasons.length ? "rejected" : "admitted", reasons,
      identity: { series, issue, year, grade, grader: label?.grader ?? (certVerified ? "CGC" : null), edition: verifiedEdition, certNumber: label?.certNumber ?? null },
      pricing: benchmark ? { source: benchmark.source, ppSourceId: benchmark.ppSourceId, snapshotDate: benchmark.snapshotDate, grade: benchmark.grade, price: benchmark.price } : null,
      research: researched ? dossier : null, historicalSales: exactSales, financials, certificationVerification,
    };
    const nextPayload = { ...payload, admissionEnrichment: evidence };
    const admissionReady = reasons.length === 0;
    const { error: writeError } = await db.from("sniper_listings").update({ payload: nextPayload, admission_ready: admissionReady, admission_evidence: admissionReady ? evidence : null }).eq("item_id", row.item_id);
    if (writeError) throw new Error(`admission write failed for ${row.item_id}: ${writeError.message}`);
    if (admissionReady) summary.admitted++; else summary.rejected++;
  }
  return summary;
}
