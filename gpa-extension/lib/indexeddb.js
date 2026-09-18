/**
 * IndexedDB Durable State Storage for Panel Profits GPA Crawler
 */

const DB_NAME = 'PanelProfitsGPA_DB';
const DB_VERSION = 1;

let dbInstance = null;

export async function openGpaDatabase(forceFresh = false) {
  if (dbInstance && !forceFresh) return dbInstance;

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Targets Queue Store
      if (!db.objectStoreNames.contains('targets')) {
        const targetStore = db.createObjectStore('targets', { keyPath: 'id' });
        targetStore.createIndex('status', 'status', { unique: false });
        targetStore.createIndex('title_id', 'title_id', { unique: false });
      }

      // 2. Extracted Results Store
      if (!db.objectStoreNames.contains('results')) {
        const resultStore = db.createObjectStore('results', { keyPath: 'id' });
        resultStore.createIndex('gpa_title_id', 'title.gpa_title_id', { unique: false });
      }

      // 3. Checkpoints Store
      if (!db.objectStoreNames.contains('checkpoints')) {
        db.createObjectStore('checkpoints', { keyPath: 'key' });
      }

      // 4. Retry History Store
      if (!db.objectStoreNames.contains('retries')) {
        const retryStore = db.createObjectStore('retries', { keyPath: 'id', autoIncrement: true });
        retryStore.createIndex('target_id', 'target_id', { unique: false });
      }

      // 5. Unsent Batches Store
      if (!db.objectStoreNames.contains('unsent_batches')) {
        const batchStore = db.createObjectStore('unsent_batches', { keyPath: 'id' });
        batchStore.createIndex('created_at', 'created_at', { unique: false });
      }
    };

    req.onsuccess = (event) => {
      dbInstance = event.target.result;
      dbInstance.onclose = () => {
        dbInstance = null;
      };
      resolve(dbInstance);
    };

    req.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

export function closeGpaDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

// Target Operations
export async function addTargets(targets) {
  const db = await openGpaDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('targets', 'readwrite');
    const store = tx.objectStore('targets');
    for (const t of targets) {
      store.put({
        ...t,
        status: t.status || 'QUEUED',
        created_at: t.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e.target.error);
  });
}

export async function getNextQueuedTarget() {
  const db = await openGpaDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('targets', 'readonly');
    const store = tx.objectStore('targets');
    const index = store.index('status');
    const req = index.get('QUEUED');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function updateTargetStatus(targetId, status, extra = {}) {
  const db = await openGpaDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('targets', 'readwrite');
    const store = tx.objectStore('targets');
    const getReq = store.get(targetId);
    getReq.onsuccess = () => {
      if (!getReq.result) {
        return resolve(false);
      }
      const updated = {
        ...getReq.result,
        ...extra,
        status,
        updated_at: new Date().toISOString(),
      };
      store.put(updated);
    };
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e.target.error);
  });
}

// Extracted Results Operations
export async function saveExtractedResult(resultPayload) {
  const db = await openGpaDatabase();
  const id = `result_${resultPayload?.title?.gpa_title_id || 0}_${resultPayload?.issue?.gpa_issue_id || 0}_${Date.now()}`;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('results', 'readwrite');
    const store = tx.objectStore('results');
    store.put({
      id,
      collected_at: new Date().toISOString(),
      payload: resultPayload,
    });
    tx.oncomplete = () => resolve(id);
    tx.onerror = (e) => reject(e.target.error);
  });
}

export async function getAllExtractedResults() {
  const db = await openGpaDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('results', 'readonly');
    const store = tx.objectStore('results');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

// Unsent Batch Operations
export async function queueUnsentBatch(batchPayload) {
  const db = await openGpaDatabase();
  const id = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('unsent_batches', 'readwrite');
    const store = tx.objectStore('unsent_batches');
    store.put({
      id,
      payload: batchPayload,
      attempts: 0,
      created_at: new Date().toISOString(),
    });
    tx.oncomplete = () => resolve(id);
    tx.onerror = (e) => reject(e.target.error);
  });
}

export async function getAllUnsentBatches() {
  const db = await openGpaDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('unsent_batches', 'readonly');
    const store = tx.objectStore('unsent_batches');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function removeUnsentBatch(batchId) {
  const db = await openGpaDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('unsent_batches', 'readwrite');
    const store = tx.objectStore('unsent_batches');
    store.delete(batchId);
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e.target.error);
  });
}

// Queue Metrics
export async function getQueueMetrics() {
  const db = await openGpaDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['targets', 'unsent_batches'], 'readonly');
    const targetStore = tx.objectStore('targets');
    const batchStore = tx.objectStore('unsent_batches');

    let queuedCount = 0;
    let completedCount = 0;
    let failedCount = 0;
    let unsentCount = 0;

    const targetReq = targetStore.getAll();
    targetReq.onsuccess = () => {
      const targets = targetReq.result || [];
      for (const t of targets) {
        if (t.status === 'QUEUED') queuedCount++;
        else if (t.status === 'COMPLETED') completedCount++;
        else if (t.status === 'FAILED') failedCount++;
      }
    };

    const batchReq = batchStore.count();
    batchReq.onsuccess = () => {
      unsentCount = batchReq.result || 0;
    };

    tx.oncomplete = () => {
      resolve({
        queued: queuedCount,
        completed: completedCount,
        failed: failedCount,
        unsent: unsentCount,
      });
    };
    tx.onerror = (e) => reject(e.target.error);
  });
}

// Checkpoints
export async function setCheckpoint(key, value) {
  const db = await openGpaDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('checkpoints', 'readwrite');
    const store = tx.objectStore('checkpoints');
    store.put({ key, value, updated_at: new Date().toISOString() });
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e.target.error);
  });
}

export async function getCheckpoint(key) {
  const db = await openGpaDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('checkpoints', 'readonly');
    const store = tx.objectStore('checkpoints');
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result?.value || null);
    req.onerror = (e) => reject(e.target.error);
  });
}
