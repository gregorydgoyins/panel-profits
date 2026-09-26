import { describe, expect, it } from "vitest";
import { buildAnchorScript } from "@/lib/news/broadcast-script";

describe("Newsroom Broadcast Script Engine", () => {
  it("synthesizes multi-sentence scripts for spoken news briefs", () => {
    const story = {
      headline: "Marvel and Sony announce new Spider-Man cinematic direction",
      summary: "The studio has confirmed the next phase of development for the franchise. Production is scheduled to begin early next year under new creative leadership. Collectors are already monitoring key issue valuations.",
      source: "VARIETY",
      published_at: "2026-09-26T00:00:00Z",
    };

    const script = buildAnchorScript(story);
    expect(script.headline).toBe(story.headline);
    expect(script.sourceLine).toContain("VARIETY");
    expect(script.fullScript).toContain("Our lead report on the wire today");
    expect(script.fullScript).toContain("The studio has confirmed");
    expect(script.fullScript).toContain("Production is scheduled to begin");
    expect(script.fullScript).toContain("Collectors are already monitoring");
    expect(script.cues.length).toBeGreaterThan(1);
    expect(script.estimatedDurationSec).toBeGreaterThan(10);
  });
});
