-- Directory (Atlas / legit) — third-party service listings, ingested by the directory engine.
-- Distinct from `projects` (member-owned auditions). Listings are crawled, anonymous, public-read.
-- Lives in the same commit.show Supabase (CEO decision 2026-06-06). Domain/brand may split later.

create table if not exists listings (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,           -- /s/<slug>
  name              text not null,
  domain            text not null,
  url               text not null,                  -- official site / product URL
  platform          text,                           -- web · SaaS · iOS · Steam · Open source · npm · MCP server · ...
  category          text,                           -- Sonnet/detected category label
  tagline           text,                           -- short one-liner (Sonnet compose) or meta-description fallback
  description       text,                           -- editorial write-up (Sonnet, grounded-only)
  who_for           jsonb not null default '[]'::jsonb,   -- audience labels (Haiku extract)
  features          jsonb not null default '[]'::jsonb,   -- feature phrases (Haiku extract)
  pricing           text not null default '',       -- "" when not stated on page (grounded-only)
  how_to_use        text not null default '',
  image_url         text,                           -- og:image / twitter:image / apple-touch-icon
  source            text,                           -- 'r/SideProject' · 'Show HN' · 'GitHub' · 'npm'
  source_post_title text,
  meta              text,                           -- ecosystem meta (★ stars · language · keywords)
  has_pricing       boolean not null default false,
  js_starved        boolean not null default false, -- client-rendered; needs deep-probe before rich extract
  enriched          boolean not null default false, -- whether Claude extract+compose ran
  claimed_by        uuid references members(id) on delete set null,  -- claim flow (later)
  info_as_of        date not null default current_date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  last_fetched_at   timestamptz not null default now()
);

create index if not exists listings_category_idx on listings (category);
create index if not exists listings_source_idx   on listings (source);
create index if not exists listings_created_idx  on listings (created_at desc);
create index if not exists listings_platform_idx on listings (platform);

-- Public directory → public read; writes are service_role only (ingest worker bypasses RLS).
alter table listings enable row level security;
drop policy if exists listings_public_read on listings;
create policy listings_public_read on listings for select using (true);
grant select on listings to anon, authenticated;

-- keep updated_at fresh
create or replace function set_listings_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_listings_updated_at on listings;
create trigger trg_listings_updated_at before update on listings
  for each row execute function set_listings_updated_at();
