CREATE TABLE IF NOT EXISTS public.recovered_index_contracts (
  index_code TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  methodology_version TEXT NOT NULL,
  expected_constituent_count INTEGER NOT NULL,
  price_basis TEXT NOT NULL,
  grade_basis TEXT,
  selection_rule TEXT NOT NULL,
  weighting_rule TEXT,
  rebalance_rule TEXT,
  calculation_frequency TEXT,
  historical_status TEXT NOT NULL,
  production_status TEXT NOT NULL DEFAULT 'NOT_POPULATED',
  source_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  verified_at TIMESTAMPTZ,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS public.recovered_index_constituents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  index_code TEXT NOT NULL REFERENCES public.recovered_index_contracts(index_code) ON DELETE CASCADE,
  seat_number INTEGER,
  historical_identity TEXT NOT NULL,
  historical_source TEXT NOT NULL,
  current_comic_id UUID,
  current_instrument_id BIGINT,
  match_status TEXT NOT NULL DEFAULT 'UNRESOLVED',
  match_method TEXT,
  source_price NUMERIC,
  source_price_grade TEXT,
  source_price_origin TEXT,
  weight NUMERIC,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  UNIQUE(index_code, seat_number),
  UNIQUE(index_code, historical_identity)
);

CREATE TABLE IF NOT EXISTS public.recovered_index_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  index_code TEXT NOT NULL REFERENCES public.recovered_index_contracts(index_code) ON DELETE CASCADE,
  observation_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  index_value NUMERIC,
  previous_value NUMERIC,
  absolute_change NUMERIC,
  percent_change NUMERIC,
  valid_constituent_count INTEGER NOT NULL DEFAULT 0,
  expected_constituent_count INTEGER NOT NULL,
  calculation_status TEXT NOT NULL,
  methodology_version TEXT NOT NULL,
  source_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(index_code, observation_time)
);

CREATE TABLE IF NOT EXISTS public.recovered_index_rebalances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  index_code TEXT NOT NULL REFERENCES public.recovered_index_contracts(index_code) ON DELETE CASCADE,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  before_count INTEGER NOT NULL DEFAULT 0,
  after_count INTEGER NOT NULL DEFAULT 0,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE public.recovered_index_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovered_index_constituents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovered_index_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovered_index_rebalances ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.recovered_index_contracts, public.recovered_index_constituents, public.recovered_index_observations, public.recovered_index_rebalances TO anon, authenticated;
DROP POLICY IF EXISTS "Public can read recovered index contracts" ON public.recovered_index_contracts;
CREATE POLICY "Public can read recovered index contracts" ON public.recovered_index_contracts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public can read recovered index constituents" ON public.recovered_index_constituents;
CREATE POLICY "Public can read recovered index constituents" ON public.recovered_index_constituents FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public can read recovered index observations" ON public.recovered_index_observations;
CREATE POLICY "Public can read recovered index observations" ON public.recovered_index_observations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public can read recovered index rebalances" ON public.recovered_index_rebalances;
CREATE POLICY "Public can read recovered index rebalances" ON public.recovered_index_rebalances FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.recovered_index_contracts
(index_code, display_name, methodology_version, expected_constituent_count, price_basis, grade_basis, selection_rule, weighting_rule, rebalance_rule, calculation_frequency, historical_status, production_status, source_evidence, notes)
VALUES
('CE70','CE70 Sovereign Comic Equity Index','CE70_CONSTITUTION_RECOVERED_V1',70,'Verified FINAL/Panel Profits FMV where reconciled','High-grade reference specimen; exact grade evidence required','9 Origin Eras with 7 primary seats per era plus 7 foreign seats; vacant seats remain unresolved','Not promoted until all 70 seats are reconciled','Rebalance rule not operationally recovered','Not operationally recovered','DEFINED_WITH_5_VACANT_SEATS','BLOCKED_INCOMPLETE_MEMBERSHIP','["CE70_MASTER_INDEX.md","ce70_constitution_engine.py","user_prompt_ce70.txt"]','Historical register contains 65 certified seats and 5 vacant seats; no 70/70 production value.'),
('PPIX60','PPIX-60 Capitalization Benchmark','PPIX60_FORMULA_RECOVERED_V1',60,'Verified FINAL/Panel Profits FMV','CGC 9.8 census-adjusted reference grade','Historical 60 single-issue market-health basket; exact final membership requires reconciliation','Capitalization weighted by FMV multiplied by Census 9.8, divided by continuity divisor','Historical rebalance details require verified constituent set','Historical 60-second snapshot concept; production cadence not active','DEFINED_VERSIONED_HISTORICAL','BLOCKED_UNVERIFIED_MEMBERSHIP','["RP-DC-0050_PPIX_60_FORM_AND_RESEARCH_BOT_CONVERSATION.md","PANEL_PROFITS_CANONICAL_FORMULA_LEDGER.csv","PANEL_PROFITS_MARKET_AND_PRICING.md"]','PPIX-60 is retained as a historical/versioned name; not silently renamed PPIX.'),
('PPIX100','Panel Profits Pulse Index 100','PPIX100_CONSTITUTION_RECOVERED_V1',100,'Verified FINAL/Panel Profits FMV where available','Qualification and market eligibility; exact grade evidence required','100 pulse instruments including emerging keys, independent, manga, international and high-velocity cultural assets; qualification threshold documented','Liquidity weighted','Quarterly concept recovered; production implementation not active','Not operationally recovered','DEFINED_WITH_PARTIAL_IMPLEMENTATION','BLOCKED_UNVERIFIED_MEMBERSHIP','["pp_market_index_engine.py","ce50_ppix100_final_constitution_engine.py","populate_final_index_constitution.py"]','No verified 100-member Clean basket was found.'),
('PPIX_COMPOSITE','PPIX Composite','PPIX_COMPOSITE_RESEARCH_REFERENCED_V1',0,'Not established','Not established','Historical references exist but authoritative composition is not recovered','Not recovered','Not recovered','Not recovered','REFERENCED_ONLY','BLOCKED_MISSING_METHODOLOGY','["FACTOR_DISCOVERY_AUDIT.md","PANEL_PROFITS_CROSS_SYSTEM_CAUSAL_GRAPH.json"]','Must not be calculated until the weighting methodology is recovered.')
ON CONFLICT (index_code) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  methodology_version = EXCLUDED.methodology_version,
  expected_constituent_count = EXCLUDED.expected_constituent_count,
  price_basis = EXCLUDED.price_basis,
  grade_basis = EXCLUDED.grade_basis,
  selection_rule = EXCLUDED.selection_rule,
  weighting_rule = EXCLUDED.weighting_rule,
  rebalance_rule = EXCLUDED.rebalance_rule,
  calculation_frequency = EXCLUDED.calculation_frequency,
  historical_status = EXCLUDED.historical_status,
  production_status = EXCLUDED.production_status,
  source_evidence = EXCLUDED.source_evidence,
  notes = EXCLUDED.notes;
