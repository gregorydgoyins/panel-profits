/**
 * Market dynamics: how real news events shape prices over time.
 *
 * Owner rule: NO fake price moves. Prices move only from real inputs (stored news stories, real prices, real census).
 * - VALUE is not MARKET PRICE, but the gap between them comes only from news-driven pressure. There is no synthetic
 *   random walk: with no news, market price equals value (marketFactor is exactly 1).
 * - Transmission is deterministic: every parsed event applies per its kind and sign. Only real repetition (similar
 *   prior events at the same entities) softens the landing (fatigue).
 * - Effects have shape in time: overshoot then reversal for scares, a slow build for real damage, run-up and fade for hype.
 *   Every effect is exactly 0 at the story's published_at and ramps in smoothly (see onsetRamp); future-dated stories are 0.
 * - Stress begets more sensitivity (regimes).
 *
 * The seeded PRNG helpers below (hash32, rng, normal, studentT4) are no longer used by any pricing path; they are kept
 * only so exported signatures stay stable.
 */

export function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normal(r: () => number): number {
  const u = Math.max(r(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

/** Student-t with 4 degrees of freedom, scaled to unit variance: fat tails. */
export function studentT4(r: () => number): number {
  const z = normal(r);
  let chi = 0;
  for (let i = 0; i < 4; i++) chi += normal(r) ** 2;
  return z / Math.sqrt(chi / 4) / Math.SQRT2;
}

/**
 * Onset time constant τ, in hours, for every news-driven effect. A story's effect is exactly 0 at its published_at and
 * rises as 1 − e^(−age/τ): ~63% after τ (30 min), ~95% after 3τ (90 min), ~99.8% after 6τ (3 h). This keeps prices from
 * jumping discontinuously the instant a story lands in the wire.
 */
export const NEWS_ONSET_TAU_HOURS = 0.5;

/** Smooth onset multiplier for a story of the given age (days). 0 at publish, → 1 within a few hours; 0 for future-dated stories. */
export function onsetRamp(ageDays: number): number {
  if (!Number.isFinite(ageDays) || ageDays <= 0) return 0;
  return 1 - Math.exp(-(ageDays * 24) / NEWS_ONSET_TAU_HOURS);
}

/**
 * Market-price factor around value. Exactly 1: there is no synthetic random walk or intraday jitter, because prices may
 * move only from real inputs (news pressure is applied separately via exp(pressure)). Signature kept for callers.
 */
export function marketFactor(key: string, now: number, sigmaAnnual: number, opts: { phi?: number; days?: number; cluster?: number } = {}): number {
  void key;
  void now;
  void sigmaAnnual;
  void opts;
  return 1;
}

/**
 * How strongly one event reaches one node. Deterministic: every real event applies per its parsed kind and sign — no
 * pseudo-random ignoring and no sign flips. The only modulation is fatigue from real repetition (`prior` = similar
 * events at the same entities in the preceding 14 days): familiar events land softer, from 1 (fresh) toward 0.5.
 */
export function transmissionDraw(eventId: string, nodeId: string, kind: string, prior = 0): number {
  void eventId;
  void nodeId;
  void kind;
  const fatigue = 1 / (1 + 0.35 * Math.max(0, prior));
  return 0.5 + 0.5 * fatigue; // familiar events land softer
}

/**
 * Shape of an event's effect in time (age in days). Not a simple decay. Every shape is multiplied by onsetRamp, so the
 * effect is 0 at published_at and ramps in over ~τ = NEWS_ONSET_TAU_HOURS; future-dated stories (age < 0) give 0.
 */
export function timeKernel(kind: string, ageDays: number): number {
  const onset = onsetRamp(ageDays);
  if (onset === 0) return 0;
  const t = ageDays;
  switch (kind) {
    case "SCARE": // immediate overshoot, then a small reversal as it fades
      return onset * (1.4 * Math.exp(-t / 1.5) - 0.4 * Math.exp(-t / 6));
    case "DAMAGE": { // some at once, the rest builds as audits and claims land, then slow recovery
      const ramp = (t / 3) * Math.exp(1 - t / 3);
      return onset * (0.45 + 0.55 * ramp) * Math.exp(-t / 20);
    }
    case "HYPE": { // run-up into and just after, then fades faster than it rose
      const ramp = (t / 2) * Math.exp(1 - t / 2);
      return onset * (0.3 + 0.7 * ramp) * Math.exp(-t / 5);
    }
    case "MARKET":
      return onset * Math.exp(-t / 7 * Math.LN2 * 1);
    default:
      return onset * Math.exp(-t / 10 * Math.LN2 * 1);
  }
}

/** Stressed markets transmit more (correlations rise): 1 → ~1.4. */
export function regimeMultiplier(totalIntensity: number): number {
  return 1 + 0.4 * Math.tanh(totalIntensity / 2);
}
