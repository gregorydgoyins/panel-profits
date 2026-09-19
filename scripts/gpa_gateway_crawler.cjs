/**
 * gpa_gateway_crawler.cjs
 *
 * Fast GPA gateway-API crawler for ASM #1 (title_id=13, comic_id=1).
 *
 * Strategy (NO accordion clicking):
 *  1. Attach to GPA tab via CDP WebSocket, reload page to capture cookies/CSRF.
 *  2. Call comics/grades/all  → 580 grade serials with last_sale & averages.
 *  3. For each serial call stats/chart  → years that have sales.
 *  4. For each (serial, year) call sales/by_year  → individual transactions.
 *  5. Deduplicate by serial+year, ingest every 25 transactions to local API.
 *  6. Save raw data to gpa_asm1_extract.json.
 *
 * API endpoints discovered:
 *   POST https://comics.gpanalysis.com/api/v1/gateway/
 *   endpoint=comics/grades/all   title_id=13 comic_id=1
 *   endpoint=stats/chart         serial=<serial>
 *   endpoint=sales/by_year       serial=<serial> year=<YYYY>
 *   endpoint=sales/last_ten      serial=<serial>   (fallback for low-count serials)
 */

'use strict';

const fs        = require('fs');
const http      = require('http');
const https     = require('https');
const WebSocket = require('ws');

// ─── Config ──────────────────────────────────────────────────────────────────

const CDP_WS   = 'ws://127.0.0.1:9222/devtools/page/6692F57D60B8B87619623241801EB343';
const GPA_HOST = 'comics.gpanalysis.com';
const GPA_PATH = '/api/v1/gateway/';

// Read secret from .env.local
const envRaw = fs.readFileSync('.env.local', 'utf8');
const envMap = {};
envRaw.split('\n').forEach(line => {
  const m = line.match(/^([A-Z0-9_]+)="?([^"]*)"?$/);
  if (m) envMap[m[1]] = m[2];
});
const INGESTION_SECRET = envMap.GPA_INGESTION_SECRET;
const INGEST_URL       = 'http://localhost:3001/api/ingestion/graded/batch';
const EXTRACT_PATH     = './scripts/gpa_asm1_extract.json';
const CHECKPOINT_PATH  = './scripts/gpa_asm1_checkpoint.json';

const TITLE_ID    = '13';
const COMIC_ID    = '1';
const COMIC_NUM   = '1';
const CONCURRENCY = 3;
const INGEST_BATCH = 25;

// ─── CDP helpers ─────────────────────────────────────────────────────────────

let cdpId = 1;
const cdpPending = new Map();
let cdpWs;

function cdpSend(method, params) {
  return new Promise((resolve, reject) => {
    const id = cdpId++;
    cdpPending.set(id, { resolve, reject });
    cdpWs.send(JSON.stringify({ id, method, params: params || {} }));
    setTimeout(() => {
      if (cdpPending.has(id)) {
        cdpPending.delete(id);
        reject(new Error('CDP timeout: ' + method));
      }
    }, 30000);
  });
}

// ─── GPA API helpers ──────────────────────────────────────────────────────────

let gpaCookies = '';
let gpaCsrf    = '';
let gpaUA      = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0';

function buildMultipart(fields) {
  const boundary = '----GPA_CRW_' + Math.random().toString(36).slice(2);
  let body = '';
  for (const [name, value] of Object.entries(fields)) {
    body += '--' + boundary + '\r\nContent-Disposition: form-data; name="' + name + '"\r\n\r\n' + value + '\r\n';
  }
  body += '--' + boundary + '--\r\n';
  return { body, contentType: 'multipart/form-data; boundary=' + boundary };
}

function gpaPost(fields, timeoutMs) {
  timeoutMs = timeoutMs || 20000;
  return new Promise((resolve, reject) => {
    const allFields = Object.assign({}, fields, { GPACMSCSRF: gpaCsrf });
    const { body, contentType } = buildMultipart(allFields);
    const options = {
      hostname: GPA_HOST,
      port: 443,
      path: GPA_PATH,
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Content-Length': Buffer.byteLength(body),
        'Cookie': gpaCookies,
        'Referer': 'https://' + GPA_HOST + '/analyse-prices/sales-data/13/1',
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': gpaUA,
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'Origin': 'https://' + GPA_HOST,
      },
    };

    const timer = setTimeout(() => {
      req.destroy();
      reject(new Error('GPA POST timeout: ' + fields.endpoint));
    }, timeoutMs);

    const req = https.request(options, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        clearTimeout(timer);
        const text = Buffer.concat(chunks).toString('utf8');
        try { resolve({ status: res.statusCode, data: JSON.parse(text) }); }
        catch (_) { resolve({ status: res.statusCode, data: null, raw: text.substring(0, 200) }); }
      });
    });
    req.on('error', e => { clearTimeout(timer); reject(e); });
    req.write(body);
    req.end();
  });
}

