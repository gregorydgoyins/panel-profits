import { describe, expect, it } from "vitest";
import { comicNewsPressure, comicEntities } from "../lib/assets/comic-pressure";
import { eventsFromArticles, propagate } from "../lib/assets/shock-propagation";
import { outcomesFromArticles, PRESSURE_CAP } from "../lib/assets/outcomes";
import { matchEntities, matchEntitiesWithPos } from "../lib/assets/entity-graph";
import { isListicle } from "../lib/assets/news-price-params";

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

  it("a listicle naming Galactus moves no price (stress/vol channel still sees it)", () => {
    const arts = [
      art("l1", "10 times Galactus attacked and devoured a planet"),
      art("l2", "Top 5 Galactus attack moments, ranked"),
      { ...art("l3", "Las 10 catástrofes de Galactus"), summary: "Galactus attack after attack, from Earth to Zenn-La." },
    ];
    const events = eventsFromArticles(arts);
    expect(events.length).toBe(3);
    for (const e of events) expect(e.price).toBeNull();
    const state = stateOf(arts);
    for (const id of ["galactus", "silver_surfer", "fantastic_four"]) expect(state.shocks.get(id)?.pressure ?? 0).toBe(0);
    expect(state.shocks.get("galactus")!.stress).toBeGreaterThan(0);
    expect(comicNewsPressure({ series: "Silver Surfer", characters: ["Galactus"] }, state, NOW)!.pressure).toBe(0);
  });

  it("'Silver Surfer movie casting announced' lifts silver_surfer", () => {
    const state = stateOf([art("c1", "Silver Surfer movie casting announced")]);
    expect(state.shocks.get("silver_surfer")!.pressure).toBeGreaterThan(0);
    expect(comicNewsPressure({ series: "Silver Surfer" }, state, NOW)!.pressure).toBeGreaterThan(0);
  });

  it("an entity named only in the body (not headline or lead) gets no price effect", () => {
    const a = {
      id: "b1",
      headline: "Studio announces new movie slate",
      summary: "The studio shared its plans on Friday. Later in the panel, a Galactus attack trailer was also teased.",
      url: "u",
      published_at: "2026-11-09T06:00:00Z",
    };
    const [ev] = eventsFromArticles([a]);
    expect(ev.origins).toContain("galactus"); // full text still feeds stress/vol
    expect(ev.price).toBeNull();
    const shocks = propagate([ev], NOW);
    expect(shocks.get("galactus")?.pressure ?? 0).toBe(0);
    expect(shocks.get("silver_surfer")?.pressure ?? 0).toBe(0);
  });

  it("listicle patterns: catch list frames, leave plain news alone", () => {
    for (const h of ["10 catastrophes that shook the Marvel universe", "30 Years Ago, A Snack Food Starred Silver Surfer", "Every Silver Surfer comic, ranked", "The best Galactus stories", "Os 7 melhores vilões", "Things you didn't know about Venom"])
      expect(isListicle(h), h).toBe(true);
    for (const h of ["Silver Surfer movie casting announced", "2026 box office: Fantastic Four opens big", "Galactus arrives to devour the planet"])
      expect(isListicle(h), h).toBe(false);
  });
});
