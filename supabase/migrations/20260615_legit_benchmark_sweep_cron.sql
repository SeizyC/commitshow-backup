-- Benchmark sweep cron — stop "Benchmark pending" from accumulating.
--
-- The ingest path fire-and-forgets a benchmark of the freshly-ingested rows,
-- but capped at limit:30 per run while daily ingest brings ~35-38 new listings
-- — so a few spill over every day. ingest-directory's comment assumed a "cron
-- sweep covers any that race or exceed this cap", but that sweep was never
-- created. This is it: hourly, it benchmarks any rows still un-scored
-- (benchmark IS NULL), newest-first, so the backlog self-heals and new
-- listings are scored within the hour.
--
-- Sizing: PageSpeed makes each listing ~5s, so the 150s edge timeout fits
-- ~25 before IDLE_TIMEOUT. limit:20 (~110s) stays safely under it; running
-- every 30 min = 40/hour, far above the ~1.6 listings/hour inflow, so pending
-- trends to ~0 and the daily-ingest burst (~38 at once) clears within an hour.
-- benchmark-listing processes in batches of 6 parallel and saves each as it
-- goes, so even a killed run still makes progress (benchmark IS NULL filter
-- means no re-work next run).
create or replace function public.legit_benchmark_sweep()
returns void language plpgsql security definer set search_path = public as $$
declare v_config record;
begin
  select supabase_url, service_role_key into v_config
  from public._email_dispatch_config order by updated_at desc nulls last limit 1;
  if v_config is null or v_config.service_role_key is null then return; end if;
  perform net.http_post(
    url     := v_config.supabase_url || '/functions/v1/benchmark-listing',
    headers := jsonb_build_object('Content-Type','application/json','apikey',v_config.service_role_key,'Authorization','Bearer ' || v_config.service_role_key),
    body    := jsonb_build_object('pending', true, 'limit', 20)
  );
end; $$;

-- Every 30 minutes (40 listings/hour throughput · fits the 150s edge timeout).
select cron.unschedule('legit-benchmark-sweep') where exists (select 1 from cron.job where jobname='legit-benchmark-sweep');
select cron.schedule('legit-benchmark-sweep', '*/30 * * * *', $$ select public.legit_benchmark_sweep(); $$);
