import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

// Load .env.local if present
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const BRIGHTDATA_BROWSER_WS = process.env.BRIGHTDATA_BROWSER_WS;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const LABEL_MAP = {
  UNI: 'Universal',
  UN: 'Universal',
  SS: 'Signature Series',
  QL: 'Qualified',
  RS: 'Restored',
  MP: 'Restored',
  CON: 'Restored',
};

const MONTH_MAP = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

function randomDelay(minMs = 4000, maxMs = 8000) {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms)),
  ]);
}

function inferVenue(url) {
  if (!url) return 'GPAnalysis';
  const u = url.toLowerCase();
  if (u.includes('ha.com') || u.includes('heritage')) return 'Heritage Auctions';
  if (u.includes('ebay.com')) return 'eBay';
  if (u.includes('mycomicshop')) return 'MyComicShop';
  if (u.includes('comicconnect')) return 'ComicConnect';
  if (u.includes('comiclink')) return 'ComicLink';
  if (u.includes('cgccomics')) return 'CGC';
  if (u.includes('gpanalysis')) return 'GPAnalysis';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'GPAnalysis';
  }
}

function parseSaleDate(yearStr, mmmDd) {
  const m = (mmmDd || '').trim().match(/^([A-Za-z]{3})[-\s](\d{1,2})$/);
  if (!m) return null;
  const mm = MONTH_MAP[m[1]];
  if (!mm) return null;
  const dd = m[2].padStart(2, '0');
  return `${yearStr}-${mm}-${dd}`;
}

