-- Tweet drafts — auto-generated from reports for admin QC, then (later) an
-- auto-upload routine posts the approved ones to @Legit_Show.
create table if not exists tweet_drafts (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null default 'single',   -- single | thread
  source_slug text,                              -- report slug
  group_id    uuid,                              -- groups a thread
  idx         int default 0,                     -- order within a thread
  body        text not null,
  status      text not null default 'draft',     -- draft | approved | posted
  posted_at   timestamptz,
  tweet_url   text,
  created_at  timestamptz default now()
);
create index if not exists tweet_drafts_idx on tweet_drafts (status, group_id, idx);

alter table tweet_drafts enable row level security;
drop policy if exists "admin manage tweet_drafts" on tweet_drafts;
create policy "admin manage tweet_drafts" on tweet_drafts for all
  using (exists (select 1 from members m where m.id = auth.uid() and m.is_admin))
  with check (exists (select 1 from members m where m.id = auth.uid() and m.is_admin));
grant select, insert, update, delete on tweet_drafts to authenticated;
