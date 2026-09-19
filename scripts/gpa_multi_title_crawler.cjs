/**
 * gpa_multi_title_crawler.cjs
 *
 * Parameterized GPA sales crawler for multiple key titles.
 * For each title: navigates the GPA tab to that title's URL, captures fresh
 * CSRF + cookies from the page reload, then runs the full 3-step pipeline:
 *   1. comics/grades/all  → grade serials
 *   2. stats/chart         → years with sales per serial
 *   3. sales/by_year       → individual transactions
 *
 * Each title has an independent checkpoint so runs are resumable.
 * Deduplicates via SHA-256 observationFingerprint.
 *
 * Usage:
 *   node scripts/gpa_multi_title_crawler.cjs
 *   node scripts/gpa_multi_title_crawler.cjs --title=14
 *
 * NOTE: title_id/comic_id values below are PLACEHOLDERS for titles other than
 * ASM#1. Run with --discover to navigate each title and log the actual IDs
 * from the GPA URL bar before running the full crawl.
 */

'use strict';

const fs        = require('fs');
const https     = require('https');
const http      = require('http');
const crypto    = require('crypto');
const WebSocket = require('ws');

// ─── Title manifest ───────────────────────────────────────────────────────────
// Verified: ASM#1 is title_id=13, comic_id=1.
// Other IDs must be confirmed by navigating to /analyse-prices/sales-data/{tid}/{cid}
// on GPA and checking the URL. Run with --discover to step through each.
const TITLES = [
  { title_id: '14',  comic_id: '15', label: 'Amazing Fantasy #15 (1962)',     slug: 'af15'  },
  { title_id: '57',  comic_id: '27', label: 'Detective Comics #27 (1939)',     slug: 'dc27'  },
  { title_id: '10',  comic_id: '1',  label: 'Action Comics #1 (1938)',         slug: 'ac1'   },
  { title_id: '100', comic_id: '1',  label: 'Fantastic Four #1 (1961)',        slug: 'ff1'   },
  { title_id: '108', comic_id: '1',  label: 'Incredible Hulk #1 (1962)',       slug: 'hulk1' },
  { title_id: '286', comic_id: '1',  label: 'X-Men #1 (1963)',                 slug: 'xm1'   },
  { title_id: '142', comic_id: '83', label: 'Journey Into Mystery #83 (1962)', slug: 'jim83' },
  { title_id: '248', comic_id: '39', label: 'Tales of Suspense #39 (1963)',    slug: 'tos39' },
  { title_id: '22',  comic_id: '1',  label: 'Batman #1 (1940)',                slug: 'bm1'   },
];

// ─── Config ───────────────────────────────────────────────────────────────────
const GPA_TAB_ID  = '6692F57D60B8B87619623241801EB343';
const GPA_HOST    = 'comics.gpanalysis.com';
const GPA_PATH    = '/api/v1/gateway/';
const CONCURRENCY = 3;
const INGEST_BATCH = 25;

const envRaw = fs.readFileSync('.env.local', 'utf8');
const envMap = {};
envRaw.split('\n').forEach(l => {
  const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/);
  if (m) envMap[m[1]] = m[2];
});
const INGESTION_SECRET = envMap.GPA_INGESTION_SECRET;
const INGEST_URL = 'http://localhost:3001/api/ingestion/graded/batch';

// ─── CDP ──────────────────────────────────────────────────────────────────────
let cdpId = 1;
const cdpPending = new Map();
let cdpWs;
let capturedReqs = {};

function cdpSend(method, params) {
  return new Promise((resolve, reject) => {
    const id = cdpId++;
    cdpPending.set(id, { resolve, reject });
    cdpWs.send(JSON.stringify({ id, method, params: params || {} }));
    setTimeout(() => {
      if (cdpPending.has(id)) { cdpPending.delete(id); reject(new Error('CDP timeout: ' + method)); }
    }, 60000);
  });
}

