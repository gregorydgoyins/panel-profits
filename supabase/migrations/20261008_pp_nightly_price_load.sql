-- Applied to project vbcmjmakluyjnsmisoth on 2026-10-08 (via Supabase connector). Kept here for reproducibility.
-- Nightly PriceCharting load: staging table, slice-commit function, daily pg_cron -> edge function pricecharting-nightly.
create unlogged table if not exists public.pp_price_stage (
  run_label text not null, pp_id text not null, pp_sales_volume int,
  pp_price_raw numeric, pp_price_2_0 numeric, pp_price_3_0 numeric, pp_price_4_0 numeric, pp_price_5_0 numeric, pp_price_6_0 numeric,
  pp_price_7_0 numeric, pp_price_8_0 numeric, pp_price_9_0 numeric, pp_price_9_2 numeric, pp_price_9_4 numeric, pp_price_9_6 numeric,
  pp_price_9_8 numeric, pp_price_9_8_sell numeric, pp_price_10_0 numeric,
  pp_retail_raw_buy numeric, pp_retail_raw_sell numeric, pp_retail_4_0_buy numeric, pp_retail_4_0_sell numeric,
  pp_retail_6_0_buy numeric, pp_retail_6_0_sell numeric, created_at timestamptz not null default now());
create index if not exists pp_price_stage_label_idx on public.pp_price_stage (run_label);
alter table public.pp_price_stage enable row level security;
-- functions public.pp_prev_snapshot_rows() and public.pp_commit_prices(label, snap, part, parts):
-- see the live database (pg_get_functiondef); both are service_role-only.
-- schedule:
--   select cron.schedule('pricecharting-nightly','17 11 * * *', $$ select net.http_post(
--     url := 'https://vbcmjmakluyjnsmisoth.supabase.co/functions/v1/pricecharting-nightly',
--     headers := jsonb_build_object('Content-Type','application/json'), body := '{}'::jsonb, timeout_milliseconds := 300000) $$);
