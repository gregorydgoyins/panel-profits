/**
 * providers/gocollect.js
 * Panel Profits Graded Collector — GoCollect Provider Adapter
 *
 * GoCollect tabs:
 *   CPI: https://gocollect.com/cpi/comics/overview
 *   Series: https://gocollect.com/app/comics/series/{seriesId}
 *
 * GoCollect is an independent data provider AND cross-grader corroboration source.
 * CGC/CBCS/PSA data from GoCollect is attributed as: provider=gocollect, grader=cgc/cbcs/psa
 * It does NOT overwrite or replace grader-native data from CBCS or PSA agents.
 *
 * STRICT SEPARATION:
 *   - Completed sales ≠ current listings
 *   - GoCollect CGC price ≠ GPA CGC price (stored separately)
 */

'use strict';

class GoCollectAdapter {
  get slug() { return 'gocollect'; }
  get name() { return 'GoCollect'; }
  get gradingCompanySlug() { return 'mixed'; } // reports data for cgc, cbcs, psa

  recognizesUrl(url) {
    return /gocollect\.com/.test(url);
  }

  async inspectAuthenticatedState() {
    const isLoggedIn = !!document.querySelector(
      '[class*="logged-in"], .user-avatar, [class*="userMenu"], button[class*="account"]'
    );
    const hasUserInfo = !!document.querySelector('[data-user-id], [data-username]');
    return {
      authenticated: isLoggedIn || hasUserInfo,
      pageUrl: window.location.href,
      pageTitle: document.title,
    };
  }

