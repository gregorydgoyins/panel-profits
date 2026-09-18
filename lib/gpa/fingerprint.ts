import { createHash } from 'node:crypto';

export interface FingerprintParams {
  gpa_title_id: number;
  gpa_issue_id: number;
  edition_variant: string;
  grader: string;
  grade: string;
  designation: string;
  observed_year: number;
  displayed_date_text: string;
  displayed_price_text: string;
  certification_number?: string | null;
  evidence_redirect_path?: string | null;
}

export function generateObservationFingerprint(params: FingerprintParams): string {
  const normTitle = String(params.gpa_title_id).trim();
  const normIssue = String(params.gpa_issue_id).trim();
  const normVariant = (params.edition_variant || 'Regular').trim().toLowerCase();
  const normGrader = (params.grader || '').trim().toUpperCase();
  const normGrade = (params.grade || '').trim();
  const normDesig = (params.designation || '').trim().toUpperCase();
  const normYear = String(params.observed_year).trim();
  const normDateText = (params.displayed_date_text || '').trim().toLowerCase();
  const normPriceText = (params.displayed_price_text || '').replace(/\s+/g, '').toLowerCase();
  const normCert = (params.certification_number || '').trim();
  const normPath = (params.evidence_redirect_path || '').trim();

  const preimage = [
    normTitle,
    normIssue,
    normVariant,
    normGrader,
    normGrade,
    normDesig,
    normYear,
    normDateText,
    normPriceText,
    normCert,
    normPath,
  ].join('|');

  return createHash('sha256').update(preimage).digest('hex');
}

const MONTH_MAP: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

export interface ParsedDateResult {
  observed_year: number;
  observed_month: number | null;
  observed_day: number | null;
  observed_date: string | null; // ISO 'YYYY-MM-DD'
  date_precision: 'DAY' | 'MONTH' | 'YEAR';
}

export function parseGpaDate(displayedDateText: string, year: number): ParsedDateResult {
  const cleaned = (displayedDateText || '').trim();
  if (!cleaned) {
    return {
      observed_year: year,
      observed_month: null,
      observed_day: null,
      observed_date: `${year}-01-01`,
      date_precision: 'YEAR',
    };
  }

  // Matches "Sep-11", "Sep 11", "Sep-1", "09/11", etc.
  const monthDayMatch = cleaned.match(/^([A-Za-z]{3})[-/\s](\d{1,2})$/i);
  if (monthDayMatch) {
    const monthKey = monthDayMatch[1].toLowerCase();
    const day = parseInt(monthDayMatch[2], 10);
    const month = MONTH_MAP[monthKey];

    if (month && day >= 1 && day <= 31) {
      const monthPadded = String(month).padStart(2, '0');
      const dayPadded = String(day).padStart(2, '0');
      return {
        observed_year: year,
        observed_month: month,
        observed_day: day,
        observed_date: `${year}-${monthPadded}-${dayPadded}`,
        date_precision: 'DAY',
      };
    }
  }

  // Month-only match e.g. "Sep"
  const monthOnlyMatch = cleaned.match(/^([A-Za-z]{3})$/i);
  if (monthOnlyMatch) {
    const month = MONTH_MAP[monthOnlyMatch[1].toLowerCase()];
    if (month) {
      const monthPadded = String(month).padStart(2, '0');
      return {
        observed_year: year,
        observed_month: month,
        observed_day: null,
        observed_date: `${year}-${monthPadded}-01`,
        date_precision: 'MONTH',
      };
    }
  }

  return {
    observed_year: year,
    observed_month: null,
    observed_day: null,
    observed_date: `${year}-01-01`,
    date_precision: 'YEAR',
  };
}

export function parseGpaPrice(displayedPriceText: string): {
  numericPrice: number;
  currencySymbol: string;
} {
  const text = (displayedPriceText || '').trim();
  const symbolMatch = text.match(/^([^\d.,\s]+)/);
  const currencySymbol = symbolMatch ? symbolMatch[1] : '$';

  const cleanNumStr = text.replace(/[^0-9.]/g, '');
  const numericPrice = parseFloat(cleanNumStr) || 0;

  return {
    numericPrice,
    currencySymbol,
  };
}
