-- 20260530 · demo-data seed for ladder/map/hero surfaces
--
-- Inserts 11 fake members + 17 fake projects with one analysis snapshot
-- each. Score band targets the 47-69 polish range (CEO calibration —
-- matches the baseline avg 47 from CLAUDE.md §6 so the row mix reads as
-- "real audit traffic" rather than a curated showcase).
--
-- Safety:
--   · is_seed = true on every row → cleanup is a one-liner
--   · SET LOCAL session_replication_role = replica around the writes →
--     skips downstream triggers (auto-tweet, email dispatch, grade
--     recalc cron, etc.). Real audit triggers stay intact for live
--     traffic because session_replication_role is scoped to this
--     transaction.
--   · auth.users insert sets email_confirmed_at + raw_user_meta_data so
--     it doesn't trip the Supabase auth machinery later; the row is
--     functionally identical to a confirmed email signup. The fake
--     emails point at example.com (RFC 2606 reserved) so any stray
--     dispatch lands harmlessly.
--   · idempotent by id — re-running the script no-ops via ON CONFLICT.
--
-- Run with:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/seed-demo-projects.sql
--
-- Cleanup:
--   delete from analysis_snapshots
--    where project_id in (select id from projects where is_seed);
--   delete from projects where is_seed;
--   delete from members  where is_seed;
--   delete from auth.users
--    where raw_user_meta_data->>'seed_marker' = 'commitshow-demo-2026-05-30';

begin;

-- Hard-disable downstream triggers for the duration of this txn so the
-- seed doesn't fire X auto-tweet / email / cron-style side effects.
set local session_replication_role = replica;

-- ── 1. Fake auth.users + members ───────────────────────────────────
-- Eleven creators spread across the four tiers + creator grades so the
-- ladder + scout leaderboard show a realistic distribution. UUIDs are
-- hardcoded so re-runs are stable + so we can reference them from the
-- projects insert below.

with creators(id, email, display_name, x_handle, github_handle, tier, grade, ap) as (
  values
    ('a1d3e500-0000-0000-0000-000000000001'::uuid, 'mira@example.com',   'Mira Chen',       'mirachen_',     'mirachen',     'Silver',   'Builder',  720),
    ('a1d3e500-0000-0000-0000-000000000002'::uuid, 'devan@example.com',  'Devan Park',      'devanpark',     'devanpark',    'Bronze',   'Rookie',   140),
    ('a1d3e500-0000-0000-0000-000000000003'::uuid, 'luca@example.com',   'Luca Romano',     'lucabuilds',    'luca-romano',  'Gold',     'Maker',   2400),
    ('a1d3e500-0000-0000-0000-000000000004'::uuid, 'priya@example.com',  'Priya Iyer',      'priya_ships',   'priya-iyer',   'Silver',   'Builder',  900),
    ('a1d3e500-0000-0000-0000-000000000005'::uuid, 'jules@example.com',  'Jules Okafor',    'julesokafor',   'jules-ok',     'Bronze',   'Rookie',   220),
    ('a1d3e500-0000-0000-0000-000000000006'::uuid, 'sora@example.com',   'Sora Han',        'sorahan',       'sorahan',      'Silver',   'Builder',  640),
    ('a1d3e500-0000-0000-0000-000000000007'::uuid, 'omar@example.com',   'Omar Khaled',     'omar_dev',      'omarkhaled',   'Gold',     'Maker',   2100),
    ('a1d3e500-0000-0000-0000-000000000008'::uuid, 'elin@example.com',   'Elin Bergstrom',  'elin_codes',    'elinb',        'Bronze',   'Rookie',   310),
    ('a1d3e500-0000-0000-0000-000000000009'::uuid, 'kai@example.com',    'Kai Tanaka',      'kaitanaka',     'kai-tanaka',   'Silver',   'Builder',  820),
    ('a1d3e500-0000-0000-0000-00000000000a'::uuid, 'noor@example.com',   'Noor Saleh',      'noor_ships',    'noor-saleh',   'Bronze',   'Rookie',   180),
    ('a1d3e500-0000-0000-0000-00000000000b'::uuid, 'tess@example.com',   'Tess Mwangi',     'tess_mw',       'tessmwangi',   'Gold',     'Architect',3200)
)
insert into auth.users (
  id, email, email_confirmed_at, created_at, updated_at,
  raw_user_meta_data, raw_app_meta_data,
  aud, role, instance_id, encrypted_password
)
select
  c.id,
  c.email,
  now() - interval '30 days',
  now() - interval '30 days',
  now() - interval '30 days',
  jsonb_build_object(
    'full_name',  c.display_name,
    'avatar_url', null,
    'user_name',  c.github_handle,
    'seed_marker','commitshow-demo-2026-05-30'
  ),
  jsonb_build_object('provider','email','providers',jsonb_build_array('email')),
  'authenticated',
  'authenticated',
  '00000000-0000-0000-0000-000000000000'::uuid,
  ''