// ─── Concurrency pool ─────────────────────────────────────────────────────────

async function pool(items, fn, concurrency) {
  const results = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      try { results[i] = await fn(items[i], i); }
      catch (e) { results[i] = { _error: e.message }; }
    }
  }
  const workers = [];
  for (let w = 0; w < Math.min(concurrency, items.length); w++) workers.push(worker());
  await Promise.all(workers);
  return results;
}

const crypto = require('crypto');

function makeFingerprint(tx) {
  // Unique key: serial + cert_number (if any) + sale_date + price
  const key = [tx.serial || '', tx.cert_number || '', tx.sale_date || '', String(tx.price || '')].join('::');
  return crypto.createHash('sha256').update(key).digest('hex').substring(0, 32);
}

async function ingestBatch(transactions) {
  // Map GPA transactions → salesObservations format
  const salesObservations = transactions.map(tx => ({
    observationFingerprint: makeFingerprint(tx),
    certificationNumber: tx.cert_number || null,
    saleDate: tx.sale_date || null,
    saleYear: tx.sale_year || null,
    salePrice: tx.price || null,
    currency: 'USD',
    venue: 'GPA',
    saleType: 'completed_sale',
    nativeGradeText: tx.grade_label || String(tx.grade || ''),
    gradeNumeric: tx.grade || null,
    pageQuality: tx.pq || null,
    hasRestoration: tx.restoration ? true : null,
    origin: tx.origin || null,
    providerSaleId: tx.auction_id || null,
    providerSerial: String(tx.serial || ''),
    nativeDesignation: tx.alt_cover || null,
  }));

  return new Promise(resolve => {
    const body = JSON.stringify({
      provider: 'gpa',
      gradingCompany: 'cgc',
      salesObservations,
    });
    const u    = new URL(INGEST_URL);
    const opts = {
      hostname: u.hostname,
      port: parseInt(u.port) || 3001,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'x-ingestion-secret': INGESTION_SECRET,
        'Authorization': 'Bearer ' + INGESTION_SECRET,
      },
    };
    const req = http.request(opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        try { resolve({ status: res.statusCode, data: JSON.parse(text) }); }
        catch (_) { resolve({ status: res.statusCode, raw: text.substring(0, 200) }); }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    setTimeout(() => { req.destroy(); resolve({ error: 'ingest timeout' }); }, 15000);
    req.write(body);
    req.end();
  });
}

// ─── Checkpoint ───────────────────────────────────────────────────────────────

