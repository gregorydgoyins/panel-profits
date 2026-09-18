'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface GpaMatchViewItem {
  id: string;
  match_method: string;
  match_confidence: number;
  match_status: 'AUTO_MATCHED' | 'PENDING_REVIEW' | 'CONFIRMED' | 'REJECTED';
  reviewer_notes: string | null;
  created_at: string;
  gpa_issue: {
    id: string;
    gpa_title_id: number;
    gpa_issue_id: number;
    issue_number_raw: string;
    gpa_url: string;
    gpa_titles?: {
      title_name: string;
      publisher: string | null;
      publication_year: number | null;
    };
  };
  comic: {
    id: string;
    series: string;
    issue_number: string;
    publication_year: number | null;
    publisher: string | null;
  };
}

export async function getGpaMatches(statusFilter?: string): Promise<GpaMatchViewItem[]> {
  const supabase = await createServerClient();

  let query = supabase
    .from('gpa_comic_matches')
    .select(`
      id,
      match_method,
      match_confidence,
      match_status,
      reviewer_notes,
      created_at,
      gpa_issue:gpa_issues(
        id,
        gpa_title_id,
        gpa_issue_id,
        issue_number_raw,
        gpa_url,
        gpa_titles(
          title_name,
          publisher,
          publication_year
        )
      ),
      comic:comics(
        id,
        series,
        issue_number,
        publication_year,
        publisher
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (statusFilter && statusFilter !== 'ALL') {
    query = query.eq('match_status', statusFilter);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching GPA matches:', error);
    return [];
  }

  return (data as any[]) || [];
}

export async function updateGpaMatchStatus(
  matchId: string,
  status: 'CONFIRMED' | 'REJECTED' | 'PENDING_REVIEW',
  notes?: string
) {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('gpa_comic_matches')
    .update({
      match_status: status,
      reviewer_notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', matchId);

  if (error) {
    throw new Error(`Failed to update match status: ${error.message}`);
  }

  revalidatePath('/admin/gpa-matches');
  return { success: true };
}
