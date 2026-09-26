alter table public.recovered_index_constituents
  add column if not exists ppcf_id text references public.ppcf_canonical_comics(ppcf_id);

create index if not exists recovered_index_constituents_ppcf_idx
  on public.recovered_index_constituents(ppcf_id)
  where ppcf_id is not null;
