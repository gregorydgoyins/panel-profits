/**
 * gocollect_pilot.cjs  (v3 — correct Node.js-level wait pattern)
 *
 * CONFIRMED WORKING APPROACH (2026-09-19):
 * 1. Network.enable BEFORE page.navigate (required for event capture)
 * 2. IIFE: set input via native setter + dispatchEvent → wait 700ms → click Lookup
 *    (internal IIFE wait only for debounce — NOT for response render)
 * 3. Node.js-level await 7000ms (browser event loop runs freely, Livewire renders)
 * 4. Second CDP call: read result from DOM + snapshot
 *
 * WRONG (caused grade=null):
 * - waiting inside awaitPromise:true IIFE for Livewire response
 *   (blocks browser event loop, Livewire can't render DOM update)
 */
'use strict';

const { WebSocket } = require('ws');
const fs = require('fs');

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});

const CLEAN_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const INGESTION_SECRET = env.GPA_INGESTION_SECRET;
const GOCOLLECT_TAB_ID = 'ACD716F3C732E8C5D3E211851A3C8120';

// ─── Five pilot certs ───────────────────────────────────────────────────────
// Using cert 2069748001 (confirmed working from prior test)
// Plus 4 other certs to test
const PILOT_CERTS = [
  { certNumber: '2069748001', grader: 'cgc', note: 'Known: CGC 7.5 UK Price Variant Kirby' },
  { certNumber: '3738879004', grader: 'cgc', note: 'Unknown' },
  { certNumber: '0012034002', grader: 'cgc', note: 'Unknown' },
  { certNumber: '1499403007', grader: 'cgc', note: 'Unknown' },
  { certNumber: '3735879024', grader: 'cgc', note: 'Unknown' },
];

// ─── CDP WebSocket ──────────────────────────────────────────────────────────
async function wsClient(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const pending = {};
    const events = [];
    let id = 1;
    ws.on('open', () => resolve({
      send: (method, params) => new Promise((res, rej) => {
        const cid = id++;
        pending[cid] = { res, rej };
        ws.send(JSON.stringify({ id: cid, method, params: params || {} }));
        setTimeout(() => { delete pending[cid]; rej(new Error(`CDP timeout: ${method}`)); }, 25000);
      }),
      events,
      close: () => ws.close(),
    }));
    ws.on('message', d => {
      const m = JSON.parse(d);
      if (m.id && pending[m.id]) { const h = pending[m.id]; delete pending[m.id]; h.res(m); }
      else if (m.method) events.push(m);
    });
    ws.on('error', reject);
  });
}

