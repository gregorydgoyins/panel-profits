/**
 * providers/cbcs.js
 * Panel Profits Graded Collector — CBCS Provider Adapter
 *
 * CBCS API base: https://api.cbcscomics.com
 * All network contracts must be verified from the live authenticated tab before use.
 *
 * CBCS provides: census/population data and certification records.
 * CBCS does NOT provide native pricing — pricing comes from GoCollect with explicit attribution.
 * All CBCS native terminology preserved exactly.
 */

'use strict';

const CBCS_API = 'https://api.cbcscomics.com';

class CbcsAdapter {
  get slug() { return 'cbcs'; }
  get name() { return 'CBCS Comics'; }
  get gradingCompanySlug() { return 'cbcs'; }

  recognizesUrl(url) {
    return /cbcscomics\.com/.test(url);
  }

  async inspectAuthenticatedState() {
    try {
      const resp = await fetch(`${CBCS_API}/api/data/values/title?value=a`, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      if (resp.status === 401 || resp.status === 403) {
        return { authenticated: false, reason: `HTTP ${resp.status}` };
      }
      const data = await resp.json();
      return { authenticated: true, sampleTitles: Array.isArray(data) ? data.slice(0, 3) : data };
    } catch (e) {
      return { authenticated: false, reason: e.message };
    }
  }

  /**
   * Search the CBCS population report.
   * @param {object} query - {title, publisher, issue, year, variant}
   * @returns {Promise<object>} raw API response (must be stored as raw evidence)
   */
  async searchPopulation(query) {
    const body = {
      title: query.title || '',
      publisher: query.publisher || '',
      issue: query.issue || '',
      year: query.year || '',
      variant: query.variant || '',
    };
    const resp = await fetch(`${CBCS_API}/api/popreport/search`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
    });
    const raw = await resp.text();
    let json = null;
    try { json = JSON.parse(raw); } catch {}
    return { httpStatus: resp.status, raw, json, requestBody: body };
  }