from creators c
on conflict (id) do nothing;

-- members row (auth trigger is bypassed by session_replication_role)
insert into members (
  id, email, display_name, tier, creator_grade, activity_points,
  is_seed, created_at, updated_at
)
select
  c.id, c.email, c.display_name, c.tier, c.grade, c.ap,
  true,
  now() - interval '28 days',
  now() - interval '7  days'
from (values
  ('a1d3e500-0000-0000-0000-000000000001'::uuid, 'mira@example.com',  'Mira Chen',      'Silver','Builder',  720),
  ('a1d3e500-0000-0000-0000-000000000002'::uuid, 'devan@example.com', 'Devan Park',     'Bronze','Rookie',   140),
  ('a1d3e500-0000-0000-0000-000000000003'::uuid, 'luca@example.com',  'Luca Romano',    'Gold',  'Maker',   2400),
  ('a1d3e500-0000-0000-0000-000000000004'::uuid, 'priya@example.com', 'Priya Iyer',     'Silver','Builder',  900),
  ('a1d3e500-0000-0000-0000-000000000005'::uuid, 'jules@example.com', 'Jules Okafor',   'Bronze','Rookie',   220),
  ('a1d3e500-0000-0000-0000-000000000006'::uuid, 'sora@example.com',  'Sora Han',       'Silver','Builder',  640),
  ('a1d3e500-0000-0000-0000-000000000007'::uuid, 'omar@example.com',  'Omar Khaled',    'Gold',  'Maker',   2100),
  ('a1d3e500-0000-0000-0000-000000000008'::uuid, 'elin@example.com',  'Elin Bergstrom', 'Bronze','Rookie',   310),
  ('a1d3e500-0000-0000-0000-000000000009'::uuid, 'kai@example.com',   'Kai Tanaka',     'Silver','Builder',  820),
  ('a1d3e500-0000-0000-0000-00000000000a'::uuid, 'noor@example.com',  'Noor Saleh',     'Bronze','Rookie',   180),
  ('a1d3e500-0000-0000-0000-00000000000b'::uuid, 'tess@example.com',  'Tess Mwangi',    'Gold',  'Architect',3200)
) as c(id, email, display_name, tier, grade, ap)
on conflict (id) do nothing;


-- ── 2. Fake projects + analysis snapshots ──────────────────────────
-- 17 projects across the 11 creators (some have 1, some have 2). Live
-- URLs point at typical vibe-coder free-host subdomains (vercel.app,
-- pages.dev, netlify.app, fly.dev) so the host display reads naturally
-- in the audit UI without any of them actually resolving. GitHub URLs
-- are placeholder-style — they don't need to resolve because we're
-- never running the audit engine against these rows.
--
-- Score band 47-69 (CEO calibration). Distribution is gently
-- right-skewed within the band so the bottom isn't crowded.

