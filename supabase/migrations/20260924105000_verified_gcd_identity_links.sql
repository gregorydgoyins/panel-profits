create table if not exists public.pp_verified_gcd_identity_links (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.pp_source_reconciliation_runs(id) on delete cascade,
  pp_source_product_id text not null,
  gcd_issue_id bigint not null,
  match_method text not null check (match_method in ('UNIQUE_BARCODE', 'UNIQUE_TITLE_ISSUE_YEAR', 'UNIQUE_TITLE_ISSUE')),
  comicbase_status text not null,
  created_at timestamptz not null default now(),
  unique (run_id, pp_source_product_id),
  unique (run_id, gcd_issue_id, pp_source_product_id)
);

create index if not exists pp_verified_gcd_links_run_idx
  on public.pp_verified_gcd_identity_links (run_id);

create index if not exists pp_verified_gcd_links_issue_idx
  on public.pp_verified_gcd_identity_links (gcd_issue_id);

alter table public.pp_verified_gcd_identity_links enable row level security;
revoke all on table public.pp_verified_gcd_identity_links from anon, authenticated;
