import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://vbcmjmakluyjnsmisoth.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiY21qbWFrbHV5am5zbWlzb3RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NjMyMzEsImV4cCI6MjEwNTEzOTIzMX0.3IhfF7HwHkbjCGhzsesrkVLr2zK9hxLDgqf04O6f74s";

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createClient();
