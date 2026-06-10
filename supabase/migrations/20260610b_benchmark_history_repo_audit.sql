-- Time-series + repo deep-audit storage (2026-06-10).
--
-- (1) benchmark_history — a snapshot per benchmark run. The weekly cron + every ingest
--     append a row, so trend / most-improved / "security improved N%" reports become
--     possible (the live benchmark jsonb is overwritten each run and has no history).
--
-- (2) listings.repo_audit — the deep code-check teardown (RLS · rate limiting · webhook
--     idempotency · error tracking · missing indexes · prompt injection · client secret ·
--     CORS) that enriches the 7 Frames for OSS / owner-linked repos. Kept in its own
--     column so the weekly URL benchmark never overwrites it — it refreshes on its own
--     (slower) cadence. This is the fuel for the "State of AI-Built Software" report.

create table if not exists benchmark_history (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid references listings(id) on delete cascade not null,
  scored_at       timestamptz not null default now(),
  form            text,
  overall         int,
  assessed        int,
  performance     int,
  accessibility   int,
  security        int,
  privacy         int,
  reliability     int,
  standards       int,
  discoverability int,
  maintenance     int,
  signals         jsonb,
  created_at      timestamptz default now()
);
create index if not exists benchmark_history_listing_idx on benchmark_history (listing_id, scored_at desc);
create index if not exists benchmark_history_scored_idx on benchmark_history (scored_at desc);

alter table benchmark_history enable row level security;
drop policy if exists "public read benchmark_history" on benchmark_history;
create policy "public read benchmark_history" on benchmark_history for select using (true);
grant select on benchmark_history to anon, authenticated;

alter table listings add column if not exists repo_audit jsonb;
grant select (repo_audit) on listings to anon, authenticated;

-- Baseline: seed the time-series with the current 7-frame scores so history starts today.
insert into benchmark_history (listing_id, scored_at, form, overall, assessed,
  performance, accessibility, security, privacy, reliability, standards, discoverability, maintenance, signals)
select id,
  coalesce((benchmark->>'scored_at')::timestamptz, now()),
  benchmark->>'form',
  (benchmark->>'overall')::int, (benchmark->>'assessed')::int,
  (benchmark->>'performance')::int, (benchmark->>'accessibility')::int, (benchmark->>'security')::int,
  (benchmark->>'privacy')::int, (benchmark->>'reliability')::int, (benchmark->>'standards')::int,
  (benchmark->>'discoverability')::int, (benchmark->>'maintenance')::int,
  benchmark->'signals'
from listings
where benchmark is not null and (benchmark->>'schema') = '2';
