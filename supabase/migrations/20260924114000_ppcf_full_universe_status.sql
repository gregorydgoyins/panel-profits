alter table public.ppcf_canonical_comics
  alter column gcd_issue_id drop not null;

alter table public.ppcf_canonical_comics
  add column if not exists identity_status text not null default 'GCD_CONFIRMED'
    check (identity_status in ('GCD_CONFIRMED', 'SOURCE_ONLY_PROVISIONAL', 'NEEDS_REVIEW')),
  add column if not exists source_presence text not null default 'GCD'
    check (source_presence in ('GCD', 'PANEL_PROFITS', 'COMICBASE', 'PANEL_PROFITS_AND_COMICBASE'));

create unique index if not exists ppcf_run_fingerprint_unique_idx
  on public.ppcf_canonical_comics (run_id, edition_fingerprint);

create index if not exists ppcf_identity_status_idx
  on public.ppcf_canonical_comics (identity_status);
