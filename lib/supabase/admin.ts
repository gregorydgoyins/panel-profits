import { createClient } from "@supabase/supabase-js";
import { resolveSupabaseConfig, CANONICAL_SUPABASE_URL, CANONICAL_SUPABASE_ANON_KEY } from "@/lib/supabase/config";

const { url, anonKey } = resolveSupabaseConfig();

export function createAdminServerClient() {
  const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!envKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for server-side database access.");
  if (envKey.includes("ghjlzrmuugquumqwlqgl") || envKey.includes("[SENSITIVE]")) {
    throw new Error("A legacy or placeholder Supabase service key is not permitted.");
  }
  const cleanKey = envKey.trim().replace(/^["']|["']$/g, "");
  const cleanUrl = (url || CANONICAL_SUPABASE_URL).trim().replace(/^["']|["']$/g, "");
  return createClient(cleanUrl, cleanKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function createCleanReadOnlyServerClient() {
  return createAdminServerClient();
}

export function createPublicReadOnlyClient() {
  const cleanKey = (anonKey || CANONICAL_SUPABASE_ANON_KEY).trim().replace(/^["']|["']$/g, "");
  const cleanUrl = (url || CANONICAL_SUPABASE_URL).trim().replace(/^["']|["']$/g, "");
  return createClient(cleanUrl, cleanKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
