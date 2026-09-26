export const CANONICAL_SUPABASE_URL = "https://vbcmjmakluyjnsmisoth.supabase.co";
export const CANONICAL_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_xrJFtqLWJZlN_V76l7Csug_uBAPfgjc";

const LEGACY_FINAL_PROJECT_URL = "https://ghjlzrmuugquumqwlqgl.supabase.co";

export function resolveSupabaseConfig(options?: {
  publicUrl?: string;
  publicAnonKey?: string;
  serverUrl?: string;
  serverAnonKey?: string;
}) {
  const publicUrl = options?.publicUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? CANONICAL_SUPABASE_URL;
  const publicAnonKey =
    options?.publicAnonKey ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? CANONICAL_SUPABASE_ANON_KEY;
  const serverUrl = options?.serverUrl ?? process.env.SUPABASE_URL ?? publicUrl;
  const serverAnonKey = options?.serverAnonKey ?? process.env.SUPABASE_ANON_KEY ?? publicAnonKey;

  const hasLegacyFinalProject =
    [publicUrl, serverUrl].some((value) => value === LEGACY_FINAL_PROJECT_URL) ||
    [publicAnonKey, serverAnonKey].some((value) => value?.includes("ghjlzrmuugquumqwlqgl") === true);

  if (hasLegacyFinalProject) {
    return {
      url: CANONICAL_SUPABASE_URL,
      anonKey: CANONICAL_SUPABASE_ANON_KEY,
      isLegacyFinalProject: true,
    };
  }

  return {
    url: publicUrl || serverUrl || CANONICAL_SUPABASE_URL,
    anonKey: publicAnonKey || serverAnonKey || CANONICAL_SUPABASE_ANON_KEY,
    isLegacyFinalProject: false,
  };
}
