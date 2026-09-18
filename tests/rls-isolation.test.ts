import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

describe("Anonymous Row-Level Security Boundary", () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vbcmjmakluyjnsmisoth.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiY21qbWFrbHV5am5zbWlzb3RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NjMyMzEsImV4cCI6MjEwNTEzOTIzMX0.3IhfF7HwHkbjCGhzsesrkVLr2zK9hxLDgqf04O6f74s";

  it("denies anonymous access to private profiles", async () => {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await anonClient.from("profiles").select("*");
    expect(data === null || (Array.isArray(data) && data.length === 0)).toBe(true);
    if (error) {
      expect(error.code).toBe("42501");
    }
  });

  it("denies anonymous access to private collections", async () => {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await anonClient.from("collections").select("*");
    expect(data === null || (Array.isArray(data) && data.length === 0)).toBe(true);
    if (error) {
      expect(error.code).toBe("42501");
    }
  });

  it("denies anonymous access to private collection items", async () => {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await anonClient.from("collection_items").select("*");
    expect(data === null || (Array.isArray(data) && data.length === 0)).toBe(true);
    if (error) {
      expect(error.code).toBe("42501");
    }
  });

  it("denies anonymous access to private watchlist items", async () => {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await anonClient.from("watchlist_items").select("*");
    expect(data === null || (Array.isArray(data) && data.length === 0)).toBe(true);
    if (error) {
      expect(error.code).toBe("42501");
    }
  });

  it("allows anonymous read-only access to public.comics catalog", async () => {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await anonClient.from("comics").select("id, series").limit(1);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBeDefined();
  });
});
