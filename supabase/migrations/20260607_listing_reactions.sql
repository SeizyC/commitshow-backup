-- Tag reactions for directory listings (legit / v2)
-- Low-friction feedback layer that sits beside star/text reviews:
-- a signed-in member taps preset reaction tags; each (member, listing, tag)
-- is unique so a tag is a toggle. Aggregate counts render publicly.

create table if not exists listing_reactions (
  listing_id uuid references listings(id) on delete cascade not null,
  member_id  uuid references members(id)  on delete cascade not null,
  reaction   text not null check (reaction in (
    'uses_it',          -- "I use this"     (usage signal · primary)
    'works_great',      -- "Works great"
    'easy',             -- "Easy to use"
    'fast',             -- "Fast & polished"
    'great_support',    -- "Great support"
    'buggy',            -- "Buggy / rough"
    'overpriced',       -- "Overpriced"
    'missing_features'  -- "Missing features"
  )),
  created_at timestamptz default now(),
  primary key (listing_id, member_id, reaction)
);

create index if not exists listing_reactions_listing_idx on listing_reactions (listing_id);

alter table listing_reactions enable row level security;

drop policy if exists listing_reactions_public_read on listing_reactions;
create policy listing_reactions_public_read
  on listing_reactions for select using (true);

drop policy if exists listing_reactions_insert_own on listing_reactions;
create policy listing_reactions_insert_own
  on listing_reactions for insert with check (auth.uid() = member_id);

drop policy if exists listing_reactions_delete_own on listing_reactions;
create policy listing_reactions_delete_own
  on listing_reactions for delete using (auth.uid() = member_id);

grant select on listing_reactions to anon, authenticated;
grant insert, delete on listing_reactions to authenticated;
