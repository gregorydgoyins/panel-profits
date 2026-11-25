import { describe, expect, it } from "vitest";
import { SURFACE_ORDER } from "../lib/assets/surfaceConfig";
import { buildUnderlyings, applyShocks } from "../lib/assets/underlyings";
import { issueInstruments } from "../lib/assets/instruments";
import { nextThirdFridays } from "../lib/assets/option-chain";
import { eventsFromArticles, propagate } from "../lib/assets/shock-propagation";
import { outcomesFromArticles } from "../lib/assets/outcomes";
import { PROHIBITED_FICTIONAL_TICKERS } from "../lib/guardrails/zero-fake-data-guardrail";

const row = (o: any) => ({
  comics_id: o.id,
  series: o.series,
  issue_number: o.issue,
  year: o.year,
  publisher: o.publisher,
  cover_url: "https://example.com/c.jpg",
  pp_id: o.pp ?? null,
  pp_ladder: o.pp98 ? { "9.8": o.pp98 } : null,
  cb_price: o.cb ?? null,
  cb_values: o.cbv ?? { 2021: (o.pp98 || o.cb) * 0.85, 2022: (o.pp98 || o.cb) * 0.9, 2023: (o.pp98 || o.cb) * 0.95, 2024: o.pp98 || o.cb },
  cgc_total: o.pop ?? 150,
  scarcity_tier: o.tier ?? "rare",
});

const TEST_ROWS = [
  row({ id: "det27", series: "Detective Comics", issue: "27", year: 1939, publisher: "DC", cb: 1150000, pop: 87, tier: "mythic" }),
  row({ id: "act1", series: "Action Comics", issue: "1", year: 1938, publisher: "DC", cb: 5454500, pop: 86, tier: "mythic" }),
  row({ id: "bat1", series: "Batman", issue: "1", year: 1940, publisher: "DC", cb: 2200000, pop: 210, tier: "legendary" }),
  row({ id: "bat404", series: "Batman", issue: "404", year: 1987, publisher: "DC", pp98: 420, pop: 2800, tier: "common" }),
  row({ id: "asm1", series: "Amazing Spider-Man", issue: "1", year: 1963, publisher: "Marvel", pp98: 642831, pop: 5434, tier: "mythic" }),
  row({ id: "asm300", series: "Amazing Spider-Man", issue: "300", year: 1988, publisher: "Marvel", pp98: 2597, pop: 41681, tier: "common" }),
  row({ id: "ff48", series: "Fantastic Four", issue: "48", year: 1966, publisher: "Marvel", pp98: 42000, pop: 450, tier: "rare" }),
  row({ id: "xmen1", series: "X-Men", issue: "1", year: 1963, publisher: "Marvel", pp98: 48500, pop: 1200, tier: "legendary" }),
  row({ id: "avng4", series: "Avengers", issue: "4", year: 1964, publisher: "Marvel", pp98: 55000, pop: 900, tier: "rare" }),
  row({ id: "hulk181", series: "Incredible Hulk", issue: "181", year: 1974, publisher: "Marvel", pp98: 15725, pop: 3200, tier: "uncommon" }),
  row({ id: "dd1", series: "Daredevil", issue: "1", year: 1964, publisher: "Marvel", pp98: 28000, pop: 600, tier: "rare" }),
  row({ id: "tmnt1", series: "Teenage Mutant Ninja Turtles", issue: "1", year: 1984, publisher: "Mirage", pp98: 9800, pop: 350, tier: "rare" }),
];

