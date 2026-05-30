-- 20260530 · is_seed marker for demo data
--
-- Adds a boolean flag on projects + members so we can safely seed
-- 15-20 plausible-looking projects without confusing them with real
-- traffic. Cleanup is a one-liner:
--
--   delete from projects where is_seed;
--   delete from members  where is_seed;
--
-- The projects FK to members is `on delete set null`, so deleting
-- members first orphans the projects but doesn't cascade-delete them;
-- delete projects first to be safe.

alter table projects
  add column if not exists is_seed boolean not null default false;

alter table members
  add column if not exists is_seed boolean not null default false;

-- Helpful indexes for the cleanup path and for any view that wants to
-- exclude seed data (none does today — seed rows are intentionally
-- indistinguishable from real ones on user-facing surfaces).
create index if not exists projects_is_seed_idx on projects (is_seed) where is_seed = true;
create index if not exists members_is_seed_idx  on members  (is_seed) where is_seed = true;

-- Column-level GRANT — same pattern as paid_audits_credit + ladder
-- columns (see CLAUDE.md memory feedback_column_grants). Without this
-- the anon role hits 42501 on selects that read is_seed.
grant select (is_seed) on projects to anon, authenticated;
grant select (is_seed) on members  to anon, authenticated;
