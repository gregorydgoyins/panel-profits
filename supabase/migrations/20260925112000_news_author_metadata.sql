alter table public.pp_news_stories
  add column if not exists author text;
