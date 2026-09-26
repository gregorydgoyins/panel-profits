create or replace view public.pp_source_conflict_review_detail
with (security_invoker = true)
as
select
  conflicts.id as conflict_id,
  conflicts.run_id,
  conflicts.pp_source_product_id,
  conflicts.conflict_type,
  conflicts.resolution_status,
  conflicts.details,
  crosswalk.normalized_title,
  crosswalk.issue_number,
  crosswalk.publication_year,
  candidates.value as candidate_id,
  snapshots.gcd_series_id,
  snapshots.series_name,
  snapshots.issue_number as candidate_issue_number,
  snapshots.publication_date as candidate_publication_date,
  snapshots.barcode as candidate_barcode,
  snapshots.isbn as candidate_isbn,
  snapshots.issue_title as candidate_issue_title,
  snapshots.variant_name as candidate_variant_name
from public.pp_source_identity_conflicts as conflicts
join public.pp_source_identity_crosswalk as crosswalk
  on crosswalk.run_id = conflicts.run_id
 and crosswalk.pp_source_product_id = conflicts.pp_source_product_id
left join lateral jsonb_array_elements_text(
  coalesce(conflicts.details -> 'candidates', '[]'::jsonb)
) as candidates(value) on true
left join public.pp_gcd_issue_candidate_snapshots as snapshots
  on snapshots.run_id = conflicts.run_id
 and conflicts.conflict_type = 'GCD_AMBIGUITY'
 and snapshots.gcd_issue_id = case
   when candidates.value ~ '^[0-9]+$' then candidates.value::bigint
   else null
 end
where conflicts.resolution_status = 'UNRESOLVED';

revoke all on public.pp_source_conflict_review_detail from anon, authenticated;
