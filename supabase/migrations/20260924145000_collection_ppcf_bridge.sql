alter table public.collection_items
  add column if not exists ppcf_id text references public.ppcf_canonical_comics(ppcf_id);

create index if not exists collection_items_ppcf_id_idx
  on public.collection_items (ppcf_id)
  where ppcf_id is not null;

alter table public.watchlist_items
  add column if not exists ppcf_id text references public.ppcf_canonical_comics(ppcf_id);

create index if not exists watchlist_items_ppcf_id_idx
  on public.watchlist_items (ppcf_id)
  where ppcf_id is not null;
