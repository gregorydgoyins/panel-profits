import { describe, it, expect } from 'vitest';
import { normalizeSeriesName, normalizeIssueNumber } from '@/lib/gpa/matching';

describe('GPA Series Normalization', () => {
  it('normalizes "Amazing Spider-Man, The" to "amazing spiderman"', () => {
    expect(normalizeSeriesName('Amazing Spider-Man, The')).toBe('amazing spiderman');
  });

  it('normalizes "The Amazing Spider-Man" to "amazing spiderman"', () => {
    expect(normalizeSeriesName('The Amazing Spider-Man')).toBe('amazing spiderman');
  });

  it('normalizes "Batman" to "batman"', () => {
    expect(normalizeSeriesName('Batman')).toBe('batman');
  });

  it('normalizes "X-Men, The" to "xmen"', () => {
    expect(normalizeSeriesName('X-Men, The')).toBe('xmen');
  });
});

describe('GPA Issue Number Normalization', () => {
  it('strips leading hashes and zeroes', () => {
    expect(normalizeIssueNumber('#1')).toBe('1');
    expect(normalizeIssueNumber('001')).toBe('1');
    expect(normalizeIssueNumber('#001')).toBe('1');
    expect(normalizeIssueNumber('12')).toBe('12');
  });

  it('preserves fractional issues', () => {
    expect(normalizeIssueNumber('1/2')).toBe('1/2');
    expect(normalizeIssueNumber('#0.5')).toBe('0.5');
  });
});
