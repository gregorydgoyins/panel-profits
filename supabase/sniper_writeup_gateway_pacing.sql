-- One shared slot every thirteen seconds respects the team's five-per-minute quota.
create or replace function public.sniper_reserve_writeup_gateway_request()
returns timestamptz language sql volatile security invoker
set search_path=public,pg_temp as $$
  insert into public.sniper_vendor_fetch(key,fetched_at,status,items,sales)
  values ('writeup-request-slot:gateway',clock_timestamp(),'reserved',0,0)
  on conflict(key) do update
    set fetched_at=greatest(clock_timestamp(),sniper_vendor_fetch.fetched_at+interval '13 seconds')
  returning fetched_at;
$$;
revoke all on function public.sniper_reserve_writeup_gateway_request() from public,anon,authenticated;
grant execute on function public.sniper_reserve_writeup_gateway_request() to service_role;
