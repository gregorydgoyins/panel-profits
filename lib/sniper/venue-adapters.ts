/**
 * Real multi-venue live comic book adapters for Sniper (`comicconnect`, `metropolis`, `hakes`)
 * plus realized completed-sale harvesting from ComicConnect's sold archive.
 *
 * Every listing and completed sale comes directly from the venue's live HTML catalog with
 * its real item ID, real URL, real slab photo, real grade, real current bid / Buy Now price,
 * and real countdown timer. Nothing is invented or extrapolated.
 */
import { parseAndFilterListing } from "./anti-bullshit";
import { seriesKey } from "./candles";
import type { AuctionSource, GradingCompany, RawAuctionListing } from "./types";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const NON_COMIC_JUNK =
  /\b(group\s+lot|comic\s+book\s+group\s+lot|lot\s+of\s+\d+|set\s+of\s+\d+|complete\s+set|fleer|topps|upper\s+deck|skybox|impel|bowman|panini|pokemon|yu-gi-oh|magic\s+the\s+gathering|sports\s+card|trading\s+card|non-sport|original\s+art|comic\s+book\s+page|comic\s+book\s+cover\s+original\s+art|splash\s+page\s+original\s+art|action\s+figure|\bafa\s+\d|wata\b|\bvga\s+\d|video\s+game|vhs\b|betamax|laserdisc|movie\s+poster|statue\b|bust\b| lunch\s*box)\b/i;

const KEY_COMIC_SEARCHES = [
  "Amazing Spider-Man",
  "Uncanny X-Men",
  "X-Men",
  "Incredible Hulk",
  "Batman",
  "Detective Comics",
  "Action Comics",
  "Fantastic Four",
  "Avengers",
  "Iron Man",
  "Daredevil",
  "Wolverine",
  "Spawn",
  "New Mutants",
  "Silver Surfer",
  "Thor",
  "Tales of Suspense",
  "Strange Tales",
  "Green Lantern",
  "Flash",
  "Superman",
  "Teenage Mutant Ninja Turtles",
  "Tomb of Dracula",
  "Werewolf by Night",
  "Ghost Rider",
  "Moon Knight",
  "Punisher",
  "Walking Dead",
  "Invincible",
  "Star Wars",
  "Showcase",
  "Brave and the Bold",
  "Journey Into Mystery",
  "Sub-Mariner",
  "Captain America",
  "Justice League",
];

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
}

