/**
 * harvest_covers_worker.cjs
 *
 * Automated Multi-Source Cover Harvesting & Verification Worker
 *
 * Systematically walks the comics catalog, checks candidate image sources
 * (direct URLs, PriceCharting, GCD archival CDN, ComicBase), computes SHA256
 * checksums, uploads binary assets to Supabase storage ('comic-covers/pp/...'),
 * and updates public.comics with verified cover storage paths and audit timestamps.
 */

const crypto = require('crypto');
const { Client: PgClient } = require('pg');
const { createClient } = require('@supabase/supabase-js');

// Database & Storage Credentials
const DIRECT_URL =
  process.env.CLEAN_DATABASE_URL ||
  process.env.SUPABASE_DIRECT_URL ||
  undefined;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vbcmjmakluyjnsmisoth.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } }) : null;

// Parse CLI flags
const args = process.argv.slice(2);
function getArg(name, defaultValue) {
  const idx = args.indexOf(name);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return defaultValue;
}
const BATCH_SIZE = parseInt(getArg('--batch-size', '10'), 10);
const MAX_TOTAL = parseInt(getArg('--limit', '50'), 10);
const IS_DAEMON = args.includes('--daemon');
const SLEEP_MS = parseInt(getArg('--delay', '500'), 10);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildGcdUrl(gcdSourceId) {
  if (!gcdSourceId) return null;
  const cleanId = String(gcdSourceId).trim().replace(/^gcd[:-]/i, '');
  const numId = parseInt(cleanId, 10);
  if (isNaN(numId) || numId <= 0) return null;
  const folder = Math.floor(numId / 1000);
  return `https://files1.comics.org/img/gcd/covers_by_id/${folder}/w400/${numId}.jpg`;
}

function buildPriceChartingUrl(panelProfitsData) {
  if (!panelProfitsData) return null;
  const pcId =
    panelProfitsData.product_id_verified ||
    panelProfitsData.PriceCharting_ID ||
    panelProfitsData.pricecharting_id ||
    panelProfitsData['PriceCharting ID'];
  if (pcId && String(pcId).trim().length > 0) {
    return `https://www.pricecharting.com/game-cover?id=${String(pcId).trim()}`;
  }
  return null;
}

async function fetchImageBuffer(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/jpeg,image/png,image/*,*/*;q=0.8',
        Referer: 'https://comicbookstockexchange.com/',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('image') && !contentType.includes('octet-stream')) {
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length < 1000) return null; // Discard empty stubs or 1x1 pixels
    return { buffer, contentType: contentType.split(';')[0].trim() || 'image/jpeg' };
  } catch {
    return null;
  }
}

