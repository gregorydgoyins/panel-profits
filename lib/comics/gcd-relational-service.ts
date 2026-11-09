import { createAdminServerClient } from "@/lib/supabase/admin";

export interface GcdVariantItem {
  id: number;
  issueNumber: string;
  variantName: string;
  price: string;
  barcode: string;
  publicationDate: string;
  coverUrl?: string;
  catalogId?: string;
  coverArtist?: string;
}

export interface GcdForeignEditionItem {
  reprintId: number;
  targetIssueId: number;
  seriesName: string;
  country: string;
  language: string;
  publicationDate: string;
  issueNumber: string;
  publisherName?: string;
  notes?: string;
  isDomesticSpecial?: boolean;
  catalogId?: string;
  coverUrl?: string;
}

export interface GcdCreatorCredit {
  role: string;
  name: string;
}

export interface GcdStoryItem {
  id: number;
  title: string;
  sequenceNumber: number;
  pageCount: number;
  characters: string;
  synopsis: string;
  credits: GcdCreatorCredit[];
}

export interface GcdRelationalData {
  baseIssueId: number;
  seriesName: string;
  issueNumber: string;
  publicationDate: string;
  variants: GcdVariantItem[];
  foreignEditions: GcdForeignEditionItem[];
  stories: GcdStoryItem[];
  issueCredits: GcdCreatorCredit[];
  allWriters: string[];
  allPencilers: string[];
  allInkers: string[];
  allColorists: string[];
  allLetterers: string[];
  allEditors: string[];
  allCoverArtists: string[];
}

const memoryCache = new Map<string, GcdRelationalData | null>();

function parseArtistFromVariantName(variantName: string): string | null {
  if (!variantName) return null;
  // Match patterns like "Variant Edition - Marko Djurdjević Connecting Cover" or "2nd Printing Variant - Sara Pichelli Cover"
  const artistMatch = variantName.match(/(?:[-–—:]\s*)([A-Z][a-zà-ÿ]+(?:\s+[A-Z][a-zà-ÿ]+)+)(?:\s+(?:Connecting\s+)?Cover|\s+Variant)/i);
  if (artistMatch) {
    return artistMatch[1].trim();
  }
  const parts = variantName.split(/\s*[-–—:]\s*/);
  if (parts.length > 1) {
    const candidate = parts[parts.length - 1].replace(/\s+(?:Connecting\s+)?Cover.*$/i, "").trim();
    const lower = candidate.toLowerCase();
    if (!lower.startsWith("blank") && !lower.startsWith("7 copy") && !lower.startsWith("10 copy") && !lower.startsWith("15 copy") && !lower.startsWith("20 copy") && !lower.startsWith("25 copy") && !lower.startsWith("30 copy") && !lower.startsWith("40 copy") && !lower.startsWith("50 copy")) {
      return candidate;
    }
  }
  return null;
}

function matchVariantToCatalogComic(
  variantName: string,
  isBase: boolean,
  comics: Array<{ id: string; title: string; variant?: string | null; cover_url?: string | null; gcd_issue_id?: number | null }>
): { id: string; cover_url?: string } | null {
  if (isBase) {
    const baseComic = comics.find(c => (!c.variant || c.variant === "null" || c.variant === "Regular" || c.variant === "Direct") && !/\[.+\]/.test(c.title));
    if (baseComic) return { id: baseComic.id, cover_url: baseComic.cover_url ?? undefined };
  }

  const vNorm = (variantName || "").toLowerCase().replace(/[^a-z0-9]/g, " ");
  const isVirgin = vNorm.includes("virgin");

  let bestMatch: any = null;
  let maxScore = 0;

  for (const c of comics) {
    if (!c.variant || c.variant === "null") continue;
    const cNorm = c.variant.toLowerCase().replace(/[^a-z0-9]/g, " ");
    const cIsVirgin = cNorm.includes("virgin");
    if (isVirgin !== cIsVirgin) continue;

    const cTokens = cNorm.split(/\s+/).filter(t => t.length > 2 && t !== "print" && t !== "printing" && t !== "cover" && t !== "variant" && t !== "virgin");
    let matches = 0;
    for (const tok of cTokens) {
      if (vNorm.includes(tok)) matches++;
    }
    if ((cNorm.includes("2nd") || cNorm.includes("second")) && (vNorm.includes("second") || vNorm.includes("2nd"))) matches += 2;
    if ((cNorm.includes("3rd") || cNorm.includes("third")) && (vNorm.includes("third") || vNorm.includes("3rd"))) matches += 2;
    if ((cNorm.includes("4th") || cNorm.includes("fourth")) && (vNorm.includes("fourth") || vNorm.includes("4th"))) matches += 2;

    if (matches > 0 && matches > maxScore) {
      maxScore = matches;
      bestMatch = c;
    }
  }

  if (bestMatch) {
    return { id: bestMatch.id, cover_url: bestMatch.cover_url ?? undefined };
  }
  return null;
}

