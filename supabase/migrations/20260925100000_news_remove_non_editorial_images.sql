update public.pp_news_stories
set archived_at = coalesce(archived_at, now())
where image_url like '%google.com/s2/favicons%'
   or image_url = '/newsroom-default.svg';