function attachCdpMessageHandler() {
  cdpWs.on('message', raw => {
    const msg = JSON.parse(raw.toString());
    if (msg.id !== undefined && cdpPending.has(msg.id)) {
      const { resolve } = cdpPending.get(msg.id);
      cdpPending.delete(msg.id);
      resolve(msg);
    } else if (msg.method === 'Network.requestWillBeSent') {
      const url = msg.params?.request?.url || '';
      if (url.includes('gateway')) {
        const pd = msg.params.request.postData || '';
        const ep = pd.match(/name="endpoint"\r\n\r\n([^\r\n]+)/);
        capturedReqs[msg.params.requestId] = {
          endpoint: ep?.[1] || 'unknown',
          postData: pd,
          headers: msg.params.request.headers || {},
        };
      }
    }
  });
}

// ─── GPA HTTP helpers ─────────────────────────────────────────────────────────
let gpaCookies = '';
let gpaCsrf    = '';
let gpaUA      = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 OPR/116.0.0.0';

function buildMultipart(fields) {
  const boundary = '----GPA_MT_' + Math.random().toString(36).slice(2);
  let body = '';
  for (const [k, v] of Object.entries(fields)) {
    body += `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`;
  }
  body += `--${boundary}--\r\n`;
  return { body: Buffer.from(body), contentType: `multipart/form-data; boundary=${boundary}` };
}

function gpaPost(fields, refTitleId, refComicId, timeoutMs = 25000) {
  const payload = { GPACMSCSRF: gpaCsrf, ...fields };
  const { body, contentType } = buildMultipart(payload);
  return new Promise((resolve, reject) => {
    const options = {
      hostname: GPA_HOST, port: 443, path: GPA_PATH, method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Content-Length': Buffer.byteLength(body),
        'Cookie': gpaCookies,
        'Referer': `https://${GPA_HOST}/analyse-prices/sales-data/${refTitleId}/${refComicId}`,
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': gpaUA,
        'sec-fetch-dest': 'empty', 'sec-fetch-mode': 'cors', 'sec-fetch-site': 'same-origin',
        'Origin': 'https://' + GPA_HOST,
      },
    };
    const timer = setTimeout(() => { req.destroy(); reject(new Error('GPA timeout: ' + fields.endpoint)); }, timeoutMs);
    const req = https.request(options, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        clearTimeout(timer);
        const text = Buffer.concat(chunks).toString('utf8');
        try { resolve({ status: res.statusCode, data: JSON.parse(text) }); }
        catch { resolve({ status: res.statusCode, data: null, raw: text.substring(0, 200) }); }
      });
    });
    req.on('error', e => { clearTimeout(timer); reject(e); });
    req.write(body); req.end();
  });
}

