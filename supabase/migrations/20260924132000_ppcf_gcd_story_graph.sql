create table if not exists public.ppcf_gcd_stories (
  gcd_story_id bigint primary key,
  gcd_issue_id bigint,
  title text,
  feature text,
  sequence_number integer,
  page_count numeric,
  script text,
  pencils text,
  inks text,
  colors text,
  letters text,
  editing text,
  genre text,
  characters text,
  synopsis text,
  reprint_notes text,
  story_type_id bigint,
  job_number text,
  first_line text,
  raw_source jsonb not null default '{}'::jsonb
);

create table if not exists public.ppcf_gcd_story_credits (
  gcd_story_credit_id bigint primary key,
  gcd_story_id bigint,
  gcd_creator_id bigint,
  credit_type_id bigint,
  credit_name text,
  credited_as text,
  signed_as text,
  is_credited boolean,
  is_signed boolean,
  uncertain boolean,
  is_sourced boolean,
  raw_source jsonb not null default '{}'::jsonb
);

create index if not exists ppcf_gcd_stories_issue_idx on public.ppcf_gcd_stories (gcd_issue_id);
create index if not exists ppcf_gcd_stories_title_idx on public.ppcf_gcd_stories using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(feature, '') || ' ' || coalesce(characters, '')));
create index if not exists ppcf_gcd_story_credits_story_idx on public.ppcf_gcd_story_credits (gcd_story_id);
create index if not exists ppcf_gcd_story_credits_creator_idx on public.ppcf_gcd_story_credits (gcd_creator_id);

alter table public.ppcf_gcd_stories enable row level security;
alter table public.ppcf_gcd_story_credits enable row level security;

create policy "ppcf_gcd_stories_read" on public.ppcf_gcd_stories for select using (true);
create policy "ppcf_gcd_story_credits_read" on public.ppcf_gcd_story_credits for select using (true);

revoke insert, update, delete on table public.ppcf_gcd_stories from anon, authenticated;
revoke insert, update, delete on table public.ppcf_gcd_story_credits from anon, authenticated;
