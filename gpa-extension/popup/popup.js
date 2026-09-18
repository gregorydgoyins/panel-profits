import { addTargets } from '../lib/indexeddb.js';

const statusBadge = document.getElementById('statusBadge');
const cfBanner = document.getElementById('cfBanner');
const queuedCount = document.getElementById('queuedCount');
const completedCount = document.getElementById('completedCount');
const failedCount = document.getElementById('failedCount');
const unsentCount = document.getElementById('unsentCount');
const currentTarget = document.getElementById('currentTarget');
const lastErrorRow = document.getElementById('lastErrorRow');
const lastErrorText = document.getElementById('lastErrorText');

const btnStart = document.getElementById('btnStart');
const btnPause = document.getElementById('btnPause');
const btnResume = document.getElementById('btnResume');
const btnStop = document.getElementById('btnStop');
const btnSyncNow = document.getElementById('btnSyncNow');

const targetUrlInput = document.getElementById('targetUrlInput');
const btnQueueUrl = document.getElementById('btnQueueUrl');

const settingServerUrl = document.getElementById('settingServerUrl');
const settingSecret = document.getElementById('settingSecret');
const settingDelay = document.getElementById('settingDelay');
const btnSaveSettings = document.getElementById('btnSaveSettings');
const saveNotice = document.getElementById('saveNotice');

// Load stored settings
chrome.storage.local.get(['settings'], (res) => {
  const s = res.settings || {};
  settingServerUrl.value = s.serverUrl || 'https://comicbookstockexchange.com';
  settingSecret.value = s.ingestionSecret || '';
  settingDelay.value = s.requestDelayMs || 2500;
});

btnSaveSettings.addEventListener('click', () => {
  const s = {
    serverUrl: settingServerUrl.value.trim() || 'https://comicbookstockexchange.com',
    ingestionSecret: settingSecret.value.trim(),
    requestDelayMs: parseInt(settingDelay.value, 10) || 2500,
  };
  chrome.storage.local.set({ settings: s }, () => {
    saveNotice.classList.remove('hidden');
    setTimeout(() => saveNotice.classList.add('hidden'), 2000);
  });
});

function updateUIState(state, metrics, activeTarget, lastError) {
  statusBadge.textContent = state;
  statusBadge.className = `badge badge-${state.toLowerCase()}`;

  if (state === 'HUMAN_REQUIRED') {
    cfBanner.classList.remove('hidden');
  } else {
    cfBanner.classList.add('hidden');
  }

  btnStart.disabled = state === 'RUNNING';
  btnPause.disabled = state !== 'RUNNING';
  btnResume.disabled = state !== 'PAUSED' && state !== 'HUMAN_REQUIRED';
  btnStop.disabled = state === 'IDLE';

  if (metrics) {
    queuedCount.textContent = metrics.queued ?? 0;
    completedCount.textContent = metrics.completed ?? 0;
    failedCount.textContent = metrics.failed ?? 0;
    unsentCount.textContent = metrics.unsent ?? 0;
  }

  currentTarget.textContent = activeTarget ? activeTarget.title_name || activeTarget.gpa_url : 'None';

  if (lastError) {
    lastErrorRow.classList.remove('hidden');
    lastErrorText.textContent = lastError;
  } else {
    lastErrorRow.classList.add('hidden');
  }
}

async function refreshStatus() {
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
    if (res && res.success) {
      updateUIState(res.state, res.metrics, res.activeTarget, res.lastError);
    }
  });
}

btnStart.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'START_CRAWLER' }, () => refreshStatus());
});

btnPause.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'PAUSE_CRAWLER' }, () => refreshStatus());
});

btnResume.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'RESUME_CRAWLER' }, () => refreshStatus());
});

btnStop.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'STOP_CRAWLER' }, () => refreshStatus());
});

btnSyncNow.addEventListener('click', () => {
  btnSyncNow.textContent = '⏳ Syncing...';
  chrome.runtime.sendMessage({ type: 'SYNC_NOW' }, () => {
    btnSyncNow.textContent = '🔄 Sync Batches Now';
    refreshStatus();
  });
});

btnQueueUrl.addEventListener('click', async () => {
  const url = targetUrlInput.value.trim();
  if (!url) return;

  const match = url.match(/\/sales-data\/(\d+)\/(\d+)/);
  const titleId = match ? parseInt(match[1], 10) : 13;
  const issueId = match ? parseInt(match[2], 10) : 1;

  await addTargets([
    {
      id: `target_${titleId}_${issueId}`,
      title_id: titleId,
      title_name: titleId === 13 ? 'Amazing Spider-Man, The' : `GPA Title ${titleId}`,
      issue_id: issueId,
      gpa_url: url,
    },
  ]);

  targetUrlInput.value = '';
  refreshStatus();
});

// Refresh every 2 seconds
refreshStatus();
setInterval(refreshStatus, 2000);
