alter table public.ppcf_canonical_comics
  add column if not exists cover_url text,
  add column if not exists cover_storage_path text,
  add column if not exists cover_source text,
  add column if not exists cover_width integer,
  add column if not exists cover_height integer,
  add column if not exists cover_verified_at timestamptz;

create or replace view public.ppcf_wiki_read_model
with (security_invoker = true)
as
select ppcf.ppcf_id, ppcf.gcd_issue_id, ppcf.gcd_series_id,
  ppcf.series_name, ppcf.issue_number, ppcf.publication_date,
  ppcf.barcode, ppcf.isbn, ppcf.issue_title, ppcf.variant_name,
  ppcf.edition_fingerprint, ppcf.identity_status, ppcf.source_presence,
  ppcf.cover_url, ppcf.cover_storage_path, ppcf.cover_source,
  ppcf.cover_width, ppcf.cover_height, ppcf.cover_verified_at,
  summary.observation_count, summary.source_count, summary.latest_observed_at,
  summary.min_amount, summary.max_amount, summary.currency_set, summary.grade_set
from public.ppcf_canonical_comics ppcf
left join public.ppcf_price_summaries summary on summary.ppcf_id = ppcf.ppcf_id;

create index if not exists ppcf_canonical_search_fields_idx
  on public.ppcf_canonical_comics using gin (
    to_tsvector('simple', coalesce(series_name, '') || ' ' || coalesce(issue_title, '') || ' ' || coalesce(variant_name, '') || ' ' || coalesce(ppcf_id, ''))
  );

revoke all on public.ppcf_wiki_read_model from anon, authenticated;
