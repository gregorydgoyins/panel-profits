-- Applied to Supabase 2026-11-13. Re-run this file to change the function.
-- Runs monthly via pg_cron job 'pp-print-runs-monthly' (inside Postgres; too long for the API).
create or replace function public.compute_comic_print_runs()
returns table(method text, books bigint)
language plpgsql security definer set search_path = public set statement_timeout = '30min' as $$
begin
  -- Monthly units per title/issue. Excludes months where Diamond no longer carried the publisher
  -- (DC from Apr 2020, Marvel from Oct 2021): those figures are partial, not print runs.
  create temp table _cm on commit drop as
  select title_key, issue_key, chart_year, chart_month, chart_year * 12 + chart_month - 1 mi,
         min(on_sale) on_sale,
         case when bool_or(is_combined) then max(est_units) filter (where is_combined) else sum(est_units) end units,
         min(source_url) url
  from comichron_monthly_estimates
  where est_units > 0 and issue_key is not null
    and not (publisher ilike 'DC%' and (chart_year * 100 + chart_month) >= 202004)
    and not (publisher ilike 'Marvel%' and (chart_year * 100 + chart_month) >= 202110)
  group by 1,2,3,4;

  create temp table _cand on commit drop as
  select c.id::text catalog_id, m.mi, m.units, m.url
  from (select distinct id, series, issue_number, publication_year from pp_comics where variant is null and publication_year is not null) c
  join _cm m
    on m.title_key = regexp_replace(lower(c.series), '[^a-z0-9]', '', 'g')
   and m.issue_key = regexp_replace(lower(c.issue_number), '[^a-z0-9]', '', 'g')
   and (case when m.on_sale is not null then extract(year from m.on_sale)::int = c.publication_year
             else m.chart_year between c.publication_year and c.publication_year + 1 end);

  -- Release = first candidate month; count it plus reorders within the next 6 months.
  -- A same-numbered relaunch a year later is a different book and falls outside the window.
  create temp table _pr on commit drop as
  select k.catalog_id, sum(k.units)::int print_run, count(*) n, min(k.url) url
  from _cand k
  join (select catalog_id, min(mi) rel from _cand group by 1) r using (catalog_id)
  where k.mi between r.rel and r.rel + 6
  group by k.catalog_id;

  delete from comic_print_runs p where p.method in ('DIAMOND_ESTIMATE','EXTRAPOLATED');

  insert into comic_print_runs (catalog_id, print_run, method, is_estimate, source_note, source_url)
  select catalog_id, print_run, 'DIAMOND_ESTIMATE', true,
         'Comichron estimate of copies shipped to North American comic shops via Diamond (release month + ' || (n - 1) || ' reorder month(s) within 6 months). Excludes newsstand and international.',
         url
  from _pr;

  insert into comic_print_runs (catalog_id, print_run, method, is_estimate, source_note, source_url)
  select distinct on (v.id) v.id::text,
         greatest(1, round(b.print_run / (substring(v.variant from '1\s*:\s*(\d+)'))::numeric))::int,
         'EXTRAPOLATED', true,
         'Extrapolated: base-edition Diamond estimate (' || b.print_run || ') ÷ incentive ratio 1:' || substring(v.variant from '1\s*:\s*(\d+)') || '.',
         b.source_url
  from pp_comics v
  join pp_comics base
    on base.series = v.series and base.issue_number = v.issue_number
   and base.publication_year = v.publication_year and base.variant is null
  join comic_print_runs b on b.catalog_id = base.id::text and b.method = 'DIAMOND_ESTIMATE'
  where v.variant ~ '1\s*:\s*\d+'
  order by v.id, b.print_run desc
  on conflict (catalog_id) do nothing;

  return query select p.method, count(*) from comic_print_runs p group by 1;
end $$;
