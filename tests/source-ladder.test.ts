import { describe, expect, it } from "vitest";
import { comicBaseReference, panelProfitsGrades } from "@/lib/pricing/source-ladder";

describe("distinct grade evidence", () => {
  it("uses only explicitly stored Panel Profits market grades", () => {
    const prices = panelProfitsGrades({ panel_profits_data: {
      "PP - Grade 4.0 Market Price": "$2,500", "PP - Grade 9.8 Market Price": "746000",
      "PP - Grade 6.0 Buy Price": "1000", "PP - Grade 10.0 Market Price": "0",
    }, pp_grade_9_8_price: null, comicbase_price: 1300000 });
    expect(prices["4.0"]).toBe(2500);
    expect(prices["9.8"]).toBe(746000);
    expect(prices["6.0"]).toBeUndefined();
    expect(prices["10.0"]).toBeUndefined();
    expect(Object.keys(prices)).toHaveLength(2);
  });

  it("does not project the ComicBase reference onto a certified grade", () => {
    const comic = { comicbase_price: 1300000, panel_profits_data: null };
    expect(comicBaseReference(comic)).toBe(1300000);
    expect(panelProfitsGrades(comic)).toEqual({});
  });
});
