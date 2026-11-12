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
  issueNumber?: string,
  publicationYear?: number | null
): Promise<GcdRelationalData | null> {
  try {
    const supabase = createAdminServerClient();
    const cleanSeries = String(seriesName || "").trim().replace(/\s*\(\d{4}\)/g, "");
    const cleanIssue = String(issueNumber || "").trim().replace(/^#/, "");
    const yearMatchFromSeries = String(seriesName || "").match(/\((\d{4})\)/);
    const targetYear = publicationYear || (yearMatchFromSeries ? parseInt(yearMatchFromSeries[1], 10) : null);

    // 1. Fetch variant snapshots
    let snaps: any[] = [];
    if (cleanSeries && cleanIssue) {
      const { data } = await supabase
        .from("gcd_candidate_snapshots")
        .select("gcd_issue_id, variant_name, barcode, publication_date")
        .ilike("series_name", cleanSeries)
        .eq("issue_number", cleanIssue)
        .order("gcd_issue_id", { ascending: true });
      snaps = (data || []).filter((v) => {
        if (!targetYear) return true;
        if (v.gcd_issue_id === issueId) return true;
        const pDate = String(v.publication_date || "");
        const yMatch = pDate.match(/\b(19\d{2}|20\d{2})\b/);
        if (!yMatch) return false;
        return Math.abs(parseInt(yMatch[1], 10) - targetYear) <= 1;
      });
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
    let comicsQuery = supabase
      .from("pp_comics")
      .select("id, title, variant, gcd_issue_id, cover_url, publication_year")
      .ilike("title", `%${cleanSeries}%#${cleanIssue}%`);
    if (targetYear) {
      comicsQuery = comicsQuery.eq("publication_year", targetYear);
    }
    const { data: comicsList } = await comicsQuery;

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

export const SSB01_CANONICAL_VARIANTS: GcdVariantItem[] = [
  { id: 1975956, issueNumber: "1", variantName: "Tradd Moore", price: "$3.99", barcode: "75960609330400111", publicationDate: "August 2019", coverArtist: "Tradd Moore", catalogId: "SSB01", coverUrl: "https://static.wikia.nocookie.net/marveldatabase/images/9/99/Silver_Surfer_Black_Vol_1_1.jpg" },
  { id: 1978163, issueNumber: "1", variantName: "Second Printing - Mike Deodato Spoiler Cover", price: "$3.99", barcode: "75960609330400112", publicationDate: "August 2019", coverArtist: "Mike Deodato", catalogId: "3669674", coverUrl: "https://static.wikia.nocookie.net/marveldatabase/images/8/8e/Silver_Surfer_Black_Vol_1_1_Second_Printing_Variant.jpg" },
  { id: 1997390, issueNumber: "1", variantName: "Third Printing - Tradd Moore", price: "$3.99", barcode: "75960609330400113", publicationDate: "September 2019", coverArtist: "Tradd Moore", catalogId: "3669669", coverUrl: "https://static.wikia.nocookie.net/marveldatabase/images/8/8b/Silver_Surfer_Black_Vol_1_1_Third_Printing_Variant.jpg" },
  { id: 2009682, issueNumber: "1", variantName: "Ron Lim", price: "$3.99", barcode: "75960609330400121", publicationDate: "August 2019", coverArtist: "Ron Lim", catalogId: "3669689", coverUrl: "https://static.wikia.nocookie.net/marveldatabase/images/1/11/Silver_Surfer_Black_Vol_1_1_Lim_Variant.jpg" },
  { id: 2009992, issueNumber: "1", variantName: "Blank Cover", price: "$3.99", barcode: "75960609330400199", publicationDate: "August 2019", coverArtist: "Blank", catalogId: "3669680", coverUrl: "https://storage.googleapis.com/panel-profits-covers-all/Pictures/M/Marvel/S/Silver%20Surfer-%20Black/1-D.jpg" },
  { id: 2010737, issueNumber: "1", variantName: "Mike Zeck 'Hidden Gem'", price: "$3.99", barcode: "75960609330400141", publicationDate: "August 2019", coverArtist: "Mike Zeck", catalogId: "3669677", coverUrl: "https://static.wikia.nocookie.net/marveldatabase/images/8/8b/Silver_Surfer_Black_Vol_1_1_Hidden_Gem_Variant.jpg" },
  { id: 2010738, issueNumber: "1", variantName: "Nick Bradshaw Virgin Art", price: "$3.99", barcode: "75960609330400171", publicationDate: "August 2019", coverArtist: "Nick Bradshaw", catalogId: "3669678", coverUrl: "https://static.wikia.nocookie.net/marveldatabase/images/9/9c/Silver_Surfer_Black_Vol_1_1_Bradshaw_Virgin_Variant.jpg" },
  { id: 2012168, issueNumber: "1", variantName: "Fourth Printing - Tradd Moore", price: "$3.99", barcode: "75960609330400114", publicationDate: "October 2019", coverArtist: "Tradd Moore", catalogId: "3669665", coverUrl: "https://static.wikia.nocookie.net/marveldatabase/images/c/cd/Silver_Surfer_Black_Vol_1_1_Fourth_Printing_Variant.jpg" },
  { id: 2016548, issueNumber: "1", variantName: "Nick Bradshaw", price: "$3.99", barcode: "75960609330400131", publicationDate: "August 2019", coverArtist: "Nick Bradshaw", catalogId: "3669676", coverUrl: "https://static.wikia.nocookie.net/marveldatabase/images/a/a3/Silver_Surfer_Black_Vol_1_1_Bradshaw_Variant.jpg" },
  { id: 2019575, issueNumber: "1", variantName: "Gerald Parel Cover", price: "$3.99", barcode: "75960609330400151", publicationDate: "August 2019", coverArtist: "Gerald Parel", catalogId: "3669675", coverUrl: "https://static.wikia.nocookie.net/marveldatabase/images/a/a6/Silver_Surfer_Black_Vol_1_1_Parel_Variant.jpg" },
  { id: 2019997, issueNumber: "1", variantName: "Shattered Variant Matt DiMasi", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Matt DiMasi", catalogId: "3669697", coverUrl: "https://static.wikia.nocookie.net/marveldatabase/images/9/98/Silver_Surfer_Black_Vol_1_1_Shattered_Comics_Exclusive_Variant.jpg" },
  { id: 2026201, issueNumber: "1", variantName: "Comics Elite Exclusive - Ryan Brown", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Ryan Brown", catalogId: "3669682", coverUrl: "https://static.wikia.nocookie.net/marveldatabase/images/5/5d/Silver_Surfer_Black_Vol_1_1_CK_Elite_Exclusive_Variant.jpg" },
  { id: 2026222, issueNumber: "1", variantName: "Kirby's Comic Art Exclusive - Gabriele Dell'Otto Virgin Art", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Gabriele Dell'Otto", catalogId: "3669691", coverUrl: "https://storage.googleapis.com/panel-profits-covers-all/Pictures/M/Marvel/S/Silver%20Surfer-%20Black/1-C.jpg" },
  { id: 2026223, issueNumber: "1", variantName: "Unknown Comics Exclusive - Lucio Parrillo Virgin Art", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Lucio Parrillo", catalogId: "3669698", coverUrl: "https://storage.googleapis.com/panel-profits-covers-all/Pictures/M/Marvel/S/Silver%20Surfer-%20Black/1-E.jpg" },
  { id: 2026224, issueNumber: "1", variantName: "Clover Press Exclusive - Gabriel Rodriguez", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Gabriel Rodriguez", catalogId: "3669681", coverUrl: "https://static.wikia.nocookie.net/marveldatabase/images/6/64/Silver_Surfer_Black_Vol_1_1_Rodriguez_Variant.jpg" },
  { id: 2026751, issueNumber: "1", variantName: "IGComicstore Exclusive - Scott Williams Virgin Art", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Scott Williams", catalogId: "3669687", coverUrl: "https://static.wikia.nocookie.net/marveldatabase/images/2/25/Silver_Surfer_Black_Vol_1_1_IGComicstore_Exclusive_Virgin_Variant.jpg" },
  { id: 2026752, issueNumber: "1", variantName: "The Comic Mint Exclusive - Junggeun Yoon Color Splash", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Junggeun Yoon", catalogId: "3669693", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/e9/e942791fb6338603d1cf2eca14266add6338b50e9fda660d0a17e8667b666a32.jpg" },
  { id: 2026753, issueNumber: "1", variantName: "The Comic Mint Exclusive - Junggeun Yoon", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Junggeun Yoon", catalogId: "3669695", coverUrl: "https://thecomicmint.com/cdn/shop/products/58686642_412604055985587_5166621743262990336_n_600x.jpg?v=1579643937" },
  { id: 2026754, issueNumber: "1", variantName: "Kirby's Comic Art Exclusive - Gabriele Dell'Otto", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Gabriele Dell'Otto", catalogId: "3669688", coverUrl: "https://storage.googleapis.com/panel-profits-covers-all/Pictures/M/Marvel/S/Silver%20Surfer-%20Black/1-B.jpg" },
  { id: 2026755, issueNumber: "1", variantName: "Comics Elite Exclusive - Ryan Brown Virgin Art", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Ryan Brown", catalogId: "3669683", coverUrl: "https://static.wikia.nocookie.net/marveldatabase/images/d/de/Silver_Surfer_Black_Vol_1_1_CK_Elite_Exclusive_Virgin_Variant.jpg" },
  { id: 2026899, issueNumber: "1", variantName: "Scorpion Comics Exclusive - Clayton Crain Virgin Art", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Clayton Crain", catalogId: "3669692", coverUrl: "https://static.wikia.nocookie.net/marveldatabase/images/b/bd/Silver_Surfer_Black_Vol_1_1_Scorpion_Comics_Exclusive_Virgin_Variant.jpg" },
  { id: 2026900, issueNumber: "1", variantName: "Joe Jusko Virgin Art", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Joe Jusko", catalogId: "8469841", coverUrl: "https://static.wikia.nocookie.net/marveldatabase/images/4/45/Silver_Surfer_Black_Vol_1_1_Jusko_Virgin_Variant.jpg" },
  { id: 2026901, issueNumber: "1", variantName: "Unknown Comics Exclusive - Lucio Parrillo", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Lucio Parrillo", catalogId: "3669696", coverUrl: "https://storage.googleapis.com/panel-profits-covers-all/Pictures/M/Marvel/S/Silver%20Surfer-%20Black/1-G.jpg" },
  { id: 2026902, issueNumber: "1", variantName: "IGComicstore Exclusive - Scott Williams", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Scott Williams", catalogId: "3669685", coverUrl: "https://static.wikia.nocookie.net/marveldatabase/images/0/06/Silver_Surfer_Black_Vol_1_1_IGComicstore_Exclusive_Variant.jpg" },
  { id: 2026903, issueNumber: "1", variantName: "The Comic Mint Exclusive - Junggeun Yoon Virgin Art", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Junggeun Yoon", catalogId: "3669694", coverUrl: "https://thecomicmint.com/cdn/shop/products/58686642_412604055985587_5166621743262990336_n_600x.jpg?v=1579643937" },
  { id: 2026905, issueNumber: "1", variantName: "Scorpion Comics Exclusive - Clayton Crain", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Clayton Crain", catalogId: "3669699", coverUrl: "https://static.wikia.nocookie.net/marveldatabase/images/2/29/Silver_Surfer_Black_Vol_1_1_Scorpion_Comics_Exclusive_Variant.jpg" },
  { id: 2026906, issueNumber: "1", variantName: "Adi Granov", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Adi Granov", catalogId: "3669679", coverUrl: "https://storage.googleapis.com/panel-profits-covers-all/Pictures/M/Marvel/S/Silver%20Surfer-%20Black/1-s.jpg" },
  { id: 2026907, issueNumber: "1", variantName: "Joe Jusko", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Joe Jusko", catalogId: "3669690", coverUrl: "https://static.wikia.nocookie.net/marveldatabase/images/1/18/Silver_Surfer_Black_Vol_1_1_Jusko_Variant.jpg" },
];

export const ASM01_1963_CANONICAL_VARIANTS: GcdVariantItem[] = [
  {
    id: 17568,
    issueNumber: "1",
    variantName: "12¢ US Edition",
    price: "$0.12",
    barcode: "",
    publicationDate: "March 1963",
    coverArtist: "Jack Kirby & Steve Ditko",
    catalogId: "2314818",
    coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/b0/b0f13fadb94c64011c6ae2e709d2a50f7c0062f224db83f070c30535e1db0ec9.jpg",
  },
  {
    id: 1756809,
    issueNumber: "1",
    variantName: "9d British Pence Variant",
    price: "9d",
    barcode: "",
    publicationDate: "March 1963",
    coverArtist: "Jack Kirby & Steve Ditko",
    coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/uk/asm1_1963_9d_british_pence_variant.jpg",
  },
];

/**
 * Resolves full GCD relational tree: all variant covers, foreign editions,
 * story sequences, and creator rolls for any comic issue.
 */
export async function getGcdRelationalData(
  gcdIssueId: string | number | null,
  seriesName?: string,
  issueNumber?: string,
  publicationYear?: number | null
): Promise<GcdRelationalData | null> {
  const isSsb01 =
    (gcdIssueId === 1975956 || gcdIssueId === "1975956" || gcdIssueId === "2412811") ||
    (/Silver Surfer.*Black/i.test(seriesName || "") && String(issueNumber || "").replace(/^#/, "") === "1");

  const yearMatch = String(seriesName || "").match(/\((\d{4})\)/);
  const resolvedYear = publicationYear || (yearMatch ? parseInt(yearMatch[1], 10) : null);
  const isAsm01_1963 =
    gcdIssueId === 17568 ||
    gcdIssueId === "17568" ||
    gcdIssueId === "2314818" ||
    (/^(?:The\s+)?Amazing Spider-Man/i.test(String(seriesName || "").replace(/\s*\(\d{4}\)/g, "").trim()) &&
      String(issueNumber || "").replace(/^#/, "") === "1" &&
      (!resolvedYear || resolvedYear === 1963));

  const cacheKey = `${gcdIssueId || ""}_${(seriesName || "").toLowerCase()}_${issueNumber || ""}_${resolvedYear || ""}`;
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
      allEditors: ["Darren Shan", "Lauren Amaro", "Danny Khazem"],
      allCoverArtists: [
        "Tradd Moore",
        "Mike Deodato",
        "Ron Lim",
        "Mike Zeck",
        "Nick Bradshaw",
        "Gerald Parel",
        "Matt DiMasi",
        "Ryan Brown",
        "Gabriele Dell'Otto",
        "Lucio Parrillo",
        "Gabriel Rodriguez",
        "Scott Williams",
        "Junggeun Yoon",
        "Clayton Crain",
        "Joe Jusko",
        "Adi Granov",
      ],
    };
    memoryCache.set(cacheKey, ssbResult);
    return ssbResult;
  }

  const numIdParsed = typeof gcdIssueId === "string" ? parseInt(gcdIssueId, 10) : (gcdIssueId || 0);

  // Supabase is the only source (local GCD SQLite dump and bundled pp115k.sqlite paths removed).
  const sbResult = await fetchRelationalFromSupabase(numIdParsed, seriesName, issueNumber, resolvedYear);
  if (isAsm01_1963 && sbResult) {
    sbResult.baseIssueId = 17568;
    sbResult.publicationDate = "March 1963";
    sbResult.variants = ASM01_1963_CANONICAL_VARIANTS;
    sbResult.allCoverArtists = ["Jack Kirby", "Steve Ditko"];
  }
  memoryCache.set(cacheKey, sbResult);
  return sbResult;
}
