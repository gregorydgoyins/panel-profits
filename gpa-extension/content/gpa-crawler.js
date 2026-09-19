/**
 * GPA Generalized Content Script & Fast Gateway Crawler
 *
 * Architecture (v2 – gateway-direct):
 *  1. Capture all grade serials by clicking all grade-expand buttons
 *     simultaneously once and intercepting FormData.prototype.append.
 *  2. For each serial, call POST /api/v1/gateway/ with endpoint=sales/last_ten
 *     to obtain all yearly aggregates in one request per grade.
 *  3. For each (serial, year) pair with count_sold > 0, call
 *     endpoint=sales/by_year to retrieve individual transactions.
 *  4. Steps 2 and 3 run with controlled concurrency (3 in-flight at once).
 *
 * This replaces 580 × N × 40ms sequential DOM delays with two 500ms settles
 * plus ~580 + M direct HTTP round-trips – reducing multi-hour runs to minutes.
 *
 * Zero ASM-specific assumptions. All data is derived from live DOM + gateway.
 */

(function () {

// ─── 1. Session Guards ──────────────────────────────────────────────────────

function checkCloudflareChallenge() {
  const isChallenge =
    document.title.includes('Just a moment...') ||
    document.title.includes('Attention Required') ||
    !!document.querySelector('#challenge-running') ||
    !!document.querySelector('.cf-turnstile-wrapper') ||
    !!document.querySelector('#challenge-form');

  if (isChallenge) {
    try {
      chrome.runtime.sendMessage(
        { type: 'CLOUDFLARE_CHALLENGE_DETECTED', url: window.location.href },
        () => { if (chrome.runtime.lastError) {} }
      );
    } catch (e) {}
    return true;
  }
  return false;
}

function checkAuthLoss() {
  const isLoggedOut =
    document.title.includes('Sign In') ||
    document.title.includes('Log In') ||
    !!document.querySelector('form[action*="login"]') ||
    !!document.querySelector('a[href*="/login"]');

  if (isLoggedOut && !window.location.pathname.includes('/login')) {
    try {
      chrome.runtime.sendMessage(
        { type: 'AUTH_LOSS_DETECTED', url: window.location.href },
        () => { if (chrome.runtime.lastError) {} }
      );
    } catch (e) {}
    return true;
  }
  return false;
}

// ─── 2. Page Metadata ───────────────────────────────────────────────────────

function parsePageMetadata() {
  const pathname = window.location.pathname;
  const match = pathname.match(/\/analyse-prices\/sales-data\/(\d+)\/(\d+)/);

  if (!match) {
    throw new Error(
      `Invalid GPA issue URL structure: ${pathname}. Expected /analyse-prices/sales-data/<title_id>/<issue_id>`
    );
  }

  const titleId = parseInt(match[1], 10);
  const issueId = parseInt(match[2], 10);

  const firstH3 = document.querySelector('h3')?.textContent?.trim() || '';
  const cleanH3 = firstH3.replace(/Additional live listings.*/i, '').trim();
  const h3Match = cleanH3.match(/(.*?),\s*No\.\s*([^,]+)(?:,\s*(\d{4}))?(?:,\s*(.*))?$/);

  let seriesName = null;
  let issueNumRaw = String(issueId);
  let pubYear = null;
  let publisher = null;

  if (h3Match) {
    seriesName = h3Match[1] ? h3Match[1].trim() : null;
    if (h3Match[2]) issueNumRaw = h3Match[2].trim();
    if (h3Match[3]) pubYear = parseInt(h3Match[3], 10);
    if (h3Match[4]) publisher = h3Match[4].trim();
  }

  if (!seriesName) {
    const h1 = document.querySelector('h1')?.textContent?.trim() || '';
    if (h1 && !h1.toLowerCase().includes('analyze prices')) {
      const seriesMatch = h1.match(/^(.*?)(?:\s+#(\S+))?$/);
      seriesName = seriesMatch && seriesMatch[1] ? seriesMatch[1].trim() : h1;
      if (seriesMatch && seriesMatch[2]) issueNumRaw = seriesMatch[2].trim();
    }
  }

  return {
    gpa_title_id: titleId,
    gpa_issue_id: issueId,
    title_name: seriesName || `GPA Title ${titleId}`,
    publisher,
    issue_number_raw: issueNumRaw,
    publication_year: pubYear,
    gpa_url: window.location.href,
  };
}

// ─── 3. Price Helpers ───────────────────────────────────────────────────────

function parsePrice(text) {
  if (!text) return { numeric: null, text: null, currency: null };
  const clean = text.replace(/,/g, '').trim();
  const numMatch = clean.match(/([$€£¥]?)\s*([\d.]+)/);
  if (numMatch) {
    return { currency: numMatch[1] || '$', numeric: parseFloat(numMatch[2]), text: text.trim() };
  }
  return { numeric: null, text: text.trim(), currency: null };
}

function extractCell(td) {
  if (!td) return { numeric: null, count: null, date: null, text: null, currency: '$' };
  const clone = td.cloneNode(true);
  const smallCopy = clone.querySelector('.c-cell__small-copy');
  let count = null;
  let date = null;
  if (smallCopy) {
    const txt = smallCopy.textContent.trim();
    if (/^\d+$/.test(txt)) count = parseInt(txt, 10);
    else if (txt !== '-') date = txt;
    smallCopy.remove();
  }
  clone.querySelectorAll('i, svg').forEach((el) => el.remove());
  const p = parsePrice(clone.textContent);
  return { numeric: p.numeric, count, date, text: p.text, currency: p.currency };
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForTableReady(timeoutMs = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (checkCloudflareChallenge()) throw new Error('Cloudflare challenge active');
    if (checkAuthLoss()) throw new Error('Authentication session lost');
    const rows = Array.from(document.querySelectorAll('tr')).filter(
      (r) => r.querySelectorAll('td').length >= 8
    );
    const h3 = document.querySelector('h3');
    if (rows.length > 0 && h3 && h3.textContent.trim()) return true;
    await wait(250);
  }
  throw new Error('Timeout waiting for GPA table to render');
}

// ─── 4. Gateway Client ──────────────────────────────────────────────────────

/**
 * Capture a CSRF token by intercepting FormData from the first grade-button
 * click. The token is valid for the entire session.
 */
async function captureSessionCsrf(gradeRows) {
  return new Promise((resolve) => {
    let captured = null;
    const _append = FormData.prototype.append;
    FormData.prototype.append = function(key, value) {
      if (key === 'GPACMSCSRF' && !captured) {
        captured = String(value);
        FormData.prototype.append = _append; // restore immediately
        resolve(captured);
      }
      return _append.call(this, key, value);
    };

    // Click the first grade button to trigger a FormData XHR
    const firstBtn = gradeRows[0]?.querySelector('button.c-icon-button--responsive');
    if (firstBtn) {
      firstBtn.click();
    } else {
      FormData.prototype.append = _append;
      resolve(null);
    }
  });
}

/**
 * POST to the GPA gateway. Returns parsed JSON data array or [].
 */
async function gatewayPost(endpoint, params, csrf) {
  const fd = new FormData();
  fd.append('endpoint', endpoint);
  for (const [k, v] of Object.entries(params)) fd.append(k, String(v));
  fd.append('GPACMSCSRF', csrf);

  try {
    const resp = await fetch('/api/v1/gateway/', {
      method: 'POST',
      body: fd,
      credentials: 'include',
    });
    if (!resp.ok) return [];
    const json = await resp.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch (e) {
    return [];
  }
}

/**
 * Run up to `concurrency` async tasks from an array at once.
 */
async function runWithConcurrency(items, fn, concurrency = 3) {
  const results = [];
  const pool = [];

  for (const item of items) {
    const p = fn(item).then((r) => { results.push(r); });
    pool.push(p);
    if (pool.length >= concurrency) {
      await Promise.race(pool);
      pool.splice(0, pool.length, ...pool.filter((x) => {
        let settled = false;
        x.then(() => { settled = true; }).catch(() => { settled = true; });
        return !settled;
      }));
    }
  }
  await Promise.all(pool);
  return results;
}

// ─── 5. Serial Discovery ─────────────────────────────────────────────────────

/**
 * Simultaneously click all grade expand buttons. Intercept FormData to collect
 * the GPA serial for each grade row. Returns a Map: gradeRowIndex → serial.
 */
async function discoverAllSerials(gradeRows, csrf) {
  const serialByIndex = new Map();
  const clickOrder = []; // Track which serial came from which click

  const _append = FormData.prototype.append;
  let clickIndex = 0;
  const pendingClick = []; // [{ index, serial, endpoint }]

  FormData.prototype.append = function(key, value) {
    const v = String(value);
    if (key === 'endpoint') {
      pendingClick.push({ endpoint: v, rowIndex: clickIndex });
    } else if (key === 'serial' && pendingClick.length > 0) {
      const last = pendingClick[pendingClick.length - 1];
      if (!last.serial) last.serial = v;
    }
    return _append.call(this, key, value);
  };

  // Click all grade buttons simultaneously – no await between clicks.
  // Each click fires 2 XHRs (stats/chart + sales/last_ten).
  // We only need the serial, not the response.
  for (let i = 0; i < gradeRows.length; i++) {
    clickIndex = i;
    const btn = gradeRows[i]?.querySelector('button.c-icon-button--responsive');
    if (btn) btn.click();
  }

  // Wait for all FormData intercepts to fire (they're synchronous-ish)
  await wait(600);
  FormData.prototype.append = _append;

  // Build the Map from pendingClick data (deduplicate by rowIndex)
  for (const entry of pendingClick) {
    if (entry.serial && !serialByIndex.has(entry.rowIndex)) {
      serialByIndex.set(entry.rowIndex, entry.serial);
    }
  }

  return serialByIndex;
}

// ─── 6. Grade Row DOM Parser ─────────────────────────────────────────────────

/**
 * Parse summary data from a grade row's visible cells (no expand needed).
 * Returns { grade, designation, variant_name, avg_2024, avg_2025, ... }
 */
function parseGradeRowSummary(row) {
  const tds = Array.from(row.querySelectorAll('td'));
  // td[0]: star button, td[1]: badge, td[2]: grade, td[3]: variant/pedigree,
  // td[4]: 2024 avg, td[5]: 2025 avg, td[6]: 12m avg, td[7]: 90d avg,
  // td[8]: last sale, td[9]: empty, td[10]: expand button
  if (tds.length < 8) return null;

  const badge = tds[1]?.querySelector('.c-badge')?.textContent?.trim() || null;
  const gradeText = tds[2]?.querySelector('strong')?.textContent?.trim() || tds[2]?.textContent?.trim();
  const gradeNum = parseFloat(gradeText) || null;
  const variantNote = tds[3]?.textContent?.trim() || null;

  const c2024 = extractCell(tds[4]);
  const c2025 = extractCell(tds[5]);
  const c12m = extractCell(tds[6]);
  const c90d = extractCell(tds[7]);
  const cLast = extractCell(tds[8]);

  // Only include rows that actually have sales data
  const hasSales = (c2024.numeric !== null && c2024.numeric > 0) ||
    (c2025.numeric !== null && c2025.numeric > 0) ||
    (c12m.numeric !== null && c12m.numeric > 0) ||
    (c90d.numeric !== null && c90d.numeric > 0) ||
    (cLast.numeric !== null && cLast.numeric > 0);

  return {
    designation: badge,
    grade: gradeNum,
    variant_name: variantNote || null,
    avg_price_2024: c2024.numeric,
    count_2024: c2024.count,
    avg_price_2025: c2025.numeric,
    count_2025: c2025.count,
    avg_price_12m: c12m.numeric,
    avg_price_90d: c90d.numeric,
    last_sale_price: cLast.numeric,
    last_sale_date: cLast.date,
    hasSales,
  };
}

// ─── 7. Yearly Aggregate Fetcher ─────────────────────────────────────────────

/**
 * Fetch all yearly aggregates for a grade serial using sales/last_ten.
 * Returns: [{ year, count_sold, max_price, min_price, avg_price }]
 */
async function fetchYearlyAggregates(serial, csrf) {
  const rows = await gatewayPost('sales/last_ten', { serial }, csrf);
  return rows.map((r) => ({
    year: parseInt(r.year, 10),
    count_sold: parseInt(r.copies_sold, 10) || 0,
    high_price: parseFloat(r.max_price) || null,
    low_price: parseFloat(r.min_price) || null,
    avg_price: parseFloat(r.avg_price) || null,
  })).filter((r) => r.year > 0 && r.count_sold > 0);
}

// ─── 8. Individual Transaction Fetcher ────────────────────────────────────────

/**
 * Fetch all individual transactions for (serial, year) using sales/by_year.
 * Returns: [{ sale_date, sale_price, origin, cert_number, price_url, uri }]
 */
async function fetchYearTransactions(serial, year, csrf) {
  const rows = await gatewayPost('sales/by_year', { serial, year: String(year) }, csrf);
  return rows.map((r) => ({
    sale_date: r.date ? r.date.replace(' 22:00:00', '').trim() : null,
    sale_price: parseFloat(r.price) || null,
    origin: r.origin || null,
    cert_number: r.cgc_id || null,
    price_url: r.price_url ? decodeURIComponent(r.price_url) : null,
    evidence_path: r.uri ? decodeURIComponent(r.uri) : null,
    link_id: r.link_id || null,
    pq: r.pq || null,
  }));
}

// ─── 9. Main Extractor ───────────────────────────────────────────────────────

/**
 * Fast gateway-based full issue extractor.
 * Replaces the sequential DOM accordion traversal.
 */
async function traverseAndExtractFullIssue(resumeCheckpoint = null) {
  await waitForTableReady();

  const meta = parsePageMetadata();

  // Collect all grade rows from the main table (not panel sub-tables)
  const allGradeRows = Array.from(
    document.querySelectorAll('tr.c-table__row')
  ).filter((r) => r.querySelectorAll('td').length >= 8);

  if (allGradeRows.length === 0) {
    throw new Error('No grade rows found on page');
  }

  // Parse summary data from all rows (no clicks needed – data is in DOM)
  const gradeSummaries = allGradeRows.map((row, i) => ({
    rowIndex: i,
    ...parseGradeRowSummary(row),
  })).filter((s) => s !== null);

  // Step 1: Capture CSRF token and discover all serials simultaneously
  let csrf = null;
  try {
    csrf = await Promise.race([
      captureSessionCsrf(allGradeRows),
      wait(3000).then(() => null),
    ]);
  } catch (e) {
    csrf = null;
  }

  if (!csrf) {
    throw new Error('Could not capture GPA session CSRF token');
  }

  // Step 2: Click all remaining grade buttons to discover serials
  // (The first button was already clicked for CSRF)
  const serialMap = await discoverAllSerials(allGradeRows, csrf);

  // Wait for all XHRs to fire (not to complete)
  await wait(500);

  // Step 3: Build work items – only grades that have sales data AND a serial
  const workItems = gradeSummaries
    .filter((s) => s.hasSales && serialMap.has(s.rowIndex))
    .map((s) => ({
      ...s,
      serial: serialMap.get(s.rowIndex),
    }));

  // Apply checkpoint: skip serials already processed
  const startFrom = resumeCheckpoint ? resumeCheckpoint.lastSerial : null;
  let skipUntilFound = !!startFrom;
  const pendingWork = workItems.filter((item) => {
    if (skipUntilFound) {
      if (item.serial === startFrom) skipUntilFound = false;
      return false;
    }
    return true;
  });

  // Step 4: Fetch yearly aggregates and individual transactions concurrently
  const allEditions = [];
  const allYearlyAggs = [];
  const allObservations = [];

  const processSingle = async (item) => {
    const yearlyAggs = await fetchYearlyAggregates(item.serial, csrf);

    // Build edition record
    const edition = {
      gpa_issue_id: meta.gpa_issue_id,
      edition_name: item.designation,
      grade: item.grade,
      variant_name: item.variant_name,
      serial: item.serial,
      avg_price_2024: item.avg_price_2024,
      avg_price_2025: item.avg_price_2025,
      last_sale_price: item.last_sale_price,
      last_sale_date: item.last_sale_date,
    };
    allEditions.push(edition);

    // Yearly aggregates
    for (const yAgg of yearlyAggs) {
      allYearlyAggs.push({ ...yAgg, serial: item.serial, edition_name: item.designation, grade: item.grade });
    }

    // Individual transactions (3 concurrent per grade)
    const yearJobs = yearlyAggs
      .filter((y) => y.count_sold > 0)
      .map((y) => ({ year: y.year, serial: item.serial }));

    await runWithConcurrency(yearJobs, async (job) => {
      const txns = await fetchYearTransactions(job.serial, job.year, csrf);
      for (const txn of txns) {
        allObservations.push({
          ...txn,
          serial: item.serial,
          edition_name: item.designation,
          grade: item.grade,
          gpa_issue_id: meta.gpa_issue_id,
          sale_year: job.year,
        });
      }
    }, 3);
  };

  // Process all grades with global concurrency of 3
  await runWithConcurrency(pendingWork, processSingle, 3);

  return {
    meta,
    editions: allEditions,
    yearly_aggregates: allYearlyAggs,
    observations: allObservations,
    total_grade_rows: allGradeRows.length,
    grades_with_data: workItems.length,
    grades_processed: pendingWork.length,
  };
}

// ─── 10. Message Handler ─────────────────────────────────────────────────────

let crawlRunning = false;

if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'PING') {
      sendResponse({ ok: true, url: window.location.href });
      return true;
    }

    if (msg.type === 'CHECK_CLOUDFLARE') {
      sendResponse({ cloudflare: checkCloudflareChallenge() });
      return true;
    }

    if (msg.type === 'CHECK_AUTH') {
      sendResponse({ authLost: checkAuthLoss() });
      return true;
    }

    if (msg.type === 'START_CRAWL') {
      if (crawlRunning) {
        sendResponse({ error: 'Crawl already in progress' });
        return true;
      }
      crawlRunning = true;
      const checkpoint = msg.checkpoint || null;

      traverseAndExtractFullIssue(checkpoint)
        .then((result) => {
          crawlRunning = false;
          sendResponse({ ok: true, result });
        })
        .catch((err) => {
          crawlRunning = false;
          sendResponse({ error: err.message, stack: err.stack });
        });

      return true; // async response
    }

    if (msg.type === 'PARSE_METADATA') {
      try {
        sendResponse({ ok: true, meta: parsePageMetadata() });
      } catch (e) {
        sendResponse({ error: e.message });
      }
      return true;
    }
  });
}

// ─── 11. Guard: prevent duplicate injection ──────────────────────────────────

if (typeof window.__GPA_CRAWLER_LOADED !== 'undefined') {
  // Already loaded — skip re-registration
} else {
  window.__GPA_CRAWLER_LOADED = true;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    traverseAndExtractFullIssue,
    parsePageMetadata,
    parsePrice,
    extractCell,
    checkCloudflareChallenge,
    checkAuthLoss,
  };
}

})();
