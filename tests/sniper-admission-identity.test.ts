import { describe, expect, it } from "vitest";
import { catalogEdition, editionMatches, exactEditionText, gradeKey, normalizedEdition, seriesMatches } from "../lib/sniper/admission-worker";

describe("Sniper admission identity normalization", () => {
  it.each([
    [8, "8.0"],
    [5, "5.0"],
    [9.8, "9.8"],
    [10, "10.0"],
  ])("maps numeric grade %s to the exact PP column key", (value, expected) => {
    expect(gradeKey(value)).toBe(expected);
  });

  it("does not invent a PP column for unsupported half grades", () => {
    expect(gradeKey(8.5)).toBeNull();
    expect(gradeKey(9.9)).toBeNull();
  });

  it("keeps newsstand and printing identity distinct from direct", () => {
    const catalog = catalogEdition({ printing: "1", direct_or_variant: "Variant", cover_variant: "Newsstand" });
    expect(catalog).toContain("newsstand");
    expect(editionMatches(normalizedEdition("Newsstand Edition"), catalog)).toBe(true);
    expect(editionMatches("direct", catalog)).toBe(false);
  });

  it("recognizes first and second printing only when the catalog fields agree", () => {
    expect(editionMatches(normalizedEdition(exactEditionText("Batman #1 First Printing", null)), "1 direct")).toBe(true);
    expect(editionMatches(normalizedEdition(exactEditionText("Batman #1 Second Printing", null)), "2 direct")).toBe(true);
    expect(editionMatches(normalizedEdition("Second Printing"), "1 direct")).toBe(false);
  });

  it("matches catalog series punctuation without relaxing issue or edition checks", () => {
    expect(seriesMatches("G.I. Joe, A Real American Hero", "G.I. Joe: A Real American Hero")).toBe(true);
    expect(seriesMatches("Amazing Spider-Man", "Amazing Spider-Man 1963")).toBe(true);
    expect(seriesMatches("Amazing Spider-Man", "Spectacular Spider-Man")).toBe(false);
  });
});
