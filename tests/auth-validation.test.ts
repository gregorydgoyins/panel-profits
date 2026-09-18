import { describe, it, expect } from "vitest";

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
});