async function fetchRelationalFromSupabase(
  issueId: number,
  seriesName?: string,
  issueNumber?: string
): Promise<GcdRelationalData | null> {
  try {
    const supabase = createAdminServerClient();
    const cleanSeries = String(seriesName || "").trim().replace(/\s*\(\d{4}\)/g, "");
    const cleanIssue = String(issueNumber || "").trim().replace(/^#/, "");

    // 1. Fetch variant snapshots
    let snaps: any[] = [];
    if (cleanSeries && cleanIssue) {
      const { data } = await supabase
        .from("gcd_candidate_snapshots")
        .select("gcd_issue_id, variant_name, barcode, publication_date")
        .ilike("series_name", cleanSeries)
        .eq("issue_number", cleanIssue)
        .order("gcd_issue_id", { ascending: true });
      snaps = data || [];
    }

    const seenVar = new Set<number>();
    const dedupedVars: any[] = [];
    for (const v of snaps) {
      if (!seenVar.has(v.gcd_issue_id)) {
        seenVar.add(v.gcd_issue_id);
        dedupedVars.push(v);
      }
    }

    // Map comics catalog records to variants for direct catalog links and authentic covers
    const { data: comicsList } = await supabase
      .from("pp_comics")
      .select("id, title, variant, gcd_issue_id, cover_url")
      .ilike("title", `%${cleanSeries}%#${cleanIssue}%`);

    const variants: GcdVariantItem[] = dedupedVars.map((v) => {
      const isBase = v.gcd_issue_id === issueId;
      const matched = matchVariantToCatalogComic(v.variant_name || "", isBase, comicsList || []);
      const parsedArtist = parseArtistFromVariantName(v.variant_name);
      return {
        id: v.gcd_issue_id,
        issueNumber: cleanIssue || "1",
        variantName: v.variant_name || `Variant #${v.gcd_issue_id}`,
        price: "",
        barcode: v.barcode || "",
        publicationDate: v.publication_date || "",
        coverArtist: parsedArtist || undefined,
        catalogId: matched?.id || undefined,
        coverUrl: matched?.cover_url || undefined,
      };
    });

    // 2. Fetch multi-act stories and credits from ppcf_gcd_stories
    const targetGcdIds = Array.from(new Set([issueId, ...dedupedVars.map((v) => v.gcd_issue_id)]));
    const { data: storiesData } = await supabase
      .from("ppcf_gcd_stories")
      .select("*")
      .in("gcd_issue_id", targetGcdIds)
      .order("sequence_number", { ascending: true });

    // Deduplicate stories by sequence_number, preferring non-empty title/synopsis
    const storyBySeq = new Map<number, any>();
    for (const st of storiesData || []) {
      const existing = storyBySeq.get(st.sequence_number);
      if (!existing || (!existing.synopsis && st.synopsis) || (!existing.title && st.title)) {
        storyBySeq.set(st.sequence_number, st);
      }
    }

    const stories: GcdStoryItem[] = [];
    const writersSet = new Set<string>();
    const pencilersSet = new Set<string>();
    const inkersSet = new Set<string>();
    const coloristsSet = new Set<string>();
    const letterersSet = new Set<string>();
    const editorsSet = new Set<string>();
    const coverArtistsSet = new Set<string>();

    Array.from(storyBySeq.values())
      .sort((a, b) => a.sequence_number - b.sequence_number)
      .forEach((s) => {
        const credits: GcdCreatorCredit[] = [];
        const addCr = (role: string, val: string, set: Set<string>) => {
          if (!val) return;
          val.split(";").map((x) => x.trim()).filter(Boolean).forEach((name) => {
            set.add(name);
            credits.push({ role, name });
          });
        };

        addCr("Writer", s.script, writersSet);
        addCr("Penciler", s.pencils, pencilersSet);
        addCr("Inker", s.inks, inkersSet);
        addCr("Colorist", s.colors, coloristsSet);
        addCr("Letterer", s.letters, letterersSet);
        addCr("Editor", s.editing, editorsSet);

        if (s.sequence_number === 0 && s.pencils) {
          s.pencils.split(";").map((x: string) => x.trim()).filter(Boolean).forEach((ca: string) => coverArtistsSet.add(ca));
        }

        stories.push({
          id: s.gcd_story_id || s.sequence_number,
          title: s.title || (s.sequence_number === 0 ? "Cover Gallery" : `Sequence #${s.sequence_number}`),
          sequenceNumber: s.sequence_number,
          pageCount: Number(s.page_count) || 0,
          characters: s.characters || "",
          synopsis: s.synopsis || "",
          credits,
        });
      });

    return {
      baseIssueId: issueId,
      seriesName: cleanSeries,
      issueNumber: cleanIssue,
      publicationDate: "",
      variants,
      foreignEditions: [],
      stories,
      issueCredits: Array.from(editorsSet).map((name) => ({ role: "Editor", name })),
      allWriters: Array.from(writersSet),
      allPencilers: Array.from(pencilersSet),
      allInkers: Array.from(inkersSet),
      allColorists: Array.from(coloristsSet),
      allLetterers: Array.from(letterersSet),
      allEditors: Array.from(editorsSet),
      allCoverArtists: Array.from(coverArtistsSet),
    };
  } catch (err) {
    console.warn("fetchRelationalFromSupabase failed:", err);
    return null;
  }
}

const SSB01_CANONICAL_VARIANTS: GcdVariantItem[] = [
  { id: 1975956, issueNumber: "1", variantName: "Tradd Moore", price: "$3.99", barcode: "75960609330400111", publicationDate: "August 2019", coverArtist: "Tradd Moore", catalogId: "SSB01", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/5c/5cdb44057b81adcf372a0d3e42d23c112d98c47f5b06ca093f76d07510b697c1.webp" },
  { id: 1978163, issueNumber: "1", variantName: "Second Printing - Mike Deodato Spoiler Cover", price: "$3.99", barcode: "75960609330400112", publicationDate: "August 2019", coverArtist: "Mike Deodato", catalogId: "3669674", coverUrl: "https://storage.googleapis.com/panel-profits-covers-all/Pictures/M/Marvel/S/Silver%20Surfer-%20Black/1-2.jpg" },
  { id: 1997390, issueNumber: "1", variantName: "Third Printing - Tradd Moore", price: "$3.99", barcode: "75960609330400113", publicationDate: "September 2019", coverArtist: "Tradd Moore", catalogId: "3669669", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/37/37f35e0c0c2e8d4f95057cfa11f6183d98abcba08e4bdbf3e98942ce1ceb5b23.jpg" },
  { id: 2009682, issueNumber: "1", variantName: "Ron Lim", price: "$3.99", barcode: "75960609330400121", publicationDate: "August 2019", coverArtist: "Ron Lim", catalogId: "3669689", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/ee/eee2760fa4cfaadaaffe05eedf772f5c8ec88828a97128679d48c7266ff10724.jpg" },
  { id: 2009992, issueNumber: "1", variantName: "Blank Cover", price: "$3.99", barcode: "75960609330400199", publicationDate: "August 2019", coverArtist: "Blank", catalogId: "3669680", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/9c/9c816d4e43883becfd1b125331ec9f95c27c134f5450d51e11178ee0bfe26812.webp" },
  { id: 2010737, issueNumber: "1", variantName: "Mike Zeck 'Hidden Gem'", price: "$3.99", barcode: "75960609330400141", publicationDate: "August 2019", coverArtist: "Mike Zeck", catalogId: "3669677", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/05/0546d4fac460cf47deabaa9c582a5772aec47a10d301ddff6663cb2aec1a1c3c.webp" },
  { id: 2010738, issueNumber: "1", variantName: "Nick Bradshaw Virgin Art", price: "$3.99", barcode: "75960609330400171", publicationDate: "August 2019", coverArtist: "Nick Bradshaw", catalogId: "3669678", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/93/93d66dc33a9b45d2c5b482f3d33034944cd3fb8d62ada5c46e27b9fd4499be08.webp" },
  { id: 2012168, issueNumber: "1", variantName: "Fourth Printing - Tradd Moore", price: "$3.99", barcode: "75960609330400114", publicationDate: "October 2019", coverArtist: "Tradd Moore", catalogId: "3669665", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/88/8876f793b55f2f558786602347d789b0744deb5356f098de499e472807a2ab0c.jpg" },
  { id: 2016548, issueNumber: "1", variantName: "Nick Bradshaw", price: "$3.99", barcode: "75960609330400131", publicationDate: "August 2019", coverArtist: "Nick Bradshaw", catalogId: "3669676", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/97/973999db41d13d28baa710a4f893d27b9ee60e7d68ee1a4e8143f95db9f052e8.webp" },
  { id: 2019575, issueNumber: "1", variantName: "Gerald Parel Cover", price: "$3.99", barcode: "75960609330400151", publicationDate: "August 2019", coverArtist: "Gerald Parel", catalogId: "3669675", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/4c/4c248aea002b6c4278b25431e71ea75bcba4ff1aa91f75dc1200cf0b1db8bead.jpg" },
  { id: 2019997, issueNumber: "1", variantName: "Shattered Variant Matt DiMasi", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Matt DiMasi", catalogId: "3669697", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/0e/0ef2107a0cf5eeaa794a688a72fde200ad4536443771c15e0e4ff82034197681.webp" },
  { id: 2026201, issueNumber: "1", variantName: "Comics Elite Exclusive - Ryan Brown", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Ryan Brown", catalogId: "3669682", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/87/87866313df83e476551e96aed28eaa45df4ec672b62e7109ab2708d53525ad80.webp" },
  { id: 2026222, issueNumber: "1", variantName: "Kirby's Comic Art Exclusive - Gabriele Dell'Otto Virgin Art", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Gabriele Dell'Otto", catalogId: "3669691", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/ca/ca82a95e8552460863e6741f32d8205d25223a6ab98bcd2ac79c0838a95c4e2d.webp" },
  { id: 2026223, issueNumber: "1", variantName: "Unknown Comics Exclusive - Lucio Parrillo Virgin Art", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Lucio Parrillo", catalogId: "3669698", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/39/392fc4dcce03aace22089e5fbbc5bd7fa060389eeb9190f0f4059ff00a9d0579.webp" },
  { id: 2026224, issueNumber: "1", variantName: "Clover Press Exclusive - Gabriel Rodriguez", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Gabriel Rodriguez", catalogId: "3669681", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/ef/efa0299b262557396f07b3348753623ae84b11fb71b38a9f8794af4bf054c63e.webp" },
  { id: 2026751, issueNumber: "1", variantName: "IGComicstore Exclusive - Scott Williams Virgin Art", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Scott Williams", catalogId: "3669687", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/b5/b56336e0c82fa89293c3e3113115d18d814932d25cb684d2cc97d6253947e53e.jpg" },
  { id: 2026752, issueNumber: "1", variantName: "The Comic Mint Exclusive - Junggeun Yoon Color Splash", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Junggeun Yoon", catalogId: "3669695", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/8b/8b3d320e0844a2be982edeb2c6397bc8690d9cb8cd9f086f1041410449cda0fd.webp" },
  { id: 2026753, issueNumber: "1", variantName: "The Comic Mint Exclusive - Junggeun Yoon", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Junggeun Yoon", catalogId: "3669695", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/8b/8b3d320e0844a2be982edeb2c6397bc8690d9cb8cd9f086f1041410449cda0fd.webp" },
  { id: 2026754, issueNumber: "1", variantName: "Kirby's Comic Art Exclusive - Gabriele Dell'Otto", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Gabriele Dell'Otto", catalogId: "3669688", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/c7/c7ee129afb5a0d1ffec911d63a9822ec049fa4f7e408a3ea8f63e9e4ae24bfb4.webp" },
  { id: 2026755, issueNumber: "1", variantName: "Comics Elite Exclusive - Ryan Brown Virgin Art", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Ryan Brown", catalogId: "3669683", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/5f/5fc76fad11feced522819fc3f1101fa752985c87bc37782c1c90b4538c6df105.webp" },
  { id: 2026899, issueNumber: "1", variantName: "Scorpion Comics Exclusive - Clayton Crain Virgin Art", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Clayton Crain", catalogId: "3669692", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/7c/7c121c5b9ed9e1ff69259b9272fefe48ce2a1c091be2773bc0aa8a020b8bfbb2.webp" },
  { id: 2026900, issueNumber: "1", variantName: "Joe Jusko Virgin Art", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Joe Jusko", catalogId: "8469841", coverUrl: "https://storage.googleapis.com/panel-profits-covers-all/Pictures/M/Marvel/S/Silver%20Surfer-%20Black/1.jpg" },
  { id: 2026901, issueNumber: "1", variantName: "Unknown Comics Exclusive - Lucio Parrillo", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Lucio Parrillo", catalogId: "3669696", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/75/75931cdf47024eeba362345a0f096292bc1e584af5c8e620ad704fdfdcedd080.webp" },
  { id: 2026902, issueNumber: "1", variantName: "IGComicstore Exclusive - Scott Williams", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Scott Williams", catalogId: "3669685", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/35/35cf3f7967a8fe42d02a556bfde6c2a5a2ea6f4b93608f9639743c974b060ade.jpg" },
  { id: 2026903, issueNumber: "1", variantName: "The Comic Mint Exclusive - Junggeun Yoon Virgin Art", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Junggeun Yoon", catalogId: "3669694", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/54/54c4fdc4b14728175beca937fdd8f8736f39240299a6a5401e037043f582f24d.webp" },
  { id: 2026905, issueNumber: "1", variantName: "Scorpion Comics Exclusive - Clayton Crain", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Clayton Crain", catalogId: "3669699", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/b5/b545a47e30d9c0c678fdff8d5167e42ecf03781c7b577b4ae0cc7c9617ea8314.webp" },
  { id: 2026906, issueNumber: "1", variantName: "Adi Granov", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Adi Granov", catalogId: "3669679", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/b6/b6b883b2a9f1947bac4e8bfabc2b308fda4c2fbd1fe71eac774726717cf58780.webp" },
  { id: 2026907, issueNumber: "1", variantName: "Joe Jusko", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Joe Jusko", catalogId: "3669690", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/43/437a2cf9d7384db98e1c654b37d4c03e60db7186d87a824669f8880bd6c07658.webp" },
];

/**
 * Resolves full GCD relational tree: all variant covers, foreign editions,
 * story sequences, and creator rolls for any comic issue.
 */
export async function getGcdRelationalData(
  gcdIssueId: string | number | null,
  seriesName?: string,
  issueNumber?: string
): Promise<GcdRelationalData | null> {
  const isSsb01 =
    (gcdIssueId === 1975956 || gcdIssueId === "1975956" || gcdIssueId === "2412811") ||
    (/Silver Surfer.*Black/i.test(seriesName || "") && String(issueNumber || "").replace(/^#/, "") === "1");

  const cacheKey = `${gcdIssueId || ""}_${(seriesName || "").toLowerCase()}_${issueNumber || ""}`;
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey) || null;
  }

  if (isSsb01) {
    const ssbResult: GcdRelationalData = {
      baseIssueId: 1975956,
      seriesName: "Silver Surfer: Black",
      issueNumber: "1",
      publicationDate: "August 2019",
      variants: SSB01_CANONICAL_VARIANTS,
      foreignEditions: [],
      stories: [],
      issueCredits: [],
      allWriters: ["Donny Cates"],
      allPencilers: ["Tradd Moore"],
      allInkers: ["Tradd Moore"],
      allColorists: ["Dave Stewart"],
      allLetterers: ["Clayton Cowles"],
      allEditors: ["Lauren Amaro", "Devin Lewis"],
      allCoverArtists: ["Tradd Moore", "Mike Deodato", "Ron Lim", "Nick Bradshaw", "Peach Momoko", "Gabriele Dell'Otto"],
    };
    memoryCache.set(cacheKey, ssbResult);
    return ssbResult;
  }

  const numIdParsed = typeof gcdIssueId === "string" ? parseInt(gcdIssueId, 10) : (gcdIssueId || 0);

  // Supabase is the only source (local GCD SQLite dump and bundled pp115k.sqlite paths removed).
  const sbResult = await fetchRelationalFromSupabase(numIdParsed, seriesName, issueNumber);
  memoryCache.set(cacheKey, sbResult);
  return sbResult;
}
