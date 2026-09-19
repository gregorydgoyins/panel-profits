/**
 * provider-contract.js
 * Panel Profits Graded Collector — Shared Provider Interface
 *
 * Every provider adapter must extend ProviderAdapter and implement all methods.
 * Unknown or unavailable fields must remain null — never invent data.
 * No provider may substitute data from another provider.
 */

'use strict';

class ProviderAdapter {
  /** @returns {string} Provider slug: 'gpa' | 'cbcs' | 'psa' | 'gocollect' */
  get slug() { throw new Error(`${this.constructor.name} must implement get slug()`); }

  /** @returns {string} Human-readable provider name */
  get name() { throw new Error(`${this.constructor.name} must implement get name()`); }

  /** @returns {string} Grading company slug this provider primarily reports: 'cgc'|'cbcs'|'psa'|'mixed' */
  get gradingCompanySlug() { return null; }

  /**
   * Returns true if this provider adapter can handle the given URL.
   * @param {string} url
   * @returns {boolean}
   */
  recognizesUrl(url) { throw new Error(`${this.constructor.name} must implement recognizesUrl(url)`); }

  /**
   * Inspect whether the current authenticated session is valid.
   * @returns {Promise<{authenticated: boolean, userId?: string, sessionInfo?: object, reason?: string}>}
   */
  async inspectAuthenticatedState() { throw new Error(`${this.constructor.name} must implement inspectAuthenticatedState()`); }

  /**
   * Discover the catalog structure: titles, series, categories.
   * @param {object} [options]
   * @returns {Promise<CatalogResult>}
   */
  async discoverCatalog(options = {}) { throw new Error(`${this.constructor.name} must implement discoverCatalog()`); }

  /**
   * Discover the current item (title+issue) from the current authenticated page.
   * @returns {Promise<ItemIdentity>}
   */
  async discoverCurrentItem() { throw new Error(`${this.constructor.name} must implement discoverCurrentItem()`); }

  /**
   * Extract the identity of the current comic from the page.
   * @returns {Promise<ComicIdentity>}
   */
  async extractIdentity() { throw new Error(`${this.constructor.name} must implement extractIdentity()`); }

  /**
   * Extract all editions/variants for the current issue.
   * @returns {Promise<Edition[]>}
   */
  async extractEditions() { throw new Error(`${this.constructor.name} must implement extractEditions()`); }

  /**
   * Extract grade-level summaries (designation, grade, avg prices, last sale).
   * @returns {Promise<GradeSummary[]>}
   */
  async extractGrades() { throw new Error(`${this.constructor.name} must implement extractGrades()`); }

  /**
   * Extract census/population report data.
   * @returns {Promise<CensusData>}
   */
  async extractCensus() { throw new Error(`${this.constructor.name} must implement extractCensus()`); }

  /**
   * Extract market summaries: avg, high, low by period.
   * @returns {Promise<MarketSummary[]>}
   */
  async extractMarketSummaries() { throw new Error(`${this.constructor.name} must implement extractMarketSummaries()`); }

  /**
   * Extract yearly sales aggregates: year → {count, high, low, avg}.
   * @returns {Promise<YearlyAggregate[]>}
   */
  async extractYearlyAggregates() { throw new Error(`${this.constructor.name} must implement extractYearlyAggregates()`); }

  /**
   * Extract individual completed sales (NOT listings, NOT estimates).
   * @returns {Promise<SaleObservation[]>}
   */
  async extractSales() { throw new Error(`${this.constructor.name} must implement extractSales()`); }

  /**
   * Extract certification records.
   * @returns {Promise<Certification[]>}
   */
  async extractCertifications() { throw new Error(`${this.constructor.name} must implement extractCertifications()`); }

  /**
   * Extract index observations (GoCollect CPI, etc.)
   * @returns {Promise<IndexObservation[]>}
   */
  async extractIndexes() { return []; }

  /**
   * Store the raw source payload BEFORE any normalization.
   * Must be called before normalizePayload().
   * @param {object} params
   * @returns {Promise<string>} raw evidence ID
   */
  async produceRawEvidence(params) { throw new Error(`${this.constructor.name} must implement produceRawEvidence()`); }

  /**
   * Normalize the raw payload into typed records ready for database insertion.
   * Must reference the raw_evidence_id returned by produceRawEvidence().
   * @param {object} rawPayload
   * @returns {Promise<NormalizedPayload>}
   */
  async normalizePayload(rawPayload) { throw new Error(`${this.constructor.name} must implement normalizePayload()`); }

