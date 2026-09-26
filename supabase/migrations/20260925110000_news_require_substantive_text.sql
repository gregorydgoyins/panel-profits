update public.pp_news_stories
set archived_at = coalesce(archived_at, now())
where archived_at is null
  and (summary is null or length(trim(summary)) < 280);

update public.pp_news_stories
set ingested_at = now() - interval '1 day'
where archived_at is null;
