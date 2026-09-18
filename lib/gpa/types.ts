export interface GpaTitleRecord {
  id?: string;
  gpa_title_id: number;
  title_name: string;
  publisher?: string | null;
  publication_year?: number | null;
  raw_metadata?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
}

export interface GpaIssueRecord {
  id?: string;
  gpa_title_id: number;
  gpa_issue_id: number;
  issue_number_raw: string;
  gpa_url: string;
  raw_metadata?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
}

export interface GpaEditionRecord {
  id?: string;
  gpa_issue_id: string;
  edition_name: string;
  variant_name?: string | null;
  is_regular_edition: boolean;
  raw_metadata?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
}

export interface GpaGradeSummaryRecord {
  id?: string;
  gpa_edition_id: string;
  grader: string;
  grade: string;
  designation: string;
  serial?: string | null;
  avg_2024?: number | null;
  avg_2025?: number | null;
  avg_12m?: number | null;
  avg_90d?: number | null;
  last_sale_price?: number | null;
  last_sale_date?: string | null;
  raw_payload?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
}

export interface GpaYearlyAggregateRecord {
  id?: string;
  gpa_grade_summary_id: string;
  year: number;
  count_sold: number;
  high_price?: number | null;
  low_price?: number | null;
  avg_price?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface GpaSalesObservationRecord {
  id?: string;
  observation_fingerprint: string;
  gpa_yearly_aggregate_id?: string | null;
  gpa_grade_summary_id?: string | null;
  gpa_edition_id?: string | null;
  gpa_issue_id?: string | null;
  gpa_title_id?: number | null;
  displayed_date_text: string;
  observed_year: number;
  observed_month?: number | null;
  observed_day?: number | null;
  observed_date?: string | null;
  date_precision: 'DAY' | 'MONTH' | 'YEAR';
  displayed_price_text: string;
  parsed_numeric_price: number;
  displayed_currency_symbol: string;
  normalized_currency?: string | null;
  certification_number?: string | null;
  grader: string;
  grade: string;
  designation: string;
  edition_variant?: string | null;
  venue?: string | null; // Stored as NULL
  evidence_redirect_path?: string | null;
  evidence_url_status: string;
  raw_payload?: Record<string, any> | null;
  created_at?: string;
}

export type GpaMatchStatus = 'AUTO_MATCHED' | 'PENDING_REVIEW' | 'CONFIRMED' | 'REJECTED';

export interface GpaComicMatchRecord {
  id?: string;
  gpa_issue_id: string;
  gpa_edition_id?: string | null;
  proposed_comic_id: string;
  match_method: string;
  match_confidence: number;
  match_status: GpaMatchStatus;
  reviewer_notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GpaBatchIngestionPayload {
  title: {
    gpa_title_id: number;
    title_name: string;
    publisher?: string | null;
    publication_year?: number | null;
    raw_metadata?: Record<string, any> | null;
  };
  issue: {
    gpa_issue_id: number;
    issue_number_raw: string;
    gpa_url: string;
    raw_metadata?: Record<string, any> | null;
  };
  editions: Array<{
    edition_name: string;
    variant_name?: string | null;
    is_regular_edition: boolean;
    grade_summaries: Array<{
      grader: string;
      grade: string;
      designation: string;
      serial?: string | null;
      avg_2024?: number | null;
      avg_2025?: number | null;
      avg_12m?: number | null;
      avg_90d?: number | null;
      last_sale_price?: number | null;
      last_sale_date?: string | null;
      yearly_aggregates?: Array<{
        year: number;
        count_sold: number;
        high_price?: number | null;
        low_price?: number | null;
        avg_price?: number | null;
        observations?: Array<{
          displayed_date_text: string;
          displayed_price_text: string;
          parsed_numeric_price: number;
          displayed_currency_symbol?: string;
          normalized_currency?: string | null;
          certification_number?: string | null;
          evidence_redirect_path?: string | null;
          raw_payload?: Record<string, any> | null;
        }>;
      }>;
    }>;
  }>;
}
