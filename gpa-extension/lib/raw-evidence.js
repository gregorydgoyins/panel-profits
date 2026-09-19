/**
 * raw-evidence.js
 * Panel Profits Graded Collector — Raw Evidence Store
 *
 * Every normalized observation MUST reference immutable raw evidence.
 * Raw evidence is stored BEFORE normalization.
 * Uses IndexedDB locally, synced to graded_source_payloads via ingestion API.
 */

'use strict';

class RawEvidenceStore {
  /**
   * @param {IDBDatabase} db
   */
  constructor(db) {
    this.db = db;
    this.store = 'raw_evidence';
  }

  /**
   * Store a raw evidence record.
   * @param {object} params
   * @param {string} params.provider - provider slug
   * @param {string} params.sourceUrl
   * @param {string} [params.providerNativeId]
   * @param {string} [params.collectionTimestamp] - ISO timestamp
   * @param {string} [params.sourceAsOfTimestamp] - ISO timestamp
   * @param {number} params.httpStatus
   * @param {string} params.requestFingerprint
   * @param {string} params.responseHash - SHA-256 of raw response
   * @param {string} [params.extractionVersion]
   * @param {object|string} params.rawPayload - raw JSON or text
   * @param {string} [params.completenessStatus]
   * @param {string[]} [params.transformationWarnings]
   * @param {string} [params.httpMethod]
   * @param {string} [params.requestBodyHash]
   * @param {string|null} [params.parentEvidenceId]
   * @returns {Promise<string>} evidence record ID
   */
  async store({
    provider,
    sourceUrl,
    providerNativeId = null,
    collectionTimestamp = new Date().toISOString(),
    sourceAsOfTimestamp = null,
    httpStatus,
    requestFingerprint,
    responseHash,
    extractionVersion = '1.0.0',
    rawPayload,
    completenessStatus = 'complete',
    transformationWarnings = [],
    httpMethod = 'GET',
    requestBodyHash = null,
    parentEvidenceId = null,
    gradingCompanySlug = null,
  }) {
    const id = `${provider}:${responseHash}:${Date.now()}`;
    const record = {
      id,
      provider,
      gradingCompanySlug,
      sourceUrl,
      httpMethod,
      requestBodyHash,
      requestFingerprint,
      responseHash,
      httpStatus,
      providerNativeId,
      collectionTimestamp,
      sourceAsOfTimestamp,
      extractionVersion,
      rawPayload: typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload),
      completenessStatus,
      transformationWarnings,
      parentEvidenceId,
      synced: false, // will be synced to Supabase via ingestion batch
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.store], 'readwrite');
      const store = tx.objectStore(this.store);
      const req = store.put(record);
      req.onsuccess = () => resolve(id);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get a raw evidence record by ID.
   */
  async get(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.store], 'readonly');
      const store = tx.objectStore(this.store);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Check if a payload with the given responseHash already exists.
   * @param {string} responseHash
   * @returns {Promise<string|null>} existing record ID or null
   */
  async findByHash(responseHash) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.store], 'readonly');
      const store = tx.objectStore(this.store);
      const index = store.index('by_response_hash');
      const req = index.getKey(responseHash);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get all unsynced records for a provider.
   */
  async getUnsynced(provider, limit = 50) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.store], 'readonly');
      const store = tx.objectStore(this.store);
      const index = store.index('by_provider_synced');
      const range = IDBKeyRange.only([provider, false]);
      const results = [];
      const req = index.openCursor(range);
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Mark records as synced.
   */
  async markSynced(ids) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.store], 'readwrite');
      const store = tx.objectStore(this.store);
      let pending = ids.length;
      if (pending === 0) { resolve(); return; }
      for (const id of ids) {
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          if (getReq.result) {
            getReq.result.synced = true;
            store.put(getReq.result);
          }
          if (--pending === 0) resolve();
        };
        getReq.onerror = () => reject(getReq.error);
      }
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RawEvidenceStore };
}
