/**
 * Canonical condition nomenclature mapper for apples-to-apples international valuation.
 *
 * U.S. stapled comics trade on the third-party CGC numerical scale (0.5–10.0 + RAW).
 * Franco-Belgian hardcover albums (Casterman, Dupuis, Lombard, Dargaud — e.g. 1939 Tintin)
 * trade unslabbed on the European Bande Dessinée (BDM / Artcurial / Millon) condition scale,
 * where every sale IS a raw hardcover book whose condition maps apples-to-apples onto the
 * numerical 0.5–10.0 underwriting ladder.
 */

export function isEuropeanBdAlbum(
  publisher: string | null | undefined,
  cgcTotalGraded?: number | null,
): boolean {
  if ((cgcTotalGraded ?? 0) > 0) return false;
  if (!publisher) return false;
  return /casterman|dupuis|lombard|dargaud|le petit vingti/i.test(publisher);
}

const FRENCH_BD_CONDITION_MAP: Record<string, { short: string; full: string }> = {
  "10.0": { short: "État Neuf (10.0)", full: "Neuf de chez Neuf · 10.0" },
  "9.8": { short: "État Neuf (9.8)", full: "État Neuf · 9.8 (Gem Mint)" },
  "9.6": { short: "État Neuf (9.6)", full: "État Neuf · 9.6 (Mint)" },
  "9.4": { short: "Proche du Neuf (9.4)", full: "Proche du Neuf / Neuf · 9.4" },
  "9.2": { short: "Proche du Neuf (9.2)", full: "Proche du Neuf · 9.2" },
  "9.0": { short: "Proche Neuf (9.0)", full: "Proche de l'État Neuf · 9.0" },
  "8.5": { short: "Très Bon État (8.5)", full: "Très Bon État+ · 8.5" },
  "8.0": { short: "Très Bon État (8.0)", full: "Très Bon État · 8.0" },
  "7.5": { short: "TTB+ (7.5)", full: "Très Très Bon+ · 7.5" },
  "7.0": { short: "TTB (7.0)", full: "Très Très Bon · 7.0" },
  "6.5": { short: "Très Bon+ (6.5)", full: "Très Bon État · 6.5" },
  "6.0": { short: "Très Bon (6.0)", full: "Très Bon État · 6.0" },
  "5.5": { short: "Bon / TB (5.5)", full: "Bon à Très Bon État · 5.5" },
  "5.0": { short: "Bon État+ (5.0)", full: "Bon État+ · 5.0" },
  "4.5": { short: "Bon État (4.5)", full: "Bon État · 4.5" },
  "4.0": { short: "Bon État (4.0)", full: "Bon État · 4.0" },
  "3.5": { short: "Assez Bon (3.5)", full: "Assez Bon État · 3.5" },
  "3.0": { short: "Assez Bon (3.0)", full: "Assez Bon État · 3.0" },
  "2.5": { short: "État Moyen (2.5)", full: "État Moyen · 2.5" },
  "2.0": { short: "État Moyen (2.0)", full: "État Moyen · 2.0" },
  "1.8": { short: "État Moyen (1.8)", full: "État Moyen · 1.8" },
  "1.5": { short: "État Usage (1.5)", full: "État d'Usage · 1.5" },
  "1.0": { short: "État Usage (1.0)", full: "État d'Usage · 1.0" },
  "0.5": { short: "Incomplet (0.5)", full: "État Médiocre · 0.5" },
};

export function formatConditionGrade(
  grade: string | number | null | undefined,
  isEuropeanBd: boolean,
  style: "short" | "full" = "short",
): string {
  const g = String(grade ?? "").trim();
  if (!g) return "";
  if (g.toUpperCase() === "RAW") {
    if (!isEuropeanBd) return style === "full" ? "Ungraded Raw Cash Baseline" : "RAW";
    return style === "full"
      ? "Raw Unslabbed · Très Bon État (EU BD)"
      : "RAW · Très Bon État";
  }
  if (!isEuropeanBd) {
    return `CGC ${g}`;
  }
  const numKey = /^\d+$/.test(g) ? `${g}.0` : g;
  const hit = FRENCH_BD_CONDITION_MAP[numKey];
  if (hit) return style === "full" ? hit.full : hit.short;
  return `EU BD ${g}`;
}