async function processHarvestCycle(client) {
  console.log(`\n[CoverHarvest] Fetching unverified batch (limit ${BATCH_SIZE})...`);

  // Target comics without verified covers, prioritizing priced/market assets first
  const query = `
    SELECT id, series, issue_number, publisher, cover_url, cover_retrieval_url,
           cover_original_url, cover_storage_path, cover_verified_at, gcd_source_id,
           panel_profits_data, comicbase_data, gcd_data
    FROM public.comics
    WHERE cover_verified_at IS NULL
    LIMIT $1
  `;

  const { rows } = await client.query(query, [BATCH_SIZE]);
  if (rows.length === 0) {
    console.log('[CoverHarvest] No unverified comics pending harvest in this batch.');
    return 0;
  }

  console.log(`[CoverHarvest] Processing ${rows.length} candidate issues...`);
  let verifiedCount = 0;

  for (const comic of rows) {
    const comicId = comic.id;
    const prefix = comicId.slice(0, 2);
    const storagePath = `pp/${prefix}/${comicId}.jpg`;

    // Candidate URL resolution list
    const candidateUrls = [];

    // 1. Direct URLs on record
    if (comic.cover_url && comic.cover_url.startsWith('http')) {
      candidateUrls.push({ url: comic.cover_url, source: 'CANONICAL_URL' });
    }
    if (comic.cover_retrieval_url && comic.cover_retrieval_url.startsWith('http')) {
      candidateUrls.push({ url: comic.cover_retrieval_url, source: 'RETRIEVAL_URL' });
    }
    if (comic.cover_original_url && comic.cover_original_url.startsWith('http')) {
      candidateUrls.push({ url: comic.cover_original_url, source: 'ORIGINAL_URL' });
    }

    // 2. PriceCharting cover
    const pcUrl = buildPriceChartingUrl(comic.panel_profits_data);
    if (pcUrl) candidateUrls.push({ url: pcUrl, source: 'PRICECHARTING_CDN' });

    // 3. GCD Archive URL
    const gcdId =
      comic.gcd_source_id ||
      comic.gcd_data?.id ||
      comic.gcd_data?.issue_id ||
      comic.gcd_data?.['GCD - gcd_issue.id'];
    const gcdUrl = buildGcdUrl(gcdId);
    if (gcdUrl) candidateUrls.push({ url: gcdUrl, source: 'GCD_ARCHIVE' });

    // 4. ComicBase picture URL
    if (comic.comicbase_data) {
      const cb = comic.comicbase_data;
      const cbUrl = cb.CoverImageURL || cb.PictureURL || cb.image_url;
      if (cbUrl && typeof cbUrl === 'string' && cbUrl.startsWith('http')) {
        candidateUrls.push({ url: cbUrl, source: 'COMICBASE' });
      }
    }

    let downloaded = null;
    let successfulSource = null;

    for (const candidate of candidateUrls) {
      downloaded = await fetchImageBuffer(candidate.url);
      if (downloaded) {
        successfulSource = candidate.source;
        break;
      }
    }

    if (downloaded && supabase) {
      const sha256 = crypto.createHash('sha256').update(downloaded.buffer).digest('hex');

      // Upload binary to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('comic-covers')
        .upload(storagePath, downloaded.buffer, {
          contentType: downloaded.contentType,
          cacheControl: '31536000',
          upsert: true,
        });

      if (!uploadError) {
        // Update database record with verified cover storage path & SHA256 checksum
        await client.query(
          `
          UPDATE public.comics
          SET cover_storage_path = $1,
              cover_sha256 = $2,
              cover_verified_at = NOW(),
              cover_source = $3
          WHERE id = $4
        `,
          [storagePath, sha256, successfulSource, comicId]
        );

        verifiedCount++;
        console.log(
          `  ✓ [${verifiedCount}] Verified: "${comic.series || 'Comic'} #${comic.issue_number || '1'}" -> ${storagePath} (SHA256: ${sha256.slice(0, 12)}...) via ${successfulSource}`
        );
      } else {
        console.warn(`  ✗ Failed uploading ${comicId} to storage:`, uploadError.message);
      }
    } else {
      // No downloadable image found across providers: mark audited to prevent infinite retries
      await client.query(
        `
        UPDATE public.comics
        SET cover_verified_at = NOW(),
            cover_source = 'FALLBACK_SYNTHETIC'
        WHERE id = $1
      `,
        [comicId]
      );
      console.log(`  - [Audited] "${comic.series || 'Comic'} #${comic.issue_number || '1'}": No remote art, marked fallback`);
    }

    await sleep(SLEEP_MS);
  }

  return rows.length;
}

async function runWorker() {
  console.log('=====================================================');
  console.log('PANEL PROFITS BACKGROUND COVER HARVESTING WORKER');
  console.log('=====================================================');
  console.log(`Mode: ${IS_DAEMON ? 'DAEMON (Continuous Loop)' : 'SINGLE RUN'}`);
  console.log(`Batch Size: ${BATCH_SIZE} | Limit: ${MAX_TOTAL}`);

  const client = new PgClient({ connectionString: DIRECT_URL });
  await client.connect();
  console.log('[CoverHarvest] Connected to clean database.');

  let totalProcessed = 0;

  try {
    do {
      const processed = await processHarvestCycle(client);
      totalProcessed += processed;
      if (processed === 0) {
        if (IS_DAEMON) {
          console.log('[CoverHarvest] Idle. Sleeping 30 seconds before next scan...');
          await sleep(30000);
        } else {
          break;
        }
      }
      if (!IS_DAEMON && totalProcessed >= MAX_TOTAL) {
        console.log(`[CoverHarvest] Reached batch limit of ${MAX_TOTAL} records.`);
        break;
      }
    } while (IS_DAEMON || totalProcessed < MAX_TOTAL);
  } finally {
    await client.end();
    console.log('[CoverHarvest] Database connection closed.');
  }

  console.log(`[CoverHarvest] Session finished. Total processed: ${totalProcessed}.`);
}

runWorker().catch((err) => {
  console.error('[CoverHarvest Fatal Error]:', err);
  process.exit(1);
});
