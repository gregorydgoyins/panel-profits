create table if not exists public.ppcf_story_links (
  id uuid primary key default gen_random_uuid(),
  ppcf_id text not null references public.ppcf_canonical_comics(ppcf_id) on delete cascade,
  gcd_story_id bigint not null,
  relationship text not null default 'STORY_IN_ISSUE',
  created_at timestamptz not null default now(),
  unique (ppcf_id, gcd_story_id, relationship)
);

create table if not exists public.ppcf_creator_links (
  id uuid primary key default gen_random_uuid(),
  ppcf_id text not null references public.ppcf_canonical_comics(ppcf_id) on delete cascade,
  gcd_story_id bigint,
  gcd_creator_id bigint,
  credit_type_id bigint,
  credit_name text,
  credited_as text,
  signed_as text,
  relationship text not null default 'STORY_CREDIT',
  created_at timestamptz not null default now(),
  unique (ppcf_id, gcd_story_id, gcd_creator_id, credit_type_id, credit_name)
);

create index if not exists ppcf_story_links_ppcf_idx on public.ppcf_story_links (ppcf_id);
create index if not exists ppcf_story_links_story_idx on public.ppcf_story_links (gcd_story_id);
create index if not exists ppcf_creator_links_ppcf_idx on public.ppcf_creator_links (ppcf_id);
create index if not exists ppcf_creator_links_creator_idx on public.ppcf_creator_links (gcd_creator_id);

alter table public.ppcf_story_links enable row level security;
alter table public.ppcf_creator_links enable row level security;
create policy "ppcf_story_links_read" on public.ppcf_story_links for select using (true);
create policy "ppcf_creator_links_read" on public.ppcf_creator_links for select using (true);
revoke insert, update, delete on table public.ppcf_story_links from anon, authenticated;
revoke insert, update, delete on table public.ppcf_creator_links from anon, authenticated;