  /**
   * Get the current page's CSRF token (required for Livewire POST requests).
   * Must be called from within the GoCollect tab context.
   */
  static getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        || document.querySelector('input[name="_token"]')?.value
        || null;
  }

  /**
   * Get the current Livewire component snapshot for cert-lookup-modal.
   * Must be called from within the GoCollect cert-lookup tab context.
   */
  static getCertLookupSnapshot() {
    const wireEls = Array.from(document.querySelectorAll('[wire:snapshot]'));
    for (const el of wireEls) {
      try {
        const div = document.createElement('div');
        div.innerHTML = el.getAttribute('wire:snapshot');
        const parsed = JSON.parse(div.textContent);
        if (parsed.memo?.name === 'certification.cert-lookup-modal') {
          return { snapshot: div.textContent, wireId: parsed.memo?.id, memo: parsed.memo };
        }
      } catch {}
    }
    return null;
  }


  /**
   * Look up a cert number via GoCollect's cert-lookup page.
   * 
   * CONFIRMED WORKING APPROACH (verified 2026-09-19):
   * 1. Set input value via native setter + dispatchEvent('input') — triggers Livewire wire:model sync
   * 2. Call btn.click() — triggers Livewire's lookup action
   * 3. Read updated Livewire snapshot from DOM for results
   *
   * MUST be called from within the GoCollect cert-lookup tab context.
   * @param {string} certNumber - CGC/CBCS/PSA cert number
   * @returns {Promise<{lookupFailed: boolean, grade: string|null, label: string|null, pageQuality: string|null, variant: string|null, artComments: string|null, notes: string|null, certificationExampleKey: number|null, textContent: string|null}>}
   */
  static async certLookupByDomInteraction(certNumber) {
    const certInput = document.getElementById('cert_number_input');
    if (!certInput) throw new Error('GoCollect cert input not found — ensure you are on /app/comics/cert-lookup');

    // Clear previous value first
    certInput.focus();
    certInput.select();
    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(certInput, '');
    certInput.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 300));

    // Set value using the native HTMLInputElement setter (bypasses Alpine/Vue batching)
    nativeSetter.call(certInput, String(certNumber));

    // Dispatch the events Livewire's wire:model listens for
    certInput.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
    certInput.dispatchEvent(new Event('change', { bubbles: true }));

    // Wait for Livewire's debounce to sync the model (default 150ms, 700ms safety margin)
    await new Promise(r => setTimeout(r, 700));

    // Click the Lookup button
    const lookupBtn = Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent.trim() === 'Lookup');
    if (!lookupBtn) throw new Error('GoCollect Lookup button not found');
    lookupBtn.click();

    // Wait for Livewire to process and re-render (6 seconds for slow connections)
    await new Promise(r => setTimeout(r, 6000));

    // Read the updated DOM snapshot
    // IMPORTANT: Must use escaped colon in CSS selector: [wire\:id]
    const certEl = Array.from(document.querySelectorAll('[wire\\:id]'))
      .find(el => el.getAttribute('wire:snapshot')?.includes('cert-lookup-modal'));
    if (!certEl) throw new Error('cert-lookup-modal Livewire element not found after lookup');

    const div = document.createElement('div');
    div.innerHTML = certEl.getAttribute('wire:snapshot') || '{}';
    let snap;
    try { snap = JSON.parse(div.textContent || '{}'); } catch { snap = {}; }
    const data = snap.data || {};

    // Parse visible page text for the cert result
    // GoCollect shows "CGC Cert #2069748001" in result card text
    const visibleText = document.body.innerText || '';
    const hashIdx = visibleText.indexOf(`#${certNumber}`);
    const bareIdx = visibleText.indexOf(String(certNumber));
    const certIdx = hashIdx >= 0 ? hashIdx : bareIdx;
    const certSection = certIdx >= 0 ? visibleText.substring(certIdx, certIdx + 800) : '';

    // Extract structured fields from visible text
    const gradeMatch = certSection.match(/Grade\s+([\d.]+)/);
    const labelMatch = certSection.match(/Label Assigned\s+([^\n]+)/);
    const pageQualityMatch = certSection.match(/Page Quality\s+([^\n]+)/);
    const variantMatch = certSection.match(/Variant\s+([^\n]+)/);
    const artCommentsMatch = certSection.match(/Art Comments\s+([^\n]+)/);
    const notesMatch = certSection.match(/Notes\s+([^\n]+)/);

    return {
      certNumber: String(certNumber),
      lookupFailed: data.lookupFailed ?? (certSection.length < 10),
      displayLookupResults: data.displayLookupResults ?? false,
      certificationExampleKey: data.certificationCompanyExample?.[1]?.key ?? null,
      certificationCompanyId: data.certificationCompanyId,
      imageUrl: data.imageUrl,
      grade: gradeMatch?.[1] || null,
      label: labelMatch?.[1]?.trim() || null,
      pageQuality: pageQualityMatch?.[1]?.trim() || null,
      variant: variantMatch?.[1]?.trim() || null,
      artComments: artCommentsMatch?.[1]?.trim() || null,
      notes: notesMatch?.[1]?.trim() || null,
      rawText: certSection.substring(0, 1000),
    };
  }

  /**
   * @deprecated Use certLookupByDomInteraction instead. 
   * This approach had checksum validation issues with GoCollect Livewire v3.
   */
  static async certLookupViaLivewire(certNumber) {
    return GoCollectAdapter.certLookupByDomInteraction(certNumber);
  }

  /**
   * Parse GoCollect cert lookup HTML result to extract comic/cert data.
   * @param {string} html - The Livewire effects.html from certLookupViaLivewire
   * @returns {object|null} Parsed cert data or null
   */
  static parseCertLookupHtml(html) {
    if (!html) return null;
    const div = document.createElement('div');
    div.innerHTML = html;

    // Extract from the rendered card
    const title = div.querySelector('[class*="title"], h2, h3, .font-bold')?.textContent?.trim();
    const grade = div.querySelector('[class*="grade"], [class*="score"]')?.textContent?.trim();
    const price = div.querySelector('[class*="price"], [class*="value"]')?.textContent?.trim();
    const certNo = div.querySelector('[class*="cert"], [class*="number"]')?.textContent?.trim();
    const imgEl = div.querySelector('img');
    const imageUrl = imgEl?.src || imgEl?.getAttribute('src') || null;

    // Data attributes
    const dataEl = div.querySelector('[data-]');
    const attrs = dataEl ? Object.fromEntries(Array.from(dataEl.attributes).map(a => [a.name, a.value])) : {};

    return { title, grade, price, certNo, imageUrl, rawHtml: html.substring(0, 2000), attrs };
  }

  /**
   * @deprecated Use CDP Network domain capture instead.
   * Kept for backward compatibility only.
   */
  static installNetworkInterceptor() {
    if (window.__gcInterceptorInstalled) return window.__gcCaptured;
    window.__gcCaptured = [];
    window.__gcInterceptorInstalled = true;
    const _fetch = window.fetch;
    window.fetch = function(url, opts) {
      window.__gcCaptured.push({ url: String(url).substring(0, 1000), method: opts?.method || 'GET', timestamp: new Date().toISOString() });
      return _fetch.call(this, url, opts);
    };
    return window.__gcCaptured;
  }

  static getCapturedRequests() {
    return window.__gcCaptured || [];
  }

  // ─── CPI Discovery ────────────────────────────────────────────────────────

  /**
   * Extract CPI index data from the GoCollect CPI overview page.
   * ALL observations are append-only. Never overwrite earlier observations.
   */
  async extractIndexes() {
    const observations = [];

    // GoCollect CPI page structure — to be verified from live tab
    // Look for index cards, chart data, weekly updates
    const indexCards = document.querySelectorAll('[class*="cpi"], [class*="index-card"], [class*="IndexCard"]');

    for (const card of indexCards) {
      const name = card.querySelector('[class*="name"], h2, h3')?.textContent?.trim() || null;
      const value = card.querySelector('[class*="value"], [class*="index-value"]')?.textContent?.trim() || null;
      const change = card.querySelector('[class*="change"], [class*="delta"]')?.textContent?.trim() || null;
      const date = card.querySelector('[class*="date"], time')?.textContent?.trim()
                || card.querySelector('[class*="date"]')?.getAttribute('datetime') || null;

      if (name && value) {
        const priceMatch = value.replace(/,/g, '').match(/([\d.]+)/);
        const indexValue = priceMatch ? parseFloat(priceMatch[1]) : null;

        let pointChange = null;
        let pctChange = null;
        if (change) {
          const cm = change.replace(/,/g, '').match(/([-\d.]+)/);
          if (cm) pointChange = parseFloat(cm[1]);
          const pm = change.match(/([-\d.]+)%/);
          if (pm) pctChange = parseFloat(pm[1]);
        }

        if (indexValue !== null) {
          observations.push({
            indexName: name,
            indexType: 'cpi',
            observationDate: date,
            indexValue,
            pointChange,
            pctChange,
            isRevision: false,
            sourceUrl: window.location.href,
            rawNative: { name, value, change, date },
          });
        }
      }
    }

    // Also check for embedded JSON (Next.js __NEXT_DATA__)
    const nextData = window.__NEXT_DATA__?.props?.pageProps;
    if (nextData?.cpiData || nextData?.indexes || nextData?.indices) {
      const cpiData = nextData.cpiData || nextData.indexes || nextData.indices;
      if (Array.isArray(cpiData)) {
        for (const item of cpiData) {
          observations.push({
            indexName: item.name || item.indexName || item.title || null,
            indexType: 'cpi',
            providerIndexId: String(item.id || item.indexId || ''),
            observationDate: item.date || item.observationDate || item.week || null,
            indexValue: parseFloat(item.value || item.indexValue || 0) || null,
            pointChange: parseFloat(item.change || item.pointChange || 0) || null,
            pctChange: parseFloat(item.pct_change || item.pctChange || 0) || null,
            constituents: item.constituents || item.components || [],
            isRevision: false,
            sourceUrl: window.location.href,
            rawNative: item,
          });
        }
      }
    }

    return {
      provider: this.slug,
      observations,
      capturedAt: new Date().toISOString(),
    };
  }

  // ─── Comic Pricing ─────────────────────────────────────────────────────────

  /**
   * Extract CGC/CBCS/PSA grade values for the current series page.
   * 
   * CONFIRMED ARCHITECTURE (2026-09-19):
   * GoCollect is Laravel + Livewire + Alpine.js — NOT Next.js.
   * There is NO __NEXT_DATA__ on GoCollect pages.
   * 
   * GoCollect grade data is accessed via:
   * 1. Cert lookup: certLookupByDomInteraction(certNumber) → grade, label, variant, notes per cert
   * 2. Series grade summary: available via wire:snapshot on the series page (not yet parsed)
   *
   * For individual cert lookups, use certLookupByDomInteraction().
   * For batch cert lookups across a title, iterate cert numbers through certLookupByDomInteraction().
   * 
   * GoCollect market data (price index, sale prices) are eBay affiliate listings — NOT completed sales.
   * Store them as 'asking_price' type observations with source_label 'gocollect_ebay_affiliate'.
   * 
   * @returns {Promise<GradeValue[]>}
   */
  async extractGrades() {
    const gradeValues = [];

    // GoCollect does NOT use __NEXT_DATA__
    // Grade data is loaded via Livewire components on the series/issue page
    // Use certLookupByDomInteraction for individual cert lookups
    // For series page wire:snapshot data, read from the page's Livewire components

    // DOM fallback for grade table
    const rows = document.querySelectorAll('[class*="grade-row"], tr[data-grade], [class*="IssueRow"]');
    for (const row of rows) {
      const gradeEl = row.querySelector('[class*="grade"], td:first-child');
      const gradeText = gradeEl?.textContent?.trim() || null;
      if (!gradeText) continue;

      // Capture CGC, CBCS, PSA columns separately
      for (const grader of ['cgc', 'cbcs', 'psa']) {
        const graderEl = row.querySelector(`[data-grader="${grader}"], [class*="${grader}"]`);
        if (graderEl) {
          const valueText = graderEl.textContent.trim();
          const numMatch = valueText.replace(/,/g, '').match(/([\d.]+)/);
          gradeValues.push({
            gradingCompanySlug: grader,  // cgc | cbcs | psa
            nativeGradeText: gradeText,  // preserve exactly
            gradeNumeric: parseFloat(gradeText) || null,
            value: numMatch ? parseFloat(numMatch[1]) : null,
            currency: 'USD',
            observationType: 'market_summary', // GoCollect's aggregated price
            // NOT a completed sale — GoCollect's calculated/aggregated value
            rawNative: { gradeText, grader, valueText },
          });
        }
      }
    }

    return { provider: this.slug, gradeValues, capturedAt: new Date().toISOString() };
  }

  _parseNextDataGrades(data) {
    const gradeValues = [];
    if (!Array.isArray(data)) return { provider: this.slug, gradeValues };
    for (const item of data) {
      for (const grader of ['cgc', 'cbcs', 'psa']) {
        const val = item[grader] ?? item[grader.toUpperCase()];
        if (val != null) {
          gradeValues.push({
            gradingCompanySlug: grader,
            nativeGradeText: String(item.grade || item.Grade || ''),
            gradeNumeric: parseFloat(item.grade || item.Grade) || null,
            value: parseFloat(val) || null,
            currency: 'USD',
            observationType: 'market_summary',
            rawNative: { grade: item.grade, grader, value: val },
          });
        }
      }
    }
    return { provider: this.slug, gradeValues, capturedAt: new Date().toISOString() };
  }

  /**
   * Extract completed sales from GoCollect.
   * STRICTLY separated from listings (asking prices).
   */
  async extractSales() {
    const sales = [];

    // Try __NEXT_DATA__ for sales data
    const nextData = window.__NEXT_DATA__?.props?.pageProps;
    const salesData = nextData?.sales || nextData?.recentSales || nextData?.transactions;
    if (Array.isArray(salesData)) {
      for (const sale of salesData) {
        sales.push({
          saleType: 'completed_sale',  // NEVER mix with listings
          gradingCompanySlug: String(sale.grader || sale.gradingCompany || '').toLowerCase() || null,
          nativeGradeText: String(sale.grade || ''),
          gradeNumeric: parseFloat(sale.grade) || null,
          nativeDesignation: sale.designation || null,
          saleDateText: sale.date || sale.saleDate || null,
          saleDate: sale.date || sale.saleDate || null,
          salePrice: parseFloat(sale.price || sale.salePrice) || null,
          currency: sale.currency || 'USD',
          venue: sale.venue || sale.auction_house || null,
          certificationNumber: sale.cert || sale.certNumber || null,
          providerSaleId: String(sale.id || sale.saleId || ''),
          rawNative: sale,
        });
      }
    }

    // DOM fallback for sales table
    if (sales.length === 0) {
      const saleRows = document.querySelectorAll('[class*="sale-row"], [class*="SaleRow"], [class*="transaction"]');
      for (const row of saleRows) {
        const cells = Array.from(row.querySelectorAll('td, [class*="cell"]'));
        if (cells.length < 3) continue;
        sales.push({
          saleType: 'completed_sale',
          currency: 'USD',
          rawNative: cells.map(c => c.textContent.trim()),
          note: 'Field mapping requires verification from live GoCollect sale data',
        });
      }
    }

    return { provider: this.slug, sales, capturedAt: new Date().toISOString() };
  }

  /**
   * Extract ACTIVE LISTINGS (asking prices — NOT completed sales).
   * Kept absolutely separate.
   */
  async extractListings() {
    const listings = [];
    const nextData = window.__NEXT_DATA__?.props?.pageProps;
    const listData = nextData?.listings || nextData?.activeLisings || nextData?.forSale;
    if (Array.isArray(listData)) {
      for (const item of listData) {
        listings.push({
          saleType: 'listing',  // NEVER confused with completed_sale
          askingPrice: parseFloat(item.price || 0) || null,
          currency: 'USD',
          gradingCompanySlug: String(item.grader || '').toLowerCase() || null,
          nativeGradeText: String(item.grade || ''),
          rawNative: item,
        });
      }
    }
    // Return count only — do not mix with sales
    return {
      provider: this.slug,
      listingCount: listings.length,
      note: 'Listings are asking prices only — never mixed with completed sales',
      capturedAt: new Date().toISOString(),
    };
  }

  /**
   * Extract CGC/PSA census as reported by GoCollect.
   * SEPARATELY attributed from CBCS agent and PSA agent data.
   */
  async extractCensus() {
    const censusData = [];
    const nextData = window.__NEXT_DATA__?.props?.pageProps;
    const census = nextData?.census || nextData?.population || nextData?.cgcCensus || nextData?.psaCensus;

    if (census) {
      // GoCollect may report CGC census and PSA census
      for (const grader of ['cgc', 'psa']) {
        const graderCensus = census[grader] || (typeof census === 'object' ? census : null);
        if (graderCensus && typeof graderCensus === 'object') {
          censusData.push({
            gradingCompanySlug: grader,
            censusSource: 'gocollect', // GoCollect's observation of grader census
            rawNative: graderCensus,
          });
        }
      }
    }

    return {
      provider: this.slug,
      censusData,
      note: 'GoCollect census is attributed as gocollect observation of grader data, not authoritative grader data',
      capturedAt: new Date().toISOString(),
    };
  }

  async discoverCatalog(options = {}) {
    // Discover series list from GoCollect
    const nextData = window.__NEXT_DATA__?.props?.pageProps;
    return {
      provider: this.slug,
      pageData: nextData || null,
      seriesFromUrl: window.location.href.match(/\/series\/(\d+)/)?.[1] || null,
      pageTitle: document.title,
    };
  }

  async discoverCurrentItem() {
    const nextData = window.__NEXT_DATA__?.props?.pageProps;
    const seriesId = window.location.href.match(/\/series\/(\d+)/)?.[1] || null;
    return {
      providerTitleId: seriesId,
      titleName: nextData?.series?.title || nextData?.title || document.querySelector('h1')?.textContent?.trim() || null,
      sourceUrl: window.location.href,
    };
  }

  async extractIdentity() {
    return this.discoverCurrentItem();
  }

  async extractEditions() {
    const nextData = window.__NEXT_DATA__?.props?.pageProps;
    return {
      provider: this.slug,
      editions: nextData?.variants || nextData?.editions || [],
      note: 'Variant data captured from GoCollect — stored as gocollect-attributed variant discovery',
    };
  }

  async extractMarketSummaries() {
    return this.extractGrades();
  }

  async extractYearlyAggregates() {
    const nextData = window.__NEXT_DATA__?.props?.pageProps;
    const yearData = nextData?.yearlyData || nextData?.historical;
    return {
      provider: this.slug,
      yearlyData: yearData || null,
      note: 'GoCollect yearly aggregates are GoCollect observations, not grader-native data',
    };
  }

  async extractCertifications() {
    return { available: false, reason: 'GoCollect does not provide cert-level detail' };
  }

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
  window.GoCollectAdapter = GoCollectAdapter;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GoCollectAdapter };
}