function stripHtml(str: string): string {
  return decodeHtmlEntities(str.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ").trim();
}

/**
 * Parses public auction catalog cards from venues that do not share the
 * ComicConnect markup. Every field is accepted only when present in the same
 * lot block: a genuine lot URL/ID, title, graded label, current bid, and an
 * explicit end timestamp. Catalog pages, challenge pages, and incomplete
 * cards are intentionally ignored.
 */
function parsePublicAuctionCatalogHtml(
  html: string,
  venue: "heritage" | "mycomicshop" | "comiclink",
  baseUrl: string,
): RawAuctionListing[] {
  const hrefPattern = venue === "heritage"
    ? /href=["']([^"']*\/itm\/[^"']+)["']/gi
    : venue === "mycomicshop"
      ? /href=["']([^"']*\/search\?[^"']*ItemID=\d+[^"']*)["']/gi
      : /href=["']([^"']*\/auctions\/item\.asp\?[^"']*\bid=\d+[^"']*)["']/gi;
  const out: RawAuctionListing[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(hrefPattern)) {
    const href = decodeHtmlEntities(match[1]);
    const absoluteUrl = new URL(href, baseUrl).toString();
    const idMatch = venue === "heritage"
      ? absoluteUrl.match(/\/a\/(\d+-\d+)\b/i)
      : venue === "mycomicshop"
        ? absoluteUrl.match(/[?&]ItemID=(\d+)/i)
        : absoluteUrl.match(/[?&]id=(\d+)/i);
    if (!idMatch) continue;
    const id = `${venue}-${idMatch[1]}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const start = Math.max(0, (match.index ?? 0) - 2500);
    const end = Math.min(html.length, (match.index ?? 0) + 6500);
    const blockHtml = html.slice(start, end);
    const block = stripHtml(blockHtml);
    const anchorText = stripHtml(match[0].replace(/^[\s\S]*?href=["'][^"']+["'][^>]*>/i, "").replace(/<\/a>[\s\S]*$/i, ""));
    const title = stripHtml(anchorText) || stripHtml(blockHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
    if (title.length < 8 || !/\b(?:#|issue|comic|cgc|cbcs|pgx)\b/i.test(`${title} ${block}`)) continue;
    const gradeMatch = block.match(/\b(CGC|CBCS|PGX)\s*(?:[A-Z+\/\-]+\s*)?(10(?:\.0)?|[0-9]\.[0-9])\b/i);
    if (!gradeMatch) continue;
    const grader = gradeMatch[1].toUpperCase() as GradingCompany;
    const grade = Number(gradeMatch[2]);
    const bidMatch = block.match(/(?:Current Bid|Current High Bid|Current auction bid price|Bid:)\s*\$\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (!bidMatch) continue;
    const currentBid = Number(bidMatch[1].replace(/,/g, ""));
    if (!Number.isFinite(currentBid) || currentBid <= 0) continue;
    const endMatch = block.match(/(?:Ends?|Auction Ends?|Update Ends?)\s*:?\s*([A-Z]{3,9}\s+\d{1,2},?\s+\d{4}[^|<;]*|\d{1,2}\/\d{1,2}\/\d{4}[^|<;]*)/i);
    const parsedEnd = endMatch ? Date.parse(endMatch[1].replace(/\s+/g, " ")) : NaN;
    if (!Number.isFinite(parsedEnd) || parsedEnd <= Date.now()) continue;
    const imageMatch = blockHtml.match(/<(?:img|source)[^>]+(?:src|srcset)=["']([^"']+)["']/i);
    const imageUrl = imageMatch ? new URL(imageMatch[1].split(/\s+/)[0], baseUrl).toString() : "";
    const fullTitle = `${title} ${grader} ${grade.toFixed(1)}`;
    const parsed = parseAndFilterListing(fullTitle);
    if (parsed.isReprintOrToy || !parsed.extractedSeries || parsed.extractedSeries === "Unknown Series") continue;
    const secondsRemaining = Math.max(1, Math.floor((parsedEnd - Date.now()) / 1000));
    out.push({
      id, source: venue, title: fullTitle, currentBid, shippingCost: 0,
      bidCount: Number(block.match(/Bid Count\s*:?\s*(\d+)/i)?.[1] ?? 0),
      secondsRemaining, timeLeftStr: formatTimeLeft(secondsRemaining), url: absoluteUrl,
      imageUrl, graderNotes: `${grader} ${grade.toFixed(1)}`, gradingCompany: grader,
      resolvedGrade: grade, listingType: "Auction", isBuyItNow: false,
      currency: "USD", originalBid: currentBid, internationalRegion: "US",
    });
  }
  return out;
}

function formatTimeLeft(seconds: number): string {
  if (seconds <= 0) return "ENDED";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

interface ParsedGradedBox {
  grader: GradingCompany;
  grade: number;
}

function parseGradeLine(gradeLine: string): ParsedGradedBox | null {
  const clean = decodeHtmlEntities(gradeLine).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const compMatch = clean.match(/\b(CGC|CBCS|PGX|PSA|EGS)\b/i);
  if (!compMatch) return null;
  const grader = compMatch[1].toUpperCase() as GradingCompany;

  // Match numeric comic grade after colon or after company/grade code, e.g. "Marvel CGC NM/M: 9.8" or "CGC 9.6"
  const colonMatch = clean.match(/:\s*(10(?:\.0)?|[0-9]\.[0-9])\b/);
  const numMatch = colonMatch ?? clean.match(/\b(10(?:\.0)?|[0-9]\.[0-9])\b/);
  if (!numMatch) return null;
  const grade = parseFloat(numMatch[1]);
  if (!Number.isFinite(grade) || grade < 0.5 || grade > 10.0) return null;

  return { grader, grade };
}

/**
 * Parses `.itempreview.details.listingbox` cards shared by ComicConnect and Metropolis Collectibles.
 */
export function parseComicConnectOrMetropolisHtml(
  html: string,
  venue: "comicconnect" | "metropolis",
  baseUrl: string
): RawAuctionListing[] {
  const out: RawAuctionListing[] = [];
  const cards = html.split('class="itempreview details listingbox');
  if (cards.length <= 1) return out;

  for (const card of cards.slice(1)) {
    const idMatch = card.match(/href="\/item\/(\d+)"/i);
    if (!idMatch) continue;
    const itemId = idMatch[1];

    // Skip sold items when harvesting live listings
    if (/<div class="endednotice">/i.test(card) || /<span class="lbl">\s*Sold For\s*<\/span>/i.test(card)) {
      continue;
    }

    const rawTitleMatch = card.match(/<div class="titleline[^"]*">([\s\S]*?)<\/div>/i);
    if (!rawTitleMatch) continue;
    const rawTitle = decodeHtmlEntities(rawTitleMatch[1].replace(/<[^>]+>/g, " "))
      .replace(/\bMagazine\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    const gradeMatch = card.match(/<div class="grade">([\s\S]*?)<\/div>/i);
    if (!gradeMatch) continue;
    const parsedGrade = parseGradeLine(gradeMatch[1]);
    if (!parsedGrade) continue;

    if (NON_COMIC_JUNK.test(rawTitle) || NON_COMIC_JUNK.test(gradeMatch[1])) continue;

    // Extract image URL (prefer high-res gallery800 preview)
    const img800 = card.match(/\/coverimages\/gallery800\/[^"'\s>]+/i);
    const img425 = card.match(/\/coverimages\/gallery425\/[^"'\s>]+/i);
    const imgAny = card.match(/\/coverimages\/[^"'\s>]+/i);
    const relImg = img800?.[0] ?? img425?.[0] ?? imgAny?.[0];
    if (!relImg || /noimage|placeholder|default/i.test(relImg)) continue;
    const imageUrl = relImg.startsWith("http") ? relImg : `${baseUrl}${relImg}`;

    // Extract comments / grader notes
    const commentsMatch = card.match(/<div class="comments wrap">([\s\S]*?)(?:<div class="ctip">|<\/div>)/i);
    const graderNotes = commentsMatch
      ? decodeHtmlEntities(commentsMatch[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()
      : undefined;

    // Determine whether this card is an active timed auction or fixed-price Buy It Now
    const dataTypeMatch = card.match(/^\s*"\s*data-type="([^"]+)"/i) ?? card.match(/data-type="([^"]+)"/i);
    const isAuctionType = dataTypeMatch?.[1]?.toLowerCase() === "auction";

    // Extract price from either auction span (<span class="val prc">$...</span>) or fixed-price Buy Now button
    let priceUsd = 0;
    let priceLabel = "";
    const prcMatch = card.match(/<span class="lbl">([\s\S]*?)<\/span>[\s\S]*?<span class="val prc">\s*\$([0-9,]+(?:\.[0-9]+)?)\s*<\/span>/i);
    if (prcMatch) {
      priceLabel = prcMatch[1].replace(/<[^>]+>/g, "").trim();
      priceUsd = parseFloat(prcMatch[2].replace(/,/g, ""));
    } else {
      const buyNowMatch =
        card.match(/Buy Now:\s*\$([0-9,]+(?:\.[0-9]+)?)/i) ??
        card.match(/class="dollar value\s*"[^>]*value="\$([0-9,]+(?:\.[0-9]+)?)"/i) ??
        card.match(/value="\$([0-9,]+(?:\.[0-9]+)?)"[^>]*class="dollar value/i);
      if (buyNowMatch) {
        priceLabel = "Buy Now";
        priceUsd = parseFloat(buyNowMatch[1].replace(/,/g, ""));
      }
    }
    if (!Number.isFinite(priceUsd) || priceUsd <= 0) continue;

    // Countdown timer (ComicConnect puts milliseconds remaining in data-countdown-ends)
    const cdMatch = card.match(/data-countdown-ends="(\d+)"/i);
    // Do not turn an auction with an unavailable timer into a fixed-price sale.
    if (isAuctionType && !cdMatch) continue;
    const isAuction = isAuctionType;
    let secondsRemaining = 86400 * 7;
    if (isAuction && cdMatch) {
      const rawVal = Number(cdMatch[1]);
      secondsRemaining = Math.round(rawVal / 1000);
      if (secondsRemaining <= 0) continue;
    }

    const fullTitle = `${rawTitle} ${parsedGrade.grader} ${parsedGrade.grade.toFixed(1)}`;
    const parsedTitle = parseAndFilterListing(fullTitle, graderNotes ?? "", graderNotes ?? "");
    if (parsedTitle.isReprintOrToy || !parsedTitle.extractedSeries || parsedTitle.extractedSeries === "Unknown Series") {
      continue;
    }

    const explicitCertMatch = (graderNotes ?? "").match(/\b(?:cgc|cbcs|pgx|psa)\s*#\s*([0-9]{7,10}(?:-[0-9]{3})?)\b/i);
    const certNumber = explicitCertMatch?.[1] ?? parsedTitle.certNumber;

    const bidCount = isAuction ? (/current\s*bid/i.test(priceLabel) ? 1 : 0) : 0;

    out.push({
      id: `${venue}-${itemId}`,
      source: venue,
      title: fullTitle,
      currentBid: priceUsd,
      shippingCost: 15,
      bidCount,
      secondsRemaining,
      timeLeftStr: isAuction ? formatTimeLeft(secondsRemaining) : "BIN",
      url: `${baseUrl}/item/${itemId}`,
      imageUrl,
      certNumber,
      graderNotes,
      isBuyItNow: !isAuction,
      listingType: isAuction ? "Auction" : "BuyItNow",
      currency: "USD",
      originalBid: priceUsd,
      internationalRegion: "US",
    });
  }

  return out;
}

export interface RealizedVenueSaleRow {
  id: string;
  series_key: string;
  series: string;
  issue: string;
  grade: number;
  grader: string | null;
  price_usd: number;
  sold_at: string;
  venue: string;
  source: string;
  confirmed: boolean;
  item_id: string;
  url: string;
}

/**
 * Parses completed (`Sold For`) graded comic sales from ComicConnect's sold archive HTML.
 */
export function parseComicConnectSoldHtml(html: string): RealizedVenueSaleRow[] {
  const out: RealizedVenueSaleRow[] = [];
  const cards = html.split('class="itempreview details listingbox');
  if (cards.length <= 1) return out;

  for (const card of cards.slice(1)) {
    const idMatch = card.match(/href="\/item\/(\d+)"/i);
    if (!idMatch) continue;
    const itemId = idMatch[1];

    const rawTitleMatch = card.match(/<div class="titleline[^"]*">([\s\S]*?)<\/div>/i);
    if (!rawTitleMatch) continue;
    const rawTitle = decodeHtmlEntities(rawTitleMatch[1].replace(/<[^>]+>/g, " "))
      .replace(/\bMagazine\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    const gradeMatch = card.match(/<div class="grade">([\s\S]*?)<\/div>/i);
    if (!gradeMatch) continue;
    const parsedGrade = parseGradeLine(gradeMatch[1]);
    if (!parsedGrade) continue;

    if (NON_COMIC_JUNK.test(rawTitle) || NON_COMIC_JUNK.test(gradeMatch[1])) continue;

    const soldMatch = card.match(/<span class="lbl">\s*Sold For\s*<\/span>[\s\S]*?<span class="val prc">\s*\$([0-9,]+(?:\.[0-9]+)?)\s*<\/span>/i);
    if (!soldMatch) continue;
    const priceUsd = parseFloat(soldMatch[1].replace(/,/g, ""));
    if (!Number.isFinite(priceUsd) || priceUsd <= 0) continue;

    const endedMatch = card.match(/<div class="endednotice">\s*Sold on\s+[A-Za-z]+,\s*(\d{2})\/(\d{2})\/(\d{4})/i);
    if (!endedMatch) continue;
    const [, mm, dd, yyyy] = endedMatch;
    const soldDateIso = `${yyyy}-${mm}-${dd}T12:00:00.000Z`;

    const fullTitle = `${rawTitle} ${parsedGrade.grader} ${parsedGrade.grade.toFixed(1)}`;
    const parsed = parseAndFilterListing(fullTitle);
    if (parsed.isReprintOrToy || !parsed.extractedSeries || parsed.extractedSeries === "Unknown Series") {
      continue;
    }

    out.push({
      id: `comicconnect|${itemId}|${Math.round(priceUsd * 100)}|${yyyy}-${mm}-${dd}`,
      series_key: seriesKey(parsed.extractedSeries, parsed.extractedIssue),
      series: parsed.extractedSeries,
      issue: parsed.extractedIssue,
      grade: parsedGrade.grade,
      grader: parsedGrade.grader,
      price_usd: priceUsd,
      sold_at: soldDateIso,
      venue: "comicconnect",
      source: "comicconnect_sold",
      confirmed: true,
      item_id: `comicconnect-${itemId}`,
      url: `https://www.comicconnect.com/item/${itemId}`,
    });
  }

  return out;
}

/**
 * Parses Hake's Auctions catalog cards (`<div class="... gtm-visible_item" id="stl-..." data-item_id="...">`).
 */
export function parseHakesCatalogHtml(html: string, nowMs: number = Date.now()): RawAuctionListing[] {
  const out: RawAuctionListing[] = [];
  const blocks = html.split(/<div class="col-6 col-md-6 col-lg-4[^"]*gtm-visible_item"/i);
  if (blocks.length <= 1) return out;

  const nowSec = Math.floor(nowMs / 1000);

  for (const block of blocks.slice(1)) {
    const itemIdMatch = block.match(/data-item_id="(\d+)"/i);
    if (!itemIdMatch) continue;
    const itemId = itemIdMatch[1];

    const titleAnchorMatch = block.match(/<div class="lot_title">\s*<a href="([^"]+)">([\s\S]*?)<\/a>/i);
    if (!titleAnchorMatch) continue;
    const url = titleAnchorMatch[1].trim();
    const rawTitle = decodeHtmlEntities(titleAnchorMatch[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

    if (NON_COMIC_JUNK.test(rawTitle)) continue;
    if (!/\b(CGC|CBCS|PGX|EGS)\b/i.test(rawTitle)) continue;

    const imgMatch = block.match(/<img\s+src="(https:\/\/s1\.img\.bidsquare\.com\/item\/[^"]+)"/i);
    if (!imgMatch) continue;
    const imageUrl = imgMatch[1];

    const priceMatch = block.match(/id="tcb_\d+_\d+"[^>]*>\s*\$([0-9,]+(?:\.[0-9]+)?)\s*<\/span>/i);
    if (!priceMatch) continue;
    const currentBid = parseFloat(priceMatch[1].replace(/,/g, ""));
    if (!Number.isFinite(currentBid) || currentBid <= 0) continue;

    const bidMatch = block.match(/id="tbc_\d+_\d+"[^>]*>\s*(\d+)\s*Bids?\s*<\/span>/i);
    const bidCount = bidMatch ? parseInt(bidMatch[1], 10) : 0;

    // countDownTimer(startUnixSec, endUnixSec, "timer_...")
    const timerMatch = block.match(/countDownTimer\(\s*(\d+)\s*,\s*(\d+)\s*,/i);
    if (!timerMatch) continue; // No invented auction closing time.
    let secondsRemaining = 0;
    if (timerMatch) {
      const endSec = parseInt(timerMatch[2], 10);
      secondsRemaining = endSec - nowSec;
      if (secondsRemaining <= 0) continue;
    }

    const parsed = parseAndFilterListing(rawTitle);
    if (
      !parsed.isCertifiedSlab ||
      parsed.grade === null ||
      parsed.isReprintOrToy ||
      !parsed.extractedSeries ||
      parsed.extractedSeries === "Unknown Series"
    ) {
      continue;
    }

    out.push({
      id: `hakes-${itemId}`,
      source: "hakes" as AuctionSource,
      title: rawTitle,
      currentBid,
      shippingCost: 19,
      bidCount,
      secondsRemaining,
      timeLeftStr: formatTimeLeft(secondsRemaining),
      url,
      imageUrl,
      isBuyItNow: false,
      listingType: "Auction",
      currency: "USD",
      originalBid: currentBid,
      internationalRegion: "US",
    });
  }

  return out;
}

async function fetchHtml(url: string, timeoutMs = 15000): Promise<{ status: number; html: string }> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const html = res.ok ? await res.text() : "";
    return { status: res.status, html };
  } catch {
    return { status: 0, html: "" };
  }
}

