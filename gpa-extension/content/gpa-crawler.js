/**
 * GPA Content Script & Page Controller
 * Operates within authenticated comics.gpanalysis.com sessions.
 */

// 1. Cloudflare Detection
function checkCloudflareChallenge() {
  const isChallenge =
    document.title.includes('Just a moment...') ||
    document.title.includes('Attention Required') ||
    !!document.querySelector('#challenge-running') ||
    !!document.querySelector('.cf-turnstile-wrapper') ||
    !!document.querySelector('#challenge-form');

  if (isChallenge) {
    chrome.runtime.sendMessage({
      type: 'CLOUDFLARE_CHALLENGE_DETECTED',
      url: window.location.href,
    });
    return true;
  }
  return false;
}

// 2. GPA Gateway API Helper
async function callGpaGateway(endpoint, payload = {}) {
  if (checkCloudflareChallenge()) {
    throw new Error('Cloudflare challenge detected. Pausing execution.');
  }

  const res = await fetch('/api/v1/gateway/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({
      endpoint,
      ...payload,
    }),
  });

  if (res.status === 403 || res.status === 503) {
    checkCloudflareChallenge();
    throw new Error(`GPA Gateway access error (HTTP ${res.status})`);
  }

  if (!res.ok) {
    throw new Error(`GPA Gateway failed: HTTP ${res.status}`);
  }

  return await res.json();
}

// 3. Stage 1: Title & Issue Discovery
export async function discoverTitles(searchQuery) {
  const data = await callGpaGateway('titles/search', { query: searchQuery });
  // GPA returns list of matching title objects
  return data?.results || data?.titles || data || [];
}

export async function discoverIssues(titleId) {
  const data = await callGpaGateway('comics/issues', { title_id: parseInt(titleId, 10) });
  return data?.results || data?.issues || data || [];
}

// 4. Stage 2: Sales By Year Extraction
export async function fetchSalesByYear(serial, year) {
  const data = await callGpaGateway('sales/by_year', {
    serial: String(serial),
    year: parseInt(year, 10),
  });
  return data?.sales || data?.results || data || [];
}

// 5. DOM Inspection of Current Issue Page
export function parseCurrentIssuePageMetadata() {
  // Title ID and Issue ID from URL e.g. /analyse-prices/sales-data/13/1
  const match = window.location.pathname.match(/\/analyse-prices\/sales-data\/(\d+)\/(\d+)/);
  const titleId = match ? parseInt(match[1], 10) : null;
  const issueId = match ? parseInt(match[2], 10) : null;

  // Primary heading e.g. "Amazing Spider-Man, The #1"
  const h1 = document.querySelector('h1')?.textContent?.trim() || '';
  const seriesMatch = h1.match(/^(.*?)(?:\s+#(\S+))?$/);
  const seriesName = seriesMatch ? seriesMatch[1] : h1;
  const issueNumRaw = seriesMatch && seriesMatch[2] ? seriesMatch[2] : (issueId ? String(issueId) : '1');

  // Metadata subtitle e.g. "Marvel Comics, 1963"
  const subtitle = document.querySelector('.comic-metadata, .sub-heading, h2')?.textContent?.trim() || '';
  const yearMatch = subtitle.match(/\b(19\d\d|20\d\d)\b/);
  const pubYear = yearMatch ? parseInt(yearMatch[1], 10) : null;

  return {
    gpa_title_id: titleId,
    gpa_issue_id: issueId,
    title_name: seriesName,
    issue_number_raw: issueNumRaw,
    publication_year: pubYear,
    gpa_url: window.location.href,
  };
}

// 6. Full Issue Extraction
export async function extractCurrentPageData() {
  if (checkCloudflareChallenge()) {
    return null;
  }

  const meta = parseCurrentIssuePageMetadata();
  if (!meta.gpa_title_id || !meta.gpa_issue_id) {
    throw new Error('Unable to resolve title_id or issue_id from page');
  }

  const payload = {
    title: {
      gpa_title_id: meta.gpa_title_id,
      title_name: meta.title_name,
      publication_year: meta.publication_year,
    },
    issue: {
      gpa_issue_id: meta.gpa_issue_id,
      issue_number_raw: meta.issue_number_raw,
      gpa_url: meta.gpa_url,
    },
    editions: [],
  };

  // Find all grade summary rows on the page
  // Based on verified contract: sections/tables for UNI/SIG/QUAL/RES
  const gradeRows = document.querySelectorAll('tr[data-serial], tr.grade-row, .grade-summary-row');
  const regularEdition = {
    edition_name: 'Regular',
    variant_name: null,
    is_regular_edition: true,
    grade_summaries: [],
  };

  for (const row of gradeRows) {
    const serial = row.getAttribute('data-serial') || row.querySelector('[data-serial]')?.getAttribute('data-serial');
    const grader = row.getAttribute('data-grader') || 'CGC';
    const grade = row.getAttribute('data-grade') || row.querySelector('.grade-val')?.textContent?.trim() || '';
    const designation = row.getAttribute('data-designation') || 'UNI';

    if (!grade) continue;

    const summary = {
      grader,
      grade,
      designation,
      serial,
      yearly_aggregates: [],
    };

    // If serial exists, we query sales by year for active years e.g. 2025, 2024
    if (serial) {
      const years = [2025, 2024]; // Query recent transaction years
      for (const y of years) {
        try {
          const salesData = await fetchSalesByYear(serial, y);
          if (Array.isArray(salesData) && salesData.length > 0) {
            const observations = salesData.map((s) => ({
              displayed_date_text: s.date_text || s.date || `${y}-01-01`,
              displayed_price_text: s.price_text || (s.price ? `$${s.price}` : '$0'),
              parsed_numeric_price: typeof s.price === 'number' ? s.price : parseFloat(String(s.price_text || '0').replace(/[^0-9.]/g, '')),
              displayed_currency_symbol: '$',
              certification_number: s.cert || s.cert_number || null,
              evidence_redirect_path: s.url || s.redirect_path || null,
              raw_payload: s,
            }));

            summary.yearly_aggregates.push({
              year: y,
              count_sold: observations.length,
              observations,
            });
          }
        } catch (err) {
          console.warn(`Could not fetch sales for serial ${serial} year ${y}:`, err);
        }
      }
    }

    regularEdition.grade_summaries.push(summary);
  }

  payload.editions.push(regularEdition);
  return payload;
}

// 7. Message Listener from Extension Background/Popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_CURRENT_PAGE') {
    extractCurrentPageData()
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }

  if (message.type === 'DISCOVER_TITLES') {
    discoverTitles(message.query)
      .then((titles) => sendResponse({ success: true, titles }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'DISCOVER_ISSUES') {
    discoverIssues(message.titleId)
      .then((issues) => sendResponse({ success: true, issues }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// Periodic Cloudflare Check
setInterval(checkCloudflareChallenge, 3000);
