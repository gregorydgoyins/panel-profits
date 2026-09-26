import { describe, expect, it } from "vitest";
import { isRelevantComicStory } from "@/lib/news/feed";

describe("newsroom relevance gate", () => {
  it("rejects unrelated material from general or non-industry feeds", () => {
    expect(isRelevantComicStory("COMICBOOK", "PWI 500 unveils its 2025 wrestling rankings", "A full ranking of professional wrestlers.")).toBe(false);
    expect(isRelevantComicStory("GUARDIAN", "A history book examines slavery and empire", "A review of a new work of history.")).toBe(false);
  });

  it("admits real-world media conglomerate M&A and financial news for equities tracking", () => {
    expect(isRelevantComicStory("VARIETY", "Paramount Skydance and Warner Bros Discovery merger faces opposition", "The coalition argues the merger deal would hurt consumers and media workers.")).toBe(true);
    expect(isRelevantComicStory("THR", "Disney earnings highlight quarterly revenue", "The annual report cites corporate financial results and shares performance.")).toBe(true);
  });

  it("keeps directly relevant comics and character reporting", () => {
    expect(isRelevantComicStory("VARIETY", "Marvel announces a new X-Men series", "The superhero franchise returns with a new creative team.")).toBe(true);
  });
});