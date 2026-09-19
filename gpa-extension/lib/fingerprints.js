/**
 * fingerprints.js
 * Panel Profits Graded Collector — Deterministic Deduplication Fingerprints
 *
 * All fingerprints are deterministic SHA-256 hex strings.
 * Uses SubtleCrypto in extension context, or crypto.subtle in service worker.
 */

'use strict';

async function sha256hex(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Fingerprint for a sale observation.
 * Deduplication priority:
 *  1. provider_sale_id (if available)
 *  2. grader + cert + sale_date
 *  3. evidence URL
 *  4. composite fingerprint
 */
async function fingerprintSale({
  provider,        // slug: 'gpa','cbcs','psa','gocollect'
  titleName,       // raw title name
  issueNumberRaw,  // raw issue number
  editionName,     // raw edition name
  grader,          // grading company slug
  designation,     // native designation text
  grade,           // native grade text
  saleDate,        // ISO date string or null
  saleDatePrecision, // 'DAY','MONTH','YEAR'
  price,           // numeric
  currency,        // 'USD'
  venue,           // 'heritage' etc.
  certNumber,      // certification number or null
  providerSaleId,  // provider-native sale ID or null
  rawRowHash,      // hash of raw data row
}) {
  // If we have a provider-native sale ID, use it as the primary key
  if (providerSaleId) {
    return sha256hex(`sale:provider_id:${provider}:${providerSaleId}`);
  }
  // If we have grader + cert + date, use that
  if (grader && certNumber && saleDate) {
    return sha256hex(`sale:cert:${grader}:${certNumber}:${saleDate}`);
  }
  // Composite fingerprint
  const parts = [
    'sale:composite',
    provider || '',
    titleName || '',
    issueNumberRaw || '',
    editionName || '',
    grader || '',
    designation || '',
    grade || '',
    saleDate || '',
    saleDatePrecision || 'UNKNOWN',
    price != null ? String(Math.round(price * 100)) : '',
    currency || 'USD',
    venue || '',
    rawRowHash || '',
  ];
  return sha256hex(parts.join('|'));
}

/**
 * Fingerprint for a certification record.
 */
async function fingerprintCert(grader, certNumber) {
  if (!grader || !certNumber) throw new Error('fingerprintCert requires grader and certNumber');
  return sha256hex(`cert:${grader}:${String(certNumber).trim()}`);
}

/**
 * Fingerprint for an edition/grade record.
 */
async function fingerprintEdition({
  provider,
  providerTitleId,
  providerIssueId,
  editionName,
  variantName,
  grader,
  designation,
  grade,
  providerSerial,
}) {
  const parts = [
    'edition',
    provider || '',
    providerTitleId || '',
    providerIssueId || '',
    editionName || '',
    variantName || '',
    grader || '',
    designation || '',
    grade || '',
    providerSerial || '',
  ];
  return sha256hex(parts.join('|'));
}

/**
 * Fingerprint for a census snapshot.
 */
async function fingerprintCensusSnapshot({
  provider,
  providerTitleId,
  providerIssueId,
  editionName,
  grader,
  snapshotTimestamp,
}) {
  const parts = [
    'census_snapshot',
    provider || '',
    providerTitleId || '',
    providerIssueId || '',
    editionName || '',
    grader || '',
    snapshotTimestamp || new Date().toISOString(),
  ];
  return sha256hex(parts.join('|'));
}

/**
 * Hash a raw response payload for evidence storage.
 */
async function hashRawPayload(jsonOrText) {
  const str = typeof jsonOrText === 'string' ? jsonOrText : JSON.stringify(jsonOrText);
  return sha256hex(str);
}

/**
 * Fingerprint for a raw request (for deduplication of identical API calls).
 */
async function fingerprintRequest(method, url, bodyJson) {
  const parts = ['req', method.toUpperCase(), url, bodyJson || ''];
  return sha256hex(parts.join('|'));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    sha256hex,
    fingerprintSale,
    fingerprintCert,
    fingerprintEdition,
    fingerprintCensusSnapshot,
    hashRawPayload,
    fingerprintRequest,
  };
}