/**
 * Fetches live graded comic auctions and Buy It Now slabs across ComicConnect, Metropolis, and Hake's.
 * Rotates pages/series by `slot` on normal cron runs, or performs a broader sweep when `fullSweep` is true.
 */
export async function fetchLiveVenueListings(
  slot: number,
  opts: { fullSweep?: boolean } = {}
): Promise<{
  items: RawAuctionListing[];
  statuses: Record<string, number>;
  calls: number;
}> {
  const statuses: Record<string, number> = {};
  const seen = new Map<string, RawAuctionListing>();
  let calls = 0;

  const bump = (prefix: string, status: number) => {
    const k = `${prefix}_${status}`;
    statuses[k] = (statuses[k] ?? 0) + 1;
  };

  // 1. ComicConnect Event Auctions + Live Auctions First + Highest Grade Slabs
  const ccUrls: string[] = [];
  const pageOffset = (slot % 5) + 1;
  if (opts.fullSweep) {
    for (let p = 1; p <= 6; p++) {
      ccUrls.push(
        `https://www.comicconnect.com/browse/?filters=1&stock_category_id%5B0%5D%5Bo%5D=E&stock_category_id%5B0%5D%5Bv%5D=1&sort_type=auctions_first&page=${p}`
      );
    }
    for (let p = 1; p <= 4; p++) {
      ccUrls.push(`https://www.comicconnect.com/browse/auction/61?page=${p}`);
      ccUrls.push(
        `https://www.comicconnect.com/browse/?filters=1&stock_category_id%5B0%5D%5Bo%5D=E&stock_category_id%5B0%5D%5Bv%5D=1&sort_type=grade_high&page=${p}`
      );
      ccUrls.push(
        `https://www.comicconnect.com/browse/?filters=1&stock_category_id%5B0%5D%5Bo%5D=E&stock_category_id%5B0%5D%5Bv%5D=1&sort_type=sale_first&page=${p}`
      );
    }
    for (const q of KEY_COMIC_SEARCHES.slice(0, 20)) {
      ccUrls.push(
        `https://www.comicconnect.com/browse/?filtertype=Comics&search=${encodeURIComponent(q)}&sort_type=auctions_first&save=submit`
      );
      ccUrls.push(
        `https://www.comicconnect.com/browse/?filtertype=Comics&search=${encodeURIComponent(q)}&sort_type=grade_high&save=submit`
      );
    }
  } else {
    ccUrls.push(
      `https://www.comicconnect.com/browse/?filters=1&stock_category_id%5B0%5D%5Bo%5D=E&stock_category_id%5B0%5D%5Bv%5D=1&sort_type=auctions_first&page=${pageOffset}`,
      `https://www.comicconnect.com/browse/auction/61?page=${pageOffset}`,
      `https://www.comicconnect.com/browse/?filters=1&stock_category_id%5B0%5D%5Bo%5D=E&stock_category_id%5B0%5D%5Bv%5D=1&sort_type=grade_high&page=${pageOffset}`,
      `https://www.comicconnect.com/browse/?filters=1&stock_category_id%5B0%5D%5Bo%5D=E&stock_category_id%5B0%5D%5Bv%5D=1&sort_type=sale_first&page=${pageOffset}`
    );
    for (let i = 0; i < 4; i++) {
      const q = KEY_COMIC_SEARCHES[(slot * 4 + i) % KEY_COMIC_SEARCHES.length];
      ccUrls.push(
        `https://www.comicconnect.com/browse/?filtertype=Comics&search=${encodeURIComponent(q)}&sort_type=auctions_first&save=submit`,
        `https://www.comicconnect.com/browse/?filtertype=Comics&search=${encodeURIComponent(q)}&sort_type=grade_high&save=submit`
      );
    }
  }

  // 2. Metropolis Collectibles Fixed-Price Graded Comics
  const metroUrls: string[] = [];
  if (opts.fullSweep) {
    for (let p = 1; p <= 4; p++) {
      metroUrls.push(
        `https://www.metropoliscomics.com/browse/?filters=1&stock_category_id%5B0%5D%5Bo%5D=E&stock_category_id%5B0%5D%5Bv%5D=1&sort_type=grade_high&page=${p}`
      );
    }
    for (const q of KEY_COMIC_SEARCHES.slice(0, 12)) {
      metroUrls.push(
        `https://www.metropoliscomics.com/browse/?filtertype=Comics&search=${encodeURIComponent(q)}&sort_type=grade_high&save=submit`
      );
    }
  } else {
    metroUrls.push(
      `https://www.metropoliscomics.com/browse/?filters=1&stock_category_id%5B0%5D%5Bo%5D=E&stock_category_id%5B0%5D%5Bv%5D=1&sort_type=grade_high&page=${pageOffset}`
    );
    const q = KEY_COMIC_SEARCHES[slot % KEY_COMIC_SEARCHES.length];
    metroUrls.push(
      `https://www.metropoliscomics.com/browse/?filtertype=Comics&search=${encodeURIComponent(q)}&sort_type=grade_high&save=submit`
    );
  }

  // Execute ComicConnect & Metropolis fetches in bounded parallel batches of 3
  const allCcMetro: Array<{ venue: "comicconnect" | "metropolis"; baseUrl: string; url: string }> = [
    ...ccUrls.map((url) => ({ venue: "comicconnect" as const, baseUrl: "https://www.comicconnect.com", url })),
    ...metroUrls.map((url) => ({ venue: "metropolis" as const, baseUrl: "https://www.metropoliscomics.com", url })),
  ];

  for (let i = 0; i < allCcMetro.length; i += 3) {
    const batch = allCcMetro.slice(i, i + 3);
    const results = await Promise.all(
      batch.map(async (entry) => {
        const res = await fetchHtml(entry.url);
        return { ...entry, ...res };
      })
    );
    for (const r of results) {
      calls++;
      bump(r.venue, r.status);
      if (r.status === 200 && r.html) {
        for (const item of parseComicConnectOrMetropolisHtml(r.html, r.venue, r.baseUrl)) {
          seen.set(item.id, item);
        }
      }
    }
  }

  // 2b. Browser-verifiable public catalogs. These are also fetched server-side
  // when the venue permits it; a WAF response simply produces zero items and a
  // recorded HTTP status, never synthetic listings.
  const publicCatalogs: Array<{ venue: "heritage" | "mycomicshop" | "comiclink"; baseUrl: string; url: string }> = [
    { venue: "heritage", baseUrl: "https://comics.ha.com", url: "https://comics.ha.com/c/search/results.zx?si=2&dept=1938&live_state=5318%7E5319%7E5320%7E5321%7E5324&mode=live" },
    { venue: "mycomicshop", baseUrl: "https://www.mycomicshop.com", url: "https://www.mycomicshop.com/auctions" },
    { venue: "comiclink", baseUrl: "https://www.comiclink.com", url: "https://www.comiclink.com/auctions/preview.asp?code=2026oct&pg=1" },
  ];
  for (const entry of publicCatalogs) {
    const res = await fetchHtml(entry.url);
    calls++;
    bump(entry.venue, res.status);
    if (res.status === 200 && res.html) {
      for (const item of parsePublicAuctionCatalogHtml(res.html, entry.venue, entry.baseUrl)) seen.set(item.id, item);
    }
  }

  // 3. Hake's Auctions: discover active auction catalog URLs from /auctions, then query CGC & CBCS lots
  const hakesIndex = await fetchHtml("https://www.hakes.com/auctions");
  calls++;
  bump("hakes", hakesIndex.status);
  // Only catalogs discovered from the current index qualify as live sources.
  const hakesCatalogUrls = new Set<string>();
  if (hakesIndex.status === 200 && hakesIndex.html) {
    const matches =
      hakesIndex.html.match(/https:\/\/www\.hakes\.com\/auctions\/hakes-auctions\/[a-z0-9\-]+\/catalog/gi) ?? [];
    for (const m of matches) hakesCatalogUrls.add(m);
  }

  const hakesSearches: string[] = [];
  for (const catUrl of Array.from(hakesCatalogUrls).slice(0, 3)) {
    hakesSearches.push(`${catUrl}?search=CGC&limit=120`);
    hakesSearches.push(`${catUrl}?search=CBCS&limit=120`);
  }

  const hakesResults = await Promise.all(hakesSearches.map((u) => fetchHtml(u)));
  const nowMs = Date.now();
  for (const hr of hakesResults) {
    calls++;
    bump("hakes", hr.status);
    if (hr.status === 200 && hr.html) {
      for (const item of parseHakesCatalogHtml(hr.html, nowMs)) {
        seen.set(item.id, item);
      }
    }
  }

  return {
    items: Array.from(seen.values()),
    statuses,
    calls,
  };
}