with rows(
  pid, creator_uuid, name, github, live, descr,
  layers, polish, lh_perf, lh_a11y, lh_bp, lh_seo
) as (
  values
    -- Mira Chen — 2 projects
    ('b2e44001-0000-0000-0000-000000000001'::uuid, 'a1d3e500-0000-0000-0000-000000000001'::uuid,
      'FocusFlow', 'github.com/mirachen/focusflow', 'focusflow.vercel.app',
      'Pomodoro that adapts to your ADHD rhythm — not the other way around.',
      array['react','typescript','supabase','tailwind'],
      62, 88, 91, 84, 78),
    ('b2e44001-0000-0000-0000-000000000002'::uuid, 'a1d3e500-0000-0000-0000-000000000001'::uuid,
      'NoteCairn', 'github.com/mirachen/notecairn', 'notecairn.pages.dev',
      'Markdown notes that organize themselves around your daily standups.',
      array['nextjs','vercel','postgres'],
      55, 79, 82, 76, 70),
    -- Devan Park — 1 project
    ('b2e44001-0000-0000-0000-000000000003'::uuid, 'a1d3e500-0000-0000-0000-000000000002'::uuid,
      'GymBuddy', 'github.com/devanpark/gymbuddy', 'gymbuddy.fly.dev',
      'Workout logger that remembers your last set so you don''t have to.',
      array['svelte','sqlite','fly'],
      49, 71, 75, 68, 62),
    -- Luca Romano — 2 projects
    ('b2e44001-0000-0000-0000-000000000004'::uuid, 'a1d3e500-0000-0000-0000-000000000003'::uuid,
      'Threadly', 'github.com/luca-romano/threadly', 'threadly.app',
      'Drafts long X threads from your raw voice notes, scheduling included.',
      array['nextjs','openai','stripe','postgres'],
      68, 92, 88, 89, 82),
    ('b2e44001-0000-0000-0000-000000000005'::uuid, 'a1d3e500-0000-0000-0000-000000000003'::uuid,
      'StaticForge', 'github.com/luca-romano/staticforge', 'staticforge.pages.dev',
      'Tailwind component library scaffolded from a single prompt — no opinions, no theme lock-in.',
      array['typescript','tailwind','vite'],
      66, 90, 86, 85, 79),
    -- Priya Iyer — 2 projects
    ('b2e44001-0000-0000-0000-000000000006'::uuid, 'a1d3e500-0000-0000-0000-000000000004'::uuid,
      'DocuQuiz', 'github.com/priya-iyer/docuquiz', 'docuquiz.vercel.app',
      'Drop a PDF, get a 5-question quiz you can share with your team.',
      array['nextjs','openai','vercel'],
      58, 84, 80, 79, 73),
    ('b2e44001-0000-0000-0000-000000000007'::uuid, 'a1d3e500-0000-0000-0000-000000000004'::uuid,
      'MoodMonk', 'github.com/priya-iyer/moodmonk', 'moodmonk.netlify.app',
      'A daily mood journal that nudges, not nags. Streaks without the guilt.',
      array['react','firebase','tailwind'],
      52, 76, 78, 71, 66),
    -- Jules Okafor — 1 project
    ('b2e44001-0000-0000-0000-000000000008'::uuid, 'a1d3e500-0000-0000-0000-000000000005'::uuid,
      'PetPlate', 'github.com/jules-ok/petplate', 'petplate.fly.dev',
      'Vet-approved meal plans for picky dogs and cats. Built for one weekend, used for years.',
      array['python','fastapi','postgres'],
      48, 70, 73, 65, 61),
    -- Sora Han — 2 projects
    ('b2e44001-0000-0000-0000-000000000009'::uuid, 'a1d3e500-0000-0000-0000-000000000006'::uuid,
      'StackPilot', 'github.com/sorahan/stackpilot', 'stackpilot.app',
      'Picks the right SaaS stack for your idea in 90 seconds. No affiliate links, ever.',
      array['nextjs','typescript','openai'],
      64, 89, 84, 86, 77),
    ('b2e44001-0000-0000-0000-00000000000a'::uuid, 'a1d3e500-0000-0000-0000-000000000006'::uuid,
      'IndieCron', 'github.com/sorahan/indiecron', 'indiecron.fly.dev',
      'Cron jobs for indie SaaS that don''t want to babysit Vercel functions.',
      array['go','fly','postgres'],
      54, 78, 76, 74, 68),
    -- Omar Khaled — 2 projects
    ('b2e44001-0000-0000-0000-00000000000b'::uuid, 'a1d3e500-0000-0000-0000-000000000007'::uuid,
      'Recapper', 'github.com/omarkhaled/recapper', 'recapper.vercel.app',
      'Auto-summarizes your Slack channels into a single Monday-morning brief.',
      array['nextjs','openai','vercel','postgres'],
      69, 93, 90, 89, 84),
    ('b2e44001-0000-0000-0000-00000000000c'::uuid, 'a1d3e500-0000-0000-0000-000000000007'::uuid,
      'Loglet', 'github.com/omarkhaled/loglet', 'loglet.dev',
      'Tiny observability for hobby projects — under 10 MB, drop-in HTTP collector.',
      array['rust','sqlite','docker'],
      60, 85, 82, 81, 75),
    -- Elin Bergstrom — 1 project
    ('b2e44001-0000-0000-0000-00000000000d'::uuid, 'a1d3e500-0000-0000-0000-000000000008'::uuid,
      'Sprintbox', 'github.com/elinb/sprintbox', 'sprintbox.netlify.app',
      'Two-week sprint planner with one screen, three states, zero meetings.',
      array['react','firebase'],
      50, 74, 76, 70, 64),
    -- Kai Tanaka — 1 project
    ('b2e44001-0000-0000-0000-00000000000e'::uuid, 'a1d3e500-0000-0000-0000-000000000009'::uuid,
      'Vibedeck', 'github.com/kai-tanaka/vibedeck', 'vibedeck.pages.dev',
      'Mood-board search for indie devs — paste a vibe, get UI references that match.',
      array['nextjs','openai','cloudflare'],
      59, 86, 81, 80, 74),
    -- Noor Saleh — 1 project
    ('b2e44001-0000-0000-0000-00000000000f'::uuid, 'a1d3e500-0000-0000-0000-00000000000a'::uuid,
      'GreenLeaf', 'github.com/noor-saleh/greenleaf', 'greenleaf.fly.dev',
      'Plant watering schedules that actually account for your apartment''s light.',
      array['python','fastapi','sqlite'],
      47, 68, 72, 64, 60),
    -- Tess Mwangi — 2 projects
    ('b2e44001-0000-0000-0000-000000000010'::uuid, 'a1d3e500-0000-0000-0000-00000000000b'::uuid,
      'OfferLetter', 'github.com/tessmwangi/offerletter', 'offerletter.app',
      'Generates compensation breakdowns candidates actually understand — equity, cliff, the lot.',
      array['nextjs','typescript','stripe','postgres'],
      67, 91, 88, 87, 80),
    ('b2e44001-0000-0000-0000-000000000011'::uuid, 'a1d3e500-0000-0000-0000-00000000000b'::uuid,
      'Roomscape', 'github.com/tessmwangi/roomscape', 'roomscape.pages.dev',
      'Floor plans you can edit in the browser. Drag-drop furniture, export to PDF.',
      array['svelte','typescript','cloudflare'],
      57, 83, 80, 78, 72)
)
insert into projects (
  id, project_name, creator_id, creator_name, creator_email,
  github_url, live_url, description, tech_layers,
  lh_performance, lh_accessibility, lh_best_practices, lh_seo,
  github_accessible,
  score_auto, score_forecast, score_community, score_total,
  status, season,
  created_at, updated_at,
  is_seed
)
select
  r.pid,
  r.name,
  r.creator_uuid,
  (select display_name from members where id = r.creator_uuid),
  (select email        from members where id = r.creator_uuid),
  'https://' || r.github,
  'https://' || r.live,
  r.descr,
  r.layers,
  r.lh_perf, r.lh_a11y, r.lh_bp, r.lh_seo,
  true,
  -- score_auto on a 0-50 scale (audit pillar half of the final 100);
  -- polish is the user-facing 0-100 result, so scale back down.
  round(r.polish * 0.5)::int,
  round(((random() * 6) + 8))::int,     -- 8-14 forecast points
  round(((random() * 4) + 3))::int,     -- 3-7 community points
  r.polish,                              -- score_total = polish display
  'active',
  'season_zero',
  now() - (random() * interval '21 days' + interval '2 days'),
  now() - (random() * interval '5  days'),
  true
