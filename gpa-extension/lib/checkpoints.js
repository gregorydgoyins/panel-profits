/**
 * checkpoints.js
 * Panel Profits Graded Collector — Durable Checkpoint System
 *
 * Checkpoint levels (from broadest to narrowest):
 *   catalog_query / catalog_page / title / issue / edition /
 *   grade / serial / census_page / year / sale_page /
 *   certification / cpi_issue / ingestion_batch
 *
 * States: discovered / pending / in_progress / extracted / ingested /
 *         verified / empty_verified / partial / retryable /
 *         human_required / permanently_failed / matched / ambiguous
 */

'use strict';

const CHECKPOINT_STATES = [
  'discovered', 'pending', 'in_progress', 'extracted', 'ingested',
  'verified', 'empty_verified', 'partial', 'retryable',
  'human_required', 'permanently_failed', 'matched', 'ambiguous',
];

const CHECKPOINT_LEVELS = [
  'catalog_query', 'catalog_page', 'title', 'issue', 'edition',
  'grade', 'serial', 'census_page', 'year', 'sale_page',
  'certification', 'cpi_issue', 'ingestion_batch',
];

class CheckpointManager {
  /**
   * @param {string} providerSlug
   * @param {IDBDatabase} db - IndexedDB instance
   */
  constructor(providerSlug, db) {
    this.providerSlug = providerSlug;
    this.db = db;
    this.store = 'checkpoints';
  }

  _key(level, key) {
    return `${this.providerSlug}:${level}:${key}`;
  }

  /**
   * Save or update a checkpoint.
   */
  async save(level, key, data = {}) {
    if (!CHECKPOINT_LEVELS.includes(level)) {
      throw new Error(`Unknown checkpoint level: ${level}`);
    }
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.store], 'readwrite');
      const store = tx.objectStore(this.store);
      const record = {
        id: this._key(level, key),
        providerSlug: this.providerSlug,
        level,
        key,
        data,
        savedAt: new Date().toISOString(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Load a checkpoint.
   * @returns {Promise<{key: string, data: object, savedAt: string} | null>}
   */
  async load(level, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.store], 'readonly');
      const store = tx.objectStore(this.store);
      const req = store.get(this._key(level, key));
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get the latest checkpoint at a given level for this provider.
   */
  async loadLatest(level) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.store], 'readonly');
      const store = tx.objectStore(this.store);
      const index = store.index('by_provider_level');
      const range = IDBKeyRange.bound(
        [this.providerSlug, level, ''],
        [this.providerSlug, level, '\uffff']
      );
      const req = index.openCursor(range, 'prev');
      req.onsuccess = () => {
        resolve(req.result ? req.result.value : null);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Delete a checkpoint (e.g., after ingestion batch completes).
   */
  async clear(level, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.store], 'readwrite');
      const store = tx.objectStore(this.store);
      const req = store.delete(this._key(level, key));
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * List all checkpoints at a given level for this provider.
   */
  async listByLevel(level) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.store], 'readonly');
      const store = tx.objectStore(this.store);
      const index = store.index('by_provider_level');
      const range = IDBKeyRange.bound(
        [this.providerSlug, level, ''],
        [this.providerSlug, level, '\uffff']
      );
      const results = [];
      const req = index.openCursor(range);
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CheckpointManager, CHECKPOINT_STATES, CHECKPOINT_LEVELS };
}
