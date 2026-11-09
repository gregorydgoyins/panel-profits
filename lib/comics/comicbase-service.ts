export interface ComicBaseData {
  "CB - ID"?: string;
  "CB - Price"?: string;
  "CB - Cover Price"?: string;
  "CB - Value Year 1"?: string;
  "CB - Value Year 2"?: string;
  "CB - Value Year 3"?: string;
  "CB - Value Year 4"?: string;
  "CB - Condition"?: string;
  "CB - Top Grade"?: string;
  "CB - Number Graded"?: number;
  [key: string]: any;
}

export interface ComicBaseRecord {
  cbId: string;
  series: string;
  issueNumber: string;
  publisher?: string | null;
  publicationDate?: string | null;
  year?: number | null;
  price?: number | null;
  coverPrice?: number | null;
  val2021?: number | null;
  val2022?: number | null;
  val2023?: number | null;
  val2024?: number | null;
  condition?: string | null;
  topGrade?: string | null;
  comicbaseData: ComicBaseData;
}

/**
 * Resolves ComicBase 4-year valuation history and condition grades.
 *
 * The former source was the local data/comicbase.sqlite file, which is git-ignored
 * and never present in the deployed runtime. That SQLite path has been removed and
 * there is no Supabase ComicBase source, so this always returns null (no data).
 * The signature is kept stable for existing callers.
 */
export function resolveComicBaseRecord(
  _series?: string | null,
  _issueNumber?: string | number | null,
  _year?: number | null,
  _upc?: string | null
): ComicBaseRecord | null {
  return null;
}
