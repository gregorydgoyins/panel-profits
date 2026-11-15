import { describe, expect, it } from 'vitest';
import { extractYearFromTitle, verifyComicIntegrity } from '../integrity-guard';
import { buildCompleteness } from '../detail-model';

describe('extractYearFromTitle', () => {
  it('extracts trailing 4-digit year from comic title', () => {
    expect(extractYearFromTitle('Black Panther #12 (2006)')).toBe(2006);
    expect(extractYearFromTitle('Black Panther #12 (1978)')).toBe(1978);
    expect(extractYearFromTitle('Black Panther #12')).toBeNull();
  });
});

describe('verifyComicIntegrity', () => {
  it('passes when census totals match pp_comics', () => {
    const res = verifyComicIntegrity({
      id: '2399925',
      title: 'Black Panther #12 (2006)',
      expectedCgcTotal: 21,
      expectedCgc98Count: 17,
      censusTotalGraded: 21,
      census98Count: 17,
    });
    expect(res.verified).toBe(true);
    expect(res.warnings).toHaveLength(0);
  });

  it('flags census total mismatch when 1978 census leaks onto 2006 issue', () => {
    const res = verifyComicIntegrity({
      id: '2399925',
      title: 'Black Panther #12 (2006)',
      expectedCgcTotal: 21,
      expectedCgc98Count: 17,
      censusTotalGraded: 129,
      census98Count: 14,
    });
    expect(res.verified).toBe(false);
    expect(res.warnings.map((w) => w.code)).toEqual(['CENSUS_MISMATCH', 'CENSUS_MISMATCH']);
  });
});

describe('buildCompleteness', () => {
  it('caps readiness at 50 (D) when integrityVerified is false', () => {
    const full = {
      marketData: true,
      censusData: true,
      coverArt: true,
      creators: true,
      synopsis: true,
      salesHistory: true,
    };
    expect(buildCompleteness(full, true).grade).toBe('A');
    const unverified = buildCompleteness(full, false);
    expect(unverified.score).toBe(50);
    expect(unverified.grade).toBe('D');
    expect(unverified.integrityVerified).toBe(false);
  });
});