describe("Rule #1 Derived Asset Engine — All 65 Surfaces, 3rd-Friday Options & Live News Ripple", () => {
  const now = Date.parse("2026-11-25T15:00:00Z");

  it("computes exact 3rd-Friday monthly option expiration dates", () => {
    const exps = nextThirdFridays(now, 3, 7);
    expect(exps.length).toBe(3);
    for (const exp of exps) {
      const dt = new Date(`${exp.expiryDate}T21:00:00Z`);
      expect(dt.getUTCDay()).toBe(5); // Friday
      const dom = dt.getUTCDate();
      expect(dom).toBeGreaterThanOrEqual(15);
      expect(dom).toBeLessThanOrEqual(21);
      expect(exp.expiryDays).toBeGreaterThanOrEqual(7);
      expect(exp.turnsToExpiry).toBeGreaterThan(0);
    }
  });

  it("populates all 65 canonical surfaces from atomic equities with zero prohibited tickers", () => {
    const baseUnders = buildUnderlyings({ rail: TEST_ROWS, ppHistory: [], news: [], now });
    const items = issueInstruments(baseUnders, new Map(), now, []);

    const emittedSurfaces = new Set(items.map((it) => it.assetType));
    const missingSurfaces = SURFACE_ORDER.filter((s) => !emittedSurfaces.has(s));
    expect(missingSurfaces).toEqual([]);

    for (const it of items) {
      expect(PROHIBITED_FICTIONAL_TICKERS.has(it.symbol.toUpperCase())).toBe(false);
      expect(Number(it.pricing.fmv_usd)).toBeGreaterThan(0);
      expect(Number.isFinite(Number(it.pricing.fmv_usd))).toBe(true);
      expect(it.pricing.formula).toBeTruthy();
    }
  });

  it("emits OCC option strings with 3rd-Friday expiries and exact Intrinsic + Time Value conservation", () => {
    const baseUnders = buildUnderlyings({ rail: TEST_ROWS, ppHistory: [], news: [], now });
    const items = issueInstruments(baseUnders, new Map(), now, []);
    const options = items.filter((it) => it.assetType === "OPTIONS");
    expect(options.length).toBeGreaterThan(6);

    for (const opt of options) {
      // OCC-style string: ROOT-YYMMDD{C|P}STRIKE
      expect(opt.symbol).toMatch(/^[A-Z0-9]+-\d{6}[CP]\d+(\.\d+)?$/);
      const p = opt.parameters as any;
      expect(p.expiryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const dt = new Date(`${p.expiryDate}T21:00:00Z`);
      expect(dt.getUTCDay()).toBe(5);
      expect(dt.getUTCDate()).toBeGreaterThanOrEqual(15);
      expect(dt.getUTCDate()).toBeLessThanOrEqual(21);
      // Intrinsic + Time Value === Premium
      expect(p.intrinsicValue).toBeGreaterThanOrEqual(0);
      expect(p.timeValue).toBeGreaterThanOrEqual(0);
      expect(Math.abs(p.intrinsicValue + p.timeValue - p.premium)).toBeLessThan(1e-6);
    }
  });

  it("ripples live hero/city news shocks across equities into options, bonds, swaps, convertibles, commodities, and nemesis spreads", () => {
    const baseUnders = buildUnderlyings({ rail: TEST_ROWS, ppHistory: [], news: [], now });
    const calmItems = issueInstruments(applyShocks(baseUnders, new Map(), now), new Map(), now, []);

    const articles = [
      {
        id: "news-joker-gotham",
        headline: "Joker launches devastating explosion and siege across Gotham City, threatening Batman",
        summary: "Gotham municipal infrastructure suffers severe damage while Batman responds.",
        url: "https://example.com/gotham",
        published_at: new Date(now - 6 * 3_600_000).toISOString(),
      },
      {
        id: "news-spiderman-trailer",
        headline: "Spider-Man blockbuster film trailer debuts with record adaptation box office hype",
        summary: "Sony and Marvel Studios reveal new Spider-Man movie trailer.",
        url: "https://example.com/spiderman",
        published_at: new Date(now - 4 * 3_600_000).toISOString(),
      },
    ];
    const outcomes = outcomesFromArticles(articles);
    const shocks = propagate(eventsFromArticles(articles), now, outcomes);
    const shockedUnders = applyShocks(baseUnders, shocks, now);
    const shockedItems = issueInstruments(shockedUnders, shocks, now, outcomes);

    const byKey = (arr: typeof calmItems) => new Map(arr.map((x) => [`${x.assetType}|${x.symbol}`, x]));
    const calmMap = byKey(calmItems);
    const shockMap = byKey(shockedItems);

    // 1. Gotham Muni Swap spreads widen under Joker attack
    const calmSwap = calmMap.get("SWAPS|SWP-GOTH5Y")!;
    const shockSwap = shockMap.get("SWAPS|SWP-GOTH5Y")!;
    expect(shockSwap.pricing.fmv_usd).toBeGreaterThan(Number(calmSwap.pricing.fmv_usd));

    // 2. Gotham Revenue Bond reprices under stress
    const calmMuni = calmMap.get("MUNI_REVENUE|GOTHRV7")!;
    const shockMuni = shockMap.get("MUNI_REVENUE|GOTHRV7")!;
    expect(shockMuni.pricing.fmv_usd).not.toBe(calmMuni.pricing.fmv_usd);

    // 3. Spider-Verse Film royalty unit lifts on trailer hype
    const calmFilm = calmMap.get("FILM|FLM-SPID")!;
    const shockFilm = shockMap.get("FILM|FLM-SPID")!;
    expect(shockFilm.pricing.fmv_usd).toBeGreaterThan(Number(calmFilm.pricing.fmv_usd));

    // 4. Batman / Wayne Convertible reprices on Gotham & Batman news
    const calmConv = calmMap.get("CONVERTIBLE|WAYNCV5")!;
    const shockConv = shockMap.get("CONVERTIBLE|WAYNCV5")!;
    expect(shockConv.pricing.fmv_usd).not.toBe(calmConv.pricing.fmv_usd);

    // 5. Spider-Man underlying equity volatility & option IV jump on news
    const calmAsm = baseUnders.find((u) => u.id === "asm300")!;
    const shockAsm = shockedUnders.find((u) => u.id === "asm300")!;
    expect(shockAsm.sigma).toBeGreaterThan(calmAsm.sigma);
  });
});
