'use strict';
// cbcs_census_v4.cjs  
// CRITICAL FIX: Never use `awaitPromise:true` with internal setTimeout.
// Split trigger (awaitPromise:true, no internal await) and read (no awaitPromise, pure sync).
// Poll from Node.js between the two CDP calls.

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
    body: JSON.stringify({ provider: 'cbcs', gradingCompany: 'cbcs', batchId: 'cbcs_' + Date.now(), certifications: records }),
  });
  const text = await resp.text();
  try { return { status: resp.status, data: JSON.parse(text) }; }
  catch { return { status: resp.status, data: { raw: text.substring(0, 200) } }; }
}

async function main() {
  const secret = readSecret();
  const checkpoint = loadCheckpoint();
  const allRecords = [];
  let totalFound = 0, totalInserted = 0, totalDeduped = 0;

  const tabList = await (await fetch(DEVTOOLS_URL + '/json/list')).json();
  const tab = tabList.find(t => t.id === CBCS_TAB_ID);
  if (!tab) throw new Error('CBCS tab not found');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  const pending = {}, events = [];
  let msgId = 1;
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
  ws.on('message', d => {
    const m = JSON.parse(d);
    if (m.id && pending[m.id]) { const h = pending[m.id]; delete pending[m.id]; h(m); }
    else if (m.method) events.push(m);
  });
  const send = (method, params) => new Promise((res, rej) => {
    const id = msgId++;
    pending[id] = res;
    ws.send(JSON.stringify({ id, method, params: params || {} }));
    setTimeout(() => { if (pending[id]) { delete pending[id]; rej(new Error('timeout: ' + method)); } }, 30000);
  });

  await send('Network.enable', {});
  await send('Page.enable', {});
  console.log('=== CBCS Census v4 ===\n');

  // Navigate fresh
  await send('Page.navigate', { url: 'https://www.cbcscomics.com/population-report/' });
  for (let i = 0; i < 15; i++) {
    await sleep(500);
    if (events.some(e => e.method === 'Page.loadEventFired')) break;
  }
  await sleep(4000); // Wait for Angular
  events.length = 0;
  console.log('Angular ready.\n');

  for (const { title, issue } of SEARCH_TITLES) {
    const key = title + '|' + issue;
    if (checkpoint[key]) { console.log('[SKIP]', title, '#' + issue, '-', checkpoint[key]); continue; }

    console.log('Searching:', title, '#' + issue);

    try {
      // STEP 1: Clear previous results + trigger search (NO internal await beyond debounce)
      const trig = await send('Runtime.evaluate', {
        awaitPromise: true, returnByValue: true,
        expression: `(async () => {
          // Find inputs and Search button
          const inputs = Array.from(document.querySelectorAll('input'));
          const titleInput = inputs.find(i => i.placeholder === 'Title*' || i.getAttribute('ng-model')?.includes('title'));
          const issueInput = inputs.find(i => i.placeholder === 'Issue#' || i.getAttribute('ng-model')?.includes('issue'));
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Search');
          if (!btn) return {error: 'no Search button'};
          
          // Set model via Angular scope  
          const s = angular.element(btn).scope();
          if (!s?.popup) return {error: 'no popup scope'};
          s.$apply(() => {
            s.popup.model = s.popup.model || {};
            s.popup.model.title = ${JSON.stringify(title)};
            s.popup.model.issue = ${JSON.stringify(String(issue))};
            s.popup.model.publisher = '';
            s.popup.model.variant = '';
            s.popup.model.month = null;
            s.popup.model.year = null;
          });
          
          // Also set input native value so Angular picks up via input event
          if (titleInput) {
            const ns = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
            ns.call(titleInput, ${JSON.stringify(title)});
            titleInput.dispatchEvent(new Event('input', {bubbles:true}));
            titleInput.dispatchEvent(new Event('change', {bubbles:true}));
          }
          if (issueInput) {
            const ns = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
            ns.call(issueInput, ${JSON.stringify(String(issue))});
            issueInput.dispatchEvent(new Event('input', {bubbles:true}));
            issueInput.dispatchEvent(new Event('change', {bubbles:true}));
          }
          
          // Wait 100ms then click button via actual DOM click (triggers ng-click)
          await new Promise(r => setTimeout(r, 100));
          btn.click();
          return {ok: true, titleVal: titleInput?.value, issueVal: issueInput?.value};
        })()`,
      });
      
      if (!trig?.result?.result?.value?.ok) {
        console.log('  Trigger failed:', JSON.stringify(trig?.result?.result?.value));
        checkpoint[key] = 'trigger_failed';
        saveCheckpoint(checkpoint);
        // Re-navigate
        await send('Page.navigate', { url: 'https://www.cbcscomics.com/population-report/' });
        for (let i = 0; i < 15; i++) { await sleep(500); if (events.some(e => e.method === 'Page.loadEventFired')) break; }
        await sleep(4000);
        events.length = 0;
        continue;
      }

      // STEP 2: Poll from Node.js for table to appear (browser event loop is FREE)
      let tableData = null;
      for (let poll = 0; poll < 20; poll++) {
        await sleep(1000); // Wait 1s between polls
        
        const check = await send('Runtime.evaluate', {
          returnByValue: true, // NO awaitPromise — pure sync read
          expression: `(()=>{
            const table = document.querySelector('table');
            if (!table || table.rows.length < 2) return {hasTable: false, bodyLen: document.body.innerText.length};
            const headers = Array.from(table.rows[0].cells).map(c => c.innerText.trim());
            const rows = [];
            for (let r = 1; r < table.rows.length; r++) {
              const cells = Array.from(table.rows[r].cells).map(c => c.innerText.trim());
              const row = {};
              headers.forEach((h, idx) => { if (h) row[h] = cells[idx]||''; });
              rows.push(row);
            }
            const body = document.body.innerText;
            const totalMatch = body.match(/Showing.*?(\\d[\\d,]+)/i) || body.match(/(\\d[\\d,]+)\\s*(?:total|record)/i);
            return {hasTable: true, rowCount: rows.length, headers, rows, totalCount: totalMatch?.[1]||rows.length};
          })()`,
        });
        
        const cv = check?.result?.result?.value;
        if (cv?.hasTable) {
          tableData = cv;
          break;
        }
        if (poll % 5 === 4) console.log('  Waiting... bodyLen:', cv?.bodyLen);
      }

      if (!tableData || tableData.rowCount === 0) {
        console.log('  No table data found');
        checkpoint[key] = 'no_results';
        saveCheckpoint(checkpoint);
        continue;
      }

      console.log('  Table:', tableData.rowCount, 'rows | Headers:', tableData.headers.join(', '));
      if (tableData.rows[0]) console.log('  Sample row:', JSON.stringify(tableData.rows[0]).substring(0, 200));

      const records = tableData.rows.map(r => ({
        gradingCompanySlug: 'cbcs',
        certificationNumber: String(r['Cert Number'] || r.CertNumber || r.certNumber || r.ID || ''),
        comicTitle: r.Title || r['Series Title'] || r.Series || title,
        issueNumber: String(r.Issue || r['Issue Number'] || r.IssueNumber || issue),
        variantName: r.Variant || r.variant || null,
        publisherName: r.Publisher || r.publisher || null,
        nativeGradeText: String(r.Grade || r.grade || ''),
        gradeNumeric: parseFloat(r.Grade || r.grade || '0') || null,
        pageQuality: r['Page Quality'] || r.PageQuality || null,
        labelType: r.Label || r.LabelType || null,
        populationCount: parseInt((r['Pop Count'] || r.PopCount || r.Count || '0').replace(/,/g, '')) || null,
        populationHigher: parseInt((r['Pop Higher'] || r.PopHigher || '0').replace(/,/g, '')) || null,
        certUrl: 'https://www.cbcscomics.com/population-report/',
        sourceUrl: 'https://www.cbcscomics.com/population-report/',
      }));

      allRecords.push(...records);
      totalFound += records.length;

      const r = await ingestBatch(records, secret);
      const ins = r.data?.certifications?.inserted ?? r.data?.inserted ?? 0;
      const ded = r.data?.certifications?.deduped ?? r.data?.deduped ?? 0;
      totalInserted += ins; totalDeduped += ded;
      console.log('  Ingested: +' + ins + ' inserted, +' + ded + ' deduped');

      checkpoint[key] = 'done';
      saveCheckpoint(checkpoint);
      await sleep(800); // polite gap between searches

    } catch (err) {
      console.error('  Error:', err.message);
      checkpoint[key] = 'error';
      saveCheckpoint(checkpoint);
      // Re-navigate to reset Angular
      await send('Page.navigate', { url: 'https://www.cbcscomics.com/population-report/' });
      for (let i = 0; i < 15; i++) { await sleep(500); if (events.some(e => e.method === 'Page.loadEventFired')) break; }
      await sleep(4000);
      events.length = 0;
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allRecords, null, 2));
  console.log('\nSaved', allRecords.length, 'records to', OUTPUT_FILE);
  console.log('\n=== Summary ===');
  console.log('Titles searched:', SEARCH_TITLES.length);
  console.log('Records found:', totalFound);
  console.log('Inserted:', totalInserted);
  console.log('Deduped:', totalDeduped);
  ws.close();
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
