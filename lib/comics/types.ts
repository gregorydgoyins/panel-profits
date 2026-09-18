export interface ComicRecord {
  id: string;
  series: string;
  title: string;
  issue_number: string;
  volume: string | null;
  printing: string | null;
  direct_or_variant: string | null;
  cover_variant: string | null;
  publisher: string | null;
  publication_date: string | null;
  publication_year: number | null;
  upc: string | null;
  alt_upc: string | null;

  pp_source_id: string | null;
  comicbase_source_id: string | null;
  gcd_source_id: string | null;

  pp_grade_9_8_price: number | null;
  comicbase_price: number | null;
  baseline_grade_9_8_value: number | null;
  baseline_grade_9_8_sources: string | null;
  baseline_grade_9_8_observation_count: number | null;

  panel_profits_data: Record<string, any> | null;
  comicbase_data: Record<string, any> | null;
  gcd_data: Record<string, any> | null;

  search_document: string | null;
  created_at: string;
  updated_at: string;

  cover_url: string | null;
  cover_storage_path: string | null;
  cover_source: string | null;
  cover_original_url: string | null;
  cover_retrieval_url: string | null;
  cover_width: number | null;
  cover_height: number | null;
  cover_sha256: string | null;
  cover_verified_at: string | null;
}

export interface ResolvedPricing {
  panelProfitsPrice98: number | null;
  panelProfitsPriceSource: string | null;
  comicbasePrice: number | null;
  baselinePrice98: number | null;
  baselineSource: string | null;
  observationCount: number | null;
}

export interface ComicSearchParams {
  q?: string;
  issue?: string;
  publisher?: string;
  year?: string;
  variant?: string;
  cursor?: string;
  prevCursor?: string;
  limit?: number;
}

export interface ComicQueryResult {
  comics: ComicRecord[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
  totalEstimatedCount?: number;
}
