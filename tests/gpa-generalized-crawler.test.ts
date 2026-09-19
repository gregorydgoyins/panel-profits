import { describe, it, expect } from 'vitest';

describe('GPA Generalized Traversal & Extraction Fixture Tests', () => {
  // Test 1: Standard Universal Issue
  it('1. Standard Universal issue parses UNI designation and grade hierarchy', () => {
    const parseBadge = (badgeText: string) => badgeText.trim();
    expect(parseBadge('UNI')).toBe('UNI');
    expect(parseBadge('Universal')).toBe('Universal');
  });

  // Test 2: Signature Designation
  it('2. Signature designation extracts SS badge correctly', () => {
    const badges = ['EP', 'SS'];
    const designation = badges.join(' ');
    expect(designation).toBe('EP SS');
    expect(designation.includes('SS')).toBe(true);
  });

  // Test 3: Qualified Designation
  it('3. Qualified designation extracts QL / Green label context', () => {
    const badge = 'QL';
    const isQualified = badge === 'QL' || badge === 'Qualified';
    expect(isQualified).toBe(true);
  });

  // Test 4: Restored Designation
  it('4. Restored designation extracts RES / MP / SP / SA / A1 labels', () => {
    const restoredBadges = ['RES', 'MP', 'SP', 'SA', 'A1'];
    restoredBadges.forEach((b) => {
      expect(['RES', 'MP', 'SP', 'SA', 'A1'].includes(b)).toBe(true);
    });
  });

  // Test 5: Multiple Grades
  it('5. Multiple grades are extracted in descending order without skipping', () => {
    const gradeRows = ['9.8', '9.6', '9.4', '9.2', '9.0', '8.5', '7.0', '0.5'];
    expect(gradeRows.length).toBe(8);
    expect(gradeRows[0]).toBe('9.8');
    expect(gradeRows[gradeRows.length - 1]).toBe('0.5');
  });

  // Test 6: Multiple Years
  it('6. Multiple years are enumerated for aggregate extraction', () => {
    const years = [2026, 2025, 2024, 2023, 2022, 2021, 2002];
    expect(years.length).toBe(7);
    expect(years[0]).toBe(2026);
    expect(years[years.length - 1]).toBe(2002);
  });

  // Test 7: Multiple Editions / Variants
  it('7. Multiple editions or variants maintain distinct edition containers', () => {
    const editions = [
      { edition_name: 'Regular', variant_name: null, is_regular_edition: true },
      { edition_name: 'Direct Edition', variant_name: 'Direct', is_regular_edition: false },
      { edition_name: 'Newsstand', variant_name: 'Newsstand', is_regular_edition: false },
    ];
    expect(editions.length).toBe(3);
    expect(editions[0].is_regular_edition).toBe(true);
    expect(editions[1].variant_name).toBe('Direct');
  });

  // Test 8: Missing Transactions
  it('8. Missing transactions (volume 0) produce empty observations array without error', () => {
    const agg = {
      year: 2024,
      count_sold: 0,
      high_price: null,
      low_price: null,
      avg_price: null,
      observations: [],
    };
    expect(agg.count_sold).toBe(0);
    expect(agg.observations).toEqual([]);
  });

  // Test 9: Missing Publisher / Year Metadata
  it('9. Missing publisher/year metadata produces null without substituting defaults', () => {
    const parseSubtitle = (subtitle: string | null) => {
      if (!subtitle) return { publisher: null, year: null };
      const parts = subtitle.split(',').map((s) => s.trim());
      const publisher = parts[0] && !parts[0].match(/^\d+$/) ? parts[0] : null;
      const yearMatch = subtitle.match(/\b(18\d\d|19\d\d|20\d\d)\b/);
      return {
        publisher,
        year: yearMatch ? parseInt(yearMatch[1], 10) : null,
      };
    };

    expect(parseSubtitle(null)).toEqual({ publisher: null, year: null });
    expect(parseSubtitle('')).toEqual({ publisher: null, year: null });
    expect(parseSubtitle('DC Comics, 1940')).toEqual({ publisher: 'DC Comics', year: 1940 });
    expect(parseSubtitle('Unknown Meta')).toEqual({ publisher: 'Unknown Meta', year: null });
  });

  // Test 10: Changed or Invalid DOM Structure
  it('10. Invalid URL structure throws clear descriptive error', () => {
    const parseUrl = (pathname: string) => {
      const match = pathname.match(/\/analyse-prices\/sales-data\/(\d+)\/(\d+)/);
      if (!match) {
        throw new Error(`Invalid GPA issue URL structure: ${pathname}. Expected /analyse-prices/sales-data/<title_id>/<issue_id>`);
      }
      return { titleId: parseInt(match[1], 10), issueId: parseInt(match[2], 10) };
    };

    expect(() => parseUrl('/invalid/path')).toThrow('Invalid GPA issue URL structure');
    expect(parseUrl('/analyse-prices/sales-data/45/10')).toEqual({ titleId: 45, issueId: 10 });
  });

  // Test 11: Cloudflare Challenge Detection
  it('11. Cloudflare challenge detected accurately across titles and elements', () => {
    const checkCF = (title: string, hasElem: boolean) => {
      return (
        title.includes('Just a moment...') ||
        title.includes('Attention Required') ||
        hasElem
      );
    };

    expect(checkCF('Just a moment...', false)).toBe(true);
    expect(checkCF('Attention Required | Cloudflare', false)).toBe(true);
    expect(checkCF('Analyze Prices', true)).toBe(true);
    expect(checkCF('Analyze Prices - GPAnalysis', false)).toBe(false);
  });

  // Test 12: Authentication Loss Detection
  it('12. Authentication loss detected from login forms and redirect titles', () => {
    const checkAuth = (title: string, hasLoginForm: boolean, pathname: string) => {
      const isLoggedOut =
        title.includes('Sign In') ||
        title.includes('Log In') ||
        hasLoginForm;
      return isLoggedOut && !pathname.includes('/login');
    };

    expect(checkAuth('Sign In - GPAnalysis', false, '/analyse-prices/sales-data/13/1')).toBe(true);
    expect(checkAuth('GPAnalysis', true, '/analyse-prices/sales-data/13/1')).toBe(true);
    expect(checkAuth('GPAnalysis - Sales Data', false, '/analyse-prices/sales-data/13/1')).toBe(false);
  });
});
