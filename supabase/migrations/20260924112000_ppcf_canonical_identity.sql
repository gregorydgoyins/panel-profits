create table if not exists public.ppcf_canonical_comics (
  record_number bigint generated always as identity,
  ppcf_id text generated always as ('PPCF-' || lpad(record_number::text, 10, '0')) stored primary key,
  run_id uuid not null references public.pp_source_reconciliation_runs(id),
  gcd_issue_id bigint not null,
  gcd_series_id bigint,
  series_name text,
  issue_number text,
  publication_date text,
  barcode text,
  isbn text,
  issue_title text,
  variant_name text,
  edition_fingerprint text not null,
  created_at timestamptz not null default now(),
  unique (run_id, gcd_issue_id)
);

create index if not exists ppcf_series_issue_idx
  on public.ppcf_canonical_comics (series_name, issue_number);

create index if not exists ppcf_barcode_idx
  on public.ppcf_canonical_comics (barcode)
  where barcode is not null and barcode <> '';

create table if not exists public.ppcf_source_links (
  id uuid primary key default gen_random_uuid(),
  ppcf_id text not null references public.ppcf_canonical_comics(ppcf_id) on delete cascade,
  source_system text not null check (source_system in ('GCD', 'PANEL_PROFITS', 'COMICBASE')),
  source_record_id text not null,
  source_role text not null default 'IDENTITY_REFERENCE' check (source_role in ('IDENTITY_REFERENCE', 'CORROBORATION', 'PROVENANCE')),
  created_at timestamptz not null default now(),
  unique (ppcf_id, source_system, source_record_id)
);

create index if not exists ppcf_source_links_record_idx
  on public.ppcf_source_links (source_system, source_record_id);

alter table public.ppcf_canonical_comics enable row level security;
alter table public.ppcf_source_links enable row level security;
revoke all on table public.ppcf_canonical_comics from anon, authenticated;
revoke all on table public.ppcf_source_links from anon, authenticated;
