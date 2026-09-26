create table if not exists public.ppcf_wiki_pages (
  id uuid primary key default gen_random_uuid(),
  ppcf_id text not null unique references public.ppcf_canonical_comics(ppcf_id) on delete cascade,
  slug text not null unique,
  display_title text not null,
  page_type text not null default 'COMIC_ISSUE' check (page_type in ('COMIC_ISSUE', 'SERIES', 'CREATOR', 'PUBLISHER', 'CHARACTER', 'STORY', 'LOCATION')),
  summary text,
  page_status text not null default 'READY' check (page_status in ('READY', 'NEEDS_REVIEW', 'DRAFT')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ppcf_wiki_pages_title_idx
  on public.ppcf_wiki_pages using gin (to_tsvector('simple', display_title));

create table if not exists public.ppcf_wiki_entity_links (
  id uuid primary key default gen_random_uuid(),
  ppcf_id text not null references public.ppcf_canonical_comics(ppcf_id) on delete cascade,
  entity_type text not null check (entity_type in ('SERIES', 'CREATOR', 'PUBLISHER', 'CHARACTER', 'STORY', 'LOCATION', 'COUNTRY', 'LANGUAGE')),
  source_system text not null check (source_system in ('GCD', 'PANEL_PROFITS', 'COMICBASE')),
  source_entity_id text not null,
  entity_label text not null,
  relationship text not null,
  confidence text not null default 'VERIFIED' check (confidence in ('VERIFIED', 'CORROBORATED', 'NEEDS_REVIEW')),
  created_at timestamptz not null default now(),
  unique (ppcf_id, entity_type, source_system, source_entity_id, relationship)
);

create index if not exists ppcf_wiki_entity_links_entity_idx
  on public.ppcf_wiki_entity_links (entity_type, source_entity_id);

create index if not exists ppcf_wiki_entity_links_ppcf_idx
  on public.ppcf_wiki_entity_links (ppcf_id);

alter table public.ppcf_wiki_pages enable row level security;
alter table public.ppcf_wiki_entity_links enable row level security;

create policy "ppcf_wiki_pages_read"
  on public.ppcf_wiki_pages for select
  using (true);

create policy "ppcf_wiki_entity_links_read"
  on public.ppcf_wiki_entity_links for select
  using (true);

revoke insert, update, delete on table public.ppcf_wiki_pages from anon, authenticated;
revoke insert, update, delete on table public.ppcf_wiki_entity_links from anon, authenticated;
