'use strict';
// cbcs_census_v3.cjs
// One CDP session: navigate, wait for Angular, search, read DOM table results.
// Key insight: CBCS uses `popup.postdata(1)` on button scope, results in DOM table.

const { WebSocket } = require('ws');
const fs = require('fs');
const path = require('path');

const CBCS_TAB_ID = 'BFDE326AAD2D9340912CD3D8802A3091';
const DEVTOOLS_URL = 'http://127.0.0.1:9222';
const INGEST_URL = 'http://localhost:3001/api/ingestion/graded/batch';
const OUTPUT_FILE = path.join(__dirname, 'cbcs_census_extract.json');
const CHECKPOINT_FILE = path.join(__dirname, 'cbcs_checkpoint.json');

const SEARCH_TITLES = [
  { title: 'Amazing Spider-Man', issue: '1' },
  { title: 'Amazing Fantasy', issue: '15' },
  { title: 'Amazing Spider-Man', issue: '129' },
  { title: 'Amazing Spider-Man', issue: '300' },
  { title: 'X-Men', issue: '1' },
  { title: 'X-Men', issue: '94' },
  { title: 'Incredible Hulk', issue: '1' },
  { title: 'Incredible Hulk', issue: '181' },
  { title: 'Fantastic Four', issue: '1' },
  { title: 'Fantastic Four', issue: '48' },
  { title: 'Tales of Suspense', issue: '39' },
  { title: 'Journey into Mystery', issue: '83' },
  { title: 'Avengers', issue: '1' },
  { title: 'Batman', issue: '1' },
  { title: 'Detective Comics', issue: '27' },
  { title: 'Action Comics', issue: '1' },
  { title: 'Superman', issue: '1' },
  { title: 'Flash', issue: '105' },
  { title: 'Green Lantern', issue: '76' },
  { title: 'Daredevil', issue: '1' },
];

async function main() {
  const secret = readSecret();
  const checkpoint = loadCheckpoint();
  const allRecords = [];
  let totalFound = 0, totalInserted = 0, totalDeduped = 0;

  const tabList = await (await fetch(DEVTOOLS_URL + '/json/list')).json();
  const tab = tabList.find(t => t.id === CBCS_TAB_ID);
  if (!tab) throw new Error('CBCS tab not found');

  // ONE persistent CDP session for all searches
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  const pending = {}, events = [];
  let msgId = 1;

  await new Promise((res, rej) => {
    ws.on('open', res);
    ws.on('error', rej);
  });
  ws.on('message', d => {
    const m = JSON.parse(d);
    if (m.id && pending[m.id]) { const h = pending[m.id]; delete pending[m.id]; h(m); }
    else if (m.method) events.push(m);
  });

  const send = (method, params) => new Promise((res, rej) => {
    const id = msgId++;
    pending[id] = res;
    ws.send(JSON.stringify({ id, method, params: params || {} }));
    setTimeout(() => { if (pending[id]) { delete pending[id]; rej(new Error('CDP timeout: ' + method)); } }, 35000);
  });

  await send('Network.enable', {});
  await send('Page.enable', {});
  console.log('=== CBCS Census v3 ===\n');

  // Navigate ONCE to fresh page
  console.log('Navigating to CBCS population report...');
  await send('Page.navigate', { url: 'https://www.cbcscomics.com/population-report/' });

  // Wait for load
  let loaded = false;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    if (events.some(e => e.method === 'Page.loadEventFired')) { loaded = true; break; }
  }
  events.length = 0;

  // Wait for Angular to initialize
  await sleep(4000);
  console.log('Page loaded. Starting searches...\n');

  for (const { title, issue } of SEARCH_TITLES) {
    const key = title + '|' + issue;
    if (checkpoint[key] === 'done') { console.log('[SKIP]', title, '#' + issue); continue; }

    console.log('Searching:', title, '#' + issue);
    events.length = 0;

    try {
      // Trigger search via Angular scope on button
      const triggerResult = await send('Runtime.evaluate', {
        awaitPromise: true, returnByValue: true,
        expression: buildTriggerExpr(title, issue),
      });
      const tv = triggerResult?.result?.result?.value;
      if (!tv?.ok) {
        console.log('  Trigger failed:', JSON.stringify(tv));
        // Try re-navigate if Angular not ready
        await send('Page.navigate', { url: 'https://www.cbcscomics.com/population-report/' });
        await sleep(5000);
        events.length = 0;
        continue;
      }

      // Wait for table to appear OR network response
      await sleep(3000);

      // Try to read the results table
      const tableResult = await send('Runtime.evaluate', {
        awaitPromise: true, returnByValue: true,
        expression: readTableExpr(),
      });
      const tr = tableResult?.result?.result?.value;

      if (tr?.rows?.length > 0) {
        console.log('  Table rows:', tr.rows.length, '| Total:', tr.totalCount);
        const records = tr.rows.map(r => ({
          gradingCompanySlug: 'cbcs',
          certificationNumber: String(r.CertNumber || r.certNumber || r['Cert Number'] || r.ID || ''),
          comicTitle: r.Title || r['Series Title'] || r.Series || title,
          issueNumber: String(r.Issue || r.IssueNumber || r['Issue Number'] || issue),
          variantName: r.Variant || r.variant || null,
          publisherName: r.Publisher || r.publisher || null,
          nativeGradeText: String(r.Grade || r.grade || ''),
          gradeNumeric: parseFloat(r.Grade || r.grade || '0') || null,
          pageQuality: r['Page Quality'] || r.PageQuality || null,
          labelType: r.Label || r.LabelType || null,
          populationCount: parseInt(r['Pop Count'] || r.PopCount || r.Count || '0') || null,
          populationHigher: parseInt(r['Pop Higher'] || r.PopHigher || '0') || null,
          certUrl: 'https://www.cbcscomics.com/population-report/',
          sourceUrl: 'https://www.cbcscomics.com/population-report/',
        }));

        allRecords.push(...records);
        totalFound += records.length;

        if (records.length > 0) {
          const r = await ingestBatch(records, secret);
          const ins = r.data?.certifications?.inserted ?? r.data?.inserted ?? 0;
          const ded = r.data?.certifications?.deduped ?? r.data?.deduped ?? 0;
          totalInserted += ins; totalDeduped += ded;
          console.log('  Ingested: +' + ins + ' inserted, +' + ded + ' deduped');
        }

        checkpoint[key] = 'done';
        saveCheckpoint(checkpoint);
      } else if (tr?.bodyText) {
        // No table - check body for results
        console.log('  No table. Body preview:', tr.bodyText?.substring(0, 200));
        checkpoint[key] = 'no_results';
        saveCheckpoint(checkpoint);
      } else {
        console.log('  No data:', JSON.stringify(tr)?.substring(0, 200));
      }

      // Small delay between searches
      await sleep(1000);

    } catch (err) {
      console.error('  Error:', err.message);
      checkpoint[key] = 'error';
      saveCheckpoint(checkpoint);
      // Re-navigate to reset state
      await send('Page.navigate', { url: 'https://www.cbcscomics.com/population-report/' });
      await sleep(5000);
      events.length = 0;
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allRecords, null, 2));
  console.log('\nSaved', allRecords.length, 'records');
  console.log('=== Summary ===');
  console.log('Records found:', totalFound);
  console.log('Inserted:', totalInserted);
  console.log('Deduped:', totalDeduped);

  ws.close();
}

