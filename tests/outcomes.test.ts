import { describe, expect, it } from "vitest";
import { parseOutcome, outcomesFromArticles } from "../lib/assets/outcomes";
import { eventsFromArticles, propagate, conditionsFor } from "../lib/assets/shock-propagation";
import { issueInstitutional } from "../lib/assets/institutions";
import { issuePredictions } from "../lib/assets/prediction-markets";

const NOW = Date.parse("2026-10-11T12:00:00Z");
const headline = "Joker wins defamation suit against Harvey Dent and Gotham City";
const art = (id: string) => ({ id, headline, summary: "", url: "u", published_at: "2026-10-11T06:00:00Z" });
const run = (id: string) => {
  const outcomes = outcomesFromArticles([art(id)]);
  return { outcomes, shocks: propagate(eventsFromArticles([art(id)]), NOW, outcomes) };
};

describe("winners and losers", () => {
  it("parses who won and who lost", () => {
    const p = parseOutcome(headline)!;
    expect(p.type).toBe("LEGAL");
    expect(p.winners).toEqual(["joker"]);
    expect(p.losers.sort()).toEqual(["gotham", "harvey_dent"]);
  });
  it("flips for a loss verb", () => {
    const p = parseOutcome("Harvey Dent loses to Joker in court")!;
    expect(p.losers.includes("harvey_dent")).toBe(true);
    expect(p.winners.includes("joker")).toBe(true);
  });
  it("the same ruling is good for Joker, bad for Dent and Gotham, and sets up Two-Face", () => {
    let joker = 0, dent = 0, gotham = 0, twoFace = 0, n = 0;
    for (let k = 0; k < 200; k++) {
      const { shocks } = run(`o${k}`);
      joker += shocks.get("joker")?.pressure ?? 0;
      dent += shocks.get("harvey_dent")?.pressure ?? 0;
      gotham += shocks.get("gotham")?.pressure ?? 0;
      twoFace += shocks.get("two_face")?.pressure ?? 0;
      n++;
    }
    expect(joker / n).toBeGreaterThan(0.005);
    expect(dent / n).toBeLessThan(-0.005);
    expect(gotham / n).toBeLessThan(-0.003);
    expect(twoFace / n).toBeGreaterThan(0.005);
    const one = run("o1").shocks;
    expect(conditionsFor(one.get("two_face")).volMult).toBeGreaterThan(1);
  });
  it("Gotham trust loses on the ruling, bounded, and identically for the same story (deterministic, no random draw)", () => {
    const calm = issueInstitutional(new Map());
    const px = (xs: any[]) => Number(xs.find((i) => i.symbol === "GOTHRE").pricing.fmv_usd);
    const base = px(calm);
    const r = Array.from({ length: 200 }, (_, k) => px(issueInstitutional(run(`g${k}`).shocks)) / base);
    expect(Math.min(...r)).toBeGreaterThan(0.85);
    expect(r.reduce((a, b) => a + b, 0) / r.length).toBeLessThan(1);
    expect(new Set(r.map((x) => x.toFixed(6))).size).toBe(1);
  });
  it("opens a Two-Face vs Joker retaliation market with plausible, deterministic odds (no crowd jitter)", () => {
    const odds = Array.from({ length: 100 }, (_, k) => {
      const { outcomes, shocks } = run(`p${k}`);
      const ps = issuePredictions(outcomes, shocks, NOW);
      return Number(ps.find((p) => p.displayName.startsWith("Two-Face retaliates"))!.pricing.fmv_usd);
    });
    expect(Math.min(...odds)).toBeGreaterThan(5);
    expect(Math.max(...odds)).toBeLessThan(97);
    expect(new Set(odds.map((x) => x.toFixed(4))).size).toBe(1);
    // and odds do not wobble with the clock: same inputs 15 minutes later give the same price
    const { outcomes, shocks } = run("p0");
    const at = (t: number) => Number(issuePredictions(outcomes, shocks, t).find((p) => p.displayName.startsWith("Two-Face retaliates"))!.pricing.fmv_usd);
    expect(at(NOW + 15 * 60_000)).toBeCloseTo(at(NOW), 1);
  });
  it("a story with no winner and loser opens nothing", () => {
    expect(parseOutcome("Gotham weather mild this week")).toBeNull();
    expect(issuePredictions([], new Map(), NOW)).toEqual([]);
  });
});
