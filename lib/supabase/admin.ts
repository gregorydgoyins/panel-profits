import { createClient } from "@supabase/supabase-js";
import { resolveSupabaseConfig, CANONICAL_SUPABASE_URL, CANONICAL_SUPABASE_ANON_KEY } from "@/lib/supabase/config";

const { url, anonKey } = resolveSupabaseConfig();

export function createAdminServerClient() {
  const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  // Missing / legacy / placeholder key → fall back to the publishable key (read-only), never a committed secret.
  const isInvalidKey = !envKey || envKey.includes("ghjlzrmuugquumqwlqgl") || envKey.includes("[SENSITIVE]");
  if (isInvalidKey) console.warn("[supabase] SUPABASE_SERVICE_ROLE_KEY missing or invalid; using publishable key");
  const effectiveKey = isInvalidKey ? "" : envKey;
  const cleanKey = (effectiveKey || anonKey || CANONICAL_SUPABASE_ANON_KEY).trim().replace(/^["']|["']$/g, "");
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
