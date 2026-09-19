'use strict';
// gocollect_full_crawler.cjs
// Full-scale GoCollect cert-lookup crawler using GPA cert numbers.
// Uses proven Livewire-based input/poll pattern from gocollect_pilot.cjs.
// Checkpointed, ingests in batches of 10.

const { WebSocket } = require('ws');
const fs = require('fs');
const path = require('path');

const GC_TAB_ID = 'ACD716F3C732E8C5D3E211851A3C8120';
const DEVTOOLS_URL = 'http://127.0.0.1:9222';
const INGEST_URL = 'http://localhost:3001/api/ingestion/graded/batch';
const CERT_FILE = path.join(__dirname, 'gpa_cert_numbers.json');
const CHECKPOINT_FILE = path.join(__dirname, 'gocollect_checkpoint.json');
const OUTPUT_FILE = path.join(__dirname, 'gocollect_extract.json');

const BATCH_SIZE = 10;
const LOOKUP_DELAY_MS = 1500; // between lookups

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function readSecret() {
  const env = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
  const m = env.match(/^GPA_INGESTION_SECRET=(.+)$/m);
  if (!m) throw new Error('GPA_INGESTION_SECRET not found');
  return m[1].trim().replace(/^["']|["']$/g, '');
}

function loadCheckpoint() {
  try { return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8')); }
  catch { return { done: {}, notFound: {} }; }
}
function saveCheckpoint(cp) { fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp)); }

async function ingestBatch(certResults, secret) {
  const certifications = certResults.filter(r => r.grade).map(r => ({
    certificationNumber: r.certNumber,
    gradingCompanySlug: 'cgc',
    nativeGradeText: r.grade,
    gradeNumeric: parseFloat(r.grade) || null,
    pageQuality: r.pageQuality || null,
    variantName: r.variant || null,
    pedigreeName: r.pedigree || null,
    graderNotes: [r.artComments, r.keyComments, r.notes].filter(Boolean).join(' | ') || null,
    certUrl: `https://gocollect.com/app/comics/cert-lookup`,
    comicTitle: r.title || null,
    issueNumber: r.issue || null,
  }));

  if (!certifications.length) return { inserted: 0, deduped: 0 };

  const resp = await fetch(INGEST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + secret },
    body: JSON.stringify({ provider: 'gocollect', gradingCompany: 'cgc', certifications }),
  });
  const data = await resp.json();
  return { inserted: data.certifications?.inserted || 0, deduped: data.certifications?.deduped || 0 };
}

