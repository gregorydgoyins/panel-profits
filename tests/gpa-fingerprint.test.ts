import { describe, it, expect } from 'vitest';
import {
  generateObservationFingerprint,
  parseGpaDate,
  parseGpaPrice,
} from '@/lib/gpa/fingerprint';

describe('GPA Sales Observation Fingerprinting', () => {
  const sampleParams1 = {
    gpa_title_id: 13,
    gpa_issue_id: 1,
    edition_variant: 'Regular',
    grader: 'CGC',
    grade: '7.0',
    designation: 'UNI',
    observed_year: 2025,
    displayed_date_text: 'Sep-11',
    displayed_price_text: '$19,800',
    certification_number: '4244095001',
    evidence_redirect_path: '/external-sales/redirect/12345',
  };

  it('generates identical deterministic sha256 hash for identical input', () => {
    const hash1 = generateObservationFingerprint(sampleParams1);
    const hash2 = generateObservationFingerprint({ ...sampleParams1 });
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('is case-insensitive for grader and designation but preserves distinct certs', () => {
    const hashA = generateObservationFingerprint({
      ...sampleParams1,
      grader: 'cgc',
      designation: 'uni',
    });
    const hashB = generateObservationFingerprint(sampleParams1);
    expect(hashA).toBe(hashB);

    const hashC = generateObservationFingerprint({
      ...sampleParams1,
      certification_number: '9999999999',
    });
    expect(hashC).not.toBe(hashB);
  });

  it('produces different hash when price or date differs', () => {
    const hashBase = generateObservationFingerprint(sampleParams1);
    const hashDiffPrice = generateObservationFingerprint({
      ...sampleParams1,
      displayed_price_text: '$20,000',
    });
    const hashDiffDate = generateObservationFingerprint({
      ...sampleParams1,
      displayed_date_text: 'Jun-16',
    });

    expect(hashDiffPrice).not.toBe(hashBase);
    expect(hashDiffDate).not.toBe(hashBase);
  });
});

describe('GPA Date Parsing', () => {
  it('parses "Sep-11" and year 2025 into 2025-09-11 with DAY precision', () => {
    const res = parseGpaDate('Sep-11', 2025);
    expect(res).toEqual({
      observed_year: 2025,
      observed_month: 9,
      observed_day: 11,
      observed_date: '2025-09-11',
      date_precision: 'DAY',
    });
  });

  it('parses "Feb-20" and year 2025 into 2025-02-20 with DAY precision', () => {
    const res = parseGpaDate('Feb-20', 2025);
    expect(res).toEqual({
      observed_year: 2025,
      observed_month: 2,
      observed_day: 20,
      observed_date: '2025-02-20',
      date_precision: 'DAY',
    });
  });

  it('parses month-only "Oct" into 2024-10-01 with MONTH precision', () => {
    const res = parseGpaDate('Oct', 2024);
    expect(res).toEqual({
      observed_year: 2024,
      observed_month: 10,
      observed_day: null,
      observed_date: '2024-10-01',
      date_precision: 'MONTH',
    });
  });
});

describe('GPA Price Parsing', () => {
  it('parses formatted dollar values', () => {
    const res = parseGpaPrice('$19,800');
    expect(res.numericPrice).toBe(19800);
    expect(res.currencySymbol).toBe('$');
  });

  it('parses fractional prices', () => {
    const res = parseGpaPrice('$26,450.50');
    expect(res.numericPrice).toBe(26450.5);
    expect(res.currencySymbol).toBe('$');
  });
});
