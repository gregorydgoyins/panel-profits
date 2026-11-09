import { describe, expect, it } from "vitest";
import { comicNewsPressure, comicEntities } from "../lib/assets/comic-pressure";
import { eventsFromArticles, propagate } from "../lib/assets/shock-propagation";
import { outcomesFromArticles, PRESSURE_CAP } from "../lib/assets/outcomes";
import { matchEntities, matchEntitiesWithPos } from "../lib/assets/entity-graph";

const NOW = Date.parse("2026-11-09T12:00:00Z");
const art = (id: string, headline: string, published_at = "2026-11-09T06:00:00Z") => ({ id, headline, summary: "", url: `https://example.test/${id}`, published_at });
const stateOf = (arts: ReturnType<typeof art>[]) => {
  const outcomes = outcomesFromArticles(arts);
  return { outcomes, shocks: propagate(eventsFromArticles(arts), NOW, outcomes) };
};

describe("comic news pressure", () => {
  it("Surfer defeats Knull: Surfer books up, Knull books down", () => {
    const state = stateOf([art("w1", "Silver Surfer defeats Knull")]);
    const surfer = comicNewsPressure({ series: "Silver Surfer Black" }, state, NOW)!;
    const knull = comicNewsPressure({ series: "Venom", characters: ["Knull"] }, state, NOW)!;
    expect(surfer.ids).toEqual(["silver_surfer"]);
    expect(surfer.pressure).toBeGreaterThan(0);
    expect(surfer.factor).toBeGreaterThan(1);
    expect(knull.ids).toEqual(["knull"]);
    expect(knull.pressure).toBeLessThan(0);
    expect(surfer.trails[0]).toMatchObject({ eventId: "w1", headline: "Silver Surfer defeats Knull", publishedAt: "2026-11-09T06:00:00.000Z" });
    expect(surfer.trails[0].effectPct).toBeGreaterThan(0);
  });

  it("a trailer story lifts silver_surfer (hype price channel)", () => {
    const state = stateOf([art("h1", "First trailer for the Silver Surfer movie released")]);
    expect(state.shocks.get("silver_surfer")!.pressure).toBeGreaterThan(0);
    const p = comicNewsPressure({ series: "Silver Surfer" }, state, NOW)!;
    expect(p.pressure).toBeGreaterThan(0);
    expect(p.trails[0].path[0]).toBe("silver_surfer");
  });

  it("character-derived entities count at partial weight", () => {
    const state = stateOf([art("h2", "First trailer for the Silver Surfer movie released")]);
    const direct = comicNewsPressure({ series: "Silver Surfer" }, state, NOW)!;
    const cameo = comicNewsPressure({ series: "Some Anthology", characters: ["Silver Surfer [Norrin Radd]"] }, state, NOW)!;
    expect(comicEntities({ series: "Some Anthology", characters: ["Norrin Radd"] })).toEqual([{ id: "silver_surfer", weight: 0.6 }]);
    expect(cameo.pressure).toBeCloseTo(direct.pressure * 0.6, 10);
  });

  it("a future-dated story moves nothing", () => {
    const state = stateOf([art("f1", "Silver Surfer defeats Knull", "2026-11-10T06:00:00Z"), art("f2", "Silver Surfer trailer drops", "2026-11-12T00:00:00Z")]);
    const p = comicNewsPressure({ series: "Silver Surfer" }, state, NOW)!;
    expect(p.pressure).toBe(0);
    expect(p.factor).toBe(1);
    expect(p.trails).toEqual([]);
  });

  it("an unmatched series returns null (no entity, no number)", () => {
    const state = stateOf([art("w2", "Silver Surfer defeats Knull")]);
    expect(comicNewsPressure({ series: "Archie's Pal Jughead", characters: ["Jughead Jones"] }, state, NOW)).toBeNull();
    expect(comicNewsPressure({ series: null, characters: [] }, state, NOW)).toBeNull();
  });

  it("stacked stories cap at ±12%", () => {
    const arts = Array.from({ length: 12 }, (_, k) => art(`s${k}`, `Silver Surfer defeats Knull in stunning showdown ${k}`));
    arts.push(art("t1", "Silver Surfer movie trailer and casting announced"));
    const state = stateOf(arts);
    const p = comicNewsPressure({ series: "Silver Surfer", characters: ["Galactus", "Fantastic Four"] }, state, NOW)!;
    expect(p.pressure).toBeCloseTo(PRESSURE_CAP, 10);
    expect(p.factor).toBeCloseTo(Math.exp(PRESSURE_CAP), 10);
    const k = comicNewsPressure({ series: "Knull" }, state, NOW);
    expect(k).toBeNull(); // no "knull" series mapping — entity comes from characters only
    const kc = comicNewsPressure({ series: "x", characters: ["Knull"] }, state, NOW)!;
    expect(kc.pressure).toBeGreaterThanOrEqual(-PRESSURE_CAP);
  });

  it("leaves the base FMV and the shock state untouched (simulated price is derived, never written back)", () => {
    const state = stateOf([art("w3", "Silver Surfer defeats Knull")]);
    const before = JSON.stringify([...state.shocks]);
    const baseFmv = 1250;
    const p = comicNewsPressure({ series: "Silver Surfer" }, state, NOW)!;
    const sim = baseFmv * p.factor;
    expect(baseFmv).toBe(1250);
    expect(sim).not.toBe(baseFmv);
    expect(JSON.stringify([...state.shocks])).toBe(before);
    expect(Object.keys(p).sort()).toEqual(["factor", "ids", "pressure", "trails"]);
  });

  it("an idiom deep in a review body is not a defeat (outcomes parse headline or lead sentence only)", () => {
    const a = { id: "r1", headline: "Iron Man #11 pays off the buildup", summary: "Tony builds a Galactus-sized suit. It isn't lost on me that the suit is gold.", url: "u", published_at: "2026-11-09T06:00:00Z" };
    expect(outcomesFromArticles([a])).toEqual([]);
    const b = { ...a, id: "r2", headline: "Cosmic showdown", summary: "Silver Surfer defeats Knull in the finale. More later." };
    expect(outcomesFromArticles([b])[0]).toMatchObject({ winners: ["silver_surfer"], losers: ["knull"] });
  });

  it("a Galactus Trilogy review does not name Galactus", () => {
    const h = "Review: the Galactus Trilogy still holds up";
    expect(matchEntities(h)).not.toContain("galactus");
    expect(matchEntitiesWithPos(h).map((e) => e.id)).not.toContain("galactus");
    expect(matchEntities("Galactus arrives to devour the planet")).toContain("galactus");
    const state = stateOf([art("g1", "Galactus Trilogy movie review: a faithful adaptation")]);
    expect(state.shocks.get("galactus")).toBeUndefined();
  });
});