function loadCheckpoint() {
  try { return JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf8')); }
  catch (_) { return { done: {} }; }
}

function saveCheckpoint(cp) {
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(cp));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const tStart = Date.now();
  console.log('=== GPA GATEWAY CRAWLER — Amazing Spider-Man #1 ===');
  console.log('Started: ' + new Date().toISOString());

  // ── Step 1: Connect via CDP ───────────────────────────────────────────────
  console.log('\n[Step 1] Connecting to GPA tab via CDP WebSocket...');
  const capturedReqs = {};

  await new Promise((resolve, reject) => {
    cdpWs = new WebSocket(CDP_WS);
    cdpWs.on('message', raw => {
      const msg = JSON.parse(raw.toString());
      if (msg.id !== undefined && cdpPending.has(msg.id)) {
        const { resolve } = cdpPending.get(msg.id);
        cdpPending.delete(msg.id);
        resolve(msg);
      } else if (msg.method === 'Network.requestWillBeSent') {
        const url = (msg.params && msg.params.request && msg.params.request.url) || '';
        if (url.includes('gateway')) {
          const pd = (msg.params.request.postData || '');
          const ep = pd.match(/name="endpoint"\r\n\r\n([^\r\n]+)/);
          capturedReqs[msg.params.requestId] = {
            endpoint: ep ? ep[1] : 'unknown',
            postData: pd,
            headers:  (msg.params.request.headers || {}),
          };
        }
      }
    });
    cdpWs.on('error', reject);
    cdpWs.on('open', resolve);
  });
  console.log('Connected.');

  // ── Step 2: Reload page to capture credentials ────────────────────────────
  console.log('\n[Step 2] Reloading GPA page to capture cookies + CSRF token...');
  await cdpSend('Network.enable', { maxTotalBufferSize: 200000000, maxResourceBufferSize: 100000000 });
  await cdpSend('Page.reload', { ignoreCache: true });
  await new Promise(r => setTimeout(r, 8000));

  // Extract cookies
  const cookiesR = await cdpSend('Network.getCookies', { urls: ['https://' + GPA_HOST] });
  const cookies  = (cookiesR.result && cookiesR.result.cookies) || [];
  gpaCookies = cookies.map(c => c.name + '=' + c.value).join('; ');

  // Extract CSRF and UA from captured multipart post
  for (const req of Object.values(capturedReqs)) {
    const csrfM = req.postData && req.postData.match(/name="GPACMSCSRF"\r\n\r\n([^\r\n]+)/);
    if (csrfM) gpaCsrf = csrfM[1];
    if (req.headers && req.headers['User-Agent']) gpaUA = req.headers['User-Agent'];
    if (gpaCsrf) break;
  }

  console.log('Cookies: ' + cookies.length + ' | CSRF: ' + (gpaCsrf ? gpaCsrf.substring(0, 20) + '...' : 'MISSING'));
  if (!gpaCsrf) { console.error('FATAL: No CSRF token. Aborting.'); process.exit(1); }

  // Try to reuse grades/all response captured from page load
  let gradesData = null;
  for (const [rid, req] of Object.entries(capturedReqs)) {
    if (req.endpoint === 'comics/grades/all') {
      try {
        const bodyR = await cdpSend('Network.getResponseBody', { requestId: rid });
        if (bodyR.result && bodyR.result.body) gradesData = JSON.parse(bodyR.result.body).data;
      } catch (_) {}
      break;
    }
  }

  // ── Step 3: comics/grades/all → all serials ───────────────────────────────
  console.log('\n[Step 3] Getting all grade serials via comics/grades/all...');
  if (!gradesData) {
    const r = await gpaPost({ endpoint: 'comics/grades/all', title_id: TITLE_ID, comic_id: COMIC_ID });
    if (!r.data || !r.data.data) { console.error('grades/all error:', JSON.stringify(r).substring(0, 300)); process.exit(1); }
    gradesData = r.data.data;
  }

  const allSerials = [];
  for (const edition of gradesData) {
    const edMeta = {
      year: edition.year, volume: edition.volume, print: edition.print,
      publisher: edition.publisher, comic_title: edition.comic_title,
      comic_number: edition.comic_number,
    };
    for (const grade of (edition.grades || [])) {
      allSerials.push({
        serial: grade.serial,
        grade: grade.grade_number,
        restoration: grade.restoration_code,
        alt_cover: grade.alt_cover,
        count_all: parseInt((grade.averages && grade.averages.count_all) || '0'),
        last_sale: grade.last_sale,
        ...edMeta,
      });
    }
  }

  const withSales = allSerials.filter(s => s.count_all > 0);
  console.log('Editions: ' + gradesData.length + ' | Total serials: ' + allSerials.length + ' | With sales: ' + withSales.length);

  // ── Step 4: stats/chart per serial → discover years with data ─────────────
  console.log('\n[Step 4] Fetching stats/chart for ' + withSales.length + ' serials (concurrency=' + CONCURRENCY + ')...');

  let chartCount = 0;
  const chartResults = await pool(withSales, async s => {
    const r = await gpaPost({ endpoint: 'stats/chart', serial: s.serial });
    chartCount++;
    if (chartCount % 25 === 0) process.stdout.write('  chart: ' + chartCount + '/' + withSales.length + '\n');
    const chartData = (r.data && r.data.data) || [];
    // Extract unique years from monthly data
    const years = [...new Set(chartData.map(d => {
      if (d.month) return String(d.month).substring(0, 4);
      if (d.year)  return String(d.year);
      return null;
    }).filter(Boolean))];
    // Fallback: use last_sale year if chart returned nothing
    if (years.length === 0 && s.last_sale && s.last_sale.date) {
      years.push(s.last_sale.date.substring(0, 4));
    }
    return { serial: s.serial, meta: s, years, chartData };
  }, CONCURRENCY);
  console.log('stats/chart complete: ' + chartCount);

  // Build (serial, year) work items
  const cp = loadCheckpoint();
  const work = [];
  for (const res of chartResults) {
    if (res._error) continue;
    for (const year of res.years) {
      const key = res.serial + '::' + year;
      if (!cp.done[key]) work.push({ serial: res.serial, year, meta: res.meta });
    }
  }
  console.log('(serial, year) pairs to fetch: ' + work.length + ' (already done: ' + Object.keys(cp.done).length + ')');

  // ── Step 5: sales/by_year per (serial, year) → individual transactions ────
  console.log('\n[Step 5] Fetching sales/by_year (concurrency=' + CONCURRENCY + ')...');

  const allTransactions = [];
  let pendingIngest = [];
  let ingestTotal   = 0;
  let pairsDone     = 0;
  let pairsErrored  = 0;

  for (let i = 0; i < work.length; i += CONCURRENCY) {
    const slice = work.slice(i, i + CONCURRENCY);
    const results = await Promise.all(slice.map(async ({ serial, year, meta }) => {
      try {
        const r = await gpaPost({ endpoint: 'sales/by_year', serial, year });
        const sales = (r.data && r.data.data) || [];
        return { serial, year, meta, sales };
      } catch (e) {
        return { serial, year, meta, sales: [], error: e.message };
      }
    }));

    for (const { serial, year, meta, sales, error } of results) {
      const key = serial + '::' + year;
      if (error) {
        pairsErrored++;
        continue;
      }
      pairsDone++;

      for (const sale of sales) {
        const tx = {
          source:          'gpa',
          source_id:       String(sale.comic_id || sale.id || ''),
          serial:          serial,
          title:           meta.comic_title || 'Amazing Spider-Man, The (1963)',
          issue_number:    meta.comic_number || '1',
          title_id:        TITLE_ID,
          grade:           parseFloat(meta.grade) || null,
          grade_label:     meta.grade,
          restoration:     meta.restoration || null,
          alt_cover:       meta.alt_cover || null,
          year_published:  meta.year,
          volume:          meta.volume,
          print:           meta.print,
          publisher:       meta.publisher,
          price:           parseFloat(sale.price) || null,
          sale_date:       sale.date ? sale.date.substring(0, 10) : null,
          sale_year:       year,
          origin:          sale.origin || null,
          auction_id:      sale.auction_id || null,
          cert_number:     sale.cgc_id || null,
          pq:              sale.pq || null,
          status:          sale.status || null,
        };
        allTransactions.push(tx);
        pendingIngest.push(tx);
      }

      cp.done[key] = true;

      // Ingest in batches
      if (pendingIngest.length >= INGEST_BATCH) {
        const batch = pendingIngest.splice(0, INGEST_BATCH);
        const ingR  = await ingestBatch(batch);
        ingestTotal += batch.length;
        if (ingR.error || (ingR.status && ingR.status >= 400)) {
          process.stdout.write('  Ingest warn (' + (ingR.status || 'err') + '): ' + JSON.stringify(ingR).substring(0, 150) + '\n');
        }
        saveCheckpoint(cp);
        process.stdout.write('  Ingested ' + ingestTotal + ' | pairs ' + pairsDone + '/' + work.length + ' | tx=' + allTransactions.length + '\n');
      }
    }
  }

  // Flush remainder
  if (pendingIngest.length > 0) {
    const ingR  = await ingestBatch(pendingIngest);
    ingestTotal += pendingIngest.length;
    const ok = !ingR.error && ingR.status < 400;
    console.log('Final ingest: ' + pendingIngest.length + ' tx → ' + (ok ? 'OK ' + ingR.status : 'WARN ' + JSON.stringify(ingR).substring(0, 150)));
    saveCheckpoint(cp);
  }

  // ── Step 6: Save raw extract ───────────────────────────────────────────────
  console.log('\n[Step 6] Saving raw extract to ' + EXTRACT_PATH + '...');
  const extract = {
    crawled_at:          new Date().toISOString(),
    title_id:            TITLE_ID,
    comic_number:        COMIC_NUM,
    comic_title:         'Amazing Spider-Man, The (1963)',
    api_endpoints_used:  ['comics/grades/all', 'stats/chart', 'sales/by_year'],
    editions_found:      gradesData.length,
    grade_serials_total: allSerials.length,
    serials_with_sales:  withSales.length,
    serial_year_pairs:   work.length + Object.keys(cp.done).length,
    transactions:        allTransactions.length,
    ingested:            ingestTotal,
    pairs_errored:       pairsErrored,
    transactions_data:   allTransactions,
    serials_metadata:    allSerials,
  };
  fs.writeFileSync(EXTRACT_PATH, JSON.stringify(extract, null, 2));
  const extractKb = (fs.statSync(EXTRACT_PATH).size / 1024).toFixed(0);
  console.log('Saved: ' + EXTRACT_PATH + ' (' + extractKb + ' KB)');

  cdpWs.close();

  const elapsed = ((Date.now() - tStart) / 1000).toFixed(1);
  console.log('\n=== RESULTS ===');
  console.log('Time elapsed:              ' + elapsed + 's');
  console.log('API endpoints used:        comics/grades/all, stats/chart, sales/by_year');
  console.log('Editions found:            ' + gradesData.length);
  console.log('Grade serials discovered:  ' + allSerials.length);
  console.log('Serials with sales:        ' + withSales.length);
  console.log('(serial, year) pairs:      ' + (work.length + Object.keys(cp.done).length));
  console.log('Transactions extracted:    ' + allTransactions.length);
  console.log('Transactions ingested:     ' + ingestTotal);
  console.log('Pairs errored:             ' + pairsErrored);
}

main().catch(err => {
  console.error('FATAL:', err.message, err.stack);
  process.exit(1);
});
