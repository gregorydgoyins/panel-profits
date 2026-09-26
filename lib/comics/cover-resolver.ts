import { displayIssue, displaySeries } from "./display";
import type { ComicRecord } from "./types";

export interface ResolvedCover {
  url: string;
  isFallback: boolean;
  sourceTier: "storage" | "canonical_url" | "gcd_archive" | "external_provider" | "dynamic_badge";
  qualityTier: "verified" | "unverified" | "synthetic";
  checksum?: string | null;
}

const PUBLISHER_THEMES: Record<string, { bg: string; accent: string; text: string }> = {
  marvel: { bg: "#1A0808", accent: "#E23636", text: "#FFFFFF" },
  dc: { bg: "#061329", accent: "#0078F0", text: "#FFFFFF" },
  "dc comics": { bg: "#061329", accent: "#0078F0", text: "#FFFFFF" },
  image: { bg: "#121212", accent: "#EAEAEA", text: "#FFFFFF" },
  "image comics": { bg: "#121212", accent: "#EAEAEA", text: "#FFFFFF" },
  "dark horse": { bg: "#211005", accent: "#E4751F", text: "#FFFFFF" },
  "dark horse comics": { bg: "#211005", accent: "#E4751F", text: "#FFFFFF" },
  idw: { bg: "#0A1726", accent: "#00AEEF", text: "#FFFFFF" },
  boom: { bg: "#1E1A08", accent: "#F5A623", text: "#FFFFFF" },
  "boom! studios": { bg: "#1E1A08", accent: "#F5A623", text: "#FFFFFF" },
  valiant: { bg: "#180A21", accent: "#9B51E0", text: "#FFFFFF" },
  dynamite: { bg: "#200909", accent: "#EB5757", text: "#FFFFFF" },
};

function getPublisherTheme(publisher?: string | null) {
  if (!publisher) return { bg: "#0C0F17", accent: "#3B82F6", text: "#FFFFFF" };
  const norm = publisher.trim().toLowerCase();
  for (const [key, theme] of Object.entries(PUBLISHER_THEMES)) {
    if (norm.includes(key)) return theme;
  }
  return { bg: "#0C0F17", accent: "#6366F1", text: "#FFFFFF" };
}

/**
 * Generate a standalone, ultra-crisp SVG badge cover data URI.
 */
export function generateDynamicCoverSvg(
  series?: string | null,
  issueNumber?: string | null,
  publisher?: string | null,
  publicationYear?: number | null
): string {
  const cleanSeries = displaySeries(series, issueNumber);
  const cleanIssue = displayIssue(issueNumber) || "ISSUE —";
  const cleanPub = (publisher || "PANEL PROFITS CANONICAL").toUpperCase();
  const theme = getPublisherTheme(publisher);
  const yearText = publicationYear ? String(publicationYear) : "";

  // Escape XML entities in strings
  const esc = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.bg}" />
      <stop offset="100%" stop-color="#050608" />
    </linearGradient>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#FFFFFF" stroke-opacity="0.04" stroke-width="1"/>
    </pattern>
  </defs>
  
  <!-- Background -->
  <rect width="400" height="600" fill="url(#bgGrad)" />
  <rect width="400" height="600" fill="url(#grid)" />
  
  <!-- Outer Rim Frame -->
  <rect x="12" y="12" width="376" height="576" fill="none" stroke="${theme.accent}" stroke-opacity="0.4" stroke-width="1.5" />
  <rect x="16" y="16" width="368" height="568" fill="none" stroke="#FFFFFF" stroke-opacity="0.08" stroke-width="1" />

  <!-- Publisher Header Banner -->
  <rect x="24" y="24" width="352" height="42" fill="#0E121B" fill-opacity="0.9" stroke="${theme.accent}" stroke-opacity="0.3" stroke-width="1"/>
  <text x="36" y="50" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="${theme.accent}" letter-spacing="2">${esc(cleanPub)}</text>
  ${yearText ? `<text x="364" y="50" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="500" fill="#94A3B8" letter-spacing="1">${esc(yearText)}</text>` : ""}

  <!-- Center Artwork / Title Box -->
  <g transform="translate(200, 270)">
    <!-- Decorative Icon / Circle -->
    <circle r="64" fill="${theme.accent}" fill-opacity="0.08" stroke="${theme.accent}" stroke-opacity="0.3" stroke-width="2" />
    <circle r="52" fill="none" stroke="#FFFFFF" stroke-opacity="0.1" stroke-dasharray="4,4" />
    <text y="8" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="${theme.accent}">PP</text>
  </g>

  <!-- Series & Issue Info -->
  <g transform="translate(200, 420)">
    <text y="0" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="700" fill="#F8FAFC" letter-spacing="0.5">
      ${esc(cleanSeries.length > 28 ? cleanSeries.slice(0, 26) + "…" : cleanSeries)}
    </text>
    <rect x="-60" y="20" width="120" height="28" rx="4" fill="${theme.accent}" fill-opacity="0.15" stroke="${theme.accent}" stroke-opacity="0.5" stroke-width="1" />
    <text y="39" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="${theme.accent}" letter-spacing="1.5">
      ${esc(cleanIssue)}
    </text>
  </g>

  <!-- Bottom Archival Barcode Motif -->
  <g transform="translate(24, 530)">
    <rect width="352" height="34" fill="#0A0C12" fill-opacity="0.8" stroke="#FFFFFF" stroke-opacity="0.08" stroke-width="1"/>
    <text x="12" y="21" font-family="monospace" font-size="9" fill="#64748B" letter-spacing="1">CANONICAL ASSET // PP-UNIVERSAL-RESOLVER</text>
    <line x1="300" y1="8" x2="300" y2="26" stroke="#475569" stroke-width="2"/>
    <line x1="305" y1="8" x2="305" y2="26" stroke="#475569" stroke-width="1"/>
    <line x1="310" y1="8" x2="310" y2="26" stroke="#475569" stroke-width="3"/>
    <line x1="316" y1="8" x2="316" y2="26" stroke="#475569" stroke-width="1"/>
    <line x1="322" y1="8" x2="322" y2="26" stroke="#475569" stroke-width="2"/>
    <line x1="328" y1="8" x2="328" y2="26" stroke="#475569" stroke-width="1"/>
    <line x1="334" y1="8" x2="334" y2="26" stroke="#475569" stroke-width="2"/>
  </g>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Construct Grand Comics Database (GCD) archival cover URL if GCD ID is present.
 */
