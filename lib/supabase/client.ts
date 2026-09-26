import { createBrowserClient } from "@supabase/ssr";
import { resolveSupabaseConfig } from "@/lib/supabase/config";

const { url: supabaseUrl, anonKey: supabaseAnonKey } = resolveSupabaseConfig();

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createClient();
