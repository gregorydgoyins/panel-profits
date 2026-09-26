create table if not exists public.pp_source_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  pp_source_name text not null,
  gcd_source_name text not null,
  comicbase_source_name text not null,
  status text not null default 'STAGED' check (status in ('STAGED', 'REVIEW', 'APPROVED', 'REJECTED')),
  source_counts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

create table if not exists public.pp_source_identity_crosswalk (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.pp_source_reconciliation_runs(id) on delete cascade,
  pp_source_product_id text not null,
  normalized_title text,
  issue_number text,
  publication_year integer,
  gcd_status text not null check (gcd_status in ('UNIQUE_BARCODE', 'UNIQUE_TITLE_ISSUE_YEAR', 'UNIQUE_TITLE_ISSUE', 'AMBIGUOUS_BARCODE', 'AMBIGUOUS_TITLE_ISSUE_YEAR', 'AMBIGUOUS_TITLE_ISSUE', 'UNMATCHED')),
  gcd_candidate_ids bigint[] not null default '{}'::bigint[],
  comicbase_status text not null check (comicbase_status in ('UNIQUE_BARCODE', 'UNIQUE_TITLE_ISSUE_YEAR', 'UNIQUE_TITLE_ISSUE', 'AMBIGUOUS_BARCODE', 'AMBIGUOUS_TITLE_ISSUE_YEAR', 'AMBIGUOUS_TITLE_ISSUE', 'UNMATCHED')),
  comicbase_candidate_rows bigint[] not null default '{}'::bigint[],
  created_at timestamptz not null default now(),
  unique (run_id, pp_source_product_id)
);

create index if not exists pp_source_crosswalk_run_idx
  on public.pp_source_identity_crosswalk (run_id);

create index if not exists pp_source_crosswalk_gcd_status_idx
  on public.pp_source_identity_crosswalk (run_id, gcd_status);

create index if not exists pp_source_crosswalk_comicbase_status_idx
  on public.pp_source_identity_crosswalk (run_id, comicbase_status);

create table if not exists public.pp_source_identity_conflicts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.pp_source_reconciliation_runs(id) on delete cascade,
  pp_source_product_id text not null,
  conflict_type text not null check (conflict_type in ('GCD_AMBIGUITY', 'COMICBASE_AMBIGUITY', 'BARCODE_DISAGREEMENT', 'TITLE_DISAGREEMENT', 'DATE_DISAGREEMENT', 'VARIANT_DISAGREEMENT', 'MALFORMED_SOURCE_ROW')),
  details jsonb not null default '{}'::jsonb,
  resolution_status text not null default 'UNRESOLVED' check (resolution_status in ('UNRESOLVED', 'ACCEPTED', 'REJECTED', 'NEEDS_RESEARCH')),
  resolution_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

create index if not exists pp_source_conflicts_review_idx
  on public.pp_source_identity_conflicts (run_id, resolution_status);

alter table public.pp_source_reconciliation_runs enable row level security;
alter table public.pp_source_identity_crosswalk enable row level security;
alter table public.pp_source_identity_conflicts enable row level security;

revoke all on table public.pp_source_reconciliation_runs from anon, authenticated;
revoke all on table public.pp_source_identity_crosswalk from anon, authenticated;
revoke all on table public.pp_source_identity_conflicts from anon, authenticated;
