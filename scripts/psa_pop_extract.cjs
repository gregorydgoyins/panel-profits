'use strict';
// psa_pop_extract.cjs — PSA Comics Population Report full extraction
// Uses in-tab fetch from the PSA browser tab (bypasses Cloudflare).
// PSA shows ALL series alphabetically, 50 series per page.
// Uses synthetic cert_number: "PSA-POP::title::issue::grade"
// Checkpoint: psa_checkpoint.json — tracks completed pages

const { WebSocket } = require('ws');
const fs = require('fs');
const path = require('path');

const PSA_TAB_ID = '72C182364011999E3DAA14DCA9404C35';
const DEVTOOLS_URL = 'http://127.0.0.1:9222';
const INGEST_URL = 'http://localhost:3001/api/ingestion/graded/batch';
const OUTPUT_FILE = path.join(__dirname, 'psa_census_extract.json');
const CHECKPOINT_FILE = path.join(__dirname, 'psa_checkpoint.json');

// PSA has ~50 series per page; total is unknown — stop when we get fewer rows
const MAX_PAGES = 500; // safety limit

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

function makeCertNumber(title, issue, grade) {
  // Synthetic cert number for PSA population rows (no individual cert numbers in pop report)
  const clean = s => (s || '').toString().replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30);
  return `PSA-POP::${clean(title)}::${clean(issue)}::${clean(grade)}`;
}

async function ingestBatch(records, secret) {
  const resp = await fetch(INGEST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + secret },
    body: JSON.stringify({ provider: 'psa', gradingCompany: 'psa', batchId: 'psa_pop_' + Date.now(), certifications: records }),
  });
  const text = await resp.text();
  try { return { status: resp.status, data: JSON.parse(text) }; }
  catch { return { status: resp.status, data: { raw: text.substring(0, 200) } }; }
}

const GRADE_HEADERS = ['CVR','PG','AU','0.3','0.5','1.0','1.5','1.8','2.0','2.5','3.0','3.5','4.0','4.5','5.0','5.5','6.0','6.5','7.0','7.5','8.0','8.5','9.0','9.2','9.4','9.6','9.8','10'];