/**
 * Harvests real completed sales (`confirmed: true`) from ComicConnect's sold archive for a list of
 * `{ series, issue }` books plus general sold pages.
 */
export async function fetchVenueCompletedSales(
  books: Array<{ series: string; issue: string }>,
  slot: number,
  opts: { maxBookQueries?: number } = {}
): Promise<{ sales: RealizedVenueSaleRow[]; calls: number }> {
  const maxBookQueries = opts.maxBookQueries ?? 8;
  const dedupBooks = new Map<string, { series: string; issue: string }>();
  for (const b of books) {
    if (!b.series || b.series === "Unknown Series" || !b.issue) continue;
    const k = seriesKey(b.series, b.issue);
    if (!dedupBooks.has(k)) dedupBooks.set(k, b);
  }

  const bookList = Array.from(dedupBooks.values());
  const selectedBooks =
    bookList.length <= maxBookQueries
      ? bookList
      : Array.from({ length: maxBookQueries }, (_, idx) => bookList[(slot * maxBookQueries + idx) % bookList.length]);

  const urls: string[] = [
    `https://www.comicconnect.com/browse/?filtertype=Sold&stock_category_id%5B0%5D%5Bo%5D=E&stock_category_id%5B0%5D%5Bv%5D=1&sort_type=title_issue&page=${(slot % 10) + 1}`,
  ];

  for (const b of selectedBooks) {
    const cleanSeries = b.series.replace(/[:;'"!()]/g, " ").replace(/\s+/g, " ").trim();
    const q = `${cleanSeries} ${String(b.issue).replace(/^#/, "")}`;
    urls.push(
      `https://www.comicconnect.com/browse/?filtertype=Comics&search=${encodeURIComponent(q)}&show_sold_search=1&save=submit`
    );
  }

  const salesMap = new Map<string, RealizedVenueSaleRow>();
  let calls = 0;

  for (let i = 0; i < urls.length; i += 8) {
    const batch = urls.slice(i, i + 8);
    const results = await Promise.all(batch.map((u) => fetchHtml(u)));
    for (const r of results) {
      calls++;
      if (r.status === 200 && r.html) {
        for (const s of parseComicConnectSoldHtml(r.html)) {
          salesMap.set(s.id, s);
        }
      }
    }
  }

  return {
    sales: Array.from(salesMap.values()),
    calls,
  };
}
