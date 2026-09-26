import { describe, it, expect } from "vitest";
import {
  resolveComicCover,
  buildGcdCoverUrl,
  generateDynamicCoverSvg,
  resolveComicCoversBatch,
} from "@/lib/comics/cover-resolver";

describe("Comic Cover Resolver Ladder", () => {
  it("resolves Tier 1: Supabase / Cloud storage path", () => {
    const result = resolveComicCover({
      id: "test-1",
      series: "Amazing Spider-Man",
      issue_number: "300",
      cover_storage_path: "covers/marvel/asm_300.jpg",
      cover_verified_at: "2026-01-01T00:00:00Z",
    });

    expect(result.sourceTier).toBe("storage");
    expect(result.isFallback).toBe(false);
    expect(result.qualityTier).toBe("verified");
    expect(result.url).toContain("storage/v1/object/public/covers/marvel/asm_300.jpg");
  });

  it("resolves Tier 2: Direct canonical URL", () => {
    const result = resolveComicCover({
      id: "test-2",
      series: "Batman",
      issue_number: "428",
      cover_url: "https://files1.comics.org/img/gcd/covers_by_id/123/123456.jpg",
      cover_sha256: "abc123sha",
    });

    expect(result.sourceTier).toBe("canonical_url");
    expect(result.isFallback).toBe(false);
    expect(result.url).toBe("https://files1.comics.org/img/gcd/covers_by_id/123/123456.jpg");
    expect(result.checksum).toBe("abc123sha");
  });

  it("resolves Tier 3: Grand Comics Database (GCD) source ID", () => {
    const result = resolveComicCover({
      id: "test-3",
      series: "X-Men",
      issue_number: "1",
      gcd_source_id: "54321",
    });

    expect(result.sourceTier).toBe("gcd_archive");
    expect(result.isFallback).toBe(false);
    expect(result.url).toBe("https://files1.comics.org/img/gcd/covers_by_id/54/54321.jpg");
  });

  it("correctly constructs GCD URLs with leading folders", () => {
    expect(buildGcdCoverUrl("12345")).toBe("https://files1.comics.org/img/gcd/covers_by_id/12/12345.jpg");
    expect(buildGcdCoverUrl("950")).toBe("https://files1.comics.org/img/gcd/covers_by_id/0/950.jpg");
    expect(buildGcdCoverUrl("gcd:887654")).toBe("https://files1.comics.org/img/gcd/covers_by_id/887/887654.jpg");
    expect(buildGcdCoverUrl(null)).toBeNull();
  });

  it("resolves Tier 4: ComicBase Picture URL", () => {
    const result = resolveComicCover({
      id: "test-4",
      series: "Spawn",
      issue_number: "1",
      comicbase_data: {
        PictureURL: "https://images.comicbase.com/items/spawn_1.jpg",
      },
    });

    expect(result.sourceTier).toBe("external_provider");
    expect(result.isFallback).toBe(false);
    expect(result.url).toBe("https://images.comicbase.com/items/spawn_1.jpg");
  });

  it("resolves Tier 5: Universal Dynamic SVG when no remote image is found", () => {
    const result = resolveComicCover({
      id: "test-5",
      series: "Action Comics",
      issue_number: "1",
      publisher: "DC Comics",
      publication_year: 1938,
    });

    expect(result.sourceTier).toBe("dynamic_badge");
    expect(result.isFallback).toBe(true);
    expect(result.qualityTier).toBe("synthetic");
    expect(result.url.startsWith("data:image/svg+xml")).toBe(true);
    expect(result.url).toContain("Action%20Comics");
    expect(result.url).toContain("DC%20COMICS");
  });

  it("batch resolves an array of comics", () => {
    const batch = resolveComicCoversBatch([
      { id: "c1", series: "Marvelman", issue_number: "1", gcd_source_id: "100" },
      { id: "c2", series: "Det Nye", issue_number: "6", publisher: "Mortensen" },
    ]);

    expect(batch.size).toBe(2);
    expect(batch.get("c1")?.sourceTier).toBe("gcd_archive");
    expect(batch.get("c2")?.sourceTier).toBe("dynamic_badge");
  });
});