async function scrapeIssuePage(page, gpaUrl) {
  await page.goto(gpaUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('h3[id^="m"]', { timeout: 15000 }).catch(() => null);
  await page.waitForTimeout(1000);

  const urlMatch = page.url().match(/\/sales-data\/(\d+)\/([^/#?]+)/);
  const gpaSeriesId = urlMatch ? urlMatch[1] : null;

  // Find all #m variant/edition headings
  const mIds = await page.locator('h3[id^="m"]').evaluateAll((els) =>
    els.map((el) => ({
      id: el.id.replace(/^m/, ''),
      label: el.textContent?.trim().replace(/\s+/g, ' ') || '',
    }))
  );

  const editions = [];

  for (const mInfo of mIds) {
    const sectionHandle = await page.locator(`#m${mInfo.id}`).evaluateHandle((h3) => h3.closest('div, section') || h3.parentElement);

    // Click all Level 1 grade chevrons inside this #m section
    const lvl1Buttons = await sectionHandle.evaluate((sec) => {
      const btns = Array.from(sec.querySelectorAll('button.c-icon-button--responsive'));
      btns.forEach((b) => {
        if (b.getAttribute('aria-expanded') !== 'true') b.click();
      });
      return btns.length;
    });
    if (lvl1Buttons > 0) await page.waitForTimeout(2500);

    // Click all Level 2 year chevrons inside this #m section (only right-side responsive chevrons, never left-side star/graph buttons)
    const lvl2Buttons = await sectionHandle.evaluate((sec) => {
      const btns = Array.from(sec.querySelectorAll('button.c-icon-button--responsive'));
      let clicked = 0;
      btns.forEach((b) => {
        if (b.getAttribute('aria-expanded') !== 'true') {
          b.click();
          clicked++;
        }
      });
      return clicked;
    });
    if (lvl2Buttons > 0) await page.waitForTimeout(2500);

    // Extract grade summaries and individual transactions
    const parsed = await sectionHandle.evaluate((sec) => {
      const gradeSummaries = [];
      const transactions = [];

      const rows = Array.from(sec.querySelectorAll('tr'));
      let currentGradeTab = 'UNI 9.8';
      let currentYear = new Date().getFullYear().toString();

      for (const tr of rows) {
        const text = (tr.textContent || '').trim().replace(/\s+/g, ' ');
        if (!text) continue;

        // Check if this is a Level 1 grade row (e.g., "UNI 9.8 $19754 ...")
        const gradeMatch = text.match(/^(UNI|UN|SS|QL|RS|MP|CON)\s+(\d+\.\d+)/i);
        if (gradeMatch) {
          currentGradeTab = `${gradeMatch[1].toUpperCase()} ${gradeMatch[2]}`;
          gradeSummaries.push({
            gradeTab: currentGradeTab,
            labelCode: gradeMatch[1].toUpperCase(),
            grade: parseFloat(gradeMatch[2]),
            rawText: text,
          });
          continue;
        }

        // Check if this is a Level 2 year header row (e.g., "2025 15 $15799 ...")
        const yearMatch = text.match(/^(20\d{2}|19\d{2})\b/);
        if (yearMatch && !text.match(/^[A-Za-z]{3}[-\s]\d{1,2}/)) {
          currentYear = yearMatch[1];
          continue;
        }

        // Check if this is a Level 3 individual transaction row (e.g., "Dec-07 $26543 1165537001")
        const dateMatch = text.match(/\b([A-Za-z]{3}[-\s]\d{1,2})\b/);
        const priceMatch = text.match(/\$([\d,]+(?:\.\d{2})?)/);
        if (dateMatch && priceMatch) {
          const certMatch = text.match(/\b(\d{7,12})\b/);
          const linkEl = tr.querySelector('a[href^="http"]');
          const href = linkEl ? linkEl.getAttribute('href') : null;
          transactions.push({
            year: currentYear,
            mmmDd: dateMatch[1],
            price: parseFloat(priceMatch[1].replace(/,/g, '')),
            certNumber: certMatch ? certMatch[1] : null,
            url: href,
            gradeTab: currentGradeTab,
          });
        }
      }

      return { gradeSummaries, transactions };
    });

    const normalizedTx = parsed.transactions.map((tx) => {
      const [labelCode, gradeStr] = tx.gradeTab.split(' ');
      return {
        saleDate: parseSaleDate(tx.year, tx.mmmDd) || `${tx.year}-01-01`,
        title: mInfo.label,
        url: tx.url || `${gpaUrl}#m${mInfo.id}`,
        price: tx.price,
        venue: inferVenue(tx.url),
        gradeTab: tx.gradeTab,
        parsedGrade: parseFloat(gradeStr) || null,
        labelCategory: LABEL_MAP[labelCode] || 'Universal',
        certNumber: tx.certNumber,
      };
    });

    editions.push({
      gpaSeriesId,
      gpaEditionId: mInfo.id,
      gpaUrl: `${gpaUrl.split('#')[0]}#m${mInfo.id}`,
      editionLabel: mInfo.label,
      gradeSummaries: parsed.gradeSummaries,
      transactions: normalizedTx,
    });
  }

  return editions;
}

async function upsertIssueToSupabase(issueMeta, editions) {
  let variantsMatchedOrCreated = 0;
  let totalSalesWritten = 0;
  const uniqueCerts = new Set();

  // Fetch existing variant rows in public.comics_market for this (series, publication_year, issue_number)
  const { data: existingRows } = await supabase
    .from('comics_market')
    .select('asset_id, bibliographic_specs')
    .eq('series', issueMeta.series)
    .eq('publication_year', issueMeta.publication_year)
    .eq('issue_number', issueMeta.issue_number);

  const primaryRow = existingRows?.[0] || null;

  for (let i = 0; i < editions.length; i++) {
    const ed = editions[i];
    // Match by variant or use primary row for the first edition
    let targetAssetId = null;
    let existingSpecs = {};

    if (i === 0 && primaryRow) {
      targetAssetId = primaryRow.asset_id;
      existingSpecs = primaryRow.bibliographic_specs || {};
    } else {
      const matched = existingRows?.find((r) => {
        const v = (r.bibliographic_specs?.variant || '').toLowerCase();
        return v && ed.editionLabel.toLowerCase().includes(v);
      });
      if (matched) {
        targetAssetId = matched.asset_id;
        existingSpecs = matched.bibliographic_specs || {};
      }
    }

    if (!targetAssetId) {
      // Insert new linked variant row so zero sales or cert numbers are lost
      targetAssetId = `gpa-${ed.gpaSeriesId || '0'}-${ed.gpaEditionId}`;
      const newSpecs = {
        variant: ed.editionLabel,
        gpa_series_id: ed.gpaSeriesId,
        gpa_edition_id: ed.gpaEditionId,
        gpa_url: ed.gpaUrl,
      };
      await supabase.from('comics_market').upsert({
        asset_id: targetAssetId,
        title: `${issueMeta.series} ${issueMeta.issue_number} (${issueMeta.publication_year}) [${ed.editionLabel.slice(0, 60)}]`,
        series: issueMeta.series,
        issue_number: issueMeta.issue_number,
        publication_year: issueMeta.publication_year,
        bibliographic_specs: newSpecs,
        cgc_census: ed.gradeSummaries,
        verified_sales_ledger: ed.transactions,
        synced_at: new Date().toISOString(),
      }, { onConflict: 'asset_id' });
    } else {
      const updatedSpecs = {
        ...existingSpecs,
        gpa_series_id: ed.gpaSeriesId,
        gpa_edition_id: ed.gpaEditionId,
        gpa_url: ed.gpaUrl,
      };
      await supabase
        .from('comics_market')
        .update({
          bibliographic_specs: updatedSpecs,
          cgc_census: ed.gradeSummaries,
          verified_sales_ledger: ed.transactions,
          synced_at: new Date().toISOString(),
        })
        .eq('asset_id', targetAssetId);
    }

    variantsMatchedOrCreated++;
    totalSalesWritten += ed.transactions.length;

    // Group transactions by cert_number for slab_cert_registry
    const byCert = new Map();
    for (const tx of ed.transactions) {
      if (!tx.certNumber) continue;
      uniqueCerts.add(tx.certNumber);
      if (!byCert.has(tx.certNumber)) {
        byCert.set(tx.certNumber, {
          cert_number: tx.certNumber,
          asset_id: targetAssetId,
          grade: tx.parsedGrade,
          label_category: tx.labelCategory,
          sales: [],
        });
      }
      byCert.get(tx.certNumber).sales.push({
        date: tx.saleDate,
        price: tx.price,
        source: tx.venue,
        url: tx.url,
      });
    }

    const certRows = [];
    for (const [certNum, info] of byCert.entries()) {
      const sorted = info.sales.sort((a, b) => a.date.localeCompare(b.date));
      const last = sorted[sorted.length - 1];
      certRows.push({
        cert_number: certNum,
        asset_id: info.asset_id,
        grade: info.grade,
        label_category: info.label_category,
        sale_history: sorted,
        flip_count: sorted.length,
        last_sale_price: last?.price ?? null,
        last_sale_date: last?.date ?? null,
        updated_at: new Date().toISOString(),
      });
    }
    for (let c = 0; c < certRows.length; c += 500) {
      await supabase.from('slab_cert_registry').upsert(certRows.slice(c, c + 500), { onConflict: 'cert_number' });
    }
  }

  return { variantsMatchedOrCreated, totalSalesWritten, uniqueCertsCount: uniqueCerts.size };
}

async function searchAndOpenIssue(page, series, pubYear, issueNumber) {
  const bareIssue = issueNumber.replace(/^#/, '');
  const searchInput = page.locator('input[placeholder*="Search by title"]').first();
  if (!(await searchInput.isVisible().catch(() => false))) {
    await page.goto('https://comics.gpanalysis.com/analyse-prices', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
  }
  await searchInput.fill(`${series} ${bareIssue}`);
  await page.waitForTimeout(1500);

  // Click first matching autocomplete / search result
  const resultLink = page.locator('a[href*="/sales-data/"]').first();
  if (await resultLink.isVisible().catch(() => false)) {
    const href = await resultLink.getAttribute('href');
    const fullUrl = href.startsWith('http') ? href : `https://comics.gpanalysis.com${href}`;
    return await scrapeIssuePage(page, fullUrl);
  }
  return null;
}

async function main() {
  const isCe70 = process.argv.includes('--ce70');
  const isTest10 = process.argv.includes('--test-10');
  const isTest5 = process.argv.includes('--test-5');
  const useCdp = process.argv.includes('--cdp');
  const useProxy = process.argv.includes('--proxy') || (!isCe70 && !process.argv.includes('--direct'));

  const proxyServer = process.env.BRIGHTDATA_PROXY_SERVER || 'http://brd.superproxy.io:33335';
  const proxyUsername = process.env.BRIGHTDATA_PROXY_USERNAME;
  const proxyPassword = process.env.BRIGHTDATA_PROXY_PASSWORD;

  const statePath = path.resolve(process.cwd(), '.gpa-storage-state.json');

  let browser;
  if (useCdp) {
    console.log('[Browser] Connecting to existing Chrome at http://127.0.0.1:9222 ...');
    browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  } else if (useProxy && proxyUsername && proxyPassword) {
    console.log(`[Browser] Launching Playwright Chromium (headless: false) via Bright Data ISP proxy (${proxyServer})...`);
    browser = await chromium.launch({
      headless: false,
      proxy: {
        server: proxyServer,
        username: proxyUsername,
        password: proxyPassword,
      },
    });
  } else {
    console.log('[Browser] Launching Playwright Chromium (headless: false, direct local connection — no proxy)...');
    browser = await chromium.launch({ headless: false });
  }

  const context = useCdp
    ? browser.contexts()[0]
    : await browser.newContext({
        viewport: { width: 1440, height: 900 },
        ...(fs.existsSync(statePath) ? { storageState: statePath } : {}),
      });
  const page = useCdp ? (context.pages()[0] || await context.newPage()) : await context.newPage();

  if (!useCdp && !fs.existsSync(statePath)) {
    console.log('[GPA] Opening https://comics.gpanalysis.com/login — log in in the Chromium window (waiting up to 5 min)...');
    await page.goto('https://comics.gpanalysis.com/login', { waitUntil: 'domcontentloaded', timeout: 45000 });
    const deadline = Date.now() + 300000;
    let loggedIn = false;
    while (Date.now() < deadline) {
      const curUrl = page.url();
      const hasSearch = await page.locator('input[placeholder*="Search"]').first().isVisible().catch(() => false);
      if ((!curUrl.includes('/login') && curUrl.includes('gpanalysis.com')) || hasSearch) {
        loggedIn = true;
        break;
      }
      await page.waitForTimeout(1000);
    }
    if (!loggedIn) {
      throw new Error('Timed out after 5 minutes waiting for GPAnalysis login.');
    }
    await page.waitForTimeout(2000);
    await context.storageState({ path: statePath });
    console.log(`[GPA] Login detected & saved .gpa-storage-state.json. Current URL: ${page.url()}`);
  }

  try {
    if (isCe70) {
      const manifestPath = path.resolve(process.cwd(), 'scripts/ce70_gpa_manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const targets = (manifest.remaining || []).filter((t) => t.category === 'US_CGC_GPA_TARGET');
      console.log(`[CE70] Loaded ${targets.length} US CGC GPAnalysis targets from ${manifestPath}`);

      let totalSeatsUpdated = 0;
      let totalSalesWritten = 0;
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        console.log(`\n[CE70 ${i + 1}/${targets.length}] Seat #${t.seat}: ${t.titleLine} (catalog=${t.catalogId || 'unlinked'})...`);
        let editions = null;
        try {
          editions = await withTimeout(
            searchAndOpenIssue(page, t.series, t.year, `#${t.issueNumber}`),
            35000,
            t.titleLine
          );
        } catch (err) {
          console.log(`  -> Skipped (${err.message})`);
        }
        if (!editions || editions.length === 0 || !t.catalogId) {
          console.log(`  -> No editions scraped or unlinked catalogId.`);
        } else {
          // Write clean Universal complete-book transactions directly into verified_completed_sales
          const primaryEd = editions[0];
          const uniTx = (primaryEd.transactions || []).filter(
            (tx) => tx.labelCategory === 'Universal' && tx.parsedGrade >= 0.5 && tx.price > 0
          );
          if (uniTx.length > 0) {
            const vcsRows = uniTx.map((tx) => ({
              sale_id: `gpa-ce70-${t.catalogId}-${tx.parsedGrade.toFixed(1)}-${tx.saleDate}-${Math.round(tx.price)}${tx.certNumber ? '-' + tx.certNumber : ''}`,
              catalog_id: String(t.catalogId),
              lookup_key: `${String(t.series).toLowerCase()}:${t.issueNumber}`,
              price_usd: tx.price,
              sold_at: `${tx.saleDate}T16:00:00+00:00`,
              certified_grade: tx.parsedGrade,
              grading_company: 'CGC',
              label_type: 'Universal',
              cert_number: tx.certNumber || null,
              venue: tx.venue || 'GPAnalysis',
              source_url: tx.url || primaryEd.gpaUrl,
              raw_title: `${t.titleLine} CGC ${tx.parsedGrade.toFixed(1)} Universal`,
            }));
            for (let c = 0; c < vcsRows.length; c += 200) {
              await supabase.from('verified_completed_sales').upsert(vcsRows.slice(c, c + 200), { onConflict: 'sale_id' });
            }
            totalSeatsUpdated++;
            totalSalesWritten += vcsRows.length;
            console.log(`  -> Upserted ${vcsRows.length} verified Universal sales for Seat #${t.seat} (${t.titleLine})`);
          }
        }
        if (i < targets.length - 1) await randomDelay(4000, 8000);
      }
      console.log(`\n=== CE70 GPA SWEEP COMPLETE: ${totalSeatsUpdated}/${targets.length} seats updated, ${totalSalesWritten} Universal sales written ===`);
    } else if (isTest10 || isTest5) {
      const targetCount = isTest5 ? 5 : 10;
      const queue = isTest5
        ? [{ series: 'Amazing Spider-Man', publication_year: 1974, issue_number: '#129', directUrl: 'https://comics.gpanalysis.com/analyse-prices/sales-data/13/129' }]
        : [];

      // Fetch distinct (series, publication_year, issue_number) from The_Final_Solution via psql
      const dbUrl = 'postgresql://postgres.tbyuiegalahwbgdayosu:vizjazz7gdg@aws-0-us-east-2.pooler.supabase.com:5432/postgres';
      const rawRows = execSync(
        `psql "${dbUrl}" -t -A -F "|" -c "SELECT series, publication_year, issue_number FROM public.comics_market WHERE issue_number IS NOT NULL AND publication_year IS NOT NULL AND (verified_sales_ledger IS NULL OR jsonb_array_length(verified_sales_ledger) = 0) GROUP BY series, publication_year, issue_number LIMIT ${targetCount};"`,
        { encoding: 'utf8' }
      );
      const candidates = rawRows
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [series, pubYear, issue_number] = line.split('|');
          return { series, publication_year: parseInt(pubYear, 10), issue_number };
        });

      const seen = new Set(queue.map((q) => `${q.series}|${q.publication_year}|${q.issue_number}`));
      for (const row of candidates || []) {
        const key = `${row.series}|${row.publication_year}|${row.issue_number}`;
        if (seen.has(key)) continue;
        seen.add(key);
        queue.push(row);
        if (queue.length >= targetCount) break;
      }

      let totalVariants = 0;
      let totalSales = 0;
      let totalCerts = 0;

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        console.log(`\n[${i + 1}/10] Processing ${item.series} ${item.issue_number} (${item.publication_year})...`);
        let editions = null;
        try {
          editions = await withTimeout(
            item.directUrl
              ? scrapeIssuePage(page, item.directUrl)
              : searchAndOpenIssue(page, item.series, item.publication_year, item.issue_number),
            25000,
            `${item.series} ${item.issue_number}`
          );
        } catch (err) {
          console.log(`  -> Skipped (${err.message})`);
        }

        if (!editions || editions.length === 0) {
          console.log(`  -> No editions found on GPAnalysis.`);
        } else {
          const stats = await upsertIssueToSupabase(item, editions);
          totalVariants += stats.variantsMatchedOrCreated;
          totalSales += stats.totalSalesWritten;
          totalCerts += stats.uniqueCertsCount;
          console.log(`  -> Variants: ${stats.variantsMatchedOrCreated}, Sales: ${stats.totalSalesWritten}, Certs: ${stats.uniqueCertsCount}`);
        }

        if (i < queue.length - 1) {
          await randomDelay(4000, 8000);
        }
      }

      console.log('\n=== 10-ISSUE VERIFICATION BATCH COMPLETE ===');
      console.log(`1. Total variants/foreign editions matched or created: ${totalVariants}`);
      console.log(`2. Total sales rows written to verified_sales_ledger: ${totalSales}`);
      console.log(`3. Total unique CGC certificate numbers upserted into slab_cert_registry: ${totalCerts}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('[Worker Error]', err);
  process.exit(1);
});
