import { createAdminServerClient } from "@/lib/supabase/admin";
import { resolveComicLoreDossier } from "./lore-dossier";
import { calculateSniperFinancials, buyerPremiumForSource } from "./financials";
import { parseAndFilterListing } from "./anti-bullshit";
import { resolvePPGradeBenchmark, type PPGrade, type PPPriceRow } from "./pp-grade-benchmarks";

const OCTOBER_6 = "2026-10-06";
const EDITION_WORDS = /\b(?:variant|newsstand|direct|foil|sketch|virgin|incentive|exclusive|facsimile|reprint|printing|cover\s+[a-z])\b/i;

type Rejection = { code: string; detail: string };

function gradeKey(value: unknown): PPGrade | null {
  const n = Number(value);
  const allowed = ["RAW", "2.0", "3.0", "4.0", "5.0", "6.0", "7.0", "8.0", "9.0", "9.2", "9.4", "9.6", "9.8", "10.0"] as const;
  return allowed.includes(String(n) as PPGrade) ? String(n) as PPGrade : value == null ? "RAW" : null;
}

function finitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function exactEditionText(title: string, edition: unknown): string {
  return String(edition ?? (EDITION_WORDS.test(title) ? title.match(EDITION_WORDS)?.[0] : "direct") ?? "").trim().toLowerCase();
}

async function resolvePanelProfits(db: any, series: string, issue: string, year: number | null, grade: PPGrade, labelEdition: string | null): Promise<{ benchmark?: ReturnType<typeof resolvePPGradeBenchmark>; rejection?: Rejection }> {
  let q = db.from("comics").select("pp_source_id,series,issue_number,publication_year,printing,direct_or_variant,cover_variant,variant").eq("series", series).eq("issue_number", issue);
  if (year) q = q.eq("publication_year", year);
  const { data: comics, error } = await q.limit(25);
  if (error) return { rejection: { code: "pp_identity_lookup_failed", detail: error.message } };
  if (!comics?.length) return { rejection: { code: "pp_identity_not_found", detail: `${series} #${issue}${year ? ` (${year})` : ""}` } };
  const normalizedEdition = exactEditionText(`${series} #${issue}`, labelEdition);
  const candidates = comics.filter((c: any) => {
    const catalogEdition = String(c.variant || c.cover_variant || c.direct_or_variant || c.printing || "direct").toLowerCase();
    return normalizedEdition === "direct" ? /direct|base|^$/.test(catalogEdition) : catalogEdition.includes(normalizedEdition);
  });
  if (candidates.length !== 1 || !candidates[0].pp_source_id) {
    return { rejection: { code: candidates.length > 1 ? "pp_identity_ambiguous" : "pp_source_id_missing", detail: `${candidates.length} edition candidates for ${series} #${issue}` } };
  }
  const ppId = String(candidates[0].pp_source_id).replace(/^pp-/i, "");
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
    const certVerified = payload.certificationVerification?.verified === true && typeof payload.certificationVerification.sourceUrl === "string";
    if (!label?.certNumber || String(label.grader).toUpperCase() !== "CGC" || !certVerified) add({ code: "certification_not_verified", detail: "A label transcription plus an independent CGC registry verification URL is required." });
    if (!series || !issue || !Number.isFinite(grade)) add({ code: "identity_incomplete", detail: "Exact title, issue, and numeric grade are required." });
    if (EDITION_WORDS.test(String(payload.title || "")) && !label?.edition) add({ code: "edition_unresolved", detail: "Listing text identifies an edition/variant but the slab label does not." });
    if (label?.edition && !String(label.edition).trim()) add({ code: "edition_unresolved", detail: "Empty edition transcription cannot establish exact identity." });

    let benchmark: ReturnType<typeof resolvePPGradeBenchmark> | undefined;
    if (!reasons.some((r) => r.code === "identity_incomplete" || r.code === "edition_unresolved")) {
      const pp = await resolvePanelProfits(db, series, issue, year, gradeKey(grade) as PPGrade, label?.edition ?? null);
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
    if (!certVerified) add({ code: "certification_registry_unverified", detail: "No independent CGC certification registry response is persisted for this run." });
    if (!benchmark) add({ code: "financial_exit_unavailable", detail: "Financial scenarios require the exact October 6 PP grade price." });

    const financials = benchmark ? {
      auction: calculateSniperFinancials({ purchasePrice: Number(row.price_usd), shipping: Number(payload.shippingCost || 0), buyerPremium: buyerPremiumForSource(String(payload.source || "")), exitPrice: benchmark.price }),
      dealer: calculateSniperFinancials({ purchasePrice: Number(row.price_usd), shipping: Number(payload.shippingCost || 0), buyerPremium: buyerPremiumForSource(String(payload.source || "")), exitPrice: benchmark.price * 0.75 }),
      collector: calculateSniperFinancials({ purchasePrice: Number(row.price_usd), shipping: Number(payload.shippingCost || 0), buyerPremium: buyerPremiumForSource(String(payload.source || "")), exitPrice: benchmark.price }),
    } : null;
    const evidence = {
      version: 1, generatedAt: new Date().toISOString(), status: reasons.length ? "rejected" : "admitted", reasons,
      identity: { series, issue, year, grade, grader: label?.grader ?? null, edition: label?.edition ?? null, certNumber: label?.certNumber ?? null },
      pricing: benchmark ? { source: benchmark.source, ppSourceId: benchmark.ppSourceId, snapshotDate: benchmark.snapshotDate, grade: benchmark.grade, price: benchmark.price } : null,
      research: researched ? dossier : null, historicalSales: exactSales, financials,
    };
    const nextPayload = { ...payload, admissionEnrichment: evidence };
    const admissionReady = reasons.length === 0;
    const { error: writeError } = await db.from("sniper_listings").update({ payload: nextPayload, admission_ready: admissionReady, admission_evidence: admissionReady ? evidence : null }).eq("item_id", row.item_id);
    if (writeError) throw new Error(`admission write failed for ${row.item_id}: ${writeError.message}`);
    if (admissionReady) summary.admitted++; else summary.rejected++;
  }
  return summary;
}
