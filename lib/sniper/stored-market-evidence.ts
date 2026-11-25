import type { StoredPrice } from "./research-types";
export type { StoredPrice } from "./research-types";

export interface EditionRow {
  ppcf_id: string;
  series_name?: string;
  variant_name: string | null;
  publication_date: string | null;
}

export interface PriceObservation {
  ppcf_id: string;
  grade_label: string | null;
  amount: number | string;
  source_system: string;
  source_locator: string | null;
  observed_at: string | null;
  currency: string | null;
  price_field: string;
  source_record_id?: string;
}

const norm = (s: string | null) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function exactStoredEdition(rows: EditionRow[], year: number, edition: string | null) {
  if (rows.length >= 100) return null;
  const matches = rows.filter(
    (r) =>
      r.publication_date?.match(/\b(?:18|19|20)\d{2}\b/)?.[0] === String(year) &&
      (norm(r.variant_name) === norm(edition) ||
        (!edition &&
          /^cover a\s*[-–:]/i.test(r.variant_name || "") &&
          !/printing|reprint|facsimile/i.test(r.variant_name || ""))),
  );
  return matches.length === 1 ? matches[0] : null;
}

/** Formats raw database source_system + price_field into institutional human-readable financial labels. */
export function formatEvidenceSourceLabel(
  sourceSystem: string,
  priceField: string,
  grade: string,
  sourceLocator?: string | null,
): string {
  const isCatalog = sourceSystem === "COMICBASE";
  const isPc = /pricecharting/i.test(priceField) || /pricecharting\.com/i.test(sourceLocator || "");
  if (isPc) return "PriceCharting · guide";
  if (isCatalog) return "ComicBase · catalog reference";
  if (sourceSystem === "PANEL_PROFITS") {
    if (/ungraded|raw/i.test(priceField)) return "Panel Profits Valuation Guide · Raw / Ungraded FMV";
    const gMatch = priceField.match(/grade_(\d+)_(\d+)/i);
    if (gMatch) return `Panel Profits Valuation Guide · CGC ${gMatch[1]}.${gMatch[2]} FMV`;
    return `Panel Profits Valuation Guide · ${grade === "RAW" ? "Raw" : `CGC ${grade}`} FMV`;
  }
  const cleanSys = sourceSystem
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const cleanField = priceField
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return `${cleanSys} · ${cleanField}`;
}

/** Normalizes raw grade labels (e.g. "6_0" -> "6.0", "9" -> "9.0", "UNGRADED" -> "RAW"). */
export function normalizeObservationGrade(raw: string | null): string {
  const s = String(raw || "").trim();
  if (/^(RAW|UNGRADED)$/i.test(s)) return "RAW";
  const dotted = s.replace("_", ".");
  if (/^(?:[0-9]|10)$/.test(dotted)) return `${dotted}.0`;
  return dotted;
}

/** Format actual observations. Publication dates are never price observation dates. */
export function storedPrices(observations: PriceObservation[], match: EditionRow | null): StoredPrice[] {
  if (!match) return [];
  const rawDate = match.publication_date || "";
  const parts = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = parts ? `${parts[3]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}` : rawDate;
  const publicationDate =
    /^\d{4}-\d{2}-\d{2}$/.test(iso) && Number.isFinite(Date.parse(`${iso}T00:00:00Z`)) ? iso : undefined;
  const pubYear = rawDate.match(/\b((?:18|19|20)\d{2})\b/)?.[1];

  const seen = new Set<string>();
  const result: StoredPrice[] = [];
  for (const row of observations) {
    if (row.ppcf_id !== match.ppcf_id || /cover price|cost|paid|buy|sell|bid|ask|value year/i.test(row.price_field)) {
      continue;
    }
    const grade = normalizeObservationGrade(row.grade_label);
    if (!/^(?:RAW|[0-9]\.[0-9]|10\.0)$/i.test(grade) || !(Number(row.amount) > 0)) continue;
    const key = `${row.source_system}|${row.source_record_id}|${grade}|${row.currency}|${row.price_field}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const catalog = row.source_system === "COMICBASE";
    const obsDay = row.observed_at?.slice(0, 10);
    const obsYear = row.observed_at?.slice(0, 4);
    const isPubDateArtifact =
      catalog ||
      (publicationDate && obsDay === publicationDate) ||
      (pubYear && obsYear === pubYear) ||
      obsYear === match.publication_date;

    result.push({
      grade,
      amount: Number(row.amount),
      currency: row.currency || "USD",
      source: formatEvidenceSourceLabel(row.source_system, row.price_field, grade, row.source_locator),
      url: /^https?:\/\//i.test(row.source_locator || "") ? row.source_locator! : `/wiki/${match.ppcf_id}`,
      observedAt: isPubDateArtifact ? undefined : row.observed_at || undefined,
      publicationDate,
      kind: catalog ? "catalog" : "guide",
      basis: catalog
        ? `ComicBase catalog reference; source condition ${grade}. Not a CGC completed sale.`
        : "Grade-specific Fair Market Value (FMV) guide estimate, not a completed sale.",
    });
  }
  return result;
}