// Livewire-based cert lookup — exact pattern from proven pilot
async function certLookup(cdp, certNumber) {
  // STEP 1: Set input + verify Livewire sync + click Lookup
  const setClickResult = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const certNumber = ${JSON.stringify(certNumber)};
      const certInput = document.getElementById('cert_number_input');
      if (!certInput) return {error: 'no input'};
      
      // Clear then set using React/Livewire native setter
      certInput.focus();
      certInput.select();
      const ns = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      ns.call(certInput, '');
      certInput.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
      await new Promise(r => setTimeout(r, 300));
      
      ns.call(certInput, certNumber);
      certInput.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
      certInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Wait for Livewire debounce model sync
      await new Promise(r => setTimeout(r, 700));
      
      // Verify Livewire reactive state
      const certEl = Array.from(document.querySelectorAll('[wire\\\\:id]'))
        .find(el => el.getAttribute('wire:snapshot')?.includes('cert-lookup-modal'));
      const lw = certEl?.__livewire;
      const reactiveVal = lw?.reactive?.certificationCompanyKey;
      
      if (reactiveVal !== certNumber) {
        return {error: 'reactive sync failed', reactiveVal, inputVal: certInput.value};
      }
      
      // Click the "Lookup" button (text exactly 'Lookup')
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Lookup');
      if (btn) btn.click();
      
      return {reactiveVal, btnClicked: !!btn};
    })()`,
  });

  const setClick = setClickResult?.result?.result?.value || {};
  const setExc = setClickResult?.result?.exceptionDetails;
  if (setExc || setClick.error) {
    return { certNumber, error: setExc?.text || setClick.error, lookupFailed: true };
  }
  if (!setClick.btnClicked) {
    return { certNumber, error: 'Lookup button not found', lookupFailed: true };
  }

  // STEP 2: Poll for Livewire response (poll every 2s, up to 16s)
  let pollResult = null;
  for (let i = 0; i < 8; i++) {
    await sleep(2000);
    const pollCheck = await cdp.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const certEl = Array.from(document.querySelectorAll('[wire\\\\:id]'))
          .find(el => el.getAttribute('wire:snapshot')?.includes('cert-lookup-modal'));
        let snap = {};
        try { snap = JSON.parse(certEl?.getAttribute('wire:snapshot') || '{}'); } catch {}
        const data = snap.data || {};
        // Must match THIS cert AND have a result
        const keyMatches = data.certificationCompanyKey === certNumber;
        return {keyMatches, displayLookupResults: data.displayLookupResults, lookupFailed: data.lookupFailed};
      })()`,
    });
    const pv = pollCheck?.result?.result?.value || {};
    // Wait for key to match AND result to be ready
    if (pv.keyMatches && (pv.displayLookupResults === true || pv.lookupFailed === true)) {
      pollResult = pv;
      break;
    }
  }

  // STEP 3: Read result from Livewire snapshot + DOM
  const readResult = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const certEl = Array.from(document.querySelectorAll('[wire\\\\:id]'))
        .find(el => el.getAttribute('wire:snapshot')?.includes('cert-lookup-modal'));
      let snap = {};
      try { snap = JSON.parse(certEl?.getAttribute('wire:snapshot') || '{}'); } catch {}
      const data = snap.data || {};
      
      const vt = document.body.innerText || '';
      const certNumber = ${JSON.stringify(certNumber)};
      
      // Find cert section — starts at "CGC Cert #XXXX" heading
      const startMarkers = ['CGC Cert #' + certNumber, 'CBCS Cert #' + certNumber, certNumber];
      let certIdx = -1;
      for (const m of startMarkers) { certIdx = vt.indexOf(m); if (certIdx >= 0) break; }
      const certSection = certIdx >= 0 ? vt.substring(certIdx, certIdx + 700) : vt.substring(vt.lastIndexOf('CGC Cert #'), vt.lastIndexOf('CGC Cert #') + 700);
      
      // innerText uses newlines between label/value pairs
      // Format: "Grade\\n8.5\\nLabel Assigned\\nUniversal\\nPage Quality\\nOFF-WHITE..."
      const gradeMatch = certSection.match(/Grade\\n([\\d.]+)/);
      const labelMatch = certSection.match(/Label Assigned\\n([^\\n]+)/);
      const pageQualityMatch = certSection.match(/Page Quality\\n([^\\n]+)/);
      const variantMatch = certSection.match(/Variant\\n([^\\n]+)/);
      const artCommentsMatch = certSection.match(/Art Comments\\n([^\\n]+)/);
      const notesMatch = certSection.match(/Notes\\n([^\\n]+)/);
      const keyCommentsMatch = certSection.match(/Key Comments\\n([^\\n]+)/);
      const comicMatch = certSection.match(/Comic\\n([^\\n]+)/);
      const pedigreeMatch = certSection.match(/Pedigree\\n([^\\n]+)/);
      
      return {
        displayLookupResults: data.displayLookupResults,
        lookupFailed: data.lookupFailed,
        snapshotKey: data.certificationCompanyKey,
        grade: gradeMatch?.[1] || null,
        label: labelMatch?.[1]?.trim() || null,
        pageQuality: pageQualityMatch?.[1]?.trim() || null,
        variant: variantMatch?.[1]?.trim() || null,
        artComments: artCommentsMatch?.[1]?.trim() || null,
        notes: notesMatch?.[1]?.trim() || null,
        keyComments: keyCommentsMatch?.[1]?.trim() || null,
        title: comicMatch?.[1]?.trim() || null,
        pedigree: pedigreeMatch?.[1]?.trim() || null,
        certSectionPreview: certSection.substring(0, 150),
      };
    })()`,
  });

  const readVal = readResult?.result?.result?.value || {};
  return { certNumber, grader: 'cgc', ...setClick, ...readVal };
}

async function main() {
  const secret = readSecret();
  const certNumbers = JSON.parse(fs.readFileSync(CERT_FILE, 'utf8'));
  const checkpoint = loadCheckpoint();
  const allResults = [];

  try { allResults.push(...JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'))); } catch {}

  const tabList = await (await fetch(DEVTOOLS_URL + '/json/list')).json();
  const tab = tabList.find(t => t.id === GC_TAB_ID);
  if (!tab) { console.error('GoCollect cert-lookup tab not found!'); process.exit(1); }

  // Create CDP wrapper
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  const pending = {};
  let msgId = 1;
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
  ws.on('message', d => {
    const m = JSON.parse(d);
    if (m.id && pending[m.id]) { const h = pending[m.id]; delete pending[m.id]; h(m); }
  });
  const cdp = {
    send: (method, params) => new Promise((res, rej) => {
      const id = msgId++;
      pending[id] = res;
      ws.send(JSON.stringify({ id, method, params: params || {} }));
      setTimeout(() => { if (pending[id]) { delete pending[id]; rej(new Error('T/O: ' + method)); } }, 30000);
    }),
  };

  const todo = certNumbers.filter(c => !checkpoint.done[c] && !checkpoint.notFound[c]);
  console.log('=== GoCollect Full Crawler ===');
  console.log(`Total: ${certNumbers.length} | Todo: ${todo.length} | Done: ${Object.keys(checkpoint.done).length} | Not Found: ${Object.keys(checkpoint.notFound||{}).length}`);
  console.log('');

  let totalInserted = 0, totalDeduped = 0, totalNotFound = 0, totalErrors = 0;
  let batch = [];

  for (let i = 0; i < todo.length; i++) {
    const certNumber = todo[i];
    process.stdout.write(`[${i+1}/${todo.length}] ${certNumber} → `);

    try {
      const result = await certLookup(cdp, certNumber);

      if (result.lookupFailed || result.error === 'reactive sync failed') {
        process.stdout.write(`Not Found\n`);
        checkpoint.notFound[certNumber] = true;
        totalNotFound++;
      } else if (result.error) {
        process.stdout.write(`Error: ${result.error}\n`);
        totalErrors++;
      } else if (result.grade) {
        process.stdout.write(`Grade ${result.grade}${result.pageQuality ? ' PQ:'+result.pageQuality : ''}${result.variant ? ' V:'+result.variant.substring(0,20) : ''}\n`);
        checkpoint.done[certNumber] = result.grade;
        allResults.push(result);
        batch.push(result);
      } else {
        process.stdout.write(`No grade (displayLookupResults=${result.displayLookupResults})\n`);
        totalErrors++;
      }

      if (batch.length >= BATCH_SIZE) {
        const ir = await ingestBatch(batch, secret);
        totalInserted += ir.inserted; totalDeduped += ir.deduped;
        console.log(`  ↳ Batch ingested: +${ir.inserted} inserted, +${ir.deduped} deduped`);
        batch = [];
      }

      saveCheckpoint(checkpoint);
    } catch (e) {
      process.stdout.write(`Exception: ${e.message}\n`);
      totalErrors++;
    }

    if ((i + 1) % 50 === 0) {
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allResults, null, 2));
      console.log(`\n--- ${i+1}/${todo.length} | Ins: ${totalInserted} | NF: ${totalNotFound} | Err: ${totalErrors} ---\n`);
    }

    await sleep(LOOKUP_DELAY_MS);
  }

  // Final flush
  if (batch.length > 0) {
    const ir = await ingestBatch(batch, secret);
    totalInserted += ir.inserted; totalDeduped += ir.deduped;
  }
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allResults, null, 2));
  saveCheckpoint(checkpoint);

  console.log('\n=== Done ===');
  console.log(`Inserted: ${totalInserted} | Deduped: ${totalDeduped} | Not Found: ${totalNotFound} | Errors: ${totalErrors}`);
  ws.close();
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
