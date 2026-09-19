/**
 * normalization.js
 * Panel Profits Graded Collector — Data Normalization
 *
 * Normalizes prices, dates, grades, designations without losing native terminology.
 * Unknown fields stay null. Never substitute data from another provider.
 */

'use strict';

/**
 * Normalize a price string to a numeric value.
 * @param {string|null} rawText
 * @param {string} [defaultCurrency='USD']
 * @returns {{ numeric: number|null, currency: string, raw: string|null }}
 */
function normalizePrice(rawText, defaultCurrency = 'USD') {
  if (!rawText) return { numeric: null, currency: defaultCurrency, raw: null };
  const raw = String(rawText).trim();
  const currencyMap = { '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY' };
  let currency = defaultCurrency;
  let clean = raw.replace(/,/g, '');

  // Detect currency symbol
  const symMatch = clean.match(/^([€£¥\$])/);
  if (symMatch) {
    currency = currencyMap[symMatch[1]] || defaultCurrency;
    clean = clean.substring(1).trim();
  }

  // Handle K/M suffixes
  const kMatch = clean.match(/^([\d.]+)\s*[Kk]$/);
  if (kMatch) return { numeric: parseFloat(kMatch[1]) * 1000, currency, raw };
  const mMatch = clean.match(/^([\d.]+)\s*[Mm]$/);
  if (mMatch) return { numeric: parseFloat(mMatch[1]) * 1000000, currency, raw };

  const numMatch = clean.match(/^([\d.]+)/);
  if (numMatch) return { numeric: parseFloat(numMatch[1]), currency, raw };

  return { numeric: null, currency, raw };
}

/**
 * Normalize a grade string to a numeric value.
 * Preserves native text — only adds a numeric interpretation.
 * @param {string|null} rawText
 * @param {string} [grader] - grading company slug
 * @returns {{ numeric: number|null, raw: string|null, grader: string|null }}
 */
function normalizeGrade(rawText, grader = null) {
  if (!rawText) return { numeric: null, raw: null, grader };
  const raw = String(rawText).trim();
  // Standard decimal grade: 9.8, 7.5, 10.0, etc.
  const decMatch = raw.match(/^(\d{1,2}(?:\.\d{1,2})?)$/);
  if (decMatch) return { numeric: parseFloat(decMatch[1]), raw, grader };
  // Integer grade (PSA comics use 1-10)
  const intMatch = raw.match(/^(\d{1,2})$/);
  if (intMatch) return { numeric: parseInt(intMatch[1], 10), raw, grader };
  // Fractions or ranges — keep null numeric, preserve raw
  return { numeric: null, raw, grader };
}

/**
 * Normalize a date string to ISO 8601 (YYYY-MM-DD) or null.
 * @param {string|null} rawText
 * @returns {string|null}
 */
function normalizeDate(rawText) {
  if (!rawText) return null;
  const raw = String(rawText).trim();

  // Already ISO: 2025-09-11
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // GPA format: "2025-09-11 22:00:00"
  const isoFull = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoFull) return isoFull[1];

  // "Jan 2024", "Sep 2025"
  const monthYear = raw.match(/^([A-Za-z]{3})\s+(\d{4})$/);
  if (monthYear) {
    const months = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',
                     Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' };
    const m = months[monthYear[1]];
    return m ? `${monthYear[2]}-${m}-01` : null;
  }

  // "01/2024" or "1/2024"
  const slashDate = raw.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashDate) return `${slashDate[2]}-${String(slashDate[1]).padStart(2,'0')}-01`;

  // "2024" — year only
  if (/^\d{4}$/.test(raw)) return `${raw}-01-01`;

  return null;
}

/**
 * Normalize a designation string.
 * Preserves native text — only adds a canonical category interpretation.
 * @param {string|null} rawText
 * @param {string} [grader] - grading company slug
 * @returns {{ canonical: string|null, raw: string|null, grader: string|null }}
 */
function normalizeDesignation(rawText, grader = null) {
  if (!rawText) return { canonical: null, raw: null, grader };
  const raw = String(rawText).trim();
  const upper = raw.toUpperCase();

  // CGC designations
  const cgcMap = {
    'UNI': 'universal', 'UNIVERSAL': 'universal',
    'SS': 'signed', 'SIGNATURE SERIES': 'signed',
    'R': 'restored', 'RESTORED': 'restored',
    'C': 'conserved', 'CONSERVED': 'conserved',
    'Q': 'qualified', 'QUALIFIED': 'qualified',
    'NG': 'no_grade', 'NO GRADE': 'no_grade',
    'EP': 'exceptional_pedigree', 'EXCEPTIONAL PEDIGREE': 'exceptional_pedigree',
    'MP': 'mint_pedigree', 'MINT PEDIGREE': 'mint_pedigree',
    'SA': 'signature_authentication', 'SIGNATURE AUTHENTICATION': 'signature_authentication',
  };

  // CBCS designations (similar but different label colors)
  const cbcsMap = {
    'UNIVERSAL': 'universal',
    'SIGNATURE SERIES': 'signed',
    'RESTORED': 'restored',
    'CONSERVED': 'conserved',
    'QUALIFIED': 'qualified',
  };

  if (grader === 'cgc') {
    return { canonical: cgcMap[upper] || null, raw, grader };
  }
  if (grader === 'cbcs') {
    return { canonical: cbcsMap[upper] || null, raw, grader };
  }

  // Generic fallback
  const generic = cgcMap[upper] || cbcsMap[upper] || null;
  return { canonical: generic, raw, grader };
}

/**
 * Normalize a page quality string.
 * Always preserves native text — no normalization, just trim.
 * @param {string|null} rawText
 * @returns {string|null}
 */
function normalizePageQuality(rawText) {
  if (!rawText) return null;
  return String(rawText).trim() || null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normalizePrice,
    normalizeGrade,
    normalizeDate,
    normalizeDesignation,
    normalizePageQuality,
  };
}
