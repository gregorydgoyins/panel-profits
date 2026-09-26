import { describe, it, expect } from "vitest";
import { resolveSupabaseConfig } from "@/lib/supabase/config";

export function normalizeAuthProviderError(message?: string | null): string {
  const raw = (message || "").trim();

  if (!raw) {
    return "Authentication is unavailable right now.";
  }

  if (/unsupported provider|provider is not enabled/i.test(raw)) {
    return "Google sign-in is not enabled for this project. Use email sign-in or enable Google OAuth in Supabase.";
  }

  if (/unrecognized client_id|client_id/i.test(raw)) {
    return "Google OAuth is misconfigured for this project. Update the Supabase Auth client settings to match the active Clean project.";
  }

  return raw;
}

describe("Auth & Safe Destination Validation", () => {
  function sanitizeReturnTo(returnTo?: string | null): string {
    if (!returnTo) return "/comics";
    // Must start with a single slash and not double slashes or external schemes
    if (returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("://")) {
      return returnTo;
    }
    return "/comics";
  }

  function validateHoldingInput(quantityRaw: unknown, costRaw: unknown) {
    const qty = parseInt(String(quantityRaw), 10);
    const quantity = isNaN(qty) || qty < 1 ? 1 : qty;

    let cost: number | null = null;
    if (costRaw !== null && costRaw !== undefined && String(costRaw).trim() !== "") {
      const parsedCost = parseFloat(String(costRaw));
      if (!isNaN(parsedCost)) {
        cost = Math.max(parsedCost, 0);
      }
    }

    return { quantity, cost };
  }

  it("permits safe local return destinations", () => {
    expect(sanitizeReturnTo("/collection")).toBe("/collection");
    expect(sanitizeReturnTo("/watchlist")).toBe("/watchlist");
    expect(sanitizeReturnTo("/comics/abc12345")).toBe("/comics/abc12345");
  });

  it("blocks malicious external open redirects and falls back to /comics", () => {
    expect(sanitizeReturnTo("https://evil.com")).toBe("/comics");
    expect(sanitizeReturnTo("//evil.com")).toBe("/comics");
    expect(sanitizeReturnTo("javascript:alert(1)")).toBe("/comics");
    expect(sanitizeReturnTo("")).toBe("/comics");
    expect(sanitizeReturnTo(null)).toBe("/comics");
  });

  it("enforces positive quantity validation", () => {
    expect(validateHoldingInput(0, 50).quantity).toBe(1);
    expect(validateHoldingInput(-5, 50).quantity).toBe(1);
    expect(validateHoldingInput("invalid", 50).quantity).toBe(1);
    expect(validateHoldingInput(3, 50).quantity).toBe(3);
    expect(validateHoldingInput("10", 50).quantity).toBe(10);
  });

  it("enforces nonnegative acquisition cost validation", () => {
    expect(validateHoldingInput(1, -25.50).cost).toBe(0);
    expect(validateHoldingInput(1, 100.25).cost).toBe(100.25);
    expect(validateHoldingInput(1, "").cost).toBeNull();
    expect(validateHoldingInput(1, null).cost).toBeNull();
  });

  it("prefers the canonical Clean project over legacy Final auth values", () => {
    const config = resolveSupabaseConfig({
      publicUrl: "https://vbcmjmakluyjnsmisoth.supabase.co",
      publicAnonKey: "sb_publishable_xrJFtqLWJZlN_V76l7Csug_uBAPfgjc",
      serverUrl: "https://ghjlzrmuugquumqwlqgl.supabase.co",
      serverAnonKey: "legacy-final-auth-key",
    });

    expect(config.url).toBe("https://vbcmjmakluyjnsmisoth.supabase.co");
    expect(config.anonKey).toBe("sb_publishable_xrJFtqLWJZlN_V76l7Csug_uBAPfgjc");
  });

  it("turns provider configuration errors into actionable user guidance", () => {
    expect(normalizeAuthProviderError("Unsupported provider: provider is not enabled")).toContain("Google sign-in is not enabled");
    expect(normalizeAuthProviderError("Unrecognized client_id")).toContain("Google OAuth is misconfigured");
    expect(normalizeAuthProviderError("Network request failed")).toBe("Network request failed");
  });
});
