-- 20260530 · cleanup for the demo-data seed
--
-- Removes every row the seed script touched, in dependency order:
--   1. analysis_snapshots that hang off seed projects
--   2. seed projects themselves
--   3. seed members
--   4. seed auth.users (identified by the seed_marker we set in
--      raw_user_meta_data — safer than going by id, since the id list
--      might drift if we extend the seed later)
--
-- Real audits never touch is_seed (it defaults to false) so cleanup
-- can run on a live database without worry.
--
-- Run with:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/seed-demo-projects-cleanup.sql

begin;

set local session_replication_role = replica;

delete from analysis_snapshots
 where project_id in (select id from projects where is_seed);

delete from projects where is_seed;

delete from members  where is_seed;

delete from auth.users
 where raw_user_meta_data->>'seed_marker' = 'commitshow-demo-2026-05-30';

commit;

-- Confirm no stragglers:
--   select count(*) from members  where is_seed;
--   select count(*) from projects where is_seed;
--   select count(*) from auth.users
--    where raw_user_meta_data->>'seed_marker' = 'commitshow-demo-2026-05-30';
