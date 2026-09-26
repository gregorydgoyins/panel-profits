create or replace view public.pp_source_verified_gcd_candidates
with (security_invoker = true)
as
select
  crosswalk.id,
  crosswalk.run_id,
  crosswalk.pp_source_product_id,
  crosswalk.normalized_title,
  crosswalk.issue_number,
  crosswalk.publication_year,
  crosswalk.gcd_status,
  crosswalk.gcd_candidate_ids,
  crosswalk.comicbase_status,
  crosswalk.comicbase_candidate_rows
from public.pp_source_identity_crosswalk as crosswalk
where crosswalk.gcd_status in ('UNIQUE_BARCODE', 'UNIQUE_TITLE_ISSUE_YEAR', 'UNIQUE_TITLE_ISSUE');

create or replace view public.pp_source_unresolved_conflicts
with (security_invoker = true)
as
select
  conflicts.id,
  conflicts.run_id,
  conflicts.pp_source_product_id,
  conflicts.conflict_type,
  conflicts.details,
  conflicts.resolution_status,
  conflicts.resolution_notes,
  conflicts.created_at
from public.pp_source_identity_conflicts as conflicts
where conflicts.resolution_status = 'UNRESOLVED';

revoke all on public.pp_source_verified_gcd_candidates from anon, authenticated;
revoke all on public.pp_source_unresolved_conflicts from anon, authenticated;
