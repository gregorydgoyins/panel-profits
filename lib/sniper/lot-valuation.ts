import type { GoCollectPrice, GoCollectQuery } from "./gocollect-prices";

export interface LotBookValue {
  series: string;
  issue: string;
  grade: number;
  grader: string;
  labelType: string;
  fmv: number | null;
  source: string;
  salesCount: number | null;
  certNumber?: string | null;
}

/** Recognizes same-series, multiple-issue slab lots without guessing unprinted grades. */
export function extractLotBooks(title: string, series: string, grader = "CGC"): Omit<LotBookValue, "fmv" | "source" | "salesCount">[] {
  const issues = [...title.matchAll(/(?:#|issues?\s*#?)\s*(\d{1,5})(?!\d)/gi)].map(m => m[1]);
  const unique = [...new Set(issues)];
  if (unique.length < 2 || unique.length > 20 || !series || series === "Unknown Series") return [];
  const grades = [...title.matchAll(/\b(?:CGC|CBCS|PSA|PGX|EGS)\s*(?:graded\s*)?(10\.0|9\.[0-9]|[1-8]\.[0-9]|[1-9]\.0)\b/gi)]
    .map(m => ({ grader: m[0].match(/CGC|CBCS|PSA|PGX|EGS/i)?.[0].toUpperCase() || grader, grade: Number(m[1]) }));
  // Auction titles often put "CGC" once: "issues #117 @ 9.8 and #161 @ 9.6".
  if (grades.length !== unique.length && /\bCGC\b/i.test(title)) {
    const positional = [...title.matchAll(/#\s*\d{1,5}\s*(?:@|graded|grade|\(|-|:)\s*(10\.0|9\.[0-9]|[1-8]\.[0-9]|[1-9]\.0)/gi)]
      .map(m => ({ grader: "CGC", grade: Number(m[1]) }));
    if (positional.length === unique.length) grades.splice(0, grades.length, ...positional);
  }
  if (grades.length !== unique.length) return [];
  // Do not silently treat signature, restored or qualified slabs as universal.
  const labelType = /signature|signed|yellow label|restored|qualified|conserved/i.test(title) ? "" : "Universal";
  // Associate certificates only when they occur inside that issue's own title segment.
  const issueSpans = [...title.matchAll(/(?:#|issues?\s*#?)\s*(\d{1,5})(?!\d)/gi)];
  const perIssueCerts = new Map<string, string>();
  for (let i = 0; i < issueSpans.length; i++) {
    const span = issueSpans[i];
    const segment = title.slice(span.index! + span[0].length, issueSpans[i + 1]?.index ?? title.length);
    const certs = [...segment.matchAll(/\b(?:(?:CGC|CBCS|PSA|PGX|EGS)\s*)?cert(?:ificate)?(?:\s*(?:no\.?|number|#))?\s*[:#-]?\s*(\d{7,12})\b/gi)];
    if (certs.length === 1) perIssueCerts.set(span[1], certs[0][1]);
  }
  return unique.map((issue, i) => ({ series, issue, grade: grades[i].grade, grader: grades[i].grader, labelType, certNumber: perIssueCerts.get(issue) ?? null }));
}

export function lotBookQueries(books: ReturnType<typeof extractLotBooks>, prefix: string): GoCollectQuery[] {
  return books.filter(b => b.labelType).map((b, i) => ({
    key: prefix + ":" + i, title: b.series, issue: b.issue,
    grader: b.grader, labelType: b.labelType, grade: b.grade
  }));
}

export function priceLotBooks(books: ReturnType<typeof extractLotBooks>, prices: Map<string, GoCollectPrice>, prefix: string): LotBookValue[] {
  return books.map((b, i) => {
    const p = prices.get(prefix + ":" + i);
    return { ...b, fmv: p?.fmv != null && p.fmv > 0 && (p.salesCount ?? 0) > 0 ? p.fmv : null,
      source: p?.fmv != null && p.fmv > 0 && (p.salesCount ?? 0) > 0 ? "GoCollect grade-specific FMV" : "No matching verified FMV",
      salesCount: p?.salesCount ?? null };
  });
}