export function buildGcdCoverUrl(gcdSourceId?: string | number | null): string | null {
  if (!gcdSourceId) return null;
  const cleanId = String(gcdSourceId).trim().replace(/^gcd[:-]/i, "");
  const numId = parseInt(cleanId, 10);
  if (isNaN(numId) || numId <= 0) return null;
  const folder = Math.floor(numId / 1000);
  return `https://files1.comics.org/img/gcd/covers_by_id/${folder}/${numId}.jpg`;
}

export interface ComicCoverInput {
  id?: string;
  cover_url?: string | null;
  cover_storage_path?: string | null;
  cover_retrieval_url?: string | null;
  cover_original_url?: string | null;
  cover_source?: string | null;
  cover_sha256?: string | null;
  cover_verified_at?: string | null;
  gcd_source_id?: string | number | null;
  series?: string | null;
  issue_number?: string | null;
  publisher?: string | null;
  publication_year?: number | null;
  panel_profits_data?: Record<string, unknown> | null;
  comicbase_data?: Record<string, unknown> | null;
  gcd_data?: Record<string, unknown> | null;
}

/**
 * Multi-Tier Autonomous Comic Cover Resolver
 * Resolves any comic record to the highest quality, most authentic available image URL.
 */
export function resolveComicCover(comic: ComicCoverInput): ResolvedCover {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vbcmjmakluyjnsmisoth.supabase.co";

  // Tier 1: Canonical Supabase / Cloud Storage Path
  if (comic.cover_storage_path && comic.cover_storage_path.trim().length > 0) {
    const cleanPath = comic.cover_storage_path.trim();
    if (!cleanPath.startsWith("http")) {
      return {
        url: `${baseUrl}/storage/v1/object/public/${cleanPath}`,
        isFallback: false,
        sourceTier: "storage",
        qualityTier: comic.cover_verified_at ? "verified" : "unverified",
        checksum: comic.cover_sha256 || null,
      };
    }
  }

  // Tier 2: Authoritative Direct Cover URL
  const directCandidates = [comic.cover_url, comic.cover_retrieval_url, comic.cover_original_url];
  for (const candidate of directCandidates) {
    if (candidate && typeof candidate === "string" && candidate.trim().length > 0) {
      const trimmed = candidate.trim();
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        // Exclude generic placeholder / tracking domains
        if (!/doubleclick|adserver|pixel\.gif|blank\.gif/i.test(trimmed)) {
          return {
            url: trimmed,
            isFallback: false,
            sourceTier: "canonical_url",
            qualityTier: comic.cover_verified_at ? "verified" : "unverified",
            checksum: comic.cover_sha256 || null,
          };
        }
      }
    }
  }

  // Tier 3: Grand Comics Database (GCD) Archival Archive by ID
  const gcdId =
    comic.gcd_source_id ||
    (comic.gcd_data && typeof comic.gcd_data === "object" ? (comic.gcd_data as Record<string, unknown>).id || (comic.gcd_data as Record<string, unknown>).issue_id : null);

  const gcdUrl = buildGcdCoverUrl(gcdId as string | number | null);
  if (gcdUrl) {
    return {
      url: gcdUrl,
      isFallback: false,
      sourceTier: "gcd_archive",
      qualityTier: "unverified",
      checksum: comic.cover_sha256 || null,
    };
  }

  // Tier 4: External Provider Imagery (ComicBase / PPCF)
  if (comic.comicbase_data && typeof comic.comicbase_data === "object") {
    const cb = comic.comicbase_data as Record<string, unknown>;
    const cbUrl = (cb.CoverImageURL || cb.PictureURL || cb.image_url) as string | undefined;
    if (cbUrl && typeof cbUrl === "string" && cbUrl.startsWith("http")) {
      return {
        url: cbUrl,
        isFallback: false,
        sourceTier: "external_provider",
        qualityTier: "unverified",
        checksum: null,
      };
    }
  }

  // Tier 5: Universal Typographic Vector SVG Cover
  const dynamicSvg = generateDynamicCoverSvg(comic.series, comic.issue_number, comic.publisher, comic.publication_year);
  return {
    url: dynamicSvg,
    isFallback: true,
    sourceTier: "dynamic_badge",
    qualityTier: "synthetic",
    checksum: null,
  };
}

/**
 * Batch resolve cover representations for an array of comics.
 */
export function resolveComicCoversBatch(comics: ComicCoverInput[]): Map<string, ResolvedCover> {
  const map = new Map<string, ResolvedCover>();
  for (const comic of comics) {
    if (comic.id) {
      map.set(comic.id, resolveComicCover(comic));
    }
  }
  return map;
}
