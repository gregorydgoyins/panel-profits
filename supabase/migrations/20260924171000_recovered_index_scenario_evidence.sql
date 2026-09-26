create table if not exists public.recovered_index_scenario_evidence (
  id uuid primary key default gen_random_uuid(),
  index_code text not null references public.recovered_index_contracts(index_code) on delete cascade,
  scenario text not null,
  seat_number integer,
  historical_identity text not null,
  historical_source text not null,
  source_price numeric,
  source_price_grade text,
  source_price_origin text,
  evidence jsonb not null default '[]'::jsonb,
  notes jsonb not null default '{}'::jsonb,
  unique(index_code, scenario, historical_identity)
);

alter table public.recovered_index_scenario_evidence enable row level security;
grant select on public.recovered_index_scenario_evidence to anon, authenticated;
drop policy if exists "Public can read recovered index scenario evidence" on public.recovered_index_scenario_evidence;
create policy "Public can read recovered index scenario evidence" on public.recovered_index_scenario_evidence for select to anon, authenticated using (true);

insert into public.recovered_index_scenario_evidence
(index_code, scenario, seat_number, historical_identity, historical_source, source_price, source_price_grade, source_price_origin, evidence, notes)
select
  index_code,
  coalesce((notes::jsonb ->> 'scenario'), 'UNSPECIFIED'),
  seat_number,
  historical_identity,
  historical_source,
  source_price,
  source_price_grade,
  source_price_origin,
  evidence,
  notes::jsonb
from public.recovered_index_constituents
where historical_source = 'local:shadow_database.sqlite:ce70_constituents_final'
on conflict (index_code, scenario, historical_identity) do nothing;

delete from public.recovered_index_constituents
where historical_source = 'local:shadow_database.sqlite:ce70_constituents_final';
