create table if not exists public.pp_gcd_issue_candidate_snapshots (
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
  created_at timestamptz not null default now(),
  unique (run_id, gcd_issue_id)
);

create index if not exists pp_gcd_candidate_snapshots_run_idx
  on public.pp_gcd_issue_candidate_snapshots (run_id);

create index if not exists pp_gcd_candidate_snapshots_series_idx
  on public.pp_gcd_issue_candidate_snapshots (gcd_series_id);

alter table public.pp_gcd_issue_candidate_snapshots enable row level security;
revoke all on table public.pp_gcd_issue_candidate_snapshots from anon, authenticated;
