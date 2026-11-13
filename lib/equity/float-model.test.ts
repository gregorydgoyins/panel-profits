import { describe, it, expect } from "vitest";
import { computeFloatProfile } from "./float-model";

const pr = { printRun: 129490, method: "DIAMOND_ESTIMATE" as const, sourceNote: "Comichron", sourceUrl: null };

describe("float model", () => {
  it("bounds survivors between census (floor) and distribution (ceiling)", () => {
    const f = computeFloatProfile({ printRun: pr, censusTotal: 465, publicationYear: 2019, sales12m: 25 });
    expect(f.survivorsEstimate).toBe(Math.round(129490 * 0.7));
    expect(f.rawFloatEstimate).toBe(Math.round(129490 * 0.7) - 465);
    expect(f.activeSupply12m).toBe(25);
  });

  it("never lets survivors fall below the census", () => {
    const f = computeFloatProfile({ printRun: { ...pr, printRun: 300000 }, censusTotal: 30000, publicationYear: 1963, sales12m: 0 });
    expect(f.survivorsEstimate).toBe(30000); // 8% of 300k = 24k < census
    expect(f.rawFloatEstimate).toBe(0);
  });

  it("has no distribution, survivors or float without a print run on file", () => {
    const f = computeFloatProfile({ printRun: null, censusTotal: 5454, publicationYear: 1963, sales12m: 3 });
    expect(f.distribution).toBeNull();
    expect(f.survivorsEstimate).toBeNull();
    expect(f.rawFloatEstimate).toBeNull();
    expect(f.census).toBe(5454);
  });
});