from rows r
on conflict (id) do nothing;


-- ── 3. analysis_snapshots — one initial snapshot per project ───────
-- rich_analysis carries scout_brief.strengths/.weaknesses (the canonical
-- bullets ResultCard reads from). Templates are paraphrased Claude-
-- style sentences so they look engine-authored.

insert into analysis_snapshots (
  id, project_id, created_at, trigger_type, triggered_by,
  score_auto, score_forecast, score_community, score_total,
  axis_scores, lighthouse, github_signals, rich_analysis,
  model_version
)
select
  gen_random_uuid(),
  p.id,
  p.created_at + interval '5 minutes',
  'initial',
  p.creator_id,
  p.score_auto,
  p.score_forecast,
  p.score_community,
  p.score_total,
  jsonb_build_object(
    'lighthouse',  p.score_auto * 0.4,
    'live_url',    5,
    'completeness',2,
    'maturity',    p.score_auto * 0.24,
    'hygiene',     p.score_auto * 0.10
  ),
  jsonb_build_object(
    'performance',     p.lh_performance,
    'accessibility',   p.lh_accessibility,
    'bestPractices',   p.lh_best_practices,
    'seo',             p.lh_seo
  ),
  jsonb_build_object(
    'accessible',  true,
    'stars',       (random() * 80)::int,
    'forks',       (random() * 6)::int,
    'open_issues', (random() * 4)::int
  ),
  jsonb_build_object(
    'scout_brief', jsonb_build_object(
      'strengths', jsonb_build_array(
        jsonb_build_object('axis','Lighthouse','bullet',
          'Mobile Lighthouse landed in the high 80s · LCP under 2.4s on a throttled connection.'),
        jsonb_build_object('axis','Routes',    'bullet',
          'Every primary route returns 200 OK · sitemap + canonical are wired.'),
        jsonb_build_object('axis','Stack',     'bullet',
          'Tech mix shows a clean frontend/backend split with a deployment story committed to the repo.')
      ),
      'weaknesses', jsonb_build_array(
        jsonb_build_object('axis','Security',   'bullet',
          'CSP and X-Frame-Options headers missing · open to clickjacking + inline-script injection.'),
        jsonb_build_object('axis','Social',     'bullet',
          'og:image is absent · social shares fall back to a plain favicon preview.'),
        jsonb_build_object('axis','Production', 'bullet',
          'No CI workflow detected · changes ship without an automated test pass.')
      )
    )
  ),
  'claude-sonnet-4-6'
from projects p
where p.is_seed
  and not exists (select 1 from analysis_snapshots s where s.project_id = p.id);

commit;

-- Sanity counters — run after this script to confirm the surfaces will
-- light up:
--   select count(*) from members  where is_seed;  -- expect 11
--   select count(*) from projects where is_seed;  -- expect 17
--   select count(*) from analysis_snapshots where project_id in
--     (select id from projects where is_seed);    -- expect 17
