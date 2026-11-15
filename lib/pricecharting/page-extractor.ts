export interface BuySellPair {
  grade: string;
  price: number | null;
  volume: string | null;
  buy: number | null;
  sell: number | null;
}

export interface SoldListing {
  saleDate: string;
  title: string;
  url: string | null;
  price: number;
  gradeTab: string | null;
  parsedGrade: string | null;
}

export interface ItemDetails {
  isKeyIssue: boolean | null;
  releaseDate: string | null;
  publisher: string | null;
  modelNumber: string | null;
  printRun: string | null;
  notes: string | null;
  upc: string | null;
  epid: string | null;
  comicOrgId: string | null;
  myComicShopId: string | null;
  pricechartingId: string;
}

export interface PriceChartingFullPageData {
  pricechartingId: string;
  fetchedAt: string;
  fullPriceGuide: Record<string, number | null>;
  buySellPairs: BuySellPair[];
  soldListings: SoldListing[];
  itemDetails: ItemDetails;
  chartData: Record<string, Array<[number, number]>>;
}

function parseDollar(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseChartData(html: string): Record<string, Array<[number, number]>> {
  const match = html.match(/VGPC\.chart_data\s*=\s*(\{[\s\S]*?\});/);
  if (!match) return {};
  try {
    return JSON.parse(match[1]) as Record<string, Array<[number, number]>>;
  } catch {
    return {};
  }
}

function parseFullPriceGuide(html: string): Record<string, number | null> {
  const result: Record<string, number | null> = {};
  const sectionMatch = html.match(/id="full-prices"[\s\S]*?<table[\s\S]*?<\/table>/i);
  if (!sectionMatch) return result;

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(sectionMatch[0])) !== null) {
    const cells = [...rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      stripTags(m[1])
    );
    if (cells.length >= 2) {
      const grade = cells[0].replace(/\s+/g, ' ').trim();
      if (grade) {
        result[grade] = cells[1] === '-' ? null : parseDollar(cells[1]);
      }
    }
  }
  return result;
}

