create extension if not exists pg_trgm;

create index if not exists ppcf_canonical_series_trgm_idx
  on public.ppcf_canonical_comics using gin (series_name gin_trgm_ops);

create index if not exists ppcf_canonical_issue_title_trgm_idx
  on public.ppcf_canonical_comics using gin (issue_title gin_trgm_ops);

create index if not exists ppcf_canonical_identity_status_idx
  on public.ppcf_canonical_comics (identity_status, ppcf_id);

create or replace view public.ppcf_fast_wiki_read_model
with (security_invoker = true)
as
select
  ppcf.ppcf_id,
  ppcf.gcd_issue_id,
  ppcf.gcd_series_id,
  ppcf.series_name,
  ppcf.issue_number,
  ppcf.publication_date,
  ppcf.barcode,
  ppcf.isbn,
  ppcf.issue_title,
  ppcf.variant_name,
  ppcf.edition_fingerprint,
  ppcf.identity_status,
  ppcf.source_presence,
  ppcf.cover_url,
  ppcf.cover_storage_path,
  ppcf.cover_source,
  ppcf.cover_verified_at,
  prices.observation_count,
  prices.source_count as pricing_source_count,
  prices.latest_observed_at,
  prices.min_amount,
  prices.max_amount,
  prices.currency_set,
  prices.grade_set
from public.ppcf_canonical_comics ppcf
left join public.ppcf_price_summaries prices on prices.ppcf_id = ppcf.ppcf_id;

revoke all on public.ppcf_fast_wiki_read_model from anon, authenticated;
