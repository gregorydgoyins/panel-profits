import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

describe("Anonymous Row-Level Security Boundary", () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vbcmjmakluyjnsmisoth.supabase.co";
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiY21qbWFrbHV5am5zbWlzb3RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NjMyMzEsImV4cCI6MjEwNTEzOTIzMX0.3IhfF7HwHkbjCGhzsesrkVLr2zK9hxLDgqf04O6f74s";

  it.skipIf(process.env.SKIP_LIVE_TESTS === "true")("denies anonymous access to private profiles", async () => {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    try {
      const { data, error } = await anonClient.from("profiles").select("*");
      expect(data === null || (Array.isArray(data) && data.length === 0)).toBe(true);
      if (error && error.code) {
        expect(error.code).toBe("42501");
      }
    } catch (e: any) {
      if (e.message?.includes("fetch failed") || e.code === "ENOTFOUND") {
        console.warn("Skipping RLS network test due to unreachable Supabase host");
        return;
      }
      throw e;
    }
  });

  it.skipIf(process.env.SKIP_LIVE_TESTS === "true")("denies anonymous access to private player alerts", async () => {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    try {
      const { data, error } = await anonClient.from("player_alerts").select("*");
      expect(data === null || (Array.isArray(data) && data.length === 0)).toBe(true);
      if (error && error.code) {
        expect(error.code).toBe("42501");
      }
    } catch (e: any) {
      if (e.message?.includes("fetch failed") || e.code === "ENOTFOUND") {
        console.warn("Skipping RLS network test due to unreachable Supabase host");
        return;
      }
      throw e;
    }
  });

  it.skipIf(process.env.SKIP_LIVE_TESTS === "true")("denies anonymous access to private player holdings", async () => {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    try {
      const { data, error } = await anonClient.from("player_holdings").select("*");
      expect(data === null || (Array.isArray(data) && data.length === 0)).toBe(true);
      if (error && error.code) {
        expect(error.code).toBe("42501");
      }
    } catch (e: any) {
      if (e.message?.includes("fetch failed") || e.code === "ENOTFOUND") {
        console.warn("Skipping RLS network test due to unreachable Supabase host");
        return;
      }
      throw e;
    }
  });

  it.skipIf(process.env.SKIP_LIVE_TESTS === "true")("denies anonymous access to private player points", async () => {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    try {
      const { data, error } = await anonClient.from("player_points").select("*");
      expect(data === null || (Array.isArray(data) && data.length === 0)).toBe(true);
      if (error && error.code) {
        expect(error.code).toBe("42501");
      }
    } catch (e: any) {
      if (e.message?.includes("fetch failed") || e.code === "ENOTFOUND") {
        console.warn("Skipping RLS network test due to unreachable Supabase host");
        return;
      }
      throw e;
    }
  });

  it.skipIf(process.env.SKIP_LIVE_TESTS === "true")("allows anonymous read-only access to public.comics catalog", async () => {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    try {
      const { data, error } = await anonClient.from("comics").select("id, series").limit(1);
      if (error && (error.message?.includes("fetch failed") || error.details?.includes("ENOTFOUND"))) {
        console.warn("Skipping RLS network test due to unreachable Supabase host");
        return;
      }
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].id).toBeDefined();
    } catch (e: any) {
      if (e.message?.includes("fetch failed") || e.code === "ENOTFOUND") {
        console.warn("Skipping RLS network test due to unreachable Supabase host");
        return;
      }
      throw e;
    }
  });
});
