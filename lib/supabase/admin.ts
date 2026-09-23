import { createClient } from "@supabase/supabase-js";

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://vbcmjmakluyjnsmisoth.supabase.co";
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiY21qbWFrbHV5am5zbWlzb3RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NjMyMzEsImV4cCI6MjEwNTEzOTIzMX0.3IhfF7HwHkbjCGhzsesrkVLr2zK9hxLDgqf04O6f74s";

export function createAdminServerClient() {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function createCleanReadOnlyServerClient() {
  return createAdminServerClient();
}
