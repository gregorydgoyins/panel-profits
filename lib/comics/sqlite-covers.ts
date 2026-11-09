/**
 * Legacy local SQLite cover index (public/covers_direct_index.sqlite,
 * data/highres_covers_all.sqlite, data/pp115k.sqlite).
 *
 * The local SQLite path has been removed: those files are git-ignored and never
 * exist in the deployed runtime, so this module had no live data source. Cover
 * resolution is served by the Supabase-backed resolvers (see cover-authority.ts
 * and cover-resolver.ts). These exports are kept so callers keep compiling and
 * now consistently report "no data".
 */

/**
 * Former SQLite cover lookup. Always returns null (no data) — there is no
 * Supabase source behind this function.
 */
export function lookupSqliteCover(_series: string, _issueNumber: string | number): string | null {
  return null;
}

/**
 * Former SQLite multi-image gallery lookup. Always returns an empty list (no
 * data) — there is no Supabase source behind this function.
 */
export function lookupSqliteGallery(_series: string, _issueNumber: string | number): string[] {
  return [];
}
