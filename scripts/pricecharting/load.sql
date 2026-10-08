\set ON_ERROR_STOP on
set statement_timeout = 0; set lock_timeout = 0; set idle_in_transaction_session_timeout = 0;
begin;
create temp table stg (pp_id text, pp_sales_volume int,
  pp_price_raw numeric, pp_price_2_0 numeric, pp_price_3_0 numeric, pp_price_4_0 numeric, pp_price_5_0 numeric, pp_price_6_0 numeric,
  pp_price_7_0 numeric, pp_price_8_0 numeric, pp_price_9_0 numeric, pp_price_9_2 numeric, pp_price_9_4 numeric, pp_price_9_6 numeric,
  pp_price_9_8 numeric, pp_price_9_8_sell numeric, pp_price_10_0 numeric,
  pp_retail_raw_buy numeric, pp_retail_raw_sell numeric, pp_retail_4_0_buy numeric, pp_retail_4_0_sell numeric,
  pp_retail_6_0_buy numeric, pp_retail_6_0_sell numeric);
\copy stg from 'out.csv' with (format csv, header true)
-- 1) append-only history: one new row per book per snapshot, nothing existing is touched
insert into public.pp_price_history (pp_id, snapshot_label, snapshot_date, pp_sales_volume,
  pp_price_raw, pp_price_2_0, pp_price_3_0, pp_price_4_0, pp_price_5_0, pp_price_6_0, pp_price_7_0, pp_price_8_0, pp_price_9_0,
  pp_price_9_2, pp_price_9_4, pp_price_9_6, pp_price_9_8, pp_price_9_8_sell, pp_price_10_0,
  pp_retail_raw_buy, pp_retail_raw_sell, pp_retail_4_0_buy, pp_retail_4_0_sell, pp_retail_6_0_buy, pp_retail_6_0_sell)
select pp_id, :'label', :'snap'::date, pp_sales_volume,
  pp_price_raw, pp_price_2_0, pp_price_3_0, pp_price_4_0, pp_price_5_0, pp_price_6_0, pp_price_7_0, pp_price_8_0, pp_price_9_0,
  pp_price_9_2, pp_price_9_4, pp_price_9_6, pp_price_9_8, pp_price_9_8_sell, pp_price_10_0,
  pp_retail_raw_buy, pp_retail_raw_sell, pp_retail_4_0_buy, pp_retail_4_0_sell, pp_retail_6_0_buy, pp_retail_6_0_sell
from stg;
-- 2) current prices the site reads: only books already in the verified dataset, only rows whose values changed
update public.pp_series_rows_full t set
  pp_sales_volume = s.pp_sales_volume,
  pp_price_raw = s.pp_price_raw, pp_price_2_0 = s.pp_price_2_0, pp_price_3_0 = s.pp_price_3_0, pp_price_4_0 = s.pp_price_4_0,
  pp_price_5_0 = s.pp_price_5_0, pp_price_6_0 = s.pp_price_6_0, pp_price_7_0 = s.pp_price_7_0, pp_price_8_0 = s.pp_price_8_0,
  pp_price_9_0 = s.pp_price_9_0, pp_price_9_2 = s.pp_price_9_2, pp_price_9_4 = s.pp_price_9_4, pp_price_9_6 = s.pp_price_9_6,
  pp_price_9_8 = s.pp_price_9_8, pp_price_9_8_sell = s.pp_price_9_8_sell, pp_price_10_0 = s.pp_price_10_0,
  pp_retail_raw_buy = s.pp_retail_raw_buy, pp_retail_raw_sell = s.pp_retail_raw_sell,
  pp_retail_4_0_buy = s.pp_retail_4_0_buy, pp_retail_4_0_sell = s.pp_retail_4_0_sell,
  pp_retail_6_0_buy = s.pp_retail_6_0_buy, pp_retail_6_0_sell = s.pp_retail_6_0_sell
from stg s
where t.pp_id = s.pp_id and t.keep_row = 'yes'
  and (t.pp_sales_volume, t.pp_price_raw, t.pp_price_2_0, t.pp_price_3_0, t.pp_price_4_0, t.pp_price_5_0, t.pp_price_6_0, t.pp_price_7_0,
       t.pp_price_8_0, t.pp_price_9_0, t.pp_price_9_2, t.pp_price_9_4, t.pp_price_9_6, t.pp_price_9_8, t.pp_price_9_8_sell, t.pp_price_10_0,
       t.pp_retail_raw_buy, t.pp_retail_raw_sell, t.pp_retail_4_0_buy, t.pp_retail_4_0_sell, t.pp_retail_6_0_buy, t.pp_retail_6_0_sell)
      is distinct from
      (s.pp_sales_volume, s.pp_price_raw, s.pp_price_2_0, s.pp_price_3_0, s.pp_price_4_0, s.pp_price_5_0, s.pp_price_6_0, s.pp_price_7_0,
       s.pp_price_8_0, s.pp_price_9_0, s.pp_price_9_2, s.pp_price_9_4, s.pp_price_9_6, s.pp_price_9_8, s.pp_price_9_8_sell, s.pp_price_10_0,
       s.pp_retail_raw_buy, s.pp_retail_raw_sell, s.pp_retail_4_0_buy, s.pp_retail_4_0_sell, s.pp_retail_6_0_buy, s.pp_retail_6_0_sell);
commit;
select 'history rows for this snapshot' as k, count(*) from public.pp_price_history where snapshot_label = :'label';
