import { createClient } from '@supabase/supabase-js';
import { fetchPriceChartingFullPage } from '../lib/pricecharting/page-extractor';
import { upsertComicMarketData } from '../lib/supabase/market-db';

const SOURCE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SOURCE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const MARKET_URL =
  process.env.MARKET_SUPABASE_URL || 'https://tbyuiegalahwbgdayosu.supabase.co';
const MARKET_KEY = process.env.MARKET_SUPABASE_SERVICE_ROLE_KEY || '';

function parseArgs() {
  const args = process.argv.slice(2);
  let concurrency = 10;
  let startAfterId = '';
  let maxTotal = Infinity;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--concurrency' && args[i + 1]) concurrency = Number(args[++i]) || 10;
    else if (args[i] === '--start-after' && args[i + 1]) startAfterId = args[++i];
    else if (args[i] === '--limit' && args[i + 1]) maxTotal = Number(args[++i]) || Infinity;
  }

  return { concurrency, startAfterId, maxTotal };
}

async function main() {
  if (!SOURCE_URL || !SOURCE_KEY || !MARKET_KEY) {
    console.error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or MARKET_SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const { concurrency, startAfterId, maxTotal } = parseArgs();
  const sourceDb = createClient(SOURCE_URL, SOURCE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const marketDb = createClient(MARKET_URL, MARKET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let lastId = startAfterId;
  let totalSynced = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  while (totalSynced + totalSkipped + totalFailed < maxTotal) {
    let query = sourceDb
      .from('pp_comics')
      .select('id, title, series, issue_number, publication_year, cover_url')
      .order('id', { ascending: true })
      .limit(250);

    if (lastId) {
      query = query.gt('id', lastId);
    }

    const { data: comics, error } = await query;
    if (error) {
      console.error('Source query error:', error.message);
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }
    if (!comics || comics.length === 0) break;

    lastId = String(comics[comics.length - 1].id);
    const ids = comics.map((c) => String(c.id));

    const { data: existing } = await marketDb
      .from('comics_market')
      .select('asset_id')
      .in('asset_id', ids);
    const existingSet = new Set((existing ?? []).map((r) => r.asset_id));

    const toSync = comics.filter((c) => !existingSet.has(String(c.id)));
    totalSkipped += comics.length - toSync.length;

    for (let i = 0; i < toSync.length; i += concurrency) {
      const batch = toSync.slice(i, i + concurrency);
      await Promise.all(
        batch.map(async (comic) => {
          try {
            const fullPage = await fetchPriceChartingFullPage(String(comic.id));
            if (!fullPage) {
              totalFailed++;
              return;
            }
            await upsertComicMarketData({
              assetId: String(comic.id),
              title: comic.title,
              series: comic.series ?? null,
              issueNumber: comic.issue_number ?? null,
              publicationYear: comic.publication_year ?? null,
              coverUrl: comic.cover_url ?? null,
              fullPage,
            });
            totalSynced++;
          } catch {
            totalFailed++;
          }
        })
      );
    }

    console.log(
      `[sync] lastId=${lastId} synced=${totalSynced} skipped=${totalSkipped} failed=${totalFailed}`
    );
  }

  console.log(`Complete. synced=${totalSynced} skipped=${totalSkipped} failed=${totalFailed}`);
}

main();
