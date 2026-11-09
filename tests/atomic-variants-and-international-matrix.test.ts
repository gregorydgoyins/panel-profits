import { describe, it, expect } from "vitest";
import { getGcdRelationalData } from "@/lib/comics/gcd-relational-service";

// These assertions were written against the full local GCD SQLite database
// (/Users/macuser/Downloads/gcd-full-As1Act/2026-09-15.db), which gcd-relational-service.ts used to read first.
// That local SQLite path has been removed; the service now reads only from Supabase, which has no
// foreign-edition rows and no Absolute Batman / ThunderCats relational crosswalk. The suite is skipped
// until a Supabase source for this relational data exists.
describe.skip("GCD Relational & Atomic Instruments Engine", () => {
  it("extracts 40+ published variants for Absolute Batman #1 (GCD 2663120)", async () => {
    const data = await getGcdRelationalData(2663120, "Absolute Batman", "1");
    expect(data).not.toBeNull();
    if (data) {
      expect(data.baseIssueId).toBe(2663120);
      expect(data.variants.length).toBeGreaterThanOrEqual(40);
      // Check for prominent variants
      const variantNames = data.variants.map((v) => v.variantName);
      expect(variantNames.some((n) => n.includes("Foil"))).toBe(true);
      expect(variantNames.some((n) => n.includes("Printing"))).toBe(true);
    }
  });

  it("extracts international / foreign language reprints (Brazil, Germany, France)", async () => {
    const data = await getGcdRelationalData(2663120, "Absolute Batman", "1");
    expect(data).not.toBeNull();
    if (data) {
      expect(data.foreignEditions.length).toBeGreaterThanOrEqual(4);
      const countries = data.foreignEditions.map((f) => f.country);
      expect(countries).toContain("Germany");
      expect(countries).toContain("Brazil");
      expect(countries).toContain("France");
    }
  });

  it("resolves story arcs and narrative credits", async () => {
    const data = await getGcdRelationalData(2663120, "Absolute Batman", "1");
    expect(data).not.toBeNull();
    if (data) {
      expect(data.stories.length).toBeGreaterThan(0);
      const leadStory = data.stories.find((s) => s.title.includes("The Zoo"));
      expect(leadStory).toBeDefined();
      expect(leadStory?.characters).toContain("Absolute Universe");
    }
  });

  it("resolves comics by parenthetical year in series title without explicit GCD ID", async () => {
    const data = await getGcdRelationalData(null, "Absolute Batman (2024)", "1");
    expect(data).not.toBeNull();
    expect(data?.baseIssueId).toBe(2663120);
    expect(data?.variants.length).toBeGreaterThanOrEqual(40);
    expect(data?.foreignEditions.length).toBeGreaterThanOrEqual(5);

    // Verify foreign publishers and notes
    const germany = data?.foreignEditions.find((f) => f.country === "Germany");
    expect(germany).toBeDefined();
    expect(germany?.publisherName).toContain("Panini");

    const france = data?.foreignEditions.find((f) => f.country === "France");
    expect(france).toBeDefined();
    expect(france?.publisherName).toContain("Urban Comics");

    // Verify variant cover artist roster
    const geradsVariant = data?.variants.find((v) => v.variantName.includes("Gerads"));
    expect(geradsVariant).toBeDefined();
  });

  it("extracts international editions for classic series like ThunderCats (1985)", async () => {
    const data = await getGcdRelationalData(null, "ThunderCats (1985)", "1");
    expect(data).not.toBeNull();
    expect(data?.baseIssueId).toBe(76201);
    expect(data?.foreignEditions.length).toBeGreaterThanOrEqual(3);

    const countries = data?.foreignEditions.map((f) => f.country) || [];
    expect(countries).toContain("France");
    expect(countries).toContain("Netherlands");
  });
});

