-- Applied to Supabase (execute_sql, 2026-11-13). Re-run this file to change the function.
-- Attaches Comichron/Diamond print-run estimates to catalog books.
create or replace function public.compute_comic_print_runs()
returns table(method text, books bigint)
language plpgsql security definer set search_path = public set statement_timeout = '30min' as $$
begin
  create temp table _cm on commit drop as
  select title_key, issue_key, chart_year, chart_month,
         min(on_sale) on_sale,
         case when bool_or(is_combined) then max(est_units) filter (where is_combined) else sum(est_units) end units,
         min(source_url) url
  from comichron_monthly_estimates
  where est_units > 0 and issue_key is not null
  group by 1,2,3,4;

  insert into comic_print_runs (catalog_id, print_run, method, is_estimate, source_note, source_url)
  select c.id::text, sum(m.units)::int, 'DIAMOND_ESTIMATE', true,
         'Comichron estimate of copies shipped to North American comic shops via Diamond (' || count(*) || ' monthly chart line(s), incl. reorders). Excludes newsstand and international.',
         min(m.url)
  from pp_comics c
  join _cm m
    on m.title_key = regexp_replace(lower(c.series), '[^a-z0-9]', '', 'g')
   and m.issue_key = regexp_replace(lower(c.issue_number), '[^a-z0-9]', '', 'g')
   and m.chart_year between c.publication_year - 1 and c.publication_year + 2
   and (m.on_sale is null or abs(extract(year from m.on_sale)::int - c.publication_year) <= 1)
  where c.variant is null and c.publication_year is not null
  group by c.id
  on conflict (catalog_id) do update set print_run = excluded.print_run, method = excluded.method,
    is_estimate = true, source_note = excluded.source_note, source_url = excluded.source_url, computed_at = now();

  insert into comic_print_runs (catalog_id, print_run, method, is_estimate, source_note, source_url)
  select v.id::text,
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
  on conflict (catalog_id) do update set print_run = excluded.print_run, source_note = excluded.source_note, computed_at = now();

  return query select p.method, count(*) from comic_print_runs p group by 1;
end $$;
revoke execute on function public.compute_comic_print_runs() from public, anon, authenticated;
grant execute on function public.compute_comic_print_runs() to service_role;
