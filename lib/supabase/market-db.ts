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
