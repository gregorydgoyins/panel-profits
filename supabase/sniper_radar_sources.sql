-- Exact comic evidence is checked before venue balancing or any trading calculations.
create or replace function public.sniper_radar_listings(p_limit integer default 1500)
returns table(payload jsonb,price_usd numeric,bid_count integer,end_time timestamptz,last_seen timestamptz,label jsonb,census jsonb,census_at timestamptz)
language sql stable security invoker set search_path=public,pg_temp set jit=off as $$
 with base as materialized (
   select l.*,coalesce(nullif(l.label->>'title',''),l.series) as research_series,
     coalesce(nullif(l.label->>'issueNumber',''),l.issue) as research_issue,
     case when l.label->>'issueDate' ~ '/[0-9]{4}$' then right(l.label->>'issueDate',4)::integer
       when l.label->>'issueDate' ~ '/[0-9]{2}$' then case when right(l.label->>'issueDate',2)::integer>30 then 1900 else 2000 end+right(l.label->>'issueDate',2)::integer
       else coalesce(l.pub_year,substring(l.title from '\m((?:19|20)[0-9]{2})\M')::integer) end as research_year,
     case when nullif(l.label->>'title','') is not null then l.label->>'edition' else l.edition end as research_edition,
     case when l.venue like 'ebay%' then 'ebay' else l.venue end as auction_site
   from public.sniper_listings l where l.research_comic_id is not null and l.status='live' and l.last_seen>=now()-interval '24 hours'
     and (l.end_time is null or l.end_time>now())
     and coalesce(case when l.label->>'grade' ~ '^[0-9]+(\.[0-9]+)?$' then (l.label->>'grade')::numeric end,l.grade)>=8.5
     and l.grader in ('CGC','CBCS','PSA','PGX','EGS')
 ), matched as materialized (
   select l.*,c.id as comic_id,c.publication_year as matched_year,c.panel_profits_data,c.gcd_data,c.comicbase_data,
     coalesce(c.panel_profits_data->>'PP Source ID',c.panel_profits_data->>'PriceCharting ID',c.pp_source_id) as source_id
   from base l join public.comics c on c.id=l.research_comic_id
   where c.issue_number=l.research_issue
     and (l.research_year is null or c.publication_year=l.research_year or (c.publication_year=l.research_year-1 and l.label->>'issueDate' ~ '^[123]/'))
     and (regexp_replace(lower(coalesce(c.cover_variant,'')),'[^a-z0-9]','','g')=regexp_replace(lower(coalesce(l.research_edition,'')),'[^a-z0-9]','','g')
       or (l.research_edition ~* '^(variant|variant edition)$' and length(coalesce(c.cover_variant,''))>=5
         and position(regexp_replace(lower(c.cover_variant),'[^a-z0-9]','','g') in regexp_replace(lower(l.title),'[^a-z0-9]','','g'))>0))
 ), valued as materialized (
   select m.*,h.pp_price_raw as intrinsic_value,h.snapshot_date as value_date,
     case when coalesce(m.gcd_data->>'cover_price','') ~ '^\$?[0-9]+(\.[0-9]+)? USD$'
       then regexp_replace(m.gcd_data->>'cover_price','[^0-9.]','','g')::numeric
       when m.comicbase_data->>'Cover Price Currency'='USD' and m.comicbase_data->>'Cover Price' ~ '^\$?[0-9]+(\.[0-9]+)?$'
       then regexp_replace(m.comicbase_data->>'Cover Price','[^0-9.]','','g')::numeric end as original_cover_price
   from matched m join lateral (
     select h.pp_price_raw,h.snapshot_date from public.pp_price_history h where h.pp_id=m.source_id
       and h.pp_price_raw>0 and h.snapshot_date is not null order by h.snapshot_date desc,h.id desc limit 1
   ) h on h.pp_price_raw>=17
 ), eligible as materialized (
   select v.*,row_number() over(partition by auction_site order by end_time asc nulls last,item_id) as site_rank
   from valued v where intrinsic_value>=17 and original_cover_price is not null and intrinsic_value>original_cover_price
 ), quota as materialized (
   select least(min(n),greatest(1,least(p_limit,2000))/count(*)) as per_site from (select auction_site,count(*) n from eligible group by auction_site) counts
 )
 select e.payload || jsonb_build_object('year',e.matched_year,'eligibility',jsonb_build_object('intrinsicValue',e.intrinsic_value,'coverPrice',e.original_cover_price,
   'observedAt',e.value_date,'sourceId',e.source_id,'comicId',e.comic_id,'basis','Stored raw guide; grading premium excluded')),
   e.price_usd,e.bid_count,e.end_time,e.last_seen,e.label,e.census,e.census_at
 from eligible e cross join quota q where e.site_rank<=q.per_site order by e.site_rank,e.auction_site;
$$;
revoke all on function public.sniper_radar_listings(integer) from public,anon,authenticated;
grant execute on function public.sniper_radar_listings(integer) to service_role;
