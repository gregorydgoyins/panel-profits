/**
 * providers/psa.js
 * Panel Profits Graded Collector — PSA Provider Adapter
 *
 * PSA tab: https://www.psacard.com/pop/comics
 * All endpoints MUST be verified from the live authenticated tab.
 * PSA comic grade terminology must be captured from real comic records,
 * NOT assumed from PSA card terminology.
 */

'use strict';

class PsaAdapter {
  get slug() { return 'psa'; }
  get name() { return 'PSA'; }
  get gradingCompanySlug() { return 'psa'; }

  recognizesUrl(url) {
    return /psacard\.com/.test(url);
  }

  async inspectAuthenticatedState() {
    // Check page for login indicators
    const isLoggedIn = !!document.querySelector('[class*="logged-in"], [data-user], .user-menu, .account-menu');
    const isLoginPage = window.location.href.includes('/login') || window.location.href.includes('/signin');
    const hasUserNav = !!document.querySelector('a[href*="/account"], a[href*="/profile"]');
    return {
      authenticated: (isLoggedIn || hasUserNav) && !isLoginPage,
      pageUrl: window.location.href,
      pageTitle: document.title,
    };
  }

  /**
   * Discover the real API contracts by intercepting fetch/XHR on the PSA tab.
   * Call this script via Runtime.evaluate in the PSA tab to capture live API calls.
   */
  static installNetworkInterceptor() {
    if (window.__psaInterceptorInstalled) return window.__psaCaptured;
    window.__psaCaptured = [];
    window.__psaInterceptorInstalled = true;

    const _fetch = window.fetch;
    window.fetch = function(url, opts) {
      const urlStr = String(url);
      if (urlStr.includes('psacard') || urlStr.includes('api')) {
        window.__psaCaptured.push({
          url: urlStr.substring(0, 500),
          method: opts?.method || 'GET',
          body: typeof opts?.body === 'string' ? opts.body.substring(0, 500) : null,
          timestamp: new Date().toISOString(),
        });
      }
      return _fetch.call(this, url, opts);
    };

    // Also intercept XHR
    const _open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
      if (String(url).includes('psacard') || String(url).includes('api')) {
        window.__psaCaptured.push({
          url: String(url).substring(0, 500),
          method,
          body: null,
          type: 'xhr',
          timestamp: new Date().toISOString(),
        });
      }
      return _open.apply(this, arguments);
    };

