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
    expect(script.fullScript).toContain("Marvel Universe Equities");
    expect(script.fullScript).toContain("Key Issue Premium");
    expect(script.cues.length).toBeGreaterThan(1);
    expect(script.estimatedDurationSec).toBeGreaterThan(10);
  });

  it("dynamically adapts spoken market analysis for upward, downward, and sideways trend stories", () => {
    const upwardStory = buildAnchorScript({
      headline: "Action Comics 1 record auction sale breakout surge",
      summary: "A CGC 8.5 copy set a new record high price at public auction today.",
      source: "BLEEDING COOL",
    });
    expect(upwardStory.fullScript).toContain("trending upward");
    expect(upwardStory.fullScript).toContain("DC Franchise Assets");
    expect(upwardStory.fullScript).toContain("Census Float");

    const downwardStory = buildAnchorScript({
      headline: "Secondary market values drop and soften for 90s variant covers",
      summary: "Collector demand saw a slight decline in recent weeks.",
      source: "AIPT",
    });
    expect(downwardStory.fullScript).toContain("downward price pressure");
    expect(downwardStory.fullScript).toContain("Variant Ratio Dilution");

    const sidewaysStory = buildAnchorScript({
      headline: "Batman graphic novel prices remain steady and flat across retail channels",
      summary: "Catalog values hold stable as volume consolidates.",
      source: "CBR",
    });
    expect(sidewaysStory.fullScript).toContain("trading sideways in a tight consolidation band");
  });
});