// ─── GoCollect Cert Lookup (CORRECT: Node.js-level wait) ──────────────────
async function certLookup(cdp, certNumber) {
  // ALWAYS navigate fresh to cert-lookup for each cert
  // Ensures no stale Livewire state from previous lookups
  await cdp.send('Page.navigate', { url: 'https://gocollect.com/app/comics/cert-lookup' });
  await new Promise(r => setTimeout(r, 4500));
  
  // Verify page is in blank state (vtLen ≈ 1041 for blank cert-lookup form)
  // If Livewire retained previous result, wait up to 3 more seconds
  for (let i = 0; i < 3; i++) {
    const vtCheck = await cdp.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(()=>{ return {vtLen: document.body.innerText.length, hasGrade: document.body.innerText.includes('Grade')}; })()`,
    });
    const vt = vtCheck?.result?.result?.value || {};
    if (!vt.hasGrade) break; // Page is in blank state
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // STEP 1: Set input + click Lookup (IIFE waits only for debounce, NOT for response render)
  const setClickResult = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const certInput = document.getElementById('cert_number_input');
      if (!certInput) return {error: 'no input'};
      
      // Clear and set new value
      certInput.focus();
      certInput.select();
      const ns = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      ns.call(certInput, '');
      certInput.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
      await new Promise(r => setTimeout(r, 300));
      
      ns.call(certInput, '${certNumber}');
      certInput.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
      certInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Wait ONLY for Livewire debounce (model sync) — NOT for DOM render
      await new Promise(r => setTimeout(r, 700));
      
      // Verify reactive state
      const certEl = Array.from(document.querySelectorAll('[wire\\\\:id]'))
        .find(el => el.getAttribute('wire:snapshot')?.includes('cert-lookup-modal'));
      const lw = certEl?.__livewire;
      const reactiveVal = lw?.reactive?.certificationCompanyKey;
      
      if (reactiveVal !== '${certNumber}') {
        return {error: 'reactive sync failed', reactiveVal, inputVal: certInput.value};
      }
      
      // Click Lookup — triggers Livewire /livewire/update POST
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Lookup');
      if (btn) btn.click();
      
      // IMPORTANT: Return immediately after click
      // Do NOT wait inside here — let Node.js wait so browser event loop is free
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
  
  // STEP 2: Poll for result — check every 2s up to 16s total
  // GoCollect's Livewire response time varies (can be 3-12 seconds)
  let pollResult = null;
  for (let i = 0; i < 8; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const pollCheck = await cdp.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(()=>{
        const certEl = Array.from(document.querySelectorAll('[wire\\\\:id]'))
          .find(el => el.getAttribute('wire:snapshot')?.includes('cert-lookup-modal'));
        let snap = {};
        try { snap = JSON.parse(certEl?.getAttribute('wire:snapshot') || '{}'); } catch {}
        const data = snap.data || {};
        return {displayLookupResults: data.displayLookupResults, lookupFailed: data.lookupFailed, vtLength: document.body.innerText.length};
      })()`,
    });
    const pv = pollCheck?.result?.result?.value || {};
    if (pv.displayLookupResults === true || pv.lookupFailed === true) {
      pollResult = pv;
      break;
    }
  }
  
  // STEP 3: Read result from DOM
  const readResult = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(()=>{
      const certEl = Array.from(document.querySelectorAll('[wire\\\\:id]'))
        .find(el => el.getAttribute('wire:snapshot')?.includes('cert-lookup-modal'));
      let snap = {};
      try { snap = JSON.parse(certEl?.getAttribute('wire:snapshot') || '{}'); } catch {}
      const data = snap.data || {};
      
      const vt = document.body.innerText || '';
      const hashIdx = vt.indexOf('#${certNumber}');
      const bareIdx = vt.indexOf('${certNumber}');
      const certIdx = hashIdx >= 0 ? hashIdx : bareIdx;
      const certSection = certIdx >= 0 ? vt.substring(certIdx, certIdx + 600) : '';
      
      const gradeMatch = certSection.match(/Grade\\s+([\\d.]+)/);
      const labelMatch = certSection.match(/Label Assigned\\s+([^\\n]+)/);
      const pageQualityMatch = certSection.match(/Page Quality\\s+([^\\n]+)/);
      const variantMatch = certSection.match(/Variant\\s+([^\\n]+)/);
      const artCommentsMatch = certSection.match(/Art Comments\\s+([^\\n]+)/);
      const notesMatch = certSection.match(/Notes\\s+([^\\n]+)/);
      
      return {
        certificationCompanyId: data.certificationCompanyId || null,
        certificationExampleKey: data.certificationCompanyExample?.[1]?.key ?? null,
        displayLookupResults: data.displayLookupResults,
        lookupFailed: data.lookupFailed,
        grade: gradeMatch?.[1] || null,
        label: labelMatch?.[1]?.trim() || null,
        pageQuality: pageQualityMatch?.[1]?.trim() || null,
        variant: variantMatch?.[1]?.trim() || null,
        artComments: artCommentsMatch?.[1]?.trim() || null,
        notes: notesMatch?.[1]?.trim() || null,
        certSectionPreview: certSection.substring(0, 150),
        vtLength: vt.length,
      };
    })()`,
  });
  
  const readVal = readResult?.result?.result?.value || {};
  const readExc = readResult?.result?.exceptionDetails;
  if (readExc) {
    const errMsg = readExc.exception?.description || readExc.text || JSON.stringify(readExc).substring(0, 200);
    return { certNumber, error: `Read exception: ${errMsg}`, lookupFailed: true };
  }
  
  return {
    certNumber,
    ...setClick,
    ...readVal,
  };
}

// ─── Ingest to batch API ─────────────────────────────────────────────────────
async function ingestResult(certResult) {
  if (!certResult.grade) return false;
  
  const payload = {
    provider: 'gocollect',
    gradingCompany: certResult.grader || 'cgc',
    batchId: `gc_pilot_${Date.now()}`,
    certifications: [{
      gradingCompanySlug: 'cgc',
      certificationNumber: certResult.certNumber,
      nativeGradeText: certResult.grade,
      gradeNumeric: parseFloat(certResult.grade) || null,
      pageQuality: certResult.pageQuality,
      variantName: certResult.variant,
      graderNotes: [certResult.artComments, certResult.notes].filter(Boolean).join(' | ') || null,
      certUrl: `https://gocollect.com/app/comics/cert-lookup`,
      sourceUrl: `https://gocollect.com/app/comics/cert-lookup`,
    }],
  };
  
  try {
    const res = await fetch(`http://localhost:3001/api/ingestion/graded/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${INGESTION_SECRET}`,
      },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      const text = await res.text();
      console.log(`  API error ${res.status}: ${text.substring(0, 200)}`);
      return false;
    }
    
    const data = await res.json();
    console.log(`  Ingested: ${certResult.certNumber} grade=${certResult.grade} → ${JSON.stringify(data).substring(0, 100)}`);
    return true;
  } catch (e) {
    console.log(`  Ingest error: ${e.message}`);
    return false;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== GoCollect Pilot v3 (Node.js-level wait pattern) ===');
  
  const tabList = await (await fetch('http://127.0.0.1:9222/json/list')).json();
  const gcTab = tabList.find(t => t.id === GOCOLLECT_TAB_ID);
  if (!gcTab) {
    console.error(`GoCollect tab not found. Available:`, tabList.map(t => `${t.id}: ${t.url}`).join(', '));
    process.exit(1);
  }
  
  const cdp = await wsClient(gcTab.webSocketDebuggerUrl);
  
  // Enable network monitoring BEFORE any navigation
  await cdp.send('Network.enable', {});
  
  await cdp.send('Page.navigate', { url: 'https://gocollect.com/app/comics/cert-lookup' });
  await new Promise(r => setTimeout(r, 4500));
  console.log('On cert-lookup page');
  
  let success = 0, fail = 0, notFound = 0;
  
  for (const pilot of PILOT_CERTS) {
    console.log(`\nCert ${pilot.certNumber} (${pilot.note})...`);
    
    // Clear network events for this cert
    cdp.events.length = 0;
    
    try {
      const result = await certLookup(cdp, pilot.certNumber);
      
      const livewireReqs = cdp.events.filter(e => e.method === 'Network.requestWillBeSent' && e.params?.request?.url?.includes('livewire'));
      console.log(`  Livewire requests fired: ${livewireReqs.length}`);
      console.log(`  Result: failed=${result.lookupFailed}, grade=${result.grade}, vtLen=${result.vtLength}`);
      if (result.error) console.log(`  Error detail: ${result.error}`);
      console.log(`  CertSection: ${result.certSectionPreview}`);
      
      if (result.lookupFailed === true) {
        notFound++;
        console.log(`  → Not found in GoCollect`);
      } else if (result.grade) {
        console.log(`  Grade: ${result.grade} | Label: ${result.label} | PageQuality: ${result.pageQuality}`);
        console.log(`  Variant: ${result.variant}`);
        console.log(`  Art: ${result.artComments}`);
        console.log(`  Notes: ${result.notes}`);
        
        const ingested = await ingestResult({...result, grader: pilot.grader});
        if (ingested) success++;
        else fail++;
      } else if (result.displayLookupResults) {
        // Found but no grade parsed — needs investigation
        console.log(`  Found (displayLookupResults=true) but grade parse failed`);
        notFound++;
      } else {
        // Neither failed=true nor grade found
        console.log(`  → Unknown state — lookupFailed=${result.lookupFailed}, displayLookupResults=${result.displayLookupResults}`);
        notFound++;
      }
    } catch (err) {
      console.log(`  Error: ${err.message}`);
      fail++;
    }
    
    // Wait 2s between certs
    await new Promise(r => setTimeout(r, 2000));
  }
  
  cdp.close();
  
  console.log('\n=== Pilot Summary ===');
  console.log(`Certs tested:   ${PILOT_CERTS.length}`);
  console.log(`Ingested:       ${success}`);
  console.log(`Not found:      ${notFound}`);
  console.log(`Errors:         ${fail}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
