/**
 * providers/gpa.js
 * Panel Profits Graded Collector — GPA/CGC Provider Adapter
 *
 * Proven gateway API:
 *   POST /api/v1/gateway/ (same-origin, session cookies)
 *   FormData: { endpoint, serial, [year], GPACMSCSRF }
 *
 *   endpoints:
 *     stats/chart     → monthly chart (skip for ingestion)
 *     sales/last_ten  → ALL yearly aggregates: {data:[{year,copies_sold,max_price,min_price,avg_price}]}
 *     sales/by_year   → individual transactions: {data:[{date,origin,price,cgc_id,pq,link_id,price_url,uri}]}
 *
 * Serial capture: intercept FormData.prototype.append while clicking button.c-icon-button--responsive
 * CSRF: captured from first FormData intercept, session-stable
 */

'use strict';

const CONCURRENCY = 3;

class GpaAdapter {
  get slug() { return 'gpa'; }
  get name() { return 'GPAnalysis'; }
  get gradingCompanySlug() { return 'cgc'; }

  recognizesUrl(url) {
    return /comics\.gpanalysis\.com\/analyse-prices\/sales-data\/\d+\/\d+/.test(url);
  }

  async inspectAuthenticatedState() {
    const title = document.title;
    const isChallenge = title.includes('Just a moment') || !!document.querySelector('#challenge-running');
    const isLoggedOut = title.includes('Sign In') || !!document.querySelector('a[href*="/login"]');
    return {
      authenticated: !isChallenge && !isLoggedOut,
      cloudflareChallenge: isChallenge,
      sessionLost: isLoggedOut,
    };
  }

  // ─── Metadata from page URL and H3 ────────────────────────────────────────

