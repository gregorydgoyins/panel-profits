import { describe, expect, it } from "vitest";
import { queryPineconeVectorIndex } from "@/lib/wiki/pinecone";

describe("Pinecone Vector Index Client", () => {
  it("gracefully resolves query requests without throwing when API is reachable or offline", async () => {
    const results = await queryPineconeVectorIndex("Spider-Man", 5);
    expect(Array.isArray(results)).toBe(true);
    if (results.length > 0) {
      expect(results[0]).toHaveProperty("id");
      expect(results[0]).toHaveProperty("name");
      expect(results[0]).toHaveProperty("ticker");
      expect(results[0].ticker.startsWith("$")).toBe(true);
    }
  });
});
