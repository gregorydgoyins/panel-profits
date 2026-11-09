import { masterAgeFromYear } from "@/lib/eras/master-age-table";
import { ComicEra, GradingCompany, SniperFilterProfile } from "./types";

// Blacklisted keywords that immediately disqualify a listing as modern reprint / toy / giveaway
const REPRINT_REJECTIONS = [
  "facsimile",
  "reprint",
  "replica",
  "tribute edition",
  "golden record",
  "true believers",
  "millennium edition",
  "free comic book day",
  "fcbd",
  "pocket digest",
  "digest size",
  "mini comic",
  "mini-comic",
  "giveaway",
  "halloween comicfest",
  "loot crate",
  "marvel legends pack-in",
  "newspaper insert",
  "poster book",
  "sample",
];

// Deceased & Legendary comic creators whose verified signatures command permanent premium
export const LEGENDARY_CREATORS = [
  "stan lee",
  "jack kirby",
  "steve ditko",
  "george perez",
  "george pérez",
  "neal adams",
  "bernie wrightson",
  "john buscema",
  "len wein",
  "carmine infantino",
  "joe kubert",
  "dave cockrum",
  "curt swan",
  "jim aparo",
  "tim sale",
  "kevin o'neill",
];

// Misspelled Comic Title Patterns (Stealth typos that hide listings from general buyer searches)
export const MISSPELLED_PATTERNS: Array<{ pattern: RegExp; correct: string }> = [
  { pattern: /\b(spidre-?man|spidermn)\b/i, correct: "Spider-Man" },
  { pattern: /\b(wolvarine|wovlerine|wolverine\s*#?\s*1(?=.*wovle))\b/i, correct: "Wolverine" },
  { pattern: /\b(xmne|x-mmen)\b/i, correct: "X-Men" },
  { pattern: /\b(batmn)\b/i, correct: "Batman" },
  { pattern: /\b(supermna|sperman)\b/i, correct: "Superman" },
  { pattern: /\b(avangers|advengers)\b/i, correct: "Avengers" },
  { pattern: /\b(carnge)\b/i, correct: "Carnage" },
  { pattern: /\b(spawnn)\b/i, correct: "Spawn" },
  { pattern: /\b(mcfarlen|mcfarland)\b/i, correct: "McFarlane" },
  { pattern: /\b(fantatsic|fatastic)\b/i, correct: "Fantastic" },
  { pattern: /\b(punsiher|punshier)\b/i, correct: "Punisher" },
  { pattern: /\b(catwman)\b/i, correct: "Catwoman" },
  { pattern: /\b(daredevl)\b/i, correct: "Daredevil" },
  { pattern: /\b(dective\s*comics|detectve)\b/i, correct: "Detective Comics" },
  { pattern: /\b(action\s*comcs)\b/i, correct: "Action Comics" },
  { pattern: /\b(invisable)\b/i, correct: "Invisible" },
];

export const CRACKED_CASE_REGEX = /\b(crack(?:ed)?\s*(?:case|slab|holder|plastic|corner|shell|casing)|scuff(?:ed)?\s*(?:case|slab|holder)|reholder\s*(?:candidate|play)?|scratched\s*(?:holder|case|slab)|broken\s*(?:case|holder|slab|shell)|damaged\s*(?:slab|case|holder|shell)|(?:case|holder|slab)\s*(?:crack|damage|scuff|chip)|chipped\s*(?:case|holder|slab|corner)|crack\s+in\s+(?:case|holder|slab))\b/i;

export const FOREIGN_TITLE_TRANSLATIONS: Record<string, string> = {
  "l'araignee": "The Amazing Spider-Man",
  "l'araignée": "The Amazing Spider-Man",
  "les vengeurs": "The Avengers",
  "serval": "Wolverine",
  "l'incroyable hulk": "The Incredible Hulk",
  "les quatre fantastiques": "Fantastic Four",
  "le chevalier noir": "Batman",
  "special strange": "Special Strange (Marvel France - Lug)",
  "spécial strange": "Special Strange (Marvel France - Lug)",
  "die spinne": "The Amazing Spider-Man",
  "die rächer": "The Avengers",
  "die racher": "The Avengers",
  "die fantastischen vier": "Fantastic Four",
  "der eiserne": "Iron Man",
};

export const CPV_REGEX = /\b(cpv|canadian\s*price\s*variant|canadian\s*edition|75[¢c]\s*cpv|95[¢c]\s*cpv|\$1(?:\.00)?\s*cpv)\b/i;
export const CANADIAN_HEROES_REGEX = /\b(alpha\s*flight|captain\s*canuck|nelvana)\b/i;

export function formatComicSeriesTitleCase(raw: string): string {
  if (!raw) return raw;
  const trimmed = raw.trim();
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 2) {
    const lowerWords = new Set(["and", "the", "of", "in", "on", "a", "an", "to", "for", "by", "with", "into"]);
    const upperTokens = new Set(["II", "III", "IV", "VI", "VII", "VIII", "IX", "DC", "JLA", "JSA", "GI", "G.I.", "TMNT"]);
    return trimmed
      .split(/\s+/)
      .map((word, idx) => {
        const upper = word.toUpperCase();
        if (upperTokens.has(upper)) return upper;
        if (word.includes("-")) {
          return word
            .split("-")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join("-");
        }
        if (word.includes("/")) {
          return word
            .split("/")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join("/");
        }
        const low = word.toLowerCase();
        if (idx > 0 && lowerWords.has(low)) return low;
        return low.charAt(0).toUpperCase() + low.slice(1);
      })
      .join(" ");
  }
  return trimmed;
}

export function normalizeAuctionTitle(rawTitle: string): string {
  if (!rawTitle) return "Unknown Comic";

  let title = rawTitle;

  // 1. Remove prominent noise and seller spam tags
  title = title
    .replace(/\b(?:1\s*of\s*only\s*\d+\s*on\s*census!?|highest\s*graded|boston\s*pedigree!?|white\s*pages|off-white|pages)\b/gi, "")
    .replace(/\b(?:hot!?|key!?|rare!?|grail!?|l@@k|look!?|wow!?|must\s*see!?|invest!?)\b/gi, "")
    .replace(/\b(?:lot\s*[a-z0-9]|lot\s*#?\d+)\b/gi, "")
    .replace(/\b(?:nm\/?m?|vf\/?nm?|fn\/?vf?|vg\/?fn?|gd\/?vg?|fn|vg|gd|pr)[+\-]*(?!\w)/gi, "")
    .replace(/\b(?:cgc|cbcs|pgx)\s*(?:10(?:\.0)?|9\.[0-9]|8\.[0-9]|7\.[0-9]|6\.[0-9]|5\.[0-9]|4\.[0-9]|3\.[0-9]|2\.[0-9]|1\.[0-9]|0\.5)\b/gi, "")
    .replace(/[-*•~_]{2,}/g, " ")
    .replace(/[*•~]+/g, " ");

  // 2. Remove prefixes & weird punctuation (preserving "Marvel Comics Presents" and "DC Comics Presents")
  title = title
    .replace(/^Marvel Comic(?!s?\s+Presents)\s+/i, "")
    .replace(/^DC(?!\s+Comics\s+Presents)\s+/i, "")
    .replace(/\s*-\s*Supe$/i, "")
    .replace(/\s*\((?:19|20)\d{2}[^)]*\)/g, "")
    .replace(/\s*,\s*19\d{2}\b/g, "")
    .replace(/\s*,\s*20\d{2}\b/g, "")
    .replace(/\s*-\s*$/i, "")
    .replace(/#\s+/g, "#");

  // 2b. Un-invert ", THE" / ", A" / ", AN" before issue #
  title = title.replace(/^([a-zA-Z0-9\s:'.\-&+/]+?),\s*(the|a|an)\b(?=\s*(?:#|no\.|\d|$))/i, "$2 $1");

  // 3. Fix merged text e.g. "halo:uprising#2" -> "Halo: Uprising #2"
  title = title.replace(/:([a-zA-Z])/g, ": $1");
  title = title.replace(/([a-zA-Z])#(\d+)/g, "$1 #$2");

  // 4. Clean trailing garbage & whitespace
  title = title
    .replace(/\s+/g, " ")
    .replace(/^[-*–—\s,]+|[-*–—\s,]+$/g, "")
    .trim();

  // 5. Title case if all-caps
  return formatComicSeriesTitleCase(title);
}

export interface TitleParseResult {
  isCertifiedSlab: boolean;
  gradingCompany: GradingCompany | null;
  grade: number | null;
  isReprintOrToy: boolean;
  reprintTrigger?: string;
  isDamagedSlab: boolean;
  isDamagedHolder: boolean;
  isCrackAndPressCandidate: boolean;
  isCrackedCase: boolean;
  isMisspelled: boolean;
  misspellingSnippet?: string;
  normalizedTitle: string;
  isNewsstand: boolean;
  isConvention: boolean;
  isSigned: boolean;
  signatureCount: number;
  isLegendarySigned: boolean;
  signer?: string;
  certNumber?: string;
  certLookupUrl?: string;
  extractedSeries: string;
  extractedIssue: string;
  extractedYear?: number;
  extractedEra: ComicEra;
  isCanadianPriceVariant: boolean;
  isCanadianSuperhero: boolean;
  isForeignLanguageEdition: boolean;
  translatedEnglishTitle?: string;
}

export function parseAndFilterListing(
  title: string,
  description: string = "",
  graderNotes: string = ""
): TitleParseResult {
  const fullText = `${title} ${description} ${graderNotes}`.toLowerCase();

  // 1. Check for Reprints / Mini-comics / Giveaways
  let isReprintOrToy = false;
  let reprintTrigger: string | undefined;

  for (const term of REPRINT_REJECTIONS) {
    if (fullText.includes(term)) {
      isReprintOrToy = true;
      reprintTrigger = term;
      break;
    }
  }

  // 2. Certification & Grade Extraction (CGC / CBCS)
  let gradingCompany: GradingCompany | null = null;
  let grade: number | null = null;
  let isCertifiedSlab = false;

  if (/\bcgc\b/i.test(title)) {
    gradingCompany = "CGC";
    isCertifiedSlab = true;
  } else if (/\bcbcs\b/i.test(title)) {
    gradingCompany = "CBCS";
    isCertifiedSlab = true;
  } else if (/\bpsa\b/i.test(title)) {
    gradingCompany = "PSA";
    isCertifiedSlab = true;
  } else if (/\bpgx\b/i.test(title)) {
    gradingCompany = "PGX";
    isCertifiedSlab = true;
  } else if (/\b(?:egs|ega)\b/i.test(title)) {
    gradingCompany = "EGS";
    isCertifiedSlab = true;
  }

  // Extract Grade: e.g. 10, 9.9, 9.8, 9.6, 9.4, 9.2, 9.0, 8.5, or PSA 9 / CGC 9
  const slabGradeMatch = title.match(/\b(?:cgc|cbcs|psa|pgx|egs|ega)\s*([0-9](?:\.[0-9])?|10(?:\.0)?)\b/i);
  const generalGradeMatch = title.match(/\b(10(?:\.0)?|[1-9]\.[0-9]|0\.5)\b/);
  const rawGradeStr = slabGradeMatch ? slabGradeMatch[1] : (generalGradeMatch ? generalGradeMatch[1] : null);
  if (rawGradeStr) {
    grade = parseFloat(rawGradeStr);
  }

  // 2b. Extract Certification Number (CGC / CBCS / PSA / PGX / EGS cert #)
  let certNumber: string | undefined;
  let certLookupUrl: string | undefined;

  const certMatch = fullText.match(/\b(?:cert(?:ification)?|cgc|cbcs|psa|pgx|egs|ega)?\s*(?:#|no\.?|number)?\s*:?\s*([0-9]{5,10}(?:-[0-9]{3})?)\b/i);
  if (certMatch && certMatch[1] && certMatch[1].length >= 5) {
    certNumber = certMatch[1];
    const cleanCert = certNumber.replace(/[^0-9]/g, "");
    if (gradingCompany === "CBCS") {
      certLookupUrl = `https://www.cbcscomics.com/grading/verify-certification-number?cert_num=${cleanCert}`;
    } else if (gradingCompany === "PSA") {
      certLookupUrl = `https://www.psacard.com/cert/${cleanCert}`;
    } else if (gradingCompany === "PGX") {
      certLookupUrl = `https://pgxcomics.com/verify-cert/?cert=${cleanCert}`;
    } else if (gradingCompany === "EGS") {
      certLookupUrl = `https://egscomics.com/check-cert/?cert=${cleanCert}`;
    } else {
      // Default to CGC lookup
      certLookupUrl = `https://www.cgccomics.com/certlookup/${cleanCert}/`;
    }
  }

  // 3. Damaged Slab / Cracked Case / Damaged Holder Angle
  const isCrackedCase = CRACKED_CASE_REGEX.test(fullText);
  const isDamagedSlab = isCrackedCase;
  const isDamagedHolder = isCrackedCase;

  // Canadian Price Variant & Canadian Superhero Detection
  const isCanadianPriceVariant = CPV_REGEX.test(fullText);
  const isCanadianSuperhero = CANADIAN_HEROES_REGEX.test(fullText);

  // Foreign Language Title Translation
  let isForeignLanguageEdition = false;
  let translatedEnglishTitle: string | undefined;
  for (const [foreign, eng] of Object.entries(FOREIGN_TITLE_TRANSLATIONS)) {
    if (new RegExp(`\\b${foreign}\\b`, "i").test(fullText)) {
      isForeignLanguageEdition = true;
      translatedEnglishTitle = eng;
      break;
    }
  }

  // 3b. Misspelled Title Detection (Stealth typo sleeper play)
  let isMisspelled = false;
  let misspellingSnippet: string | undefined;

  for (const { pattern, correct } of MISSPELLED_PATTERNS) {
    const match = title.match(pattern);
    if (match) {
      isMisspelled = true;
      misspellingSnippet = `Listed as '${match[0]}' instead of '${correct}'`;
      break;
    }
  }

  // 4. Crack and Press Candidate Detection (pressable grader defects)
  const pressDefectRegex = /\b(non-color\s*breaking|light\s+bend|pressable|waviness|wavy\s+cover|finger\s+bend|light\s+indent|spine\s+roll|surface\s+dirt)\b/i;
  const isCrackAndPressCandidate = (grade !== null && grade >= 9.0 && grade <= 9.6) && pressDefectRegex.test(fullText);

  // 4b. Normalized Clean Title
  const normalizedTitle = normalizeAuctionTitle(title);

  // 5. Newsstand & Convention Edition Detection
  const isNewsstand = /\bnewsstand\b/i.test(fullText) || /\b(upc|barcode)\b/i.test(fullText);
  const isConvention = /\b(convention|con\s+exclusive|sdcc|nycc|eccc|c2e2)\b/i.test(fullText);

  // 6. Signature Detection & Multi-Sig Stacking
  let isSigned = false;
  let signatureCount = 0;
  let isLegendarySigned = false;
  let signer: string | undefined;

  const yellowLabel = /\b(signature\s+series|ss|yellow\s+label|gold\s+label|signed\s+by|signed|autographed)\b/i.test(fullText);
  if (yellowLabel) {
    isSigned = true;
    signatureCount = 1;
    // Check multi-sig counts in title/desc
    if (/\b(quad\s*signed|4x\s*signed|4\s*signatures|signed\s+by\s+4)\b/i.test(fullText)) {
      signatureCount = 4;
    } else if (/\b(triple\s*signed|3x\s*signed|3\s*signatures|signed\s+by\s+3)\b/i.test(fullText)) {
      signatureCount = 3;
    } else if (/\b(dual\s*signed|double\s*signed|2x\s*signed|2\s*signatures|signed\s+by\s+2)\b/i.test(fullText)) {
      signatureCount = 2;
    }

    for (const creator of LEGENDARY_CREATORS) {
      if (fullText.includes(creator)) {
        isLegendarySigned = true;
        signer = creator.toUpperCase();
        break;
      }
    }
  }

  // 7. Series & Issue Extraction
  let extractedSeries = "Unknown Series";
  let extractedIssue = "1";
  let extractedYear: number | undefined;

  // Clean title from emojis, leading punctuation, and grading badges
  let cleanTitle = title
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, " ")
    .replace(/\((?:19|20)\d{2}[^)]*\)/g, " ")
    .replace(/^[^a-zA-Z0-9]+/, "")
    .replace(/^(cgc|cbcs|psa|pgx)\s+(graded\s+)?(?:\d+\.?\d*\s+)?/i, "")
    .replace(/^(?:marvel\s+comics|dc\s+comics|image\s+comics)(?!\s+presents\b)\s*[-:]?\s*/i, "")
    .trim();

  // Un-invert ", THE" / ", A" / ", AN" before issue #
  cleanTitle = cleanTitle.replace(/^([a-zA-Z0-9\s:'.\-&+/]+?),\s*(the|a|an)\b(?=\s*(?:#|no\.|\d|$))/i, "$2 $1").trim();

  const cleanExtractedSeries = (raw: string): string => {
    let s = raw
      .replace(/\b(cgc|cbcs|pgx|psa)\b/gi, "")
      .replace(/\b(19\d{2}|20\d{2})\b/g, "")
      .replace(/\b(?:vol(?:\.|ume)?|v)\s*\d+\b/gi, "")
      .replace(/[\[\]\(\)\{\}]/g, "")
      .replace(/[-–—:,]+$/, "")
      .replace(/\s+/g, " ")
      .trim();
    if (/^x-?men:?\s+giant[- ]size$/i.test(s)) {
      s = "Giant-Size X-Men";
    }
    return formatComicSeriesTitleCase(s);
  };

  // Pattern A: Has '#' e.g. '#266', ' - #266', '# 266'
  const hashMatch = cleanTitle.match(/^([a-zA-Z0-9\s:'.\-&+/,]+?)\s*[-–—]?\s*#\s*([0-9]+[a-zA-Z]?(?:\.[0-9]+)?|1\/2|\u00bd)/i);
  if (hashMatch) {
    const rawSeries = cleanExtractedSeries(hashMatch[1]);
    if (rawSeries.length > 0) {
      extractedSeries = rawSeries;
    }
    extractedIssue = hashMatch[2];
  } else {
    // Pattern B: 'No. 128'
    const noMatch = cleanTitle.match(/^([a-zA-Z0-9\s:'.\-&+/,]+?)\s*[-–—]?\s*no\.\s*([0-9]+[a-zA-Z]?(?:\.[0-9]+)?)/i);
    if (noMatch) {
      const rawSeries = cleanExtractedSeries(noMatch[1]);
      if (rawSeries.length > 0) {
        extractedSeries = rawSeries;
      }
      extractedIssue = noMatch[2];
    } else {
      // Pattern C: Number preceded by series and followed by grade or descriptor (e.g. 'Batman 611 CGC 9.8' or 'Thor 373 CGC')
      const numMatch = cleanTitle.match(/^([a-zA-Z0-9\s:'.\-&+/,]+?)\s+(\d{1,4}[a-zA-Z]?)\b(?:\s+(?:cgc|cbcs|psa|pgx|\(?\d{4}\)?|nm|vf|white|newsstand|annual|variant))/i);
      if (numMatch) {
        const rawSeries = cleanExtractedSeries(numMatch[1]);
        if (rawSeries.length > 0) {
          extractedSeries = rawSeries;
        }
        extractedIssue = numMatch[2];
      }
    }
  }

  const issueNumVal = parseInt(extractedIssue, 10) || 1;

  // Extract publication year: distinguish exact single year "(1988)" from series run range "(1937-2011)"
  const exactYearParen = title.match(/\(\s*(19\d{2}|20\d{2})\s*\)/);
  const exactYearComma = title.match(/,\s*(19\d{2}|20\d{2})\b/);
  const rangeParen = title.match(/\(\s*(19\d{2}|20\d{2})\s*[-–]\s*(\d{2,4})?/);

  if (exactYearParen) {
    extractedYear = parseInt(exactYearParen[1], 10);
  } else if (exactYearComma) {
    extractedYear = parseInt(exactYearComma[1], 10);
  } else if (rangeParen) {
    const startYear = parseInt(rangeParen[1], 10);
    // Estimate issue year from startYear + (issue - 1) / 10 (will be refined by DB metadata lookup when available)
    const estOffset = issueNumVal <= 1 ? 0 : Math.floor((issueNumVal - 1) / 10);
    let endYear = 2026;
    if (rangeParen[2]) {
      const rawEnd = rangeParen[2];
      endYear = rawEnd.length === 2 ? Math.floor(startYear / 100) * 100 + parseInt(rawEnd, 10) : parseInt(rawEnd, 10);
      if (endYear < startYear) endYear += 100;
    }
    extractedYear = Math.min(endYear, startYear + estOffset);
  } else {
    // Check standalone 4-digit year not part of a range
    const standaloneYear = title.match(/\b(19\d{2}|20\d{2})(?!\s*[-–])\b/);
    if (standaloneYear) {
      extractedYear = parseInt(standaloneYear[1], 10);
    }
  }

  // Fallback series-based start year estimation when no year appears in the title
  if (!extractedYear) {
    const CLASSIC_SERIES_START_YEARS: Record<string, { start: number; issuesPerYear: number }> = {
      "action comics": { start: 1938, issuesPerYear: 12 },
      "detective comics": { start: 1937, issuesPerYear: 12 },
      "batman": { start: 1940, issuesPerYear: 8 },
      "superman": { start: 1939, issuesPerYear: 8 },
      "wonder woman": { start: 1942, issuesPerYear: 8 },
      "flash comics": { start: 1940, issuesPerYear: 10 },
      "all-star comics": { start: 1940, issuesPerYear: 6 },
      "sensation comics": { start: 1942, issuesPerYear: 10 },
      "more fun comics": { start: 1936, issuesPerYear: 12 },
      "adventure comics": { start: 1938, issuesPerYear: 12 },
      "captain america comics": { start: 1941, issuesPerYear: 10 },
      "marvel mystery comics": { start: 1939, issuesPerYear: 10 },
      "whiz comics": { start: 1940, issuesPerYear: 12 },
      "master comics": { start: 1940, issuesPerYear: 12 },
      "vault of horror": { start: 1950, issuesPerYear: 6 },
      "tales from the crypt": { start: 1950, issuesPerYear: 6 },
      "haunt of fear": { start: 1950, issuesPerYear: 6 },
      "weird science": { start: 1950, issuesPerYear: 6 },
      "weird fantasy": { start: 1950, issuesPerYear: 6 },
      "journey into mystery": { start: 1952, issuesPerYear: 8 },
      "strange tales": { start: 1951, issuesPerYear: 8 },
      "tales to astonish": { start: 1959, issuesPerYear: 10 },
      "tales of suspense": { start: 1959, issuesPerYear: 10 },
      "showcase": { start: 1956, issuesPerYear: 6 },
      "brave and the bold": { start: 1955, issuesPerYear: 6 },
      "the brave and the bold": { start: 1955, issuesPerYear: 6 },
      "mystery in space": { start: 1951, issuesPerYear: 8 },
      "strange adventures": { start: 1950, issuesPerYear: 10 },
      "house of mystery": { start: 1951, issuesPerYear: 10 },
      "house of secrets": { start: 1956, issuesPerYear: 8 },
      "sugar and spike": { start: 1956, issuesPerYear: 6 },
      "sea devils": { start: 1961, issuesPerYear: 6 },
      "metal men": { start: 1963, issuesPerYear: 6 },
      "doom patrol": { start: 1964, issuesPerYear: 8 },
      "the flash": { start: 1959, issuesPerYear: 9 },
      "flash": { start: 1959, issuesPerYear: 9 },
      "green lantern": { start: 1960, issuesPerYear: 8 },
      "justice league of america": { start: 1960, issuesPerYear: 9 },
      "aquaman": { start: 1962, issuesPerYear: 6 },
      "the atom": { start: 1962, issuesPerYear: 6 },
      "atom": { start: 1962, issuesPerYear: 6 },
      "hawkman": { start: 1964, issuesPerYear: 6 },
      "teen titans": { start: 1966, issuesPerYear: 6 },
      "the spectre": { start: 1967, issuesPerYear: 5 },
      "spectre": { start: 1967, issuesPerYear: 5 },
      "phantom stranger": { start: 1969, issuesPerYear: 6 },
      "the phantom stranger": { start: 1969, issuesPerYear: 6 },
      "fantastic four": { start: 1961, issuesPerYear: 12 },
      "the amazing spider-man": { start: 1963, issuesPerYear: 12 },
      "amazing spider-man": { start: 1963, issuesPerYear: 12 },
      "the avengers": { start: 1963, issuesPerYear: 12 },
      "avengers": { start: 1963, issuesPerYear: 12 },
      "x-men": { start: 1963, issuesPerYear: 10 },
      "uncanny x-men": { start: 1963, issuesPerYear: 10 },
      "the incredible hulk": { start: 1962, issuesPerYear: 10 },
      "incredible hulk": { start: 1962, issuesPerYear: 10 },
      "daredevil": { start: 1964, issuesPerYear: 12 },
      "iron man": { start: 1968, issuesPerYear: 12 },
      "captain america": { start: 1968, issuesPerYear: 12 },
      "silver surfer": { start: 1968, issuesPerYear: 6 },
      "sub-mariner": { start: 1968, issuesPerYear: 12 },
      "doctor strange": { start: 1968, issuesPerYear: 8 },
      "conan the barbarian": { start: 1970, issuesPerYear: 12 },
      "swamp thing": { start: 1972, issuesPerYear: 6 },
      "the tomb of dracula": { start: 1972, issuesPerYear: 8 },
      "tomb of dracula": { start: 1972, issuesPerYear: 8 },
      "werewolf by night": { start: 1972, issuesPerYear: 8 },
      "ghost rider": { start: 1973, issuesPerYear: 8 },
      "giant-size x-men": { start: 1975, issuesPerYear: 2 },
      "marvel spotlight": { start: 1971, issuesPerYear: 6 },
      "marvel premiere": { start: 1972, issuesPerYear: 6 },
      "new mutants": { start: 1983, issuesPerYear: 12 },
      "alpha flight": { start: 1983, issuesPerYear: 12 },
      "wolverine": { start: 1988, issuesPerYear: 12 },
      "spawn": { start: 1992, issuesPerYear: 12 },
      "the walking dead": { start: 2003, issuesPerYear: 12 },
      "walking dead": { start: 2003, issuesPerYear: 12 },
      "invincible": { start: 2003, issuesPerYear: 12 },
      "saga": { start: 2012, issuesPerYear: 10 },
    };
    const keyLower = extractedSeries.toLowerCase();
    const matchInfo = CLASSIC_SERIES_START_YEARS[keyLower];
    if (matchInfo) {
      if (keyLower === "the flash" || keyLower === "flash") {
        // Flash #105 starts in 1959
        extractedYear = issueNumVal >= 105
          ? 1959 + Math.floor((issueNumVal - 105) / matchInfo.issuesPerYear)
          : 1940 + Math.floor(Math.max(0, issueNumVal - 1) / 10);
      } else if (keyLower === "captain america" || keyLower === "the incredible hulk" || keyLower === "incredible hulk") {
        extractedYear = issueNumVal >= 100
          ? 1968 + Math.floor((issueNumVal - 100) / matchInfo.issuesPerYear)
          : matchInfo.start + Math.floor(Math.max(0, issueNumVal - 1) / matchInfo.issuesPerYear);
      } else {
        extractedYear = matchInfo.start + Math.floor(Math.max(0, issueNumVal - 1) / matchInfo.issuesPerYear);
      }
    }
  }

  // Determine Era with full canonical precision from publication year
  let extractedEra: ComicEra = "modern";
  if (extractedYear) {
    const age = masterAgeFromYear(extractedYear);
    extractedEra = age === "independent" ? "indy" : age;
  } else {
    const isIndyPublisher = /\b(image|dark\s*horse|valiant|idw|boom|dynamite|vertigo|fantagraphics|mirage|pacific|kitchen\s*sink|malibu|eclipse|crossgen|avatar|oni\s*press)\b/i.test(fullText);
    if (isIndyPublisher) {
      extractedEra = "indy";
    } else if (/action comics|detective comics|batman|superman/i.test(title) && grade !== null && grade <= 9.2) {
      extractedEra = "silver";
    }
  }

  return {
    isCertifiedSlab,
    gradingCompany,
    grade,
    isReprintOrToy,
    reprintTrigger,
    isDamagedSlab,
    isCrackAndPressCandidate,
    isCrackedCase,
    isMisspelled,
    misspellingSnippet,
    normalizedTitle,
    isNewsstand,
    isConvention,
    isSigned,
    signatureCount,
    isLegendarySigned,
    signer,
    certNumber,
    certLookupUrl,
    extractedSeries,
    extractedIssue,
    extractedYear,
    extractedEra,
    isDamagedHolder,
    isCanadianPriceVariant,
    isCanadianSuperhero,
    isForeignLanguageEdition,
    translatedEnglishTitle,
  };
}

export function getEraDisplayName(era: ComicEra): string {
  switch (era) {
    case "platinum":
      return "Platinum Age (<1938)";
    case "golden":
      return "Golden Age (1938-1945)";
    case "atomic":
      return "Atomic Age (1946-1955)";
    case "silver":
      return "Silver Age (1956-1969)";
    case "bronze":
      return "Bronze Age (1970-1983)";
    case "copper":
      return "Copper Age (1984-1991)";
    case "modern":
      return "Modern Age (1992-2009)";
    case "postmodern":
      return "Post-Modern (2010+)";
    case "indy":
      return "Indy / Alternative";
    default:
      return era;
  }
}

/**
 * Automatically upscales eBay image URLs from low-res compressed thumbnails to maximum uncompressed studio resolution (1600px).
 * Strips /thumbs/ edge routing and replaces /s-l64, /s-l140, /s-l200, /s-l225, /s-l300, /s-l400, /s-l500, /s-l640, /s-l1200 with /s-l1600.
 */
export function uprezEbayImage(url?: string | null): string {
  if (!url || typeof url !== "string") return "";
  let u = url.replace("/thumbs/", "/");
  u = u.replace(/\/s-l\d+/i, "/s-l1600");
  return u;
}

