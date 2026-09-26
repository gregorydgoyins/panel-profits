update public.pp_news_stories
set ingested_at = now() - interval '1 day'
where archived_at is null;