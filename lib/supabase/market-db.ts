import { createClient } from '@supabase/supabase-js';
import type { PriceChartingFullPageData } from '@/lib/pricecharting/page-extractor';

const MARKET_SUPABASE_URL =
  process.env.MARKET_SUPABASE_URL || 'https://tbyuiegalahwbgdayosu.supabase.co';
const MARKET_SUPABASE_KEY =
  process.env.MARKET_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.MARKET_SUPABASE_ANON_KEY ||
  'sb_publishable_8PqVGZnUmageIRLUI_N8eQ_Vuq3ZMuk';

export interface ComicMarketRow {
  asset_id: string;
  title: string;
  series: string | null;
  issue_number: string | null;
  publication_year: number | null;
  cover_url: string | null;
  diamond_code: string | null;
  comichron_units: number | null;
  cgc_census: Record<string, unknown>;
  grade_valuation_lattice: Record<string, number | null>;
  dealer_spreads: PriceChartingFullPageData['buySellPairs'];
  verified_sales_ledger: PriceChartingFullPageData['soldListings'];
  bibliographic_specs: Omit<PriceChartingFullPageData['itemDetails'], 'pricechartingId'>;
  historical_price_series: Record<string, Array<[number, number]>>;
  synced_at: string;
}

function getMarketClient() {
  return createClient(MARKET_SUPABASE_URL, MARKET_SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getComicMarketData(assetId: string): Promise<ComicMarketRow | null> {
  const supabase = getMarketClient();
  const { data, error } = await supabase
    .from('comics_market')
    .select('*')
    .eq('asset_id', assetId)
    .maybeSingle();

  if (error || !data) return null;
  return data as ComicMarketRow;
}

/** One completed sale saved by the PriceCharting sold-listings loader into comics_market.verified_sales_ledger. */
export interface MarketLedgerSale {
  sale_id: string;
  date: string;
  price: number;
  grade: string | null;
  venue: string | null;
  title: string | null;
  url: string | null;
  grader: string | null;
  page_quality: string | null;
}

/** Completed eBay / Heritage sales for one book from The_Final_Solution. Read-only; [] on any failure. */
export async function getMarketSalesLedger(assetId: string): Promise<MarketLedgerSale[]> {
  if (!assetId) return [];
  try {
    const { data, error } = await getMarketClient()
      .from('comics_market')
      .select('verified_sales_ledger')
      .eq('asset_id', assetId)
      .maybeSingle();
    if (error || !data || !Array.isArray(data.verified_sales_ledger)) return [];
    return (data.verified_sales_ledger as any[]).filter(
      (s) => s && typeof s.sale_id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(String(s.date)) && Number(s.price) > 0,
    ) as MarketLedgerSale[];
  } catch {
    return [];
  }
}

export async function upsertComicMarketData(params: {
  assetId: string;
  title: string;
  series: string | null;
  issueNumber: string | null;
  publicationYear: number | null;
  coverUrl: string | null;
  diamondCode?: string | null;
  comichronUnits?: number | null;
  cgcCensus?: Record<string, unknown>;
  fullPage: PriceChartingFullPageData;
}): Promise<void> {
  const serviceKey = process.env.MARKET_SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return;

  const supabase = createClient(MARKET_SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { pricechartingId: _omit, ...cleanSpecs } = params.fullPage.itemDetails;

  await supabase.from('comics_market').upsert(
    {
      asset_id: params.assetId,
      title: params.title,
      series: params.series,
      issue_number: params.issueNumber,
      publication_year: params.publicationYear,
      cover_url: params.coverUrl,
      diamond_code: params.diamondCode ?? null,
      comichron_units: params.comichronUnits ?? null,
      cgc_census: params.cgcCensus ?? {},
      grade_valuation_lattice: params.fullPage.fullPriceGuide,
      dealer_spreads: params.fullPage.buySellPairs,
      verified_sales_ledger: params.fullPage.soldListings,
      bibliographic_specs: cleanSpecs,
      historical_price_series: params.fullPage.chartData,
      synced_at: params.fullPage.fetchedAt,
    },
    { onConflict: 'asset_id' }
  );
}

export async function upsertGpaToComicsMarket(params: {
  series: string;
  issueNumber: string;
  publicationYear: number | null;
  cgcCensus: Record<string, unknown>;
}): Promise<void> {
  const serviceKey = process.env.MARKET_SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return;

  const supabase = createClient(MARKET_SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let query = supabase
    .from('comics_market')
    .update({ cgc_census: params.cgcCensus })
    .ilike('series', params.series)
    .eq('issue_number', params.issueNumber);

  if (params.publicationYear) {
    query = query.eq('publication_year', params.publicationYear);
  }

  await query;
}

export interface SlabCertRecord {
  cert_number: string;
  asset_id: string | null;
  grade: string;
  label_category: string | null;
  page_quality: string | null;
  grade_date: string | null;
  grader_notes: string[];
  signatures: string[];
  sale_history: Array<{ date: string; price: number; source: string }>;
  flip_count: number;
  last_sale_price: number | null;
  last_sale_date: string | null;
  front_scan_url: string | null;
  back_scan_url: string | null;
  updated_at: string;
}

export async function upsertSlabCert(params: {
  certNumber: string;
  assetId?: string | null;
  grade: string;
  labelCategory?: string | null;
  pageQuality?: string | null;
  gradeDate?: string | null;
  graderNotes?: string[];
  signatures?: string[];
  sale?: { date: string; price: number; source: string } | null;
  frontScanUrl?: string | null;
  backScanUrl?: string | null;
}): Promise<SlabCertRecord | null> {
  const serviceKey = process.env.MARKET_SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;

  const supabase = createClient(MARKET_SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing } = await supabase
    .from('slab_cert_registry')
    .select('sale_history')
    .eq('cert_number', params.certNumber)
    .maybeSingle();

  const history: Array<{ date: string; price: number; source: string }> = Array.isArray(
    existing?.sale_history
  )
    ? [...existing.sale_history]
    : [];

  if (params.sale && params.sale.price > 0) {
    const dup = history.some(
      (s) => s.date === params.sale!.date && s.price === params.sale!.price && s.source === params.sale!.source
    );
    if (!dup) history.push(params.sale);
  }

  history.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
  const latest = history[0] ?? null;

  const row = {
    cert_number: params.certNumber,
    asset_id: params.assetId ?? null,
    grade: params.grade,
    label_category: params.labelCategory ?? null,
    page_quality: params.pageQuality ?? null,
    grade_date: params.gradeDate ?? null,
    grader_notes: params.graderNotes ?? [],
    signatures: params.signatures ?? [],
    sale_history: history,
    flip_count: history.length,
    last_sale_price: latest ? latest.price : null,
    last_sale_date: latest ? latest.date : null,
    front_scan_url: params.frontScanUrl ?? null,
    back_scan_url: params.backScanUrl ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data } = await supabase
    .from('slab_cert_registry')
    .upsert(row, { onConflict: 'cert_number' })
    .select('*')
    .single();

  return (data as SlabCertRecord) ?? null;
}

export async function getSlabCertsForAsset(assetId: string): Promise<SlabCertRecord[]> {
  const supabase = getMarketClient();
  const { data, error } = await supabase
    .from('slab_cert_registry')
    .select('*')
    .eq('asset_id', assetId)
    .order('last_sale_date', { ascending: false });

  if (error || !data) return [];
  return data as SlabCertRecord[];
}

export interface BookFloatRecord {
  asset_id: string;
  era: string | null;
  print_units: number | null;
  printed_copies: number | null;
  print_basis: string | null;
  confidence: string | null;
  survival_rate: number | null;
  est_surviving: number | null;
  surviving_low: number | null;
  surviving_high: number | null;
  graded_cgc: number | null;
  est_raw: number | null;
  graded_share: number | null;
  sales_12m: number | null;
  active_float: number | null;
  vault_hoard: number | null;
  active_float_pct: number | null;
  velocity_tier: string | null;
  liquidity_tier: string | null;
  regime: string | null;
  tradable_float: number | null;
  flag: string | null;
}

/** Supply, survivors and float for one book from The_Final_Solution (table book_float). Read-only; null on any failure. */
export async function getBookFloat(assetId: string): Promise<BookFloatRecord | null> {
  if (!assetId) return null;
  try {
    const { data, error } = await getMarketClient()
      .from('book_float')
      .select('asset_id, era, print_units, printed_copies, print_basis, confidence, survival_rate, est_surviving, surviving_low, surviving_high, graded_cgc, est_raw, graded_share, sales_12m, active_float, vault_hoard, active_float_pct, velocity_tier, liquidity_tier, regime, tradable_float, flag')
      .eq('asset_id', assetId)
      .maybeSingle();
    if (error || !data) return null;
    return data as BookFloatRecord;
  } catch {
    return null;
  }
}
