/**
 * Service Worker Orchestrator for GPA Authenticated Browser Ingestion
 */

import {
  openGpaDatabase,
  getNextQueuedTarget,
  updateTargetStatus,
  saveExtractedResult,
  queueUnsentBatch,
  getAllUnsentBatches,
  removeUnsentBatch,
  getQueueMetrics,
  getCheckpoint,
  setCheckpoint,
} from '../lib/indexeddb.js';
import { startCgcPop, stopCgcPop, getCgcPopStatus } from '../lib/cgc-pop-crawler.js';
import { startPriceChartingLoad, getPriceChartingStatus } from '../lib/pricecharting-loader.js';

let crawlerState = 'IDLE'; // 'IDLE' | 'RUNNING' | 'PAUSED' | 'HUMAN_REQUIRED'
let activeGpaTabId = null;
let currentTargetObject = null;
let lastErrorMessage = null;

// Settings Defaults
const DEFAULT_SETTINGS = {
  serverUrl: 'https://comicbookstockexchange.com',
  ingestionSecret: 'dev-gpa-ingestion-secret',
  requestDelayMs: 2500,
};

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['settings'], (res) => {
      resolve({ ...DEFAULT_SETTINGS, ...(res.settings || {}) });
    });
  });
}

// 0. Convert extractor output to the GPA ingestion contract (/api/ingestion/gpa/batch → gpa_* tables)
export function toGpaBatchPayload(x) {
  const m = x.meta || {};
  const aggsBySerial = new Map();
  for (const a of x.yearly_aggregates || []) {
    if (!aggsBySerial.has(a.serial)) aggsBySerial.set(a.serial, []);
    aggsBySerial.get(a.serial).push(a);
  }
  const obsBySerialYear = new Map();
  for (const o of x.observations || []) {
    const k = `${o.serial}|${o.sale_year}`;
    if (!obsBySerialYear.has(k)) obsBySerialYear.set(k, []);
    obsBySerialYear.get(k).push(o);
  }
  const editions = new Map();
  for (const e of x.editions || []) {
    const name = e.variant_name || 'Regular';
    if (!editions.has(name)) editions.set(name, { edition_name: name, variant_name: e.variant_name || null, is_regular_edition: !e.variant_name, grade_summaries: [] });
    editions.get(name).grade_summaries.push({
      grader: 'CGC',
      grade: e.grade != null ? Number(e.grade).toFixed(1) : 'UNKNOWN',
      designation: e.edition_name || 'Universal',
      serial: e.serial || null,
      avg_2024: e.avg_price_2024 ?? null,
      avg_2025: e.avg_price_2025 ?? null,
      avg_12m: e.avg_price_12m ?? null,
      avg_90d: e.avg_price_90d ?? null,
      last_sale_price: e.last_sale_price ?? null,
      last_sale_date: e.last_sale_date ?? null,
      yearly_aggregates: (aggsBySerial.get(e.serial) || []).map((a) => ({
        year: a.year,
        count_sold: a.count_sold,
        high_price: a.high_price ?? null,
        low_price: a.low_price ?? null,
        avg_price: a.avg_price ?? null,
        observations: (obsBySerialYear.get(`${e.serial}|${a.year}`) || [])
          .filter((o) => o.sale_price != null && o.sale_date)
          .map((o) => ({
            displayed_date_text: o.sale_date,
            displayed_price_text: `$${o.sale_price}`,
            parsed_numeric_price: o.sale_price,
            displayed_currency_symbol: '$',
            normalized_currency: 'USD',
            certification_number: o.cert_number || null,
            evidence_redirect_path: o.evidence_path || null,
            raw_payload: o,
          })),
      })),
    });
  }
  return {
    title: { gpa_title_id: m.gpa_title_id, title_name: m.title_name, publisher: m.publisher || null, publication_year: m.publication_year || null },
    issue: { gpa_issue_id: m.gpa_issue_id, issue_number_raw: m.issue_number_raw, gpa_url: m.gpa_url },
    editions: Array.from(editions.values()),
  };
}

