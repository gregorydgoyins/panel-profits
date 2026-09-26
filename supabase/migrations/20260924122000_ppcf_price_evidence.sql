create table if not exists public.ppcf_price_observations (
  id uuid primary key default gen_random_uuid(),
  ppcf_id text not null references public.ppcf_canonical_comics(ppcf_id) on delete cascade,
  source_system text not null check (source_system in ('PANEL_PROFITS', 'COMICBASE')),
  source_record_id text not null,
  price_field text not null,
  grade_label text,
  amount numeric,
  currency text,
  observed_at date,
  source_locator text,
  dedupe_key text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists ppcf_price_observations_ppcf_idx
  on public.ppcf_price_observations (ppcf_id, grade_label, observed_at desc);

create index if not exists ppcf_price_observations_source_idx
  on public.ppcf_price_observations (source_system, source_record_id);

create table if not exists public.ppcf_price_summaries (
  ppcf_id text primary key references public.ppcf_canonical_comics(ppcf_id) on delete cascade,
  observation_count integer not null default 0,
  source_count integer not null default 0,
  latest_observed_at date,
  min_amount numeric,
  max_amount numeric,
  currency_set text[] not null default '{}',
  grade_set text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.ppcf_price_observations enable row level security;
alter table public.ppcf_price_summaries enable row level security;

create policy "ppcf_price_observations_read"
  on public.ppcf_price_observations for select
  using (true);

create policy "ppcf_price_summaries_read"
  on public.ppcf_price_summaries for select
  using (true);

revoke insert, update, delete on table public.ppcf_price_observations from anon, authenticated;
revoke insert, update, delete on table public.ppcf_price_summaries from anon, authenticated;
