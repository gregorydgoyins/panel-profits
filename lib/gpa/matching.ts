import { SupabaseClient } from '@supabase/supabase-js';
import { GpaMatchStatus } from './types';

export interface ComicMatchCandidate {
  comic_id: string;
  series: string;
  issue_number: string;
  publication_year: number | null;
  match_method: string;
  match_confidence: number;
  match_status: GpaMatchStatus;
}

export function normalizeSeriesName(name: string): string {
  if (!name) return '';
  let normalized = name.trim();
  
  // Handle "Amazing Spider-Man, The" -> "The Amazing Spider-Man" or "Amazing Spider-Man"
  if (normalized.includes(',')) {
    const parts = normalized.split(',').map((p) => p.trim());
    if (parts.length === 2 && ['the', 'a', 'an'].includes(parts[1].toLowerCase())) {
      normalized = `${parts[0]}`;
    }
  }

  return normalized
    .toLowerCase()
    .replace(/^the\s+/i, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeIssueNumber(issue: string): string {
  if (!issue) return '';
  const cleaned = issue.trim().replace(/^#\s*/, '');
  // If numeric with leading zeroes e.g. "001" -> "1"
  if (/^\d+$/.test(cleaned)) {
    return String(parseInt(cleaned, 10));
  }
  return cleaned.toLowerCase();
}

export async function findComicMatches(
  supabase: SupabaseClient,
  params: {
    gpa_title_name: string;
    gpa_issue_number: string;
    gpa_publication_year?: number | null;
  }
): Promise<ComicMatchCandidate | null> {
  const normTitle = normalizeSeriesName(params.gpa_title_name);
  const normIssue = normalizeIssueNumber(params.gpa_issue_number);

  if (!normTitle || !normIssue) {
    return null;
  }

  // Search by series/title AND issue_number
  let query = supabase
    .from('comics')
    .select('id, series, title, issue_number, publication_year, publisher')
    .eq('issue_number', normIssue);

  // Extract core keywords from title (e.g. "Amazing Spider-Man" -> "Spider-Man" or "Amazing")
  const words = normTitle.split(/\s+/).filter((w) => w.length > 2);
  if (words.length > 0) {
    const primaryWord = words[words.length - 1]; // e.g. "spiderman" or "batman"
    query = query.or(`series.ilike.%${primaryWord}%,title.ilike.%${primaryWord}%`);
  }

  const { data: candidates, error } = await query.limit(50);

  if (error || !candidates || candidates.length === 0) {
    return null;
  }

  let bestMatch: ComicMatchCandidate | null = null;

  for (const c of candidates) {
    const candNormSeries = normalizeSeriesName(c.series || c.title || '');
    const candNormIssue = normalizeIssueNumber(c.issue_number || '');

    if (candNormIssue !== normIssue) {
      continue;
    }

    if (candNormSeries === normTitle) {
      // Exact series + issue + publication_year match
      if (params.gpa_publication_year && c.publication_year && params.gpa_publication_year === c.publication_year) {
        return {
          comic_id: c.id,
          series: c.series,
          issue_number: c.issue_number,
          publication_year: c.publication_year,
          match_method: 'EXACT_SERIES_ISSUE_YEAR',
          match_confidence: 1.0,
          match_status: 'PENDING_REVIEW', // Staged for human decision
        };
      }

      // Exact series + issue without matching year
      if (!bestMatch || bestMatch.match_confidence < 0.95) {
        bestMatch = {
          comic_id: c.id,
          series: c.series,
          issue_number: c.issue_number,
          publication_year: c.publication_year,
          match_method: 'NORMALIZED_SERIES_ISSUE',
          match_confidence: 0.95,
          match_status: 'PENDING_REVIEW',
        };
      }
    } else if (candNormSeries.includes(normTitle) || normTitle.includes(candNormSeries)) {
      // Partial match
      if (!bestMatch || bestMatch.match_confidence < 0.75) {
        bestMatch = {
          comic_id: c.id,
          series: c.series,
          issue_number: c.issue_number,
          publication_year: c.publication_year,
          match_method: 'FUZZY_SERIES_ISSUE',
          match_confidence: 0.75,
          match_status: 'PENDING_REVIEW',
        };
      }
    }
  }

  return bestMatch;
}
