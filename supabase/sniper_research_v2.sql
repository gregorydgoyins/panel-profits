-- Supporting exact-match index: the old cover reads could only use a lower(series) index.
create index concurrently if not exists rail_books_series_issue_year_idx on public.rail_books(series,issue_number,year);

-- Rev 2: one read transaction against the original evidence tables, never a rendered-copy store.
create or replace function public.sniper_lot_evidence_v2(p_item_id text)
returns jsonb language plpgsql stable security invoker set search_path = public, pg_temp as $$
declare
  lot record;
  s text; iss text; yr integer; date_part text; ed text; story_key text; sale_key text;
  editions jsonb; book_rows jsonb; observations jsonb; story jsonb; authored jsonb;
  census_rows jsonb := '[]'; gc_rows jsonb := '[]'; videos jsonb; sales jsonb; history jsonb; guide_snapshots jsonb;
  q jsonb; label_name text; authored_key text; normalized_title text; resolved_grader text; gr numeric;
  timer timestamptz := clock_timestamp(); timings jsonb := '{}';
begin
  select item_id,title,series,issue,pub_year,edition,grade,grader,label,publisher,research_comic_id into lot from public.sniper_listings where item_id=p_item_id;
  if not found then return null; end if;
  timings := timings || jsonb_build_object('listing',round((extract(epoch from clock_timestamp()-timer)*1000)::numeric,1)); timer := clock_timestamp();
  s := coalesce(nullif(lot.label->>'title',''),lot.series);
  s := btrim(regexp_replace(s,'^(Marvel Comics|Marvel|DC Comics|DC|Image Comics|Image|Dark Horse Comics|Dark Horse|Dynamite Entertainment|Dynamite)\s+(?!Presents\b)','','i'));
  -- A verified comic pointer takes precedence over seller-prefix cleanup. Marvel Premiere is a title.
  if lot.research_comic_id is not null then
    select c.series,coalesce(lot.publisher,c.publisher) into s,lot.publisher from public.comics c where c.id=lot.research_comic_id;
  end if;
  if s ~* 'mace windu' and s ~* 'jedi of the republic' then s := 'Star Wars: Mace Windu'; end if;
  resolved_grader := coalesce(nullif(lot.label->>'grader',''),lot.grader);
  gr := case when lot.label->>'grade' ~ '^[0-9]+(\.[0-9]+)?$' then (lot.label->>'grade')::numeric else lot.grade end;
  iss := coalesce(nullif(lot.label->>'issueNumber',''),lot.issue);
  ed := case when nullif(lot.label->>'title','') is not null then lot.label->>'edition' else lot.edition end;
  date_part := substring(lot.label->>'issueDate' from '/([0-9]{2}|[0-9]{4})$');
  yr := case when date_part is null then lot.pub_year when length(date_part)=4 then date_part::integer
    when date_part::integer>30 then 1900+date_part::integer else 2000+date_part::integer end;
  if yr is null and lot.research_comic_id is not null then select publication_year into yr from public.comics where id=lot.research_comic_id; end if;
  select coalesce(jsonb_agg(to_jsonb(e)),'[]') into editions from (
    select ppcf_id,series_name,variant_name,publication_date from public.ppcf_canonical_comics
    where series_name in (s,lot.series,'The ' || s,'The ' || lot.series) and issue_number=iss order by ppcf_id limit 100
  ) e;
  timings := timings || jsonb_build_object('editions',round((extract(epoch from clock_timestamp()-timer)*1000)::numeric,1)); timer := clock_timestamp();
  if yr is null then
    select case when count(distinct substring(e->>'publication_date' from '(18[0-9]{2}|19[0-9]{2}|20[0-9]{2})'))=1
      and count(*)=count(substring(e->>'publication_date' from '(18[0-9]{2}|19[0-9]{2}|20[0-9]{2})'))
      then min(substring(e->>'publication_date' from '(18[0-9]{2}|19[0-9]{2}|20[0-9]{2})'))::integer end into yr
      from jsonb_array_elements(editions) e;
  end if;
  select coalesce(jsonb_agg(to_jsonb(c)),'[]') into book_rows from (
    select id,series,issue_number,publication_year,cover_variant,direct_or_variant,printing,pp_grade_9_8_price,panel_profits_data,gcd_data->>'cover_price' as original_cover_price
    from public.comics where (lot.research_comic_id is not null and id=lot.research_comic_id) or (lot.research_comic_id is null and series in(s,lot.series) and issue_number=iss and (publication_year=yr or (publication_year=yr-1 and lot.label->>'issueDate' ~ '^[123]/'))) limit 50
  ) c;
  timings := timings || jsonb_build_object('comics',round((extract(epoch from clock_timestamp()-timer)*1000)::numeric,1)); timer := clock_timestamp();
  -- Follow existing source-ID crosswalks when a provider encodes the cover in its series title.
  select editions || coalesce(jsonb_agg(jsonb_build_object('ppcf_id',e.ppcf_id,'series_name',e.series_name,'variant_name',e.variant_name,'publication_date',e.publication_date)),'[]') into editions
    from public.ppcf_canonical_comics e where e.ppcf_id in(
      select l.ppcf_id from public.ppcf_source_links l where l.source_system='PANEL_PROFITS' and l.source_record_id in(
        select coalesce(c->'panel_profits_data'->>'PP Source ID',c->'panel_profits_data'->>'PriceCharting ID') from jsonb_array_elements(book_rows) c))
    and not exists(select 1 from jsonb_array_elements(editions) existing where existing->>'ppcf_id'=e.ppcf_id);
  select coalesce(jsonb_agg(to_jsonb(p) order by p.observed_at desc,p.id),'[]') into observations
    from public.ppcf_price_observations p where p.ppcf_id in(select e->>'ppcf_id' from jsonb_array_elements(editions) e);
  select coalesce(jsonb_agg(to_jsonb(h) order by h.snapshot_date),'[]') into guide_snapshots
    from public.pp_price_history h where h.snapshot_date is not null and h.pp_id in(
      select coalesce(c->'panel_profits_data'->>'PP Source ID',c->'panel_profits_data'->>'PriceCharting ID') from jsonb_array_elements(book_rows) c);
  timings := timings || jsonb_build_object('observations',round((extract(epoch from clock_timestamp()-timer)*1000)::numeric,1)); timer := clock_timestamp();
  story_key := btrim(regexp_replace(replace(regexp_replace(regexp_replace(lower(s),'\(\s*[0-9]{4}[^)]*\)','','g'),'^the\s+',''),'&',' and '),'[^a-z0-9]+',' ','g')) || '|' || lower(iss) || '|' || coalesce(yr::text,'');
  select jsonb_build_object('summary',summary,'source',source,'source_url',source_url,'license',license) into story
    from public.issue_story_summaries where comic_key=story_key;
  -- Existing publisher-page crosswalks also connect cover-specific source titles to the issue plot.
  if story is null or coalesce(story->>'summary','') ~ '\"text\"\s*:\s*\"\|' then
    select jsonb_build_object('summary',summary,'source',source,'source_url',source_url,'license',license) into story
    from public.issue_story_summaries where year=yr and issue_number=iss and source_url=(
      select case when count(distinct f.wiki || '|' || f.page_title)=1 then min(
        'https://' || case lower(f.wiki) when 'marvel' then 'marvel.fandom.com' when 'dc' then 'dc.fandom.com'
          when 'starwars' then 'starwars.fandom.com' when 'darkhorse' then 'darkhorse.fandom.com'
          when 'image' then 'imagecomics.fandom.com' when 'tmnt' then 'turtlepedia.fandom.com' end
        || '/wiki/' || replace(f.page_title,' ','_')) end
      from public.fandom_pp_match f where f.pp_id in(
        select coalesce(c->'panel_profits_data'->>'PP Source ID',c->'panel_profits_data'->>'PriceCharting ID') from jsonb_array_elements(book_rows) c))
    limit 1;
  end if;
  if (story is null or coalesce(story->>'summary','') ~ '\"text\"\s*:\s*\"\|') and lot.label->>'issueDate' ~ '^[123]/' then
    select jsonb_build_object('summary',summary,'source',source,'source_url',source_url,'license',license) into story
    from public.issue_story_summaries where series=s and issue_number=iss and year=yr-1
      and summary is not null and summary !~ '\"text\"\s*:\s*\"\|' limit 1;
  end if;
  timings := timings || jsonb_build_object('story',round((extract(epoch from clock_timestamp()-timer)*1000)::numeric,1)); timer := clock_timestamp();
  normalized_title := regexp_replace(lower(lot.title),'#\s*','#','g');
  normalized_title := regexp_replace(normalized_title,'\m(cgc|cbcs|pgx|egs|psa)\M',' ','g');
  normalized_title := regexp_replace(normalized_title,'\m(universal|signature series|qualified|restored)\M',' ','g');
  normalized_title := regexp_replace(normalized_title,'\m(10|9\.[0-9]|[0-8]\.[0-9]|[0-9]\.[0-9])\M',' ','g');
  normalized_title := regexp_replace(normalized_title,'\m[0-9]{7,12}\M',' ','g');
  normalized_title := btrim(regexp_replace(normalized_title,'[^a-z0-9#]+',' ','g'));
  authored_key := left(encode(sha256(convert_to(normalized_title,'UTF8')),'hex'),40);
  select jsonb_build_object('content',content,'failed_at',failed_at,'written_at',written_at) into authored
    from public.sniper_listing_writeup where key=authored_key;
  timings := timings || jsonb_build_object('authored',round((extract(epoch from clock_timestamp()-timer)*1000)::numeric,1)); timer := clock_timestamp();
  q := jsonb_build_array(jsonb_build_object('k','lot','title',s,'issue',iss,'date',coalesce(lot.label->>'issueDate',''),'edition',coalesce(ed,'')));
  if resolved_grader='CGC' and nullif(lot.label->>'issueDate','') is not null then
    select coalesce(jsonb_agg(to_jsonb(c)),'[]') into census_rows from public.sniper_census_label(q) c;
  elsif resolved_grader='CGC' and coalesce(ed,'')='' and lot.title !~* '\m(variant|virgin|exclusive|newsstand|reprint)\M' then
    select coalesce(jsonb_agg(to_jsonb(c)),'[]') into census_rows from public.sniper_census_batch(q) c;
  elsif resolved_grader='PSA' then
    select coalesce(jsonb_agg(to_jsonb(c)),'[]') into census_rows from public.sniper_census_psa(q) c;
  end if;
  timings := timings || jsonb_build_object('census',round((extract(epoch from clock_timestamp()-timer)*1000)::numeric,1)); timer := clock_timestamp();
  label_name := case when lot.label->>'labelType' ~* 'universal' then 'Universal'
    when lot.label->>'labelType' ~* 'qualified.*signature|signature.*qualified' then 'Qualified SS'
    when lot.label->>'labelType' ~* 'signature' then 'Signature'
    when lot.label->>'labelType' ~* 'qualified' then 'Qualified'
    when lot.label->>'labelType' ~* 'restored' then 'Restored'
    when lot.label->>'labelType' ~* 'conserved' then 'Conserved' end;
  if coalesce(ed,'')='' and label_name is not null then
    select coalesce(jsonb_agg(to_jsonb(g)),'[]') into gc_rows from public.sniper_gocollect_batch(
      jsonb_build_array(jsonb_build_object('k','lot','title',s,'issue',iss,'date',coalesce(lot.label->>'issueDate',''),
        'grader',resolved_grader,'label',label_name,'grade',to_char(gr,'FM990.0')))) g;
  end if;
  timings := timings || jsonb_build_object('gocollect',round((extract(epoch from clock_timestamp()-timer)*1000)::numeric,1)); timer := clock_timestamp();
  sale_key := btrim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(lower(s),'\s*[(\[].*?[)\]]','','g'),'\m(vol\.?|volume|v)\s*[0-9]+\M','','g'),'^the\s+',''),'[^a-z0-9]+',' ','g')) || '|' || lower(regexp_replace(iss,'^#',''));
  select coalesce(jsonb_agg(to_jsonb(t) order by t.sold_at),'[]') into sales from (
    select item_id,sold_at,price_usd,grade,grader,venue,source,url,edition,publication_year from public.sniper_sales
    where series_key=sale_key and confirmed is true and price_usd>0 and grader=resolved_grader order by sold_at limit 5000
  ) t;
  -- Read the existing graded-sale register directly; never maintain a second copy.
  select sales || coalesce(jsonb_agg(jsonb_build_object(
    'item_id',g.provider_sale_id,'sold_at',g.sale_date,'price_usd',g.sale_price,'grade',g.grade_numeric,
    'grader',gc.name,'venue',g.venue,'source','graded_sales_observations','url',g.evidence_path,
    'edition',g.edition_name,'publication_year',yr)),'[]') into sales
  from public.graded_sales_observations g join public.grading_companies gc on gc.id=g.grading_company_id
  where gc.name=resolved_grader and g.issue_number_raw=iss and g.sale_type='completed_sale'
    and g.currency='USD' and g.sale_date is not null and g.sale_price>0
    and g.has_restoration is not true and g.has_signature is not true
    and coalesce(g.native_designation,'') !~* 'signature|restor|trim|qualified|pedigree|Pacific Coast|Winnipeg'
    and g.title_name in (s || ' (' || yr || ')',s || ', The (' || yr || ')','The ' || s || ' (' || yr || ')')
    and coalesce(g.edition_name,'')=coalesce(ed,'');
  timings := timings || jsonb_build_object('sales',round((extract(epoch from clock_timestamp()-timer)*1000)::numeric,1)); timer := clock_timestamp();
  select response into history from public.sniper_ebay_history
    where query_key=btrim(regexp_replace(lower(s || ' ' || regexp_replace(iss,'^#','')),'[^a-z0-9]+',' ','g'));
  timings := timings || jsonb_build_object('history',round((extract(epoch from clock_timestamp()-timer)*1000)::numeric,1)); timer := clock_timestamp();
  select coalesce(jsonb_agg(v.videos order by v.fetched_at desc),'[]') into videos from public.sniper_video_cache v
    where starts_with(v.key,'v2:' || btrim(regexp_replace(lower(s),'[^a-z0-9 ]+',' ','g')) || '#' || lower(iss) || ':')
       or v.key='v2:explainer';
  timings := timings || jsonb_build_object('videos',round((extract(epoch from clock_timestamp()-timer)*1000)::numeric,1)); timer := clock_timestamp();
  return jsonb_build_object('timings',timings,'identity',jsonb_build_object('itemId',lot.item_id,'title',lot.title,'series',s,'issue',iss,'year',yr,
    'publisher',coalesce(lot.label->>'publisher',lot.publisher),'edition',ed,'grade',gr,'grader',resolved_grader,'label',lot.label),
    'editions',editions,'comics',book_rows,'guideSnapshots',guide_snapshots,'observations',observations,'story',story,'authored',authored,
    'census',census_rows,'gocollect',gc_rows,'videoSets',videos,'sales',sales,'history',history);
end $$;
revoke all on function public.sniper_lot_evidence_v2(text) from public,anon,authenticated;
grant execute on function public.sniper_lot_evidence_v2(text) to service_role;
-- Remove obsolete rendered lot snapshots only. Authored narratives, videos and source evidence stay intact.
delete from public.sniper_listing_writeup where key like 'lot:%';