function parseSeries(seriesText) {
  // "Amazing Spider-Man #1 (1963 Series)" or "Amazing Spider-Man (1963 Series)"
  const issueMatch = seriesText.match(/^(.+?)\s+#(\S+)\s+\((\d{4})/);
  const noIssueMatch = !issueMatch && seriesText.match(/^(.+?)\s+\((\d{4})/);
  if (issueMatch) return { title: issueMatch[1].trim(), issue: issueMatch[2], year: issueMatch[3] };
  if (noIssueMatch) return { title: noIssueMatch[1].trim(), issue: null, year: noIssueMatch[2] };
  return { title: seriesText.trim(), issue: null, year: null };
}

async function main() {
  const secret = readSecret();
  const checkpoint = loadCheckpoint();
  const allRecords = [];
  let totalFound = 0, totalInserted = 0, totalDeduped = 0;
  let startPage = checkpoint['next_page'] || 1;

  const tabList = await (await fetch(DEVTOOLS_URL + '/json/list')).json();
  const tab = tabList.find(t => t.id === PSA_TAB_ID);
  if (!tab) throw new Error('PSA tab not found! Is Opera open with the PSA tab?');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  const pending = {};
  let msgId = 1;
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
  ws.on('message', d => {
    const m = JSON.parse(d);
    if (m.id && pending[m.id]) { const h = pending[m.id]; delete pending[m.id]; h(m); }
  });
  const send = (method, params) => new Promise((res, rej) => {
    const id = msgId++;
    pending[id] = res;
    ws.send(JSON.stringify({ id, method, params: params || {} }));
    setTimeout(() => { if (pending[id]) { delete pending[id]; rej(new Error('T/O: ' + method)); } }, 60000);
  });
  
  console.log('=== PSA Population Report Extractor ===');
  console.log('Starting from page', startPage, '\n');

  for (let page = startPage; page <= MAX_PAGES; page++) {
    const url = `https://www.psacard.com/pop/comics${page > 1 ? `?page=${page}` : ''}`;
    console.log(`Page ${page} — ${url}`);
    
    const result = await send('Runtime.evaluate', {
      awaitPromise: true, returnByValue: true,
      expression: `(async () => {
        const url = ${JSON.stringify(url)};
        const resp = await fetch(url, {credentials: 'include', headers: {'Accept': 'text/html'}});
        if (!resp.ok) return {error: resp.status, url};
        const html = await resp.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const table = doc.querySelector('table');
        if (!table) return {error: 'no_table', htmlLen: html.length};
        
        const headers = Array.from(table.rows[0]?.cells || []).map(c => c.textContent.trim());
        const rows = [];
        for (let i = 1; i < table.rows.length; i++) {
          const cells = Array.from(table.rows[i].cells).map(c => c.textContent.trim());
          if (cells[0] && cells[0].length > 0 && cells[0] !== '') {
            const row = {};
            headers.forEach((h, idx) => { row[h] = cells[idx] || ''; });
            rows.push(row);
          }
        }
        return {rowCount: rows.length, rows};
      })()`,
    });
    
    const rv = result?.result?.result?.value;
    if (rv?.error) {
      console.log('  Error:', rv.error);
      break;
    }
    
    const rowCount = rv?.rowCount || 0;
    console.log(`  ${rowCount} series rows`);
    
    if (rowCount === 0) {
      console.log('  Empty page — done!');
      checkpoint['completed'] = true;
      saveCheckpoint(checkpoint);
      break;
    }
    
    // Convert rows to cert records
    const records = (rv?.rows || []).flatMap(row => {
      const series = parseSeries(row['Series'] || '');
      const total = parseInt((row['Total'] || '0').replace(/,/g, '')) || 0;
      
      return GRADE_HEADERS.filter(g => row[g] && row[g].trim() !== '' && row[g] !== '0').map(g => {
        const count = parseInt((row[g] || '0').replace(/,/g, '')) || 0;
        const certNumber = makeCertNumber(series.title, series.issue, g);
        return {
          certificationNumber: certNumber,
          comicTitle: series.title,
          issueNumber: series.issue,
          variantName: null,
          nativeGradeText: g,
          gradeNumeric: parseFloat(g) || null,
          populationCount: count,
          populationHigher: total,
          sourceUrl: url,
        };
      }).filter(r => r.populationCount > 0);
    });
    
    console.log(`  ${records.length} grade-level records`);
    
    if (records.length > 0) {
      totalFound += records.length;
      allRecords.push(...records);
      const r = await ingestBatch(records, secret);
      const ins = r.data?.certifications?.inserted ?? 0;
      const ded = r.data?.certifications?.deduped ?? 0;
      const errs = r.data?.certifications?.errors || [];
      totalInserted += ins; totalDeduped += ded;
      console.log(`  ✓ +${ins} inserted, +${ded} deduped${errs.length ? ' ERR: ' + errs[0] : ''}`);
    }
    
    checkpoint['next_page'] = page + 1;
    saveCheckpoint(checkpoint);
    await sleep(800); // polite gap between pages
    
    // If we got fewer than 30 rows, probably the last page
    if (rowCount < 30) {
      console.log('  Few rows — likely last page. Stopping.');
      checkpoint['completed'] = true;
      saveCheckpoint(checkpoint);
      break;
    }
  }

  // Save all records
  const existing = [];
  try { existing.push(...JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'))); } catch {}
  const combined = [...existing, ...allRecords];
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(combined, null, 2));
  
  console.log(`\n✓ Saved ${combined.length} total records to psa_census_extract.json`);
  console.log('\n=== Summary ===');
  console.log('Records this run:', allRecords.length);
  console.log('Inserted:', totalInserted);
  console.log('Deduped:', totalDeduped);
  ws.close();
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
