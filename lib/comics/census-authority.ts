/**
 * Census / ComicBase metadata lookup.
 *
 * The former local SQLite sources (data/pp115k.sqlite comicbase_metadata,
 * data/comicbase.sqlite comicbase_items, shadow_database.sqlite census_snapshots)
 * have been removed: they are git-ignored and never exist in the deployed runtime.
 * There is no Supabase source behind these lookups yet, so they report "no data"
 * (null) rather than inventing census figures.
 */

export interface RealCensusRecord {
  totalGraded: number;
  topGrade?: string;
  year?: number;
  publisher?: string;
  source: string;
  verifiedAt: string;
}

export interface ComicBaseMetadataRecord {
  year?: number;
  publisher?: string;
  totalGraded?: number;
  topGrade?: string;
}

export function lookupComicBaseMetadata(_series: string, _issueNumber: string | number): ComicBaseMetadataRecord | null {
  // No Supabase source for ComicBase metadata; local SQLite path removed.
  return null;
}

/**
 * Authoritative, multi-verifiable Census Registry Lookup.
 * Previously queried local SQLite files (pp115k comicbase_metadata, ComicBase registry, shadow_database CGC snapshots);
 * those sources were removed and no Supabase census source exists, so this returns null (no data).
 * Zero placeholders, zero synthetic approximations, zero mock numbers.
 */
export function lookupRealCensus(_series: string, _issueNumber: string | number): RealCensusRecord | null {
  // No Supabase source for census snapshots; local SQLite paths removed.
  return null;
}