async function pool(items, fn, concurrency) {
  const results = new Array(items.length);
  let idx = 0;
  const worker = async () => {
    while (idx < items.length) {
      const i = idx++;
      try { results[i] = await fn(items[i], i); }
      catch (e) { results[i] = { _error: e.message }; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

function makeFingerprint(tx) {
  const key = [tx.serial || '', tx.cert_number || '', tx.sale_date || '', String(tx.price || '')].join('::');
  return crypto.createHash('sha256').update(key).digest('hex').substring(0, 32);
}

// ─── Checkpoint / extract paths ───────────────────────────────────────────────
const checkpointPath = slug => `./scripts/gpa_${slug}_checkpoint.json`;
const extractPath    = slug => `./scripts/gpa_${slug}_extract.json`;

function loadCheckpoint(slug) {
  try { return JSON.parse(fs.readFileSync(checkpointPath(slug), 'utf8')); }
  catch { return { done: {} }; }
}
function saveCheckpoint(slug, cp) { fs.writeFileSync(checkpointPath(slug), JSON.stringify(cp)); }

// ─── Ingest ───────────────────────────────────────────────────────────────────
async function ingestBatch(transactions, title) {
  const salesObservations = transactions.map(tx => ({
    observationFingerprint: makeFingerprint(tx),
    certificationNumber:    tx.cert_number || null,
    saleDate:               tx.sale_date || null,
    saleYear:               tx.sale_year ? parseInt(tx.sale_year) : null,
    salePrice:              tx.price || null,
    currency:               'USD',
    saleType:               'auction',
    venue:                  tx.origin || 'gpa',
    gradeNumeric:           tx.grade || null,
    nativeGradeText:        tx.grade_label || null,
    pageQuality:            tx.pq || null,
    providerSerial:         tx.serial || null,
    titleName:              tx.title || title.label.replace(/ \(\d{4}\)$/, ''),
    issueNumberRaw:         String(tx.issue_number || title.comic_id),
    editionName:            tx.alt_cover || null,
    providerTitleId:        String(title.title_id),
    providerIssueId:        String(title.comic_id),
  }));

  const body = JSON.stringify({ provider: 'gpa', gradingCompany: 'cgc', salesObservations });
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost', port: 3001,
      path: '/api/ingestion/graded/batch', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + INGESTION_SECRET,
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = http.request(opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, ...JSON.parse(Buffer.concat(chunks).toString()) }); }
        catch { resolve({ status: res.statusCode }); }
      });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

// ─── Navigate to title + capture credentials ──────────────────────────────────
async function captureCredentials(title) {
  capturedReqs = {};
  const targetUrl = `https://${GPA_HOST}/analyse-prices/sales-data/${title.title_id}/${title.comic_id}`;
  console.log(`  → Navigating to ${targetUrl}`);

  await cdpSend('Network.enable', { maxTotalBufferSize: 200000000, maxResourceBufferSize: 100000000 });
  await cdpSend('Page.navigate', { url: targetUrl });
  await new Promise(r => setTimeout(r, 10000));

  // Cookies
  const cookiesR = await cdpSend('Network.getCookies', { urls: ['https://' + GPA_HOST] });
  const cookies  = cookiesR.result?.cookies || [];
  gpaCookies = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  // CSRF from intercepted XHR
  gpaCsrf = '';
  for (const req of Object.values(capturedReqs)) {
    const m = req.postData?.match(/name="GPACMSCSRF"\r\n\r\n([^\r\n]+)/);
    if (m) gpaCsrf = m[1];
    if (req.headers?.['User-Agent']) gpaUA = req.headers['User-Agent'];
    if (gpaCsrf) break;
  }

  // Fallback: try JS window variable
  if (!gpaCsrf) {
    const r = await cdpSend('Runtime.evaluate', { returnByValue: true,
      expression: `window.GPA_CSRF || window._token || document.querySelector('meta[name=csrf-token]')?.content || ''` });
    gpaCsrf = r?.result?.result?.value || '';
  }

  console.log(`  Cookies: ${cookies.length} | CSRF: ${gpaCsrf ? gpaCsrf.substring(0,16)+'...' : 'MISSING'}`);

  // Try to reuse grades/all from page load
  let gradesData = null;
  for (const [rid, req] of Object.entries(capturedReqs)) {
    if (req.endpoint === 'comics/grades/all') {
      try {
        const bodyR = await cdpSend('Network.getResponseBody', { requestId: rid });
        if (bodyR.result?.body) gradesData = JSON.parse(bodyR.result.body).data;
      } catch {}
      break;
    }
  }
  return gradesData;
}

// ─── Run one title ────────────────────────────────────────────────────────────
async function runTitle(title) {
  const tStart = Date.now();
  console.log(`\n${'='.repeat(68)}`);
  console.log(`TITLE: ${title.label}  (tid=${title.title_id} cid=${title.comic_id})`);
  console.log('='.repeat(68));

  const cp = loadCheckpoint(title.slug);
  const alreadyDone = Object.keys(cp.done).length;

  // Step 1: Navigate + capture auth
  let gradesData = await captureCredentials(title);

  if (!gpaCsrf) {
    console.error(`  FATAL: No CSRF for ${title.slug} — skipping.`);
    return { slug: title.slug, error: 'no_csrf' };
  }

  // Step 2: grades/all
  if (!gradesData) {
    console.log('  Fetching comics/grades/all...');
    const r = await gpaPost({ endpoint: 'comics/grades/all', title_id: title.title_id, comic_id: title.comic_id }, title.title_id, title.comic_id);
    if (!r.data?.data) {
      console.error(`  grades/all failed (${r.status}): ${JSON.stringify(r.raw||'').substring(0,150)}`);
      return { slug: title.slug, error: 'grades_all_failed', status: r.status };
    }
    gradesData = r.data.data;
  }
  console.log(`  Editions from grades/all: ${gradesData.length}`);

  // Flatten to serials
  const allSerials = [];
  for (const edition of gradesData) {
    const edMeta = { year: edition.year, volume: edition.volume, print: edition.print, publisher: edition.publisher, comic_title: edition.comic_title, comic_number: edition.comic_number };
    for (const grade of (edition.grades || [])) {
      allSerials.push({ serial: grade.serial, grade: grade.grade_number, restoration: grade.restoration_code, alt_cover: grade.alt_cover, count_all: parseInt(grade.averages?.count_all || '0'), last_sale: grade.last_sale, ...edMeta });
    }
  }
  const withSales = allSerials.filter(s => s.count_all > 0);
  console.log(`  Serials total: ${allSerials.length} | With sales: ${withSales.length}`);

  // Step 3: stats/chart
  console.log(`  Fetching stats/chart (concurrency=${CONCURRENCY})...`);
  let chartDone = 0;
  const chartResults = await pool(withSales, async s => {
    const r = await gpaPost({ endpoint: 'stats/chart', serial: s.serial }, title.title_id, title.comic_id);
    chartDone++;
    if (chartDone % 50 === 0) process.stdout.write(`    chart: ${chartDone}/${withSales.length}\n`);
    const cd = r.data?.data || [];
    const years = [...new Set(cd.map(d => d.month ? String(d.month).substring(0,4) : d.year ? String(d.year) : null).filter(Boolean))];
    if (years.length === 0 && s.last_sale?.date) years.push(s.last_sale.date.substring(0,4));
    return { serial: s.serial, meta: s, years };
  }, CONCURRENCY);

  // Build work list
  const work = [];
  for (const res of chartResults) {
    if (res._error) continue;
    for (const year of res.years) {
      const key = `${res.serial}::${year}`;
      if (!cp.done[key]) work.push({ serial: res.serial, year, meta: res.meta });
    }
  }
  console.log(`  (serial,year) pairs new: ${work.length} | already done: ${alreadyDone}`);

  // Step 4: sales/by_year
  const allTx = [];
  let pending = [], ingestTotal = 0, inserted = 0, deduped = 0, pairsDone = 0, pairsErr = 0;

  for (let i = 0; i < work.length; i += CONCURRENCY) {
    const slice = work.slice(i, i + CONCURRENCY);
    const results = await Promise.all(slice.map(async ({ serial, year, meta }) => {
      try {
        const r = await gpaPost({ endpoint: 'sales/by_year', serial, year }, title.title_id, title.comic_id);
        return { serial, year, meta, sales: r.data?.data || [] };
      } catch (e) { return { serial, year, meta, sales: [], error: e.message }; }
    }));

    for (const { serial, year, meta, sales, error } of results) {
      const key = `${serial}::${year}`;
      if (error) { pairsErr++; continue; }
      pairsDone++;
      for (const sale of sales) {
        const tx = {
          serial, title: meta.comic_title || title.label,
          issue_number: meta.comic_number || title.comic_id,
          grade: parseFloat(meta.grade) || null, grade_label: meta.grade,
          alt_cover: meta.alt_cover || null, year_published: meta.year,
          volume: meta.volume, print: meta.print, publisher: meta.publisher,
          price: parseFloat(sale.price) || null,
          sale_date: sale.date ? sale.date.substring(0,10) : null,
          sale_year: year, origin: sale.origin || null,
          cert_number: sale.cgc_id || null, pq: sale.pq || null,
        };
        allTx.push(tx); pending.push(tx);
      }
      cp.done[key] = true;

      if (pending.length >= INGEST_BATCH) {
        const batch = pending.splice(0, INGEST_BATCH);
        const ingR = await ingestBatch(batch, title);
        ingestTotal += batch.length;
        inserted += ingR.sales?.inserted || 0;
        deduped  += ingR.sales?.deduped  || 0;
        if (ingR.status >= 400) console.warn(`  Ingest warn ${ingR.status}:`, JSON.stringify(ingR).substring(0,120));
        saveCheckpoint(title.slug, cp);
        process.stdout.write(`  pairs=${pairsDone}/${work.length} tx=${allTx.length} ins=${inserted} dup=${deduped}\n`);
      }
    }
  }

  if (pending.length > 0) {
    const ingR = await ingestBatch(pending, title);
    ingestTotal += pending.length;
    inserted += ingR.sales?.inserted || 0;
    deduped  += ingR.sales?.deduped  || 0;
    if (ingR.status >= 400) console.warn(`  Final ingest warn ${ingR.status}`);
    saveCheckpoint(title.slug, cp);
  }

  // Raw extract
  fs.writeFileSync(extractPath(title.slug), JSON.stringify({
    crawled_at: new Date().toISOString(), ...title,
    editions: gradesData.length, serials: allSerials.length,
    serials_with_sales: withSales.length, pairs_new: work.length,
    pairs_done_total: Object.keys(cp.done).length,
    transactions: allTx.length, transactions_data: allTx,
  }, null, 2));

  const elapsed = ((Date.now() - tStart)/1000).toFixed(1);
  const summary = { slug: title.slug, label: title.label, elapsed_s: elapsed, editions: gradesData.length, serials: allSerials.length, withSales: withSales.length, tx: allTx.length, inserted, deduped, errored: pairsErr };
  console.log(`  DONE: ${JSON.stringify(summary)}`);
  return summary;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const titleArg = process.argv.find(a => a.startsWith('--title='));
  const discoverMode = process.argv.includes('--discover');
  const targetTitles = titleArg ? TITLES.filter(t => t.title_id === titleArg.split('=')[1] || t.slug === titleArg.split('=')[1]) : TITLES;

  if (targetTitles.length === 0) { console.error('No matching title'); process.exit(1); }

  console.log(`=== GPA Multi-Title Crawler ===`);
  console.log(`Targets: ${targetTitles.map(t => t.slug).join(', ')}`);
  if (!INGESTION_SECRET) { console.error('FATAL: GPA_INGESTION_SECRET missing'); process.exit(1); }

  // Connect CDP
  const tabList = await (await fetch('http://127.0.0.1:9222/json/list')).json();
  const tab = tabList.find(t => t.id === GPA_TAB_ID);
  if (!tab) { console.error('GPA tab not found — is Opera open?'); process.exit(1); }

  cdpWs = new WebSocket(tab.webSocketDebuggerUrl);
  attachCdpMessageHandler();
  await new Promise((res, rej) => { cdpWs.on('open', res); cdpWs.on('error', rej); });
  console.log('CDP connected to GPA tab.');

  if (discoverMode) {
    // Just navigate to each title and print the actual URL (for ID verification)
    for (const t of targetTitles) {
      await cdpSend('Page.navigate', { url: `https://${GPA_HOST}/analyse-prices/sales-data/${t.title_id}/${t.comic_id}` });
      await new Promise(r => setTimeout(r, 4000));
      const urlR = await cdpSend('Runtime.evaluate', { returnByValue: true, expression: 'location.href + " | " + document.title' });
      console.log(t.slug, '→', urlR?.result?.result?.value);
    }
    cdpWs.close(); return;
  }

  const summaries = [];
  for (const title of targetTitles) {
    try { summaries.push(await runTitle(title)); }
    catch (e) { console.error(`Error on ${title.slug}:`, e.message); summaries.push({ slug: title.slug, error: e.message }); }
  }

  cdpWs.close();
  console.log('\n=== MULTI-TITLE SUMMARY ===');
  summaries.forEach(s => console.log(JSON.stringify(s)));
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
