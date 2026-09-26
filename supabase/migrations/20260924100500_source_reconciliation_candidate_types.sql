alter table public.pp_source_identity_crosswalk
  alter column comicbase_candidate_rows type text[]
  using comicbase_candidate_rows::text[];
