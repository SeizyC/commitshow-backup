-- Star ratings for directory listings: one 1-5 rating per member per product.
create table if not exists listing_ratings (
  listing_id uuid references listings(id) on delete cascade not null,
  member_id  uuid references members(id)  on delete cascade not null,
  rating     int  not null check (rating between 1 and 5),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (listing_id, member_id)
);
create index if not exists listing_ratings_listing_idx on listing_ratings (listing_id);

alter table listing_ratings enable row level security;
drop policy if exists listing_ratings_read on listing_ratings;
create policy listing_ratings_read on listing_ratings for select using (true);
drop policy if exists listing_ratings_ins on listing_ratings;
create policy listing_ratings_ins on listing_ratings for insert with check (auth.uid() = member_id);
drop policy if exists listing_ratings_upd on listing_ratings;
create policy listing_ratings_upd on listing_ratings for update using (auth.uid() = member_id);
drop policy if exists listing_ratings_del on listing_ratings;
create policy listing_ratings_del on listing_ratings for delete using (auth.uid() = member_id);
grant select on listing_ratings to anon, authenticated;
grant insert, update, delete on listing_ratings to authenticated;

create or replace view listing_rating_stats as
select listing_id, round(avg(rating)::numeric, 2)::float as avg_rating, count(*)::int as rating_count
from listing_ratings group by listing_id;
grant select on listing_rating_stats to anon, authenticated;
