import { createClient } from '@supabase/supabase-js';
import type { PriceChartingFullPageData } from '@/lib/pricecharting/page-extractor';

const MARKET_SUPABASE_URL =
  process.env.MARKET_SUPABASE_URL || 'https://tbyuiegalahwbgdayosu.supabase.co';
const MARKET_SUPABASE_KEY =
  process.env.MARKET_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.MARKET_SUPABASE_ANON_KEY ||
  'sb_publishable_8PqVGZnUmageIRLUI_N8eQ_Vuq3ZMuk';

export interface ComicMarketRow {
  pricecharting_id: string;
  title: string;
  series: string | null;
  issue_number: string | null;
  publication_year: number | null;
  cover_url: string | null;
  full_price_guide: Record<string, number | null>;
  buy_sell_pairs: PriceChartingFullPageData['buySellPairs'];
  sold_listings: PriceChartingFullPageData['soldListings'];
  item_details: PriceChartingFullPageData['itemDetails'];
  chart_data: Record<string, Array<[number, number]>>;
  fetched_at: string;
}

function getMarketClient() {
  return createClient(MARKET_SUPABASE_URL, MARKET_SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getComicMarketData(
  pricechartingId: string
): Promise<ComicMarketRow | null> {
  const supabase = getMarketClient();
  const { data, error } = await supabase
    .from('comics_market')
    .select('*')
    .eq('pricecharting_id', pricechartingId)
    .maybeSingle();

  if (error || !data) return null;
  return data as ComicMarketRow;
}

export async function upsertComicMarketData(params: {
  pricechartingId: string;
  title: string;
  series: string | null;
  issueNumber: string | null;
  publicationYear: number | null;
  coverUrl: string | null;
  fullPage: PriceChartingFullPageData;
}): Promise<void> {
  const serviceKey = process.env.MARKET_SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return;

  const supabase = createClient(MARKET_SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await supabase.from('comics_market').upsert(
    {
      pricecharting_id: params.pricechartingId,
      title: params.title,
      series: params.series,
      issue_number: params.issueNumber,
      publication_year: params.publicationYear,
      cover_url: params.coverUrl,
      full_price_guide: params.fullPage.fullPriceGuide,
      buy_sell_pairs: params.fullPage.buySellPairs,
      sold_listings: params.fullPage.soldListings,
      item_details: params.fullPage.itemDetails,
      chart_data: params.fullPage.chartData,
      fetched_at: params.fullPage.fetchedAt,
    },
    { onConflict: 'pricecharting_id' }
  );
}
