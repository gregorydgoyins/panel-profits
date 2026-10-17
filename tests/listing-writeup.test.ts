import { describe, expect, it } from "vitest";
import { attachRefs, writeupKey, writeupPrompt, writeupSchema } from "@/lib/sniper/listing-writeup";
describe("listing write-up", () => {
  it("separates financial research by slab grade while ignoring certificate numbers", () => {
    const a = writeupKey({ title: "Spider-Gwen Ghost-Spider # 1 CGC 9.8 J Scott Campbell SDCC 2024 EXL" });
    const b = writeupKey({ title: "Spider-Gwen Ghost-Spider #1 CGC 9.6 J Scott Campbell SDCC 2024 EXL 4455667788" });
    expect(a).not.toBe(b);
    expect(writeupKey({title:"Spider-Gwen Ghost-Spider #1 CGC 9.8 J Scott Campbell SDCC 2024 EXL 4455667788"})).toBe(a);
    expect(writeupKey({title:"Spider-Gwen Ghost-Spider #1 CGC 9.8 J Scott Campbell SDCC 2024 EXL",grader:"CGC",grade:9.8})).toBe(a);
    expect(writeupKey({ title: "Spider-Gwen Ghost-Spider #1 CGC 9.8" })).not.toBe(a);
    expect(writeupKey({ title: "Spider-Gwen Ghost-Spider # 1 CGC 9.8 J Scott Campbell SDCC 2024 EXL", publisher: "Marvel", year: 2018 })).toBe(a);
  });
  it("asks about the exact listing and demands sourced facts", () => {
    const p = writeupPrompt({ title: "Edge of Venomverse #1 Comics Elite Roberto Poggi Variant" }, "2026-10-15");
    expect(p).toContain("Poggi");
    expect(p).toContain("Only state facts you found in search results");
    expect(p).toContain("Why Invest in <edition>?");
  });
  it("needs a synopsis and at least two reasons to buy", () => {
    const pt = { label: "The Plot", text: "Laura escapes the facility and bonds with a symbiote." };
    expect(writeupSchema.safeParse({ edition: "Edge of Venomverse #1 (2017)", synopsis: { intro: "Written by Matthew Rosenberg.", points: [pt] }, investment: { heading: "Why invest?", points: [pt] } }).success).toBe(false);
  });
  it("links each point to the sources Gemini says back that sentence", () => {
    const pt = (text: string) => ({ label: "L", text });
    const parsed = { synopsis: { intro: "Written by Stephanie Phillips.", points: [pt("Gwen moves to Manhattan under TVA orders and must hide her identity.")] }, investment: { points: [pt("The cover was held back and debuted at San Diego Comic-Con 2024."), pt("An unsupported point nobody cited at all here.")] } };
    const sources = [{ title: "marvel.fandom.com", uri: "https://a" }, { title: "jscottcampbell.com", uri: "https://b" }];
    const supports = [{ text: "Gwen moves to Manhattan under TVA orders", chunks: [0] }, { text: "debuted at San Diego Comic-Con 2024", chunks: [1, 0] }];
    const out: any = attachRefs(parsed, sources, supports);
    expect(out.parsed.synopsis.points[0].refs).toEqual([0]);
    expect(out.parsed.investment.points[0].refs).toEqual([1, 0]);
    expect(out.parsed.investment.points[1].refs).toEqual([]);
    expect(out.sources.map((s: { uri: string }) => s.uri)).toEqual(["https://a", "https://b"]);
  });
  it("keeps every citation inside the displayed source list", () => {
    const sources = Array.from({ length: 12 }, (_, i) => ({ title: `Source ${i}`, uri: `https://example.org/${i}` }));
    const text = "This exact edition has a documented convention release.";
    const parsed = { synopsis: { intro: text, points: [{ label: "Release", text }] }, investment: { points: [{ label: "Edition", text }] } };
    const result = attachRefs(parsed, sources, [{ text, chunks: sources.map((_, i) => i) }]);
    expect(result.sources).toHaveLength(10);
    for (const point of [...result.parsed.synopsis.points, ...result.parsed.investment.points]) {
      for (const ref of (point as { refs?: number[] }).refs ?? []) expect(result.sources[ref]).toBeDefined();
    }
  });

});