function buildTriggerExpr(title, issue) {
  const t = JSON.stringify(title);
  const i = JSON.stringify(String(issue));
  return `(async () => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Search');
    if (!btn) return {error: 'no Search button'};
    const s = angular.element(btn).scope();
    if (!s || !s.popup) return {error: 'no popup scope'};
    s.$apply(() => {
      s.popup.model = s.popup.model || {};
      s.popup.model.title = ${t};
      s.popup.model.issue = ${i};
      s.popup.model.publisher = '';
      s.popup.model.variant = '';
      s.popup.model.month = null;
      s.popup.model.year = null;
    });
    s.$apply(() => { s.popup.postdata(1); });
    return {ok: true};
  })()`;
}

function readTableExpr() {
  return `(async () => {
    // Poll for table (up to 12s more)
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const tables = document.querySelectorAll('table');
      for (const table of tables) {
        if (table.rows.length > 1) {
          const headers = Array.from(table.rows[0].cells).map(c => c.innerText.trim());
          const rows = [];
          for (let r = 1; r < table.rows.length; r++) {
            const cells = Array.from(table.rows[r].cells).map(c => c.innerText.trim());
            const row = {};
            headers.forEach((h, idx) => { if (h) row[h] = cells[idx] || ''; });
            rows.push(row);
          }
          // Find total count
          const bodyText = document.body.innerText;
          const match = bodyText.match(/Total.*?(\\d[\\d,]+)/i) || bodyText.match(/(\\d[\\d,]+)\\s*record/i);
          return {rows, headers, totalCount: match ? match[1] : rows.length};
        }
      }
    }
    return {rows: [], bodyText: document.body.innerText.substring(0, 300)};
  })()`;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function readSecret() {
  const env = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
  const m = env.match(/^GPA_INGESTION_SECRET=(.+)$/m);
  if (!m) throw new Error('GPA_INGESTION_SECRET not found');
  return m[1].trim().replace(/^["']|["']$/g, '');
}

function loadCheckpoint() {
  try { return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8')); } catch { return {}; }
}
function saveCheckpoint(cp) { fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp, null, 2)); }

async function ingestBatch(records, secret) {
  const resp = await fetch(INGEST_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + secret},
    body: JSON.stringify({
      provider: 'cbcs', gradingCompany: 'cbcs',
      batchId: 'cbcs_census_' + Date.now(),
      certifications: records,
    }),
  });
  const text = await resp.text();
  try { return {status: resp.status, data: JSON.parse(text)}; }
  catch { return {status: resp.status, data: {raw: text.substring(0, 200)}}; }
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
