create table if not exists public.pp_canonical_identity_reconciliation (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.pp_source_reconciliation_runs(id) on delete cascade,
  gcd_issue_id bigint not null,
  gcd_series_id bigint,
  series_name text,
  issue_number text,
  publication_date text,
  barcode text,
  isbn text,
  issue_title text,
  variant_name text,
  pp_row_count integer not null default 0,
  comicbase_row_count integer not null default 0,
  source_presence text not null check (source_presence in ('PP_AND_COMICBASE', 'PP_ONLY', 'COMICBASE_ONLY')),
  identity_status text not null default 'CANONICAL_GCD_IDENTITY' check (identity_status in ('CANONICAL_GCD_IDENTITY', 'NEEDS_REVIEW')),
  created_at timestamptz not null default now(),
  unique (run_id, gcd_issue_id)
);

create index if not exists pp_canonical_identity_run_idx
  on public.pp_canonical_identity_reconciliation (run_id);

create index if not exists pp_canonical_identity_source_idx
  on public.pp_canonical_identity_reconciliation (source_presence);

alter table public.pp_canonical_identity_reconciliation enable row level security;
revoke all on table public.pp_canonical_identity_reconciliation from anon, authenticated;
