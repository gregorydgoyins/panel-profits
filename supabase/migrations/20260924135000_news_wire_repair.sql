create extension if not exists "pgcrypto";

create table if not exists public.pp_news_stories (
  id uuid primary key default gen_random_uuid(),
  story_key text not null unique,
  source text not null,
  source_url text not null,
  category text not null default 'international',
  headline text not null,
  summary text,
  url text not null,
  image_url text,
  published_at timestamptz,
  ingested_at timestamptz not null default now(),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists pp_news_stories_active_idx on public.pp_news_stories (published_at desc, ingested_at desc) where archived_at is null;
create index if not exists pp_news_stories_archive_idx on public.pp_news_stories (archived_at desc);

alter table public.pp_news_stories enable row level security;
drop policy if exists "pp_news_stories_read" on public.pp_news_stories;
create policy "pp_news_stories_read" on public.pp_news_stories for select using (true);

create or replace function public.archive_old_news_stories()
returns void language sql security definer set search_path = public as $$
  update public.pp_news_stories set archived_at = coalesce(archived_at, now())
  where archived_at is null and coalesce(published_at, ingested_at) < now() - interval '3 days';
$$;
revoke all on function public.archive_old_news_stories() from public;
