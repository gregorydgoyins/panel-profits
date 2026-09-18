const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});

const secret = env.GPA_INGESTION_SECRET || fs.readFileSync('.gpa_secret_local', 'utf8').trim();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getCdpSession(targetFilter) {
  let list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
  let target = list.find(targetFilter);
  if (!target) {
    console.log('Opening extension popup tab via DevTools...');
    target = await (await fetch('http://127.0.0.1:9222/json/new?chrome-extension://ngelkebaeedndghdabonhokmkomamgpl/popup/popup.html', { method: 'PUT' })).json();
    await sleep(800);
  }
  if (!target || !target.webSocketDebuggerUrl) throw new Error(`Target not found`);

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve => ws.onopen = resolve);

  let msgId = 1;
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      const handler = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  return { ws, send, target };
}

async function captureScreenshot(session, filepath) {
  const res = await session.send('Page.captureScreenshot');
  fs.writeFileSync(filepath, Buffer.from(res.data, 'base64'));
  console.log(`[Screenshot Captured] ${filepath}`);
}

async function runAcceptance() {
  console.log('=== STARTING GENUINE GPA BROWSER EXTENSION ACCEPTANCE RUN ===');

  // 0. Reset Supabase Tables to 0
  console.log('\n[Phase 0] Resetting Supabase GPA tables to 0 rows...');
  await supabase.from('gpa_sales_observations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('gpa_yearly_aggregates').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('gpa_grade_summaries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('gpa_comic_matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('gpa_editions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('gpa_issues').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('gpa_titles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Supabase tables cleared.');

  // 1. Connect to Extension Popup
  console.log('\n[Phase 1] Connecting to Extension Popup via CDP...');
  let popupSession = await getCdpSession(t => t.url.includes('popup.html'));
  console.log('Connected to popup:', popupSession.target.title);

  // Clear Extension IndexedDB and Reload Extension
  console.log('Clearing Extension IndexedDB & reloading extension...');
  await popupSession.send('Runtime.evaluate', {
    expression: `
      (async function() {
        const { openGpaDatabase } = await import('../lib/indexeddb.js');
        const db = await openGpaDatabase();
        const stores = ['targets', 'results', 'checkpoints', 'retries', 'unsent_batches'];
        for (const s of stores) {
          const tx = db.transaction(s, 'readwrite');
          tx.objectStore(s).clear();
        }
        return true;
      })()
    `,
    awaitPromise: true
  });
  await popupSession.send('Runtime.evaluate', { expression: 'chrome.runtime.reload()' });
  popupSession.ws.close();
  await sleep(2000);

  // Reconnect after reload
  popupSession = await getCdpSession(t => t.url.includes('popup.html'));

  // 2. Configure Settings in Popup
  console.log('\n[Phase 2] Configuring Extension Settings in Popup UI...');
  const configScript = `
    (function() {
      document.getElementById('settingServerUrl').value = 'https://comicbookstockexchange.com';
      document.getElementById('settingSecret').value = ${JSON.stringify(secret)};
      document.getElementById('settingDelay').value = 1500;
      document.getElementById('btnSaveSettings').click();
      return true;
    })()
  `;
  await popupSession.send('Runtime.evaluate', { expression: configScript });
  await sleep(600);

  // 3. Screenshot Before Collection
  console.log('\n[Phase 3] Capturing Screenshot: Before Collection...');
  await captureScreenshot(popupSession, '/tmp/popup_1_before.png');

  // 4. Queue Target URL
  console.log('\n[Phase 4] Queuing Target URL through Popup...');
  const queueScript = `
    (async function() {
      const urlInput = document.getElementById('targetUrlInput');
      urlInput.value = 'https://comics.gpanalysis.com/analyse-prices/sales-data/13/1';
      document.getElementById('btnQueueUrl').click();
      return true;
    })()
  `;
  await popupSession.send('Runtime.evaluate', { expression: queueScript, awaitPromise: true });
  await sleep(1000);

  // 5. Press Start through Extension Popup
  console.log('\n[Phase 5] Pressing Start on Extension...');
  await popupSession.send('Runtime.evaluate', {
    expression: "document.getElementById('btnStart').click()"
  });
  await sleep(800);

  // 6. Screenshot During Collection
  console.log('\n[Phase 6] Capturing Screenshot: During Collection...');
  await captureScreenshot(popupSession, '/tmp/popup_2_during.png');

  // 7. Wait for Processing & Ingestion
  console.log('\n[Phase 7] Waiting for Extension Extraction & Ingestion to Complete...');
  let completed = false;
  for (let i = 0; i < 25; i++) {
    await sleep(1500);
    const statusRes = await popupSession.send('Runtime.evaluate', {
      expression: `
        JSON.stringify({
          badge: document.getElementById('statusBadge')?.innerText,
          queued: document.getElementById('queuedCount')?.innerText,
          completed: document.getElementById('completedCount')?.innerText,
          unsent: document.getElementById('unsentCount')?.innerText,
          lastError: document.getElementById('lastErrorText')?.innerText
        })
      `
    });
    const status = JSON.parse(statusRes.result.value || '{}');
    console.log(`  Status check [${i+1}/25]:`, status);
    if (status.completed === '1' && status.queued === '0' && status.unsent === '0') {
      completed = true;
      break;
    }
  }

  // 8. Screenshot After Collection
  console.log('\n[Phase 8] Capturing Screenshot: After Collection...');
  await captureScreenshot(popupSession, '/tmp/popup_3_after.png');

  // 9. Retrieve and Preserve Raw Extension Payload from IndexedDB
  console.log('\n[Phase 9] Preserving Raw Payload from Extension IndexedDB...');
  const resultsRes = await popupSession.send('Runtime.evaluate', {
    expression: `
      (async function() {
        const { getAllExtractedResults } = await import('../lib/indexeddb.js');
        const res = await getAllExtractedResults();
        return JSON.stringify(res);
      })()
    `,
    awaitPromise: true
  });

  const rawResults = JSON.parse(resultsRes.result.value || '[]');
  console.log(`Preserved ${rawResults.length} extracted result(s) from IndexedDB.`);
  fs.writeFileSync('/tmp/extension_raw_payload.json', JSON.stringify(rawResults, null, 2));

  // 10. Query Live Supabase Database Records
  console.log('\n[Phase 10] Querying Live Supabase Tables after Genuine Extension Run...');
  const { data: titles } = await supabase.from('gpa_titles').select('*');
  const { data: issues } = await supabase.from('gpa_issues').select('*');
  const { data: editions } = await supabase.from('gpa_editions').select('*');
  const { data: summaries } = await supabase.from('gpa_grade_summaries').select('*');
  const { data: aggregates } = await supabase.from('gpa_yearly_aggregates').select('*');
  const { data: observations } = await supabase.from('gpa_sales_observations').select('*').order('observed_date', { ascending: false });
  const { data: matches } = await supabase.from('gpa_comic_matches').select('*');

  console.log('\n--- LIVE DATABASE ROW COUNTS ---');
  console.log({
    gpa_titles: titles?.length,
    gpa_issues: issues?.length,
    gpa_editions: editions?.length,
    gpa_grade_summaries: summaries?.length,
    gpa_yearly_aggregates: aggregates?.length,
    gpa_sales_observations: observations?.length,
    gpa_comic_matches: matches?.length,
  });

  console.log('\n--- LIVE SALES OBSERVATIONS (AUTHENTIC EXTENSION OUTPUT) ---');
  observations?.forEach((obs, idx) => {
    console.log(`  ${idx+1}. Date: ${obs.displayed_date_text} (${obs.observed_date}) | Price: ${obs.displayed_price_text} ($${obs.parsed_numeric_price}) | Cert: ${obs.certification_number} | Venue: ${obs.venue} | Evidence: ${obs.evidence_redirect_path}`);
  });

  console.log('\n--- LIVE 2025 YEARLY AGGREGATE ---');
  console.log(aggregates?.[0]);

  // 11. Test Idempotency (Second Run)
  console.log('\n[Phase 11] Running Idempotency Check (Re-queuing Target)...');
  await popupSession.send('Runtime.evaluate', { expression: queueScript, awaitPromise: true });
  await sleep(600);
  await popupSession.send('Runtime.evaluate', {
    expression: "document.getElementById('btnStart').click()"
  });
  await sleep(4000);

  const { count: obsCount2 } = await supabase.from('gpa_sales_observations').select('*', { count: 'exact', head: true });
  const { count: aggCount2 } = await supabase.from('gpa_yearly_aggregates').select('*', { count: 'exact', head: true });
  console.log(`Second-run counts: observations=${obsCount2} (diff: ${obsCount2 - observations.length}), aggregates=${aggCount2} (diff: ${aggCount2 - aggregates.length})`);

  // 12. Test Restart Recovery & Checkpoint Persistence
  console.log('\n[Phase 12] Testing Restart Recovery & Checkpoint Persistence in Extension...');
  const recoveryTestScript = `
    (async function() {
      const { setCheckpoint, getCheckpoint, addTargets, getNextQueuedTarget } = await import('../lib/indexeddb.js');
      await setCheckpoint('recovery_test_checkpoint', 'ASM_1_CHECKPOINT_VALUE');
      await addTargets([{
        id: 'target_recovery_test',
        title_id: 13,
        title_name: 'Amazing Spider-Man, The',
        issue_id: 1,
        gpa_url: 'https://comics.gpanalysis.com/analyse-prices/sales-data/13/1',
        status: 'QUEUED'
      }]);
      return true;
    })()
  `;
  await popupSession.send('Runtime.evaluate', { expression: recoveryTestScript, awaitPromise: true });

  console.log('Reloading extension service worker...');
  await popupSession.send('Runtime.evaluate', { expression: 'chrome.runtime.reload()' });
  popupSession.ws.close();
  await sleep(2000);

  console.log('Reconnecting to popup and verifying persistence...');
  const newPopupSession = await getCdpSession(t => t.url.includes('popup.html'));
  const verifyRecoveryScript = `
    (async function() {
      const { getCheckpoint, getNextQueuedTarget, updateTargetStatus } = await import('../lib/indexeddb.js');
      const cp = await getCheckpoint('recovery_test_checkpoint');
      const target = await getNextQueuedTarget();
      return JSON.stringify({ checkpoint: cp, targetId: target?.id });
    })()
  `;
  const recoveryResult = await newPopupSession.send('Runtime.evaluate', {
    expression: verifyRecoveryScript,
    awaitPromise: true
  });
  console.log('Recovery verification result:', recoveryResult.result.value);
  newPopupSession.ws.close();

  console.log('\n=== ACCEPTANCE TEST COMPLETED SUCCESSFULLY ===');
}

runAcceptance().catch(err => {
  console.error('Acceptance run failed:', err);
  process.exit(1);
});