function parseBuySellPairs(html: string): BuySellPair[] {
  const pairs: BuySellPair[] = [];
  const priceBoxMatch = html.match(/id="price_data"[\s\S]*?<\/table>/i);
  if (!priceBoxMatch) return pairs;

  const tableHtml = priceBoxMatch[0];
  const headerMatch = tableHtml.match(/<thead[\s\S]*?<\/thead>/i);
  const grades: string[] = [];
  if (headerMatch) {
    for (const th of headerMatch[0].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)) {
      const label = stripTags(th[1]).replace(/⚑/g, '').trim();
      if (label) grades.push(label);
    }
  }

  const tbodyMatch = tableHtml.match(/<tbody[\s\S]*?<\/tbody>/i);
  if (!tbodyMatch || grades.length === 0) return pairs;

  const rows = [...tbodyMatch[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const priceCells = rows[0]
    ? [...rows[0][1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => stripTags(m[1]))
    : [];

  const buyRow = rows.find((r) => /Buy:/i.test(r[1]));
  const sellRow = rows.find((r) => /Sell:/i.test(r[1]));
  const volRow = rows.find((r) => /volume:/i.test(r[1]));

  const buyCells = buyRow
    ? [...buyRow[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => stripTags(m[1]))
    : [];
  const sellCells = sellRow
    ? [...sellRow[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => stripTags(m[1]))
    : [];
  const volCells = volRow
    ? [...volRow[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => stripTags(m[1]))
    : [];

  for (let i = 0; i < grades.length; i++) {
    const priceText = priceCells[i] ?? '';
    const firstDollar = priceText.match(/\$[0-9,.]+/)?.[0] ?? null;
    const volText = volCells[i]?.replace(/^volume:\s*/i, '').trim() || null;
    const buyText = buyCells[i]?.replace(/^Buy:\s*/i, '').trim() || null;
    const sellText = sellCells[i]?.replace(/^Sell:\s*/i, '').trim() || null;

    pairs.push({
      grade: grades[i],
      price: parseDollar(firstDollar),
      volume: volText,
      buy: parseDollar(buyText),
      sell: parseDollar(sellText),
    });
  }

  return pairs;
}

function parseGradeFromTitle(title: string): string | null {
  const m = title.match(/\b(?:CGC|CBCS|PGX)\b[^0-9]{0,20}\b(10(?:\.0)?|[0-9]\.[0-9])\b/i);
  if (!m) return null;
  return m[1] === '10' ? '10.0' : m[1];
}

function normalizeTabGrade(tabId: string | null): string | null {
  if (!tabId) return null;
  if (tabId.includes('used')) return 'Raw';
  if (tabId.includes('cib')) return '4.0';
  if (tabId.includes('new')) return '6.0';
  if (tabId.includes('graded')) return '8.0';
  if (tabId.includes('boxonly')) return '9.2';
  if (tabId.includes('manualonly')) return '9.8';
  const numMatch = tabId.match(/([0-9]+(?:\.[0-9]+)?)$/);
  return numMatch ? numMatch[1] : tabId;
}

function parseSoldListings(html: string): SoldListing[] {
  const listings: SoldListing[] = [];
  const seen = new Set<string>();

  const tabRegex = /<div[^>]+id="(completed-auctions-[^"]+)"[^>]*>([\s\S]*?)(?=<div[^>]+id="completed-auctions-|<\/div>\s*<div[^>]+id="itemdetails")/gi;
  let tabMatch: RegExpExecArray | null;
  const blocks: Array<{ tabId: string | null; content: string }> = [];

  while ((tabMatch = tabRegex.exec(html)) !== null) {
    blocks.push({ tabId: normalizeTabGrade(tabMatch[1]), content: tabMatch[2] });
  }

  if (blocks.length === 0) {
    blocks.push({ tabId: null, content: html });
  }

  for (const block of blocks) {
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch: RegExpExecArray | null;
    while ((rowMatch = rowRegex.exec(block.content)) !== null) {
      const rowHtml = rowMatch[1];
      const dateMatch = rowHtml.match(/<td[^>]*class="[^"]*date[^"]*"[^>]*>([\s\S]*?)<\/td>/i);
      const titleMatch = rowHtml.match(/<td[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/td>/i);
      const priceMatch = rowHtml.match(/<td[^>]*class="[^"]*numeric[^"]*"[^>]*>([\s\S]*?)<\/td>/i);
      if (!dateMatch || !titleMatch || !priceMatch) continue;

      const saleDate = stripTags(dateMatch[1]);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(saleDate)) continue;

      const title = stripTags(titleMatch[1]).replace(/\s*\[eBay\]$/i, '').trim();
      const hrefMatch = titleMatch[1].match(/href="([^"]+)"/i);
      const url = hrefMatch ? hrefMatch[1].replace(/&amp;/g, '&') : null;
      const price = parseDollar(stripTags(priceMatch[1]));
      if (price === null) continue;

      const key = `${saleDate}|${title}|${price}`;
      if (seen.has(key)) continue;
      seen.add(key);

      listings.push({
        saleDate,
        title,
        url,
        price,
        gradeTab: block.tabId,
        parsedGrade: parseGradeFromTitle(title),
      });
    }
  }

  return listings;
}

function parseItemDetails(html: string, pricechartingId: string): ItemDetails {
  const details: ItemDetails = {
    isKeyIssue: null,
    releaseDate: null,
    publisher: null,
    modelNumber: null,
    printRun: null,
    notes: null,
    upc: null,
    epid: null,
    comicOrgId: null,
    myComicShopId: null,
    pricechartingId,
  };

  const rowRegex = /<tr[^>]*>\s*<td[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*class="[^"]*details[^"]*"[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const label = stripTags(rowMatch[1]).replace(/:$/, '').trim().toLowerCase();
    const rawVal = stripTags(rowMatch[2]).replace(/\s*(edit|make key)$/i, '').trim();
    const val = rawVal === 'none' || rawVal === 'n/a' || rawVal === '' ? null : rawVal;

    if (label === 'is key issue') {
      details.isKeyIssue = val ? /^yes$/i.test(val) : null;
    } else if (label === 'release date') {
      details.releaseDate = val;
    } else if (label === 'publisher') {
      details.publisher = val;
    } else if (label === 'model number') {
      details.modelNumber = val;
    } else if (label === 'print run') {
      details.printRun = val;
    } else if (label === 'notes') {
      details.notes = val;
    } else if (label === 'upc') {
      details.upc = val;
    } else if (label === 'epid (ebay)') {
      details.epid = val;
    } else if (label === 'comic.org id') {
      details.comicOrgId = val;
    } else if (label === 'mycomicshop id') {
      details.myComicShopId = val;
    }
  }

  return details;
}

export async function fetchPriceChartingFullPage(
  pricechartingId: string
): Promise<PriceChartingFullPageData | null> {
  const url = `https://www.pricecharting.com/game/${encodeURIComponent(pricechartingId)}`;
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (compatible; PanelProfits/1.0)',
  };
  if (process.env.PRICECHARTING_COOKIE) {
    headers['Cookie'] = process.env.PRICECHARTING_COOKIE;
  }
  const res = await fetch(url, {
    headers,
    next: { revalidate: 3600 },
  });

  if (!res.ok) return null;
  const html = await res.text();

  return {
    pricechartingId,
    fetchedAt: new Date().toISOString(),
    fullPriceGuide: parseFullPriceGuide(html),
    buySellPairs: parseBuySellPairs(html),
    soldListings: parseSoldListings(html),
    itemDetails: parseItemDetails(html, pricechartingId),
    chartData: parseChartData(html),
  };
}

/**
 * Anchors each grade in the 14-grade lattice to its most recent verified sale
 * (matching parsedGrade first, then gradeTab) so decayed/manufactured guide
 * estimates never override real completed sales.
 */
export function reconcileGradeLattice(
  fullPriceGuide: Record<string, number | null>,
  soldListings: SoldListing[]
): Record<string, number | null> {
  const reconciled: Record<string, number | null> = { ...fullPriceGuide };
  const latestSaleByGrade = new Map<string, SoldListing>();

  for (const sale of soldListings) {
    const grade = sale.parsedGrade || sale.gradeTab;
    if (!grade) continue;
    const existing = latestSaleByGrade.get(grade);
    if (!existing || sale.saleDate > existing.saleDate) {
      latestSaleByGrade.set(grade, sale);
    }
  }

  for (const [grade, sale] of latestSaleByGrade.entries()) {
    const key = grade === '10.0' ? '10' : grade === 'Raw' ? 'Ungraded' : grade;
    if (key in reconciled && sale.price > 0) {
      reconciled[key] = sale.price;
    }
  }

  return reconciled;
}
