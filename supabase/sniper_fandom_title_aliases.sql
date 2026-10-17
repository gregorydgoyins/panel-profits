-- Keep the existing indexed source expression; allow the leading article used by publisher records.
create or replace function public.sniper_stored_fandom(p_series text,p_issue text,p_year integer)
returns table(wiki text,page_title text,data jsonb) language sql stable security invoker set search_path='' as $$
 select f.wiki,f.page_title,f.data from quarantine.fandom_issue f
 where regexp_replace(lower(f.data->>'series'),'[^a-z0-9]','','g') in (
   regexp_replace(lower(p_series),'[^a-z0-9]','','g'),
   regexp_replace(regexp_replace(lower(p_series),'^the\s+',''),'[^a-z0-9]','','g'),
   'the' || regexp_replace(regexp_replace(lower(p_series),'^the\s+',''),'[^a-z0-9]','','g'))
 and f.data->>'issue'=p_issue
 and (f.data->>'cover_year'=p_year::text or f.data->>'pub_year'=p_year::text)
 limit 3
$$;
revoke all on function public.sniper_stored_fandom(text,text,integer) from public,anon,authenticated;
grant execute on function public.sniper_stored_fandom(text,text,integer) to service_role;
