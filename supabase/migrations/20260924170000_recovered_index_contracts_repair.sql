create table if not exists public.recovered_index_contracts (
  index_code text primary key,
  display_name text not null,
  methodology_version text not null,
  expected_constituent_count integer not null,
  price_basis text not null,
  grade_basis text,
  selection_rule text not null,
  weighting_rule text,
  rebalance_rule text,
  calculation_frequency text,
  historical_status text not null,
  production_status text not null default 'NOT_POPULATED',
  source_evidence jsonb not null default '[]'::jsonb,
  verified_at timestamptz,
  notes text
);

create table if not exists public.recovered_index_constituents (
  id uuid primary key default gen_random_uuid(),
  index_code text not null references public.recovered_index_contracts(index_code) on delete cascade,
  seat_number integer,
  historical_identity text not null,
  historical_source text not null,
  current_comic_id uuid,
  current_instrument_id bigint,
  match_status text not null default 'UNRESOLVED',
  match_method text,
  source_price numeric,
  source_price_grade text,
  source_price_origin text,
  weight numeric,
  evidence jsonb not null default '[]'::jsonb,
  notes text,
  unique(index_code, seat_number),
  unique(index_code, historical_identity)
);

create table if not exists public.recovered_index_observations (
  id uuid primary key default gen_random_uuid(),
  index_code text not null references public.recovered_index_contracts(index_code) on delete cascade,
  observation_time timestamptz not null default now(),
  index_value numeric,
  previous_value numeric,
  absolute_change numeric,
  percent_change numeric,
  valid_constituent_count integer not null default 0,
  expected_constituent_count integer not null,
  calculation_status text not null,
  methodology_version text not null,
  source_snapshot jsonb not null default '{}'::jsonb,
  unique(index_code, observation_time)
);

create table if not exists public.recovered_index_rebalances (
  id uuid primary key default gen_random_uuid(),
  index_code text not null references public.recovered_index_contracts(index_code) on delete cascade,
  effective_at timestamptz not null default now(),
  action text not null,
  reason text not null,
  before_count integer not null default 0,
  after_count integer not null default 0,
  evidence jsonb not null default '[]'::jsonb
);

alter table public.recovered_index_contracts enable row level security;
alter table public.recovered_index_constituents enable row level security;
alter table public.recovered_index_observations enable row level security;
alter table public.recovered_index_rebalances enable row level security;

grant select on public.recovered_index_contracts, public.recovered_index_constituents, public.recovered_index_observations, public.recovered_index_rebalances to anon, authenticated;

drop policy if exists "Public can read recovered index contracts" on public.recovered_index_contracts;
create policy "Public can read recovered index contracts" on public.recovered_index_contracts for select to anon, authenticated using (true);
drop policy if exists "Public can read recovered index constituents" on public.recovered_index_constituents;
create policy "Public can read recovered index constituents" on public.recovered_index_constituents for select to anon, authenticated using (true);
drop policy if exists "Public can read recovered index observations" on public.recovered_index_observations;
create policy "Public can read recovered index observations" on public.recovered_index_observations for select to anon, authenticated using (true);
drop policy if exists "Public can read recovered index rebalances" on public.recovered_index_rebalances;
create policy "Public can read recovered index rebalances" on public.recovered_index_rebalances for select to anon, authenticated using (true);

insert into public.recovered_index_contracts
(index_code, display_name, methodology_version, expected_constituent_count, price_basis, grade_basis, selection_rule, weighting_rule, rebalance_rule, calculation_frequency, historical_status, production_status, source_evidence, notes)
values
('CE70','CE70 Sovereign Comic Equity Index','CE70_CONSTITUTION_RECOVERED_V1',70,'Verified Final/Panel Profits FMV where reconciled','High-grade reference specimen; exact grade evidence required','9 Origin Eras with 7 primary seats per era plus 7 foreign seats; vacant seats remain unresolved','Not promoted until all 70 seats are reconciled','Rebalance rule not operationally recovered','Not operationally recovered','DEFINED_WITH_5_VACANT_SEATS','BLOCKED_INCOMPLETE_MEMBERSHIP','["CE70_MASTER_INDEX.md","ce70_adjudication_dossiers"]','Historical register contains 65 certified seats and 5 vacant seats; no 70/70 production value.'),
('PPIX60','PPIX-60 Capitalization Benchmark','PPIX60_FORMULA_RECOVERED_V1',60,'Verified Final/Panel Profits FMV','CGC 9.8 census-adjusted reference grade','Historical 60 single-issue market-health basket; exact final membership requires reconciliation','Capitalization weighted by FMV multiplied by Census 9.8, divided by continuity divisor','Historical rebalance details require verified constituent set','Historical 60-second snapshot concept; production cadence not active','DEFINED_VERSIONED_HISTORICAL','BLOCKED_UNVERIFIED_MEMBERSHIP','["PANEL_PROFITS_CANONICAL_FORMULA_LEDGER.csv"]','Historical reference only until membership and observations are verified.'),
('PPIX100','Panel Profits Pulse Index 100','PPIX100_CONSTITUTION_RECOVERED_V1',100,'Verified Final/Panel Profits FMV where available','Qualification and market eligibility; exact grade evidence required','100 pulse instruments; exact membership requires reconciliation','Liquidity weighted','Quarterly concept recovered; production implementation not active','Not operationally recovered','DEFINED_WITH_PARTIAL_IMPLEMENTATION','BLOCKED_UNVERIFIED_MEMBERSHIP','["pp_market_index_engine.py","ce50_ppix100_final_constitution_engine.py"]','No verified 100-member Clean basket was found.'),
('PPIX_COMPOSITE','PPIX Composite','PPIX_COMPOSITE_RESEARCH_REFERENCED_V1',0,'Not established','Not established','Historical references exist but composition is not recovered','Not recovered','Not recovered','Not recovered','REFERENCED_ONLY','BLOCKED_MISSING_METHODOLOGY','["FACTOR_DISCOVERY_AUDIT.md"]','Must not be calculated until the weighting methodology is recovered.')
on conflict (index_code) do nothing;
