/**
 * indexeddb.js
 * Panel Profits Graded Collector — IndexedDB Schema
 *
 * Preserves all existing GPA stores.
 * Adds new stores for the expanded multi-provider system.
 */

'use strict';

const DB_NAME = 'panel_profits_graded';
const DB_VERSION = 2; // bump from 1 (GPA only) to 2 (multi-provider)

/**
 * Open the IndexedDB database, applying all schema upgrades.
 * @returns {Promise<IDBDatabase>}
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;

      // ── Version 1: Original GPA stores ─────────────────────────────────────
      if (oldVersion < 1) {
        // GPA pending batches
        if (!db.objectStoreNames.contains('pending_batches')) {
          const batchStore = db.createObjectStore('pending_batches', { keyPath: 'batchId' });
          batchStore.createIndex('by_provider', 'provider', { unique: false });
          batchStore.createIndex('by_status', 'status', { unique: false });
          batchStore.createIndex('by_created', 'createdAt', { unique: false });
        }

        // GPA crawl queue
        if (!db.objectStoreNames.contains('crawl_queue')) {
          const queueStore = db.createObjectStore('crawl_queue', { keyPath: 'targetUrl' });
          queueStore.createIndex('by_status', 'status', { unique: false });
          queueStore.createIndex('by_title_id', 'gpa_title_id', { unique: false });
        }

        // GPA checkpoints (v1)
        if (!db.objectStoreNames.contains('checkpoints')) {
          const cpStore = db.createObjectStore('checkpoints', { keyPath: 'id' });
          cpStore.createIndex('by_provider_level', ['providerSlug', 'level', 'key'], { unique: false });
          cpStore.createIndex('by_provider', 'providerSlug', { unique: false });
        }
      }

      // ── Version 2: Multi-provider stores ────────────────────────────────────
      if (oldVersion < 2) {
        // Raw evidence store (required before normalization)
        if (!db.objectStoreNames.contains('raw_evidence')) {
          const evStore = db.createObjectStore('raw_evidence', { keyPath: 'id' });
          evStore.createIndex('by_provider', 'provider', { unique: false });
          evStore.createIndex('by_response_hash', 'responseHash', { unique: false });
          evStore.createIndex('by_provider_synced', ['provider', 'synced'], { unique: false });
          evStore.createIndex('by_collected', 'collectionTimestamp', { unique: false });
        }

        // Provider state (authentication, session info)
        if (!db.objectStoreNames.contains('provider_state')) {
          const stateStore = db.createObjectStore('provider_state', { keyPath: 'providerSlug' });
          stateStore.createIndex('by_authenticated', 'authenticated', { unique: false });
        }

        // Census snapshots (local buffer before Supabase sync)
        if (!db.objectStoreNames.contains('census_snapshots')) {
          const censusStore = db.createObjectStore('census_snapshots', { keyPath: 'id' });
          censusStore.createIndex('by_provider', 'provider', { unique: false });
          censusStore.createIndex('by_synced', ['provider', 'synced'], { unique: false });
          censusStore.createIndex('by_timestamp', 'snapshotTimestamp', { unique: false });
        }

        // Certifications (local buffer)
        if (!db.objectStoreNames.contains('certifications')) {
          const certStore = db.createObjectStore('certifications', { keyPath: 'id' });
          certStore.createIndex('by_grader_cert', ['gradingCompanySlug', 'certificationNumber'], { unique: false });
          certStore.createIndex('by_synced', ['provider', 'synced'], { unique: false });
        }

        // Disagreements (local buffer)
        if (!db.objectStoreNames.contains('disagreements')) {
          const disagStore = db.createObjectStore('disagreements', { keyPath: 'id' });
          disagStore.createIndex('by_type', 'disagreementType', { unique: false });
          disagStore.createIndex('by_status', 'resolutionStatus', { unique: false });
          disagStore.createIndex('by_synced', 'synced', { unique: false });
        }

        // Index observations (CPI)
        if (!db.objectStoreNames.contains('index_observations')) {
          const idxStore = db.createObjectStore('index_observations', { keyPath: 'id' });
          idxStore.createIndex('by_index', 'indexId', { unique: false });
          idxStore.createIndex('by_date', 'observationDate', { unique: false });
          idxStore.createIndex('by_synced', ['provider', 'synced'], { unique: false });
        }

        // Ingestion targets per provider (durable work queue)
        if (!db.objectStoreNames.contains('ingestion_targets')) {
          const targetStore = db.createObjectStore('ingestion_targets', { keyPath: 'id' });
          targetStore.createIndex('by_provider_status', ['provider', 'status'], { unique: false });
          targetStore.createIndex('by_type', ['provider', 'targetType'], { unique: false });
          targetStore.createIndex('by_priority', 'priority', { unique: false });
        }
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB upgrade blocked by another tab'));
  });
}

/**
 * Clear all pending/unsynced data for a provider (used during repair runs).
 * Does NOT clear checkpoints or raw evidence.
 */
async function clearProviderBuffer(db, providerSlug) {
  const stores = ['census_snapshots', 'certifications', 'index_observations'];
  for (const storeName of stores) {
    await new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const index = store.index('by_synced');
      const range = IDBKeyRange.only([providerSlug, false]);
      const req = index.openCursor(range);
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { openDatabase, clearProviderBuffer, DB_NAME, DB_VERSION };
}
