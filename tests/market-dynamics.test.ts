import { describe, expect, it } from "vitest";
import { hash32, marketFactor, studentT4, rng, timeKernel, transmissionDraw, onsetRamp, NEWS_ONSET_TAU_HOURS } from "../lib/assets/market-dynamics";

const NOW = Date.parse("2026-10-11T12:00:00Z");
const HOUR_IN_DAYS = 1 / 24;

describe("market dynamics (no fake moves)", () => {
  it("marketFactor is exactly 1: no synthetic random walk or intraday jitter", () => {
    for (let k = 0; k < 50; k++) {
      expect(marketFactor(`k${k}`, NOW + k * 15 * 60_000, 0.2)).toBe(1);
      expect(marketFactor(`k${k}`, NOW + k * 86_400_000, 0.6)).toBe(1);
    }
  });
  it("seeded helpers remain deterministic (kept for signature stability)", () => {
    const r = rng(hash32("tails"));
    const xs = Array.from({ length: 2000 }, () => studentT4(r));
    const r2 = rng(hash32("tails"));
    const ys = Array.from({ length: 2000 }, () => studentT4(r2));
    expect(xs).toEqual(ys);
  });
  it("transmission is deterministic: never ignored, never flipped", () => {
    const draws = Array.from({ length: 500 }, (_, k) => transmissionDraw(`e${k}`, `n${k}`, k % 2 ? "SCARE" : "HYPE"));
    expect(new Set(draws).size).toBe(1);
    expect(draws[0]).toBe(1);
  });
  it("familiar events land softer (fatigue from real repetition only)", () => {
    expect(transmissionDraw("e1", "gotham", "DAMAGE", 6)).toBeLessThan(transmissionDraw("e1", "gotham", "DAMAGE", 0));
    expect(transmissionDraw("e1", "gotham", "DAMAGE", 6)).toBeGreaterThan(0.5);
  });
  it("onset ramp: 0 at publish, 0 for future-dated, ~63% after τ, ~1 after a few hours", () => {
    expect(NEWS_ONSET_TAU_HOURS).toBe(0.5);
    expect(onsetRamp(0)).toBe(0);
    expect(onsetRamp(-1)).toBe(0);
    expect(onsetRamp(NEWS_ONSET_TAU_HOURS * HOUR_IN_DAYS)).toBeCloseTo(1 - Math.exp(-1), 6);
    expect(onsetRamp(3 * HOUR_IN_DAYS)).toBeGreaterThan(0.99);
    // smooth and monotone over the first hours
    let prev = 0;
    for (let m = 1; m <= 240; m++) {
      const v = onsetRamp((m / 60) * HOUR_IN_DAYS);
      expect(v).toBeGreaterThan(prev);
      expect(v - prev).toBeLessThan(0.04);
      prev = v;
    }
  });
  it("every kernel is 0 at publish and for future-dated stories", () => {
    for (const kind of ["SCARE", "DAMAGE", "HYPE", "MARKET", "CAPITAL"]) {
      expect(timeKernel(kind, 0)).toBe(0);
      expect(timeKernel(kind, -0.5)).toBe(0);
    }
  });
  it("time shapes: scares overshoot then reverse, damage builds, hype runs up then fades", () => {
    expect(timeKernel("SCARE", 3 * HOUR_IN_DAYS)).toBeGreaterThan(0.85);
    expect(timeKernel("SCARE", 4)).toBeLessThan(0.25);
    expect(timeKernel("SCARE", 4)).toBeGreaterThan(-0.2);
    expect(timeKernel("DAMAGE", 3)).toBeGreaterThan(timeKernel("DAMAGE", 6 * HOUR_IN_DAYS));
    expect(timeKernel("HYPE", 2)).toBeGreaterThan(timeKernel("HYPE", 6 * HOUR_IN_DAYS));
    expect(timeKernel("HYPE", 20)).toBeLessThan(0.05);
  });
});
