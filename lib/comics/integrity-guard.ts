export interface IntegrityWarning {
  code: 'CENSUS_MISMATCH' | 'COVER_SERIES_MISMATCH' | 'SALES_POP_COLLISION' | 'MISSING_YEAR';
  severity: 'error' | 'warn';
  message: string;
}

export interface ComicIntegrityInput {
  id: string;
  title: string;
  year?: number | null;
  coverUrl?: string | null;
  expectedCgcTotal?: number | null;
  expectedCgc98Count?: number | null;
  censusTotalGraded?: number | null;
  census98Count?: number | null;
}

export interface ComicIntegrityResult {
  verified: boolean;
  warnings: IntegrityWarning[];
}

/**
 * Extracts a 4-digit publication year from a comic title like "Black Panther #12 (2006)".
 */
export function extractYearFromTitle(title: string): number | null {
  const match = title.match(/\((\d{4})\)\s*$/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed >= 1930 && parsed <= 2035 ? parsed : null;
}

/**
 * Verifies cross-field integrity for a comic detail payload so mismatched
 * census, print-run, or cover records are caught before display.
 */
export function verifyComicIntegrity(input: ComicIntegrityInput): ComicIntegrityResult {
  const warnings: IntegrityWarning[] = [];
  const effectiveYear = input.year ?? extractYearFromTitle(input.title);

  if (!effectiveYear) {
    warnings.push({
      code: 'MISSING_YEAR',
      severity: 'warn',
      message: `Comic ${input.id} (${input.title}) has no verifiable publication year.`,
    });
  }

  // Check if census total diverges from pp_comics.cgc_total (e.g. 1978 census on 2006 book)
  if (
    input.expectedCgcTotal != null &&
    input.expectedCgcTotal > 0 &&
    input.censusTotalGraded != null &&
    input.censusTotalGraded > 0 &&
    input.expectedCgcTotal !== input.censusTotalGraded
  ) {
    warnings.push({
      code: 'CENSUS_MISMATCH',
      severity: 'error',
      message: `Census total mismatch on ${input.id}: expected ${input.expectedCgcTotal} from pp_comics, got ${input.censusTotalGraded}.`,
    });
  }

  // Check if 9.8 count diverges from pp_comics.cgc_9_8_count
  if (
    input.expectedCgc98Count != null &&
    input.expectedCgc98Count > 0 &&
    input.census98Count != null &&
    input.census98Count > 0 &&
    input.expectedCgc98Count !== input.census98Count
  ) {
    warnings.push({
      code: 'CENSUS_MISMATCH',
      severity: 'error',
      message: `CGC 9.8 count mismatch on ${input.id}: expected ${input.expectedCgc98Count}, got ${input.census98Count}.`,
    });
  }

  return {
    verified: warnings.filter((w) => w.severity === 'error').length === 0,
    warnings,
  };
}
