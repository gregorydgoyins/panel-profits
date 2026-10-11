import { AuctionSource, RawAuctionListing } from "./types";
import { uprezEbayImage } from "./anti-bullshit";
import { resolveComicLoreDossier } from "./lore-dossier";

interface EbayTokenCache {
  token: string;
  expiresAt: number;
}

let cachedToken: EbayTokenCache | null = null;

/**
 * Obtain an OAuth 2.0 application access token using official eBay client credentials
 */
export async function getEbayOAuthToken(): Promise<string | null> {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn("[eBay API] Missing EBAY_CLIENT_ID or EBAY_CLIENT_SECRET");
    return null;
  }

  // Check cache (with 60-second safety window)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  try {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`,
      },
      body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("[eBay API] OAuth token request failed:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    if (data.access_token) {
      cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in || 7200) * 1000,
      };
      return data.access_token;
    }
    return null;
  } catch (err) {
    console.error("[eBay API] OAuth token fetch exception:", err);
    return null;
  }
}

export type EbayMarketplaceHeader =
  | "EBAY_US"
  | "EBAY_GB"
  | "EBAY_CA"
  | "EBAY_FR"
  | "EBAY_DE"
  | "EBAY_AU";

export interface SearchEbayAuctionsParams {
  query?: string;
  marketplace?: EbayMarketplaceHeader;
  limit?: number;
  categoryIds?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface EbayItemAspects {
  certNumber?: string;
  gradingCompany?: string;
  grade?: string;
  artistWriter?: string;
  coverArtist?: string;
  character?: string;
  publisher?: string;
  publicationYear?: string;
  era?: string;
  seriesTitle?: string;
  issueNumber?: string;
  variantType?: string;
}

/**
 * Fetch detailed item information and localized aspects using official eBay Browse API
 */
export async function fetchEbayItemDetails(itemId: string): Promise<{
  itemId: string;
  title: string;
  description?: string;
  aspects: EbayItemAspects;
  images: string[];
  seller?: { username?: string; feedbackScore?: number; feedbackPercentage?: string };
} | null> {
  const token = await getEbayOAuthToken();
  if (!token) return null;

  const cleanId = itemId.replace(/^ebay-/, "");
  const url = `https://api.ebay.com/buy/browse/v1/item/${encodeURIComponent(cleanId)}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`[eBay API] fetchItemDetails error (${res.status}):`, await res.text());
      return null;
    }

    const item = await res.json();
    const aspects: EbayItemAspects = {};

    if (Array.isArray(item.localizedAspects)) {
      for (const asp of item.localizedAspects) {
        const name = (asp.name || "").toLowerCase();
        const val = asp.value;
        if (name.includes("certification") || name.includes("cert number")) aspects.certNumber = val;
        else if (name.includes("grader") || name.includes("grading company")) aspects.gradingCompany = val;
        else if (name.includes("grade")) aspects.grade = val;
        else if (name.includes("artist") || name.includes("writer")) aspects.artistWriter = val;
        else if (name.includes("cover artist")) aspects.coverArtist = val;
        else if (name.includes("character")) aspects.character = val;
        else if (name.includes("publisher")) aspects.publisher = val;
        else if (name.includes("publication year") || name.includes("year")) aspects.publicationYear = val;
        else if (name.includes("era")) aspects.era = val;
        else if (name.includes("series")) aspects.seriesTitle = val;
        else if (name.includes("issue number")) aspects.issueNumber = val;
        else if (name.includes("variant")) aspects.variantType = val;
      }
    }

    const images = [
      item.image?.imageUrl ? uprezEbayImage(item.image.imageUrl) : null,
      ...(item.additionalImages || []).map((img: { imageUrl?: string }) =>
        img?.imageUrl ? uprezEbayImage(img.imageUrl) : null
      ),
    ].filter((img): img is string => Boolean(img));

    return {
      itemId: cleanId,
      title: item.title,
      description: item.shortDescription || item.description,
      aspects,
      images,
      seller: item.seller
        ? {
            username: item.seller.username,
            feedbackScore: item.seller.feedbackScore,
            feedbackPercentage: item.seller.feedbackPercentage,
          }
        : undefined,
    };
  } catch (err) {
    console.error("[eBay API] fetchItemDetails exception:", err);
    return null;
  }
}

/**
 * Query official eBay REST Browse API for live active auctions
 */
export async function searchEbayLiveAuctions(
  params: SearchEbayAuctionsParams = {}
): Promise<RawAuctionListing[]> {
  const token = await getEbayOAuthToken();
  if (!token) return [];

  const marketplace = params.marketplace || "EBAY_US";
  const limit = params.limit || 20;
  const q = encodeURIComponent(params.query || "CGC 9.8 comic");

  let filter = "buyingOptions:{AUCTION}";
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    const min = params.minPrice ?? 0;
    const max = params.maxPrice ?? 2500;
    filter += `,price:[${min}..${max}],priceCurrency:USD`;
  }

  const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${q}&filter=${filter}&limit=${limit}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": marketplace,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`[eBay API] Search error (${marketplace}):`, res.status, await res.text());
      return [];
    }

    const data = await res.json();
    if (!data.itemSummaries || !Array.isArray(data.itemSummaries)) {
      return [];
    }

    const sourceMap: Record<EbayMarketplaceHeader, AuctionSource> = {
      EBAY_US: "ebay",
      EBAY_GB: "ebay_uk",
      EBAY_CA: "ebay_ca",
      EBAY_FR: "ebay_fr",
      EBAY_DE: "ebay_de",
      EBAY_AU: "ebay_au",
    };

    const currencyMap: Record<EbayMarketplaceHeader, { code: string; sym: string; rate: number }> =
      {
        EBAY_US: { code: "USD", sym: "$", rate: 1.0 },
        EBAY_GB: { code: "GBP", sym: "£", rate: 1.3 },
        EBAY_CA: { code: "CAD", sym: "C$", rate: 0.73 },
        EBAY_FR: { code: "EUR", sym: "€", rate: 1.09 },
        EBAY_DE: { code: "EUR", sym: "€", rate: 1.09 },
        EBAY_AU: { code: "AUD", sym: "A$", rate: 0.67 },
      };

    const cur = currencyMap[marketplace];
    const source = sourceMap[marketplace];

    const results: RawAuctionListing[] = [];

    for (const item of data.itemSummaries) {
      const origVal = parseFloat(item.price?.value || item.currentBidPrice?.value || "0");
      const shipVal = parseFloat(item.shippingOptions?.[0]?.shippingCost?.value || "0");

      const usdPrice = cur.code === "USD" ? origVal : Math.round(origVal * cur.rate * 100) / 100;
      const usdShip = cur.code === "USD" ? shipVal : Math.round(shipVal * cur.rate * 100) / 100;

      // Calculate real remaining seconds until auction ends
      let secondsRemaining = 1200;
      if (item.itemEndDate) {
        const endMs = new Date(item.itemEndDate).getTime();
        const diff = Math.floor((endMs - Date.now()) / 1000);
        if (diff > 0) secondsRemaining = diff;
      }

      const rawImg =
        item.thumbnailImages?.[0]?.imageUrl ||
        item.image?.imageUrl ||
        "/placeholder.png";
      const imageUrl = uprezEbayImage(rawImg);

      const galleryImages = [
        imageUrl,
        ...(item.thumbnailImages || []).map((img: { imageUrl?: string }) =>
          img?.imageUrl ? uprezEbayImage(img.imageUrl) : null
        ),
        ...(item.additionalImages || []).map((img: { imageUrl?: string }) =>
          img?.imageUrl ? uprezEbayImage(img.imageUrl) : null
        ),
      ].filter((img, idx, arr): img is string => Boolean(img) && arr.indexOf(img) === idx);

      // Match cert number if present in title or seller item details
      const certMatch = item.title?.match(/\b(\d{7,10})\b/);

      // Resolve lore dossier and GCD metadata
      const dossier = resolveComicLoreDossier(item.title);

      results.push({
        id: `ebay-${item.itemId}`,
        source,
        title: item.title,
        currentBid: usdPrice,
        shippingCost: usdShip || 14.0,
        bidCount: item.bidCount ?? 1,
        secondsRemaining,
        url: item.itemWebUrl || `https://www.ebay.com/itm/${item.itemId}`,
        imageUrl,
        galleryImages,
        sellerRating: item.seller?.feedbackPercentage
          ? parseFloat(item.seller.feedbackPercentage)
          : 99.8,
        certNumber: certMatch ? certMatch[1] : undefined,
        currency: cur.code,
        originalBid: origVal,
        originalCurrencySymbol: cur.sym,
        exchangeRateToUsd: cur.rate,
        internationalRegion:
          marketplace === "EBAY_GB"
            ? "UK"
            : marketplace === "EBAY_CA"
            ? "CA"
            : marketplace === "EBAY_FR"
            ? "FR"
            : marketplace === "EBAY_DE"
            ? "DE"
            : marketplace === "EBAY_AU"
            ? "AU"
            : "US",
        historicalSignificanceTier: dossier.tier,
        historicalSignificanceLore: dossier.historicalSignificance,
        longTermHoldingThesis: dossier.collectorHoldingThesis,
        gcdMetadata: {
          writers: dossier.gcdMetadata.writers,
          pencilers: dossier.gcdMetadata.pencilers,
          coverArtists: dossier.gcdMetadata.coverArtists,
          publisher: dossier.gcdMetadata.publisher,
          publicationDate: dossier.gcdMetadata.publicationYear ? String(dossier.gcdMetadata.publicationYear) : undefined,
          storylines: dossier.gcdMetadata.storyline,
        },
      });
    }

    return results;
  } catch (err) {
    console.error("[eBay API] Live search exception:", err);
    return [];
  }
}

/**
 * Multi-stream concurrent live auction harvester across US, UK, Canada, and certified grading tiers
 */
export async function searchEbayMultiStream(): Promise<RawAuctionListing[]> {
  const queryConfigs: SearchEbayAuctionsParams[] = [
    { query: "CGC 9.8 comic", marketplace: "EBAY_US", limit: 12 },
    { query: "CBCS 9.8 comic", marketplace: "EBAY_US", limit: 8 },
    { query: "PSA 10 comic", marketplace: "EBAY_US", limit: 6 },
    { query: "CGC comic", marketplace: "EBAY_GB", limit: 5 },
    { query: "CGC comic", marketplace: "EBAY_CA", limit: 5 },
  ];

  const results = await Promise.allSettled(
    queryConfigs.map((cfg) => searchEbayLiveAuctions(cfg))
  );

  const merged: RawAuctionListing[] = [];
  const seenIds = new Set<string>();

  for (const res of results) {
    if (res.status === "fulfilled" && Array.isArray(res.value)) {
      for (const item of res.value) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          merged.push(item);
        }
      }
    }
  }

  return merged;
}

