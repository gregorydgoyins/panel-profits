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
} from '../lib/indexeddb.js';

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

// 1. Sync Unsent Batches to Server
export async function syncUnsentBatches() {
  const settings = await getSettings();
  const batches = await getAllUnsentBatches();

  if (!batches || batches.length === 0) {
    return { synced: 0 };
  }

  let syncedCount = 0;

  for (const b of batches) {
    try {
      const res = await fetch(`${settings.serverUrl}/api/ingestion/gpa/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.ingestionSecret}`,
        },
        body: JSON.stringify(b.payload),
      });

      if (res.ok) {
        await removeUnsentBatch(b.id);
        syncedCount++;
      } else {
        const errText = await res.text();
        lastErrorMessage = `Server HTTP ${res.status}: ${errText.slice(0, 100)}`;
        console.warn(`Server responded with ${res.status} for batch ${b.id}`);
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

    // Navigate to target URL if not already there
    if (tab.url !== target.gpa_url) {
      await chrome.tabs.update(tab.id, { url: target.gpa_url });

      // Wait for tab completion
      await new Promise((resolve) => {
        const listener = (tabId, info) => {
          if (tabId === tab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve(true);
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
      });
    }

    // Polite delay
    await new Promise((r) => setTimeout(r, settings.requestDelayMs));

    // Send extraction command (with automatic script injection fallback)
    let response;
    try {
      response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_CURRENT_PAGE' });
    } catch (msgErr) {
      console.log('Injecting content script dynamically into tab:', tab.id);
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/gpa-crawler.js'],
      });
      await new Promise((r) => setTimeout(r, 500));
      response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_CURRENT_PAGE' });
    }

    if (response && response.success && response.data) {
      await saveExtractedResult(response.data);
      await queueUnsentBatch(response.data);
      await updateTargetStatus(target.id, 'COMPLETED');
      lastErrorMessage = null;
      await syncUnsentBatches();
    } else {
      throw new Error(response?.error || 'Extraction failed');
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