  /**
   * Get population detail (grade breakdown) for a specific comic.
   * @param {object} params - CBCS-native identifiers from searchPopulation result
   */
  async getPopulationDetail(params) {
    const resp = await fetch(`${CBCS_API}/api/popreport/detail`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(params),
    });
    const raw = await resp.text();
    let json = null;
    try { json = JSON.parse(raw); } catch {}
    return { httpStatus: resp.status, raw, json };
  }

  /**
   * Get listing of individual certified copies.
   */
  async getComicListing(params) {
    const resp = await fetch(`${CBCS_API}/api/popreport/comiclisting`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(params),
    });
    const raw = await resp.text();
    let json = null;
    try { json = JSON.parse(raw); } catch {}
    return { httpStatus: resp.status, raw, json };
  }

  /**
   * Get detail for a specific graded comic (cert number, designation, notes).
   */
  async getGradedComicDetails(params) {
    const resp = await fetch(`${CBCS_API}/api/popreport/gradedComicDetails`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(params),
    });
    const raw = await resp.text();
    let json = null;
    try { json = JSON.parse(raw); } catch {}
    return { httpStatus: resp.status, raw, json };
  }

  /**
   * Autocomplete title lookup.
   */
  async lookupTitleValues(query) {
    const resp = await fetch(`${CBCS_API}/api/data/values/title?value=${encodeURIComponent(query)}`, {
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    });
    return { httpStatus: resp.status, json: await resp.json().catch(() => null) };
  }

  // ─── ProviderAdapter interface ─────────────────────────────────────────────

  async discoverCatalog(options = {}) {
    const query = options.searchTerm || 'a';
    const titles = await this.lookupTitleValues(query);
    return {
      provider: this.slug,
      titleAutocompleteResult: titles,
      note: 'Use searchPopulation() to query full census',
    };
  }

  async discoverCurrentItem() {
    // On the CBCS population report page, parse the current search state
    const titleInput = document.querySelector('input[name="title"], input[placeholder*="title" i]');
    const issueInput = document.querySelector('input[name="issue"], input[placeholder*="issue" i]');
    return {
      titleName: titleInput?.value?.trim() || null,
      issueNumberRaw: issueInput?.value?.trim() || null,
      sourceUrl: window.location.href,
    };
  }

  async extractIdentity() {
    return this.discoverCurrentItem();
  }

  async extractEditions() {
    // Editions come from population report search results
    return { available: 'via_search', note: 'Call searchPopulation() to get edition/variant breakdown' };
  }

  async extractGrades() {
    return { available: 'via_detail', note: 'Call getPopulationDetail() for grade breakdown' };
  }

  /**
   * Extract census data for a specific query.
   * Preserves CBCS-native terminology EXACTLY.
   */
  async extractCensus(query) {
    const searchResult = await this.searchPopulation(query);
    if (!searchResult.json) return { snapshotTimestamp: new Date().toISOString(), rows: [], error: 'No JSON response' };

    const rows = [];
    const items = Array.isArray(searchResult.json) ? searchResult.json : searchResult.json?.data || [];
    for (const item of items) {
      // Get grade detail for each result
      const detail = await this.getPopulationDetail({ id: item.id, ...item });
      const gradeItems = detail.json?.grades || detail.json?.data || [];
      for (const g of gradeItems) {
        rows.push({
          // Preserve ALL CBCS native field names exactly
          nativeGradeText: String(g.grade ?? g.Grade ?? ''),
          gradeNumeric: parseFloat(g.grade ?? g.Grade) || null,
          nativeDesignation: g.designation ?? g.Designation ?? null,
          countAtGrade: parseInt(g.count ?? g.Count ?? g.total ?? 0, 10),
          countHigher: g.count_higher ?? g.CountHigher ?? null,
          // CBCS-native page quality — preserve exactly
          pageQuality: g.page_quality ?? g.PageQuality ?? g.pq ?? null,
          hasRestoration: g.restored ?? g.Restored ?? null,
          hasConservation: g.conserved ?? g.Conserved ?? null,
          hasSignature: g.signed ?? g.Signed ?? null,
          cbcsNativeRaw: g, // preserve entire native object
        });
      }
    }

    return {
      snapshotTimestamp: new Date().toISOString(),
      provider: this.slug,
      gradingCompanySlug: this.gradingCompanySlug,
      totalGraded: items.reduce((s, i) => s + (parseInt(i.total ?? 0, 10) || 0), 0),
      rows,
      rawSearchResponse: searchResult.json,
    };
  }

  async extractMarketSummaries() {
    // CBCS does not provide native pricing.
    return { available: false, reason: 'CBCS provides census/certification only. Market pricing comes from GoCollect with explicit attribution.' };
  }

  async extractYearlyAggregates() {
    return { available: false, reason: 'CBCS does not provide sales history' };
  }

  async extractSales() {
    return { available: false, reason: 'CBCS does not provide completed sales data' };
  }

  /**
   * Extract certifications from listing.
   * Preserves CBCS-native: designation, page quality, restoration, conservation,
   * signer, signature date, pedigree, grader notes, ASP/VSP status.
   */
  async extractCertifications(params) {
    const listing = await this.getComicListing(params);
    const items = listing.json?.data || listing.json || [];

    return items.map(c => ({
      certificationNumber: String(c.cert_number ?? c.CertNumber ?? c.id ?? ''),
      // All fields preserved in CBCS-native form exactly
      nativeGradeText: String(c.grade ?? c.Grade ?? ''),
      gradeNumeric: parseFloat(c.grade ?? c.Grade) || null,
      nativeDesignation: c.designation ?? c.Designation ?? null,
      pageQuality: c.page_quality ?? c.PageQuality ?? c.pq ?? null, // preserve native text
      hasRestoration: c.restored ?? c.Restored ?? null,
      restorationDetail: c.restoration_detail ?? c.RestorationDetail ?? null,
      hasConservation: c.conserved ?? c.Conserved ?? null,
      conservationDetail: c.conservation_detail ?? null,
      hasSignature: c.signed ?? c.Signed ?? null,
      pedigreeName: c.pedigree ?? c.Pedigree ?? null,
      graderNotes: c.grader_notes ?? c.GraderNotes ?? c.notes ?? null, // verbatim
      aspStatus: c.asp ?? c.ASP ?? null,       // CBCS ASP status
      vspStatus: c.vsp ?? c.VSP ?? null,       // CBCS VSP status
      certUrl: c.cert_url ?? null,
      cbcsNativeRaw: c, // preserve entire native object
    }));
  }

  async extractIndexes() { return []; }

  async produceRawEvidence(params) {
    return `${this.slug}:${params.responseHash || Date.now()}`;
  }

  async normalizePayload(rawPayload) {
    return rawPayload;
  }

  async checkpoint(level, key, data = {}) {
    return { level, key, data };
  }

  async resume(level) {
    return null;
  }
}

if (typeof window !== 'undefined') {
  window.CbcsAdapter = CbcsAdapter;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CbcsAdapter };
}