  async extractIdentity() {
    const pathname = window.location.pathname;
    const match = pathname.match(/\/analyse-prices\/sales-data\/(\d+)\/(\d+)/);
    if (!match) return null;

    const titleId = parseInt(match[1], 10);
    const issueId = parseInt(match[2], 10);

    const firstH3 = document.querySelector('h3')?.textContent?.trim() || '';
    const cleanH3 = firstH3.replace(/Additional live listings.*/i, '').trim();
    const h3Match = cleanH3.match(/(.*?),\s*No\.\s*([^,]+)(?:,\s*(\d{4}))?(?:,\s*(.*))?$/);

    let seriesName = null;
    let issueNumberRaw = String(issueId);
    let pubYear = null;
    let publisher = null;

    if (h3Match) {
      seriesName = h3Match[1]?.trim() || null;
      if (h3Match[2]) issueNumberRaw = h3Match[2].trim();
      if (h3Match[3]) pubYear = parseInt(h3Match[3], 10);
      if (h3Match[4]) publisher = h3Match[4].trim();
    }

    if (!seriesName) {
      const h1 = document.querySelector('h1')?.textContent?.trim() || '';
      if (h1 && !h1.toLowerCase().includes('analyze prices')) {
        const m = h1.match(/^(.*?)(?:\s+#(\S+))?$/);
        seriesName = m?.[1]?.trim() || h1;
        if (m?.[2]) issueNumberRaw = m[2].trim();
      }
    }

    return {
      providerTitleId: String(titleId),
      providerIssueId: String(issueId),
      titleName: seriesName || `GPA Title ${titleId}`,
      issueNumberRaw,
      publicationYear: pubYear,
      publisher,
      sourceUrl: window.location.href,
    };
  }

  // ─── Grade Row DOM Parser ──────────────────────────────────────────────────

  _parseGradeRow(row) {
    const tds = Array.from(row.querySelectorAll('td'));
    if (tds.length < 8) return null;

    const designation = tds[1]?.querySelector('.c-badge')?.textContent?.trim() || null;
    const gradeText = tds[2]?.querySelector('strong')?.textContent?.trim() || tds[2]?.textContent?.trim();
    const gradeNum = parseFloat(gradeText) || null;
    const variantNote = tds[3]?.textContent?.trim() || null;

    const parseCell = (td) => {
      if (!td) return { numeric: null, count: null, date: null };
      const clone = td.cloneNode(true);
      const small = clone.querySelector('.c-cell__small-copy');
      let count = null, date = null;
      if (small) {
        const t = small.textContent.trim();
        if (/^\d+$/.test(t)) count = parseInt(t, 10);
        else if (t !== '-') date = t;
        small.remove();
      }
      clone.querySelectorAll('i, svg').forEach(el => el.remove());
      const text = clone.textContent.replace(/,/g, '').trim();
      const m = text.match(/([\d.]+)/);
      return { numeric: m ? parseFloat(m[1]) : null, count, date };
    };

    const c2024 = parseCell(tds[4]);
    const c2025 = parseCell(tds[5]);
    const c12m  = parseCell(tds[6]);
    const c90d  = parseCell(tds[7]);
    const cLast = parseCell(tds[8]);

    const hasSales = [c2024, c2025, c12m, c90d, cLast].some(c => c.numeric && c.numeric > 0);

    return {
      nativeDesignation: designation,
      nativeGradeText: gradeText || null,
      gradeNumeric: gradeNum,
      variantName: variantNote || null,
      avg2024: c2024.numeric,
      count2024: c2024.count,
      avg2025: c2025.numeric,
      count2025: c2025.count,
      avg12m: c12m.numeric,
      avg90d: c90d.numeric,
      lastSalePrice: cLast.numeric,
      lastSaleDate: cLast.date,
      hasSales,
    };
  }

  // ─── CSRF + Serial Capture ────────────────────────────────────────────────

  async _captureAllSerials(gradeRows) {
    const serialMap = new Map(); // rowIndex → serial
    let csrf = null;

    await new Promise((resolve) => {
      const _append = FormData.prototype.append;
      let pendingSerial = null;
      let currentIdx = -1;

      FormData.prototype.append = function(key, value) {
        const v = String(value);
        if (key === 'GPACMSCSRF' && !csrf) csrf = v;
        if (key === 'serial') pendingSerial = v;
        if (key === 'endpoint' && pendingSerial !== null && currentIdx >= 0) {
          if (!serialMap.has(currentIdx)) serialMap.set(currentIdx, pendingSerial);
          pendingSerial = null;
        }
        return _append.call(this, key, value);
      };

      // Click all buttons simultaneously
      for (let i = 0; i < gradeRows.length; i++) {
        currentIdx = i;
        gradeRows[i].querySelector('button.c-icon-button--responsive')?.click();
      }

      // Wait 600ms for all FormData intercepts to fire
      setTimeout(() => {
        FormData.prototype.append = _append;
        resolve();
      }, 600);
    });

    return { serialMap, csrf };
  }

  // ─── Gateway API ──────────────────────────────────────────────────────────

  async _gatewayPost(endpoint, params, csrf) {
    const fd = new FormData();
    fd.append('endpoint', endpoint);
    for (const [k, v] of Object.entries(params)) fd.append(k, String(v));
    fd.append('GPACMSCSRF', csrf);
    try {
      const resp = await fetch('/api/v1/gateway/', { method: 'POST', body: fd, credentials: 'include' });
      if (!resp.ok) return [];
      const json = await resp.json();
      return Array.isArray(json?.data) ? json.data : [];
    } catch { return []; }
  }

  async _runWithConcurrency(items, fn, concurrency = 3) {
    const results = [];
    const inFlight = new Set();
    for (const item of items) {
      const p = fn(item).then(r => { results.push(r); inFlight.delete(p); });
      inFlight.add(p);
      if (inFlight.size >= concurrency) await Promise.race(inFlight);
    }
    await Promise.all(inFlight);
    return results;
  }

  // ─── Main Extraction ──────────────────────────────────────────────────────

  async extractEditions() {
    const rows = Array.from(document.querySelectorAll('tr.c-table__row'))
      .filter(r => r.querySelectorAll('td').length >= 8 && !r.closest('.c-panel'));

    const summaries = rows.map((row, i) => ({ rowIndex: i, ...this._parseGradeRow(row) }))
      .filter(s => s !== null);

    return summaries;
  }

  async extractYearlyAggregates() {
    const rows = Array.from(document.querySelectorAll('tr.c-table__row'))
      .filter(r => r.querySelectorAll('td').length >= 8 && !r.closest('.c-panel'));

    const { serialMap, csrf } = await this._captureAllSerials(rows);
    if (!csrf) throw new Error('Could not capture GPA CSRF token');

    const workItems = Array.from(serialMap.entries()).map(([idx, serial]) => ({ idx, serial }));
    const allAggs = [];

    await this._runWithConcurrency(workItems, async ({ idx, serial }) => {
      const data = await this._gatewayPost('sales/last_ten', { serial }, csrf);
      const summary = this._parseGradeRow(rows[idx]);
      for (const row of data) {
        const year = parseInt(row.year, 10);
        const count = parseInt(row.copies_sold, 10) || 0;
        if (year > 0 && count > 0) {
          allAggs.push({
            serial,
            nativeDesignation: summary?.nativeDesignation || null,
            nativeGradeText: summary?.nativeGradeText || null,
            gradeNumeric: summary?.gradeNumeric || null,
            year,
            countSold: count,
            highPrice: parseFloat(row.max_price) || null,
            lowPrice: parseFloat(row.min_price) || null,
            avgPrice: parseFloat(row.avg_price) || null,
            currency: 'USD',
          });
        }
      }
    }, CONCURRENCY);

    return { serialMap, csrf, aggregates: allAggs };
  }

  async extractSales(serialMap, csrf, aggregates) {
    const allSales = [];
    // Group aggs by serial+year
    const jobs = aggregates
      .filter(a => a.countSold > 0)
      .map(a => ({ serial: a.serial, year: a.year, agg: a }));

    await this._runWithConcurrency(jobs, async ({ serial, year, agg }) => {
      const data = await this._gatewayPost('sales/by_year', { serial, year: String(year) }, csrf);
      for (const row of data) {
        const dateRaw = row.date ? String(row.date).replace(' 22:00:00', '').trim() : null;
        const price = parseFloat(row.price) || null;
        const certNum = row.cgc_id || null;
        const evidencePath = row.uri ? decodeURIComponent(row.uri) : null;
        const origin = row.origin || null;

        allSales.push({
          serial,
          nativeDesignation: agg.nativeDesignation,
          nativeGradeText: agg.nativeGradeText,
          gradeNumeric: agg.gradeNumeric,
          saleDateText: dateRaw,
          saleDate: dateRaw,
          saleYear: year,
          salePrice: price,
          currency: 'USD',
          venue: origin,
          origin,
          saleType: 'completed_sale',
          certificationNumber: certNum,
          evidencePath,
          linkId: row.link_id || null,
          priceUrl: row.price_url ? decodeURIComponent(row.price_url) : null,
          pageQuality: row.pq || null,
        });
      }
    }, CONCURRENCY);

    return allSales;
  }

  // ─── Catalog Discovery ─────────────────────────────────────────────────────

  async discoverCatalog(options = {}) {
    // Try the catalog gateway endpoints
    // These are user-specified endpoints to verify:
    const csrf = options.csrf || null;
    if (!csrf) return { error: 'No CSRF token — run extractYearlyAggregates on a page first' };

    // Test: POST /api/v1/gateway/ with endpoint=titles/search
    const fd = new FormData();
    fd.append('endpoint', 'titles/search');
    fd.append('GPACMSCSRF', csrf);
    if (options.searchTerm) fd.append('search', options.searchTerm);
    try {
      const resp = await fetch('/api/v1/gateway/', { method: 'POST', body: fd, credentials: 'include' });
      const json = await resp.json();
      return { endpoint: 'titles/search', status: resp.status, data: json };
    } catch (e) {
      return { endpoint: 'titles/search', error: e.message };
    }
  }

  async extractCensus() {
    // GPA does not have a dedicated census endpoint confirmed.
    // Census data would come from CGC directly.
    return { available: false, reason: 'GPA does not expose CGC census via authenticated gateway' };
  }

  async extractMarketSummaries() {
    // Market summaries are derived from grade rows (DOM) + yearly aggregates (gateway)
    const rows = Array.from(document.querySelectorAll('tr.c-table__row'))
      .filter(r => r.querySelectorAll('td').length >= 8 && !r.closest('.c-panel'));
    return rows.map((row, i) => this._parseGradeRow(row)).filter(Boolean);
  }

  async extractCertifications() {
    // Individual cert numbers come from sales/by_year cgc_id field
    // Returned as part of extractSales()
    return { available: 'partial', reason: 'Cert numbers extracted per-sale via sales/by_year' };
  }

  async extractIndexes() {
    return [];
  }

  async produceRawEvidence({ provider, sourceUrl, responseHash, httpStatus, rawPayload, requestFingerprint, gradingCompanySlug }) {
    // In extension context, stored via IndexedDB RawEvidenceStore
    // Returns a local ID; synced to graded_source_payloads via ingestion batch
    return `${provider}:${responseHash}`;
  }

  async normalizePayload(rawPayload) {
    // Normalization is handled in the service worker / ingestion route
    return rawPayload;
  }

  async checkpoint(level, key, data = {}) {
    // Implemented via CheckpointManager in service worker
    return { level, key, data };
  }

  async resume(level) {
    // Implemented via CheckpointManager in service worker
    return null;
  }

  async discoverCurrentItem() {
    return this.extractIdentity();
  }

  async extractGrades() {
    return this.extractMarketSummaries();
  }
}

if (typeof window !== 'undefined') {
  window.GpaAdapter = GpaAdapter;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GpaAdapter };
}