    return window.__psaCaptured;
  }

  /**
   * Get all captured API calls (call after interacting with the PSA page).
   */
  static getCapturedRequests() {
    return window.__psaCaptured || [];
  }

  // ─── Population Report ────────────────────────────────────────────────────

  /**
   * Extract population data from the current PSA census page.
   * Reads from DOM; actual API calls captured via network interceptor.
   */
  async extractCensus() {
    const rows = [];
    // PSA comic population table — structure to be confirmed from live tab
    const tableRows = document.querySelectorAll('table tr, .pop-report-row, [class*="pop-row"]');

    for (const row of tableRows) {
      const cells = Array.from(row.querySelectorAll('td, .cell, [class*="cell"]'));
      if (cells.length < 3) continue;

      // Capture native text exactly — DO NOT assume card terminology for comics
      const gradeText = cells[0]?.textContent?.trim();
      if (!gradeText || gradeText.toLowerCase() === 'grade' || gradeText.toLowerCase() === 'pop') continue;

      rows.push({
        nativeGradeText: gradeText,                              // preserve exactly
        gradeNumeric: parseFloat(gradeText) || null,
        nativeDesignation: cells[1]?.textContent?.trim() || null, // preserve exactly
        qualifier: null,                                          // PSA qualifier — captured from real data
        countAtGrade: parseInt(cells[cells.length - 2]?.textContent?.trim()) || 0,
        countHigher: parseInt(cells[cells.length - 1]?.textContent?.trim()) || null,
        psaNativeRaw: cells.map(c => c.textContent?.trim()),     // preserve all
      });
    }

    return {
      snapshotTimestamp: new Date().toISOString(),
      provider: this.slug,
      gradingCompanySlug: this.gradingCompanySlug,
      sourceUrl: window.location.href,
      rows,
      note: 'Verify PSA comic grade scale from real data — do not assume card grades',
    };
  }

  /**
   * Look up a PSA certification record.
   * Pattern: /cert/{certNumber}/psa
   * NEVER enumerate cert numbers blindly.
   */
  async lookupCertification(certNumber) {
    if (!certNumber) throw new Error('certNumber required');
    const url = `https://www.psacard.com/cert/${encodeURIComponent(certNumber)}/psa`;
    try {
      const resp = await fetch(url, { credentials: 'include' });
      return {
        certNumber,
        url,
        httpStatus: resp.status,
        raw: resp.ok ? await resp.text() : null,
      };
    } catch (e) {
      return { certNumber, url, error: e.message };
    }
  }

  /**
   * Extract catalog navigation for PSA Comics category.
   */
  async discoverCatalog(options = {}) {
    // Discover real category/title navigation from current page
    const categoryLinks = Array.from(document.querySelectorAll('a[href*="/pop/"], a[href*="/category/"], a[href*="/set/"]'))
      .filter(a => a.href.includes('comic') || a.closest('[class*="comic"]'))
      .map(a => ({ text: a.textContent.trim(), href: a.href }))
      .slice(0, 50);

    const topLinks = Array.from(document.querySelectorAll('.pop-categories a, .cat-list a, nav a'))
      .map(a => ({ text: a.textContent.trim(), href: a.href }))
      .filter(a => a.text && a.href)
      .slice(0, 50);

    return {
      provider: this.slug,
      comicsLinks: categoryLinks,
      navLinks: topLinks,
      pageTitle: document.title,
      pageUrl: window.location.href,
      note: 'Verify real category identifiers from live tab before building catalog crawler',
    };
  }

  async discoverCurrentItem() {
    return {
      titleName: document.querySelector('h1, h2, .title')?.textContent?.trim() || null,
      issueNumberRaw: null,
      sourceUrl: window.location.href,
      pageTitle: document.title,
    };
  }

  async extractIdentity() {
    return this.discoverCurrentItem();
  }

  async extractEditions() {
    return { available: 'via_catalog', note: 'Navigate to specific PSA set/item to get editions' };
  }

  async extractGrades() {
    return this.extractCensus();
  }

  async extractMarketSummaries() {
    // PSA may expose estimates on authenticated pages — capture from real data
    const estimateEls = document.querySelectorAll('[class*="estimate"], [class*="value"], [class*="price"]');
    const estimates = Array.from(estimateEls)
      .map(el => ({ text: el.textContent.trim(), class: el.className }))
      .filter(e => e.text && /[\d,]+/.test(e.text))
      .slice(0, 20);

    return {
      available: estimates.length > 0 ? 'partial' : false,
      estimatesFromPage: estimates,
      note: 'PSA estimate fields must be confirmed from authenticated session',
    };
  }

  async extractYearlyAggregates() {
    return { available: false, reason: 'PSA does not expose sales history aggregates' };
  }

  async extractSales() {
    // PSA comparable sales if exposed on authenticated pages
    const saleRows = document.querySelectorAll('[class*="comp-sale"], [class*="recent-sale"], [class*="sale-row"]');
    if (!saleRows.length) return { available: false, reason: 'No comparable sales found on current page' };

    return Array.from(saleRows).map(row => {
      const cells = Array.from(row.querySelectorAll('td, .cell, span'));
      return {
        saleType: 'completed_sale',
        currency: 'USD',
        psaNativeRaw: cells.map(c => c.textContent.trim()),
        note: 'Verify field mapping from real PSA sale data',
      };
    });
  }

  async extractCertifications() {
    // Cert numbers discovered from population report listing, not enumerated
    const certLinks = Array.from(document.querySelectorAll('a[href*="/cert/"]'))
      .map(a => ({
        certNumber: a.href.match(/\/cert\/([^/]+)/)?.[1] || null,
        href: a.href,
      }))
      .filter(c => c.certNumber);

    return {
      certificationLinks: certLinks.slice(0, 50),
      note: 'Look up each via lookupCertification() from authenticated tab',
    };
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
  window.PsaAdapter = PsaAdapter;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PsaAdapter };
}