// 1. Sync Unsent Batches to Server
export async function syncUnsentBatches() {
  const settings = await getSettings();
  const batches = await getAllUnsentBatches();

  if (!batches || batches.length === 0) {
    return { synced: 0 };
  }

  let syncedCount = 0;

  const base = (settings.serverUrl || DEFAULT_SETTINGS.serverUrl).replace(/\/+$/, '');
  const secret = (settings.ingestionSecret || '').trim();

  for (const b of batches) {
    // Batches queued by v2.1 are raw extractor output; convert them. Drop anything unusable.
    let payload = b.payload;
    if (payload && !payload.title && payload.meta) payload = toGpaBatchPayload(payload);
    if (!payload || !payload.title?.gpa_title_id || !payload.issue?.gpa_issue_id) {
      await removeUnsentBatch(b.id);
      continue;
    }
    try {
      const res = await fetch(`${base}/api/ingestion/gpa/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await removeUnsentBatch(b.id);
        syncedCount++;
      } else {
        const errText = await res.text();
        lastErrorMessage =
          res.status === 401 || res.status === 403
            ? `Secret rejected: ${errText.slice(0, 160)}`
            : `Server HTTP ${res.status}: ${errText.slice(0, 200)}`;
        console.warn(`Server responded with ${res.status} for batch ${b.id}`, errText);
        if (res.status === 401 || res.status === 403) break;
      }
    } catch (err) {
      lastErrorMessage = `Sync connection error: ${err.message}`;
      console.warn(`Failed to sync batch ${b.id}:`, err);
      break; // Stop syncing if server is unreachable
    }
  }

  return { synced: syncedCount, remaining: batches.length - syncedCount };
}

// 2. Ensure Single Active GPA Tab
async function getOrCreateGpaTab() {
  if (activeGpaTabId) {
    try {
      const tab = await chrome.tabs.get(activeGpaTabId);
      if (tab && tab.url?.includes('gpanalysis.com')) {
        return tab;
      }
    } catch {
      activeGpaTabId = null;
    }
  }

  // Find existing GPA tab
  const tabs = await chrome.tabs.query({ url: 'https://comics.gpanalysis.com/*' });
  if (tabs.length > 0) {
    activeGpaTabId = tabs[0].id;
    return tabs[0];
  }

  // Create single new tab if none exist
  const newTab = await chrome.tabs.create({
    url: 'https://comics.gpanalysis.com/analyse-prices',
    active: false,
  });
  activeGpaTabId = newTab.id;
  return newTab;
}

function navigate(tabId, url) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { chrome.tabs.onUpdated.removeListener(listener); resolve(true); }, 15000);
    const listener = (id, info) => {
      if (id === tabId && info.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(true);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.update(tabId, { url });
  });
}

async function runInPage(tabId, func, args = []) {
  // GPA's own requests (and its CSRF token) live in the page's MAIN world.
  await chrome.scripting.executeScript({ target: { tabId }, files: ['content/gpa-crawler.js'], world: 'MAIN' });
  const res = await chrome.scripting.executeScript({ target: { tabId }, func, args, world: 'MAIN' });
  return res?.[0]?.result;
}

const ISSUE_PAGE = /\/analyse-prices\/sales-data\/\d+\/\d+/;

// 3. Crawler Queue Execution Loop
async function runCrawlerLoop() {
  if (crawlerState !== 'RUNNING') return;

  const target = await getNextQueuedTarget();
  if (!target) {
    currentTargetObject = null;
    crawlerState = 'IDLE';
    await chrome.storage.local.set({ crawlerState: 'IDLE' });
    await syncUnsentBatches();
    return;
  }

  currentTargetObject = target;
  const settings = await getSettings();

  try {
    await updateTargetStatus(target.id, 'IN_PROGRESS');
    const tab = await getOrCreateGpaTab();

    // Navigate; a search URL is resolved to the matching issue page first.
    await navigate(tab.id, target.gpa_url);
    await new Promise((r) => setTimeout(r, settings.requestDelayMs || 800));
    let current = (await chrome.tabs.get(tab.id)).url || '';
    if (!ISSUE_PAGE.test(current)) {
      let issueUrl = null;
      for (let attempt = 0; attempt < 10 && !issueUrl; attempt++) {
        issueUrl = await runInPage(tab.id, (series, issue) => window.__ppGpaFindIssueLink(series, issue), [target.series || target.title_name || '', target.issue || '']);
        if (!issueUrl) await new Promise((r) => setTimeout(r, 1000));
      }
      if (!issueUrl) throw new Error(`No GPA issue page found for ${target.series || target.title_name} #${target.issue || ''}`);
      await navigate(tab.id, issueUrl);
      await new Promise((r) => setTimeout(r, settings.requestDelayMs || 800));
    }

    const cp = await getCheckpoint(target.id);
    const raw = await runInPage(tab.id, async (checkpoint) => await window.__ppGpaExtract(checkpoint), [cp]);
    const extractedData = raw ? toGpaBatchPayload(raw) : null;

    if (extractedData) {
      await saveExtractedResult(extractedData);
      await queueUnsentBatch(extractedData);
      await updateTargetStatus(target.id, 'COMPLETED');
      await setCheckpoint(target.id, null); // Clear checkpoint on completion
      lastErrorMessage = null;
      await syncUnsentBatches();
    } else {
      throw new Error('Extraction failed to return data');
    }
  } catch (err) {
    lastErrorMessage = err.message;
    console.error(`Error processing target ${target.id}:`, err);
    await updateTargetStatus(target.id, 'FAILED', { error: err.message });
  }

  // Next iteration
  if (crawlerState === 'RUNNING') {
    setTimeout(runCrawlerLoop, 1000);
  }
}

// 4. Message Router
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CRAWLER_CHECKPOINT' && message.checkpoint) {
    if (currentTargetObject) {
      setCheckpoint(currentTargetObject.id, message.checkpoint);
    }
    sendResponse({ success: true });
    return true;
  }
  if (message.type === 'START_CRAWLER') {
    crawlerState = 'RUNNING';
    chrome.storage.local.set({ crawlerState: 'RUNNING' });
    runCrawlerLoop();
    sendResponse({ success: true, state: 'RUNNING' });
    return true;
  }

  if (message.type === 'PAUSE_CRAWLER') {
    crawlerState = 'PAUSED';
    chrome.storage.local.set({ crawlerState: 'PAUSED' });
    sendResponse({ success: true, state: 'PAUSED' });
    return true;
  }

  if (message.type === 'RESUME_CRAWLER') {
    crawlerState = 'RUNNING';
    chrome.storage.local.set({ crawlerState: 'RUNNING' });
    runCrawlerLoop();
    sendResponse({ success: true, state: 'RUNNING' });
    return true;
  }

  if (message.type === 'STOP_CRAWLER') {
    crawlerState = 'IDLE';
    chrome.storage.local.set({ crawlerState: 'IDLE' });
    sendResponse({ success: true, state: 'IDLE' });
    return true;
  }

  if (message.type === 'GET_STATUS') {
    getQueueMetrics().then((metrics) => {
      sendResponse({
        success: true,
        state: crawlerState,
        metrics,
        activeTarget: currentTargetObject,
        lastError: lastErrorMessage,
      });
    });
    return true;
  }

  if (message.type === 'SYNC_NOW') {
    syncUnsentBatches().then((res) => {
      sendResponse({ success: true, ...res });
    });
    return true;
  }

  if (message.type === 'CGC_POP_START') {
    startCgcPop().then(() => sendResponse({ success: true }));
    return true;
  }
  if (message.type === 'CGC_POP_STOP') {
    stopCgcPop().then(() => sendResponse({ success: true }));
    return true;
  }
  if (message.type === 'PC_PRICE_START') {
    startPriceChartingLoad().then(() => sendResponse({ success: true }));
    return true;
  }
  if (message.type === 'PC_PRICE_STATUS') {
    getPriceChartingStatus().then((state) => sendResponse({ success: true, state }));
    return true;
  }
  if (message.type === 'CGC_POP_STATUS') {
    getCgcPopStatus().then((state) => sendResponse({ success: true, state }));
    return true;
  }

  if (message.type === 'CLOUDFLARE_CHALLENGE_DETECTED') {
    crawlerState = 'HUMAN_REQUIRED';
    lastErrorMessage = 'Cloudflare challenge detected';
    chrome.storage.local.set({ crawlerState: 'HUMAN_REQUIRED' });
    if (activeGpaTabId) {
      chrome.tabs.update(activeGpaTabId, { active: true });
    }
    sendResponse({ success: true, state: 'HUMAN_REQUIRED' });
    return true;
  }
});

// Periodic sync alarm every 1 minute
chrome.alarms.create('gpa_sync_alarm', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'gpa_sync_alarm') {
    syncUnsentBatches();
  }
});