  /**
   * Write the current progress checkpoint.
   * @param {string} level - checkpoint level (title/issue/edition/grade/serial/year/...)
   * @param {string} key - unique key for this checkpoint position
   * @param {object} [data] - checkpoint state
   * @returns {Promise<void>}
   */
  async checkpoint(level, key, data = {}) { throw new Error(`${this.constructor.name} must implement checkpoint()`); }

  /**
   * Resume from the last saved checkpoint.
   * @param {string} level
   * @returns {Promise<{key: string, data: object} | null>}
   */
  async resume(level) { throw new Error(`${this.constructor.name} must implement resume()`); }
}

// ─── Type Definitions (JSDoc) ─────────────────────────────────────────────────

/**
 * @typedef {object} ComicIdentity
 * @property {string|null} titleName        - Series title (provider-native)
 * @property {string|null} issueNumberRaw   - Issue number as text
 * @property {number|null} volumeNumber
 * @property {number|null} publicationYear
 * @property {number|null} publicationMonth
 * @property {string|null} publisher
 * @property {string|null} providerTitleId  - Provider's native title ID
 * @property {string|null} providerIssueId  - Provider's native issue ID
 * @property {string|null} sourceUrl
 */

/**
 * @typedef {object} Edition
 * @property {string|null} editionName      - Provider-native edition name
 * @property {string|null} variantName      - Provider-native variant name
 * @property {string|null} nativeDesignation - Preserve exactly: 'UNI', 'SS', 'R', 'Q'
 * @property {string|null} nativeGradeText   - Preserve exactly: '9.8', '7.5'
 * @property {number|null} gradeNumeric
 * @property {string|null} providerSerial    - GPA serial, internal ID
 * @property {boolean|null} hasRestoration
 * @property {boolean|null} hasSignature
 * @property {string|null} pedigreeName
 * @property {string|null} pageQuality       - Preserve native text exactly
 */

/**
 * @typedef {object} CensusData
 * @property {number|null} totalGraded
 * @property {CensusRow[]} rows
 * @property {string} snapshotTimestamp
 * @property {string|null} sourceUrl
 */

/**
 * @typedef {object} CensusRow
 * @property {string} nativeGradeText    - Preserve exactly
 * @property {number|null} gradeNumeric
 * @property {string|null} nativeDesignation - Preserve exactly
 * @property {number} countAtGrade
 * @property {number|null} countHigher
 * @property {string|null} pageQuality   - Preserve native text exactly
 * @property {boolean|null} hasRestoration
 * @property {boolean|null} hasSignature
 * @property {string|null} qualifier     - PSA native qualifier text
 */

/**
 * @typedef {object} SaleObservation
 * @property {string} observationFingerprint - Deterministic dedup key
 * @property {string|null} saleDateText      - Preserve raw date text
 * @property {string|null} saleDate          - ISO 8601 date or null
 * @property {number|null} saleYear
 * @property {number|null} salePrice
 * @property {string} currency               - 'USD'
 * @property {string|null} venue             - 'heritage','ebay','comiclink' etc.
 * @property {'completed_sale'|'listing'|'estimate'|'index_constituent'} saleType
 * @property {string|null} certificationNumber
 * @property {string|null} evidencePath      - Encrypted redirect or direct URL
 * @property {string|null} origin            - Provider's venue field
 * @property {string|null} providerSaleId
 * @property {string|null} pageQuality
 * @property {boolean|null} hasRestoration
 * @property {boolean|null} hasSignature
 * @property {string|null} pedigreeName
 * @property {string|null} rawEvidenceId
 */

/**
 * @typedef {object} YearlyAggregate
 * @property {number} year
 * @property {number} countSold
 * @property {number|null} highPrice
 * @property {number|null} lowPrice
 * @property {number|null} avgPrice
 * @property {string} currency
 */

/**
 * @typedef {object} Certification
 * @property {string} certificationNumber   - Preserve exactly
 * @property {string|null} nativeGradeText  - Preserve exactly
 * @property {number|null} gradeNumeric
 * @property {string|null} nativeDesignation - Preserve exactly
 * @property {string|null} pageQuality      - Preserve native text exactly
 * @property {boolean|null} hasRestoration
 * @property {string|null} restorationDetail
 * @property {boolean|null} hasConservation
 * @property {boolean|null} hasSignature
 * @property {string|null} pedigreeName
 * @property {string|null} graderNotes      - Verbatim
 * @property {boolean|null} aspStatus       - CBCS ASP
 * @property {boolean|null} vspStatus       - CBCS VSP
 * @property {string|null} qualifier        - PSA qualifier verbatim
 * @property {string|null} autographStatus  - PSA autograph state verbatim
 * @property {string|null} certUrl
 */

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ProviderAdapter };
}
