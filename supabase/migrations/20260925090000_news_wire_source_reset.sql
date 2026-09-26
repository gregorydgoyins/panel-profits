update public.pp_news_stories
set archived_at = coalesce(archived_at, now())
where archived_at is null;