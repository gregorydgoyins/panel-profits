import { describe, expect, it } from "vitest";
import { buildUnderlyings, MENTION_HALF_LIFE_HOURS } from "../lib/assets/underlyings";

const NOW = Date.parse("2026-10-11T12:00:00Z");
const row = { comics_id: "1", series: "Amazing Fantasy", issue_number: "15", year: 1962, publisher: "Marvel", cover_url: "x", cb_price: 100 };
const shockAt = (ageHours: number[]) =>
  buildUnderlyings({
    rail: [row],
    ppHistory: [],
    news: ageHours.map((h) => ({ headline: "Amazing Fantasy sale news", summary: "", published_at: new Date(NOW - h * 3_600_000).toISOString() })),
    now: NOW,
  })[0].newsShock;

describe("news mention weighting (smooth, no 48h cliff)", () => {
  it("half-life is the 48h-equivalent window", () => {
    expect(MENTION_HALF_LIFE_HOURS / Math.LN2).toBeCloseTo(48, 6);
  });
  it("a story contributes nothing at publish or when future-dated", () => {
    expect(shockAt([0, 0, 0, 0, 0])).toBe(1);
    expect(shockAt([-5, -5, -5, -5, -5])).toBe(1);
  });
  it("no cliff around 48 hours", () => {
    const burst = (h: number) => Array.from({ length: 8 }, () => h);
    const before = shockAt(burst(47.9));
    const after = shockAt(burst(48.1));
    expect(before).toBeGreaterThan(1);
    expect(Math.abs(before - after)).toBeLessThan(0.01);
  });
});
