create table if not exists public.ppcf_gcd_series (
  gcd_series_id bigint primary key,
  name text,
  sort_name text,
  format text,
  year_began integer,
  year_ended integer,
  publisher_id bigint,
  country_id bigint,
  language_id bigint,
  issue_count integer,
  publication_dates text,
  publishing_format text,
  dimensions text,
  binding text,
  color text,
  is_comics_publication boolean,
  raw_source jsonb not null default '{}'::jsonb
);

create table if not exists public.ppcf_gcd_creators (
  gcd_creator_id bigint primary key,
  official_name text,
  sort_name text,
  whos_who text,
  birth_city text,
  death_city text,
  biography text,
  disambiguation text,
  birth_country_id bigint,
  birth_date_id bigint,
  death_country_id bigint,
  death_date_id bigint,
  raw_source jsonb not null default '{}'::jsonb
);

create table if not exists public.ppcf_gcd_publishers (
  gcd_publisher_id bigint primary key,
  name text,
  url text,
  country_id bigint,
  year_began integer,
  year_ended integer,
  issue_count integer,
  raw_source jsonb not null default '{}'::jsonb
);

create index if not exists ppcf_gcd_series_name_idx on public.ppcf_gcd_series using gin (to_tsvector('simple', coalesce(name, '')));
create index if not exists ppcf_gcd_creator_name_idx on public.ppcf_gcd_creators using gin (to_tsvector('simple', coalesce(official_name, '')));
create index if not exists ppcf_gcd_publisher_name_idx on public.ppcf_gcd_publishers using gin (to_tsvector('simple', coalesce(name, '')));

alter table public.ppcf_gcd_series enable row level security;
alter table public.ppcf_gcd_creators enable row level security;
alter table public.ppcf_gcd_publishers enable row level security;

create policy "ppcf_gcd_series_read" on public.ppcf_gcd_series for select using (true);
create policy "ppcf_gcd_creators_read" on public.ppcf_gcd_creators for select using (true);
create policy "ppcf_gcd_publishers_read" on public.ppcf_gcd_publishers for select using (true);

revoke insert, update, delete on table public.ppcf_gcd_series from anon, authenticated;
revoke insert, update, delete on table public.ppcf_gcd_creators from anon, authenticated;
revoke insert, update, delete on table public.ppcf_gcd_publishers from anon, authenticated;
