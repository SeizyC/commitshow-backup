-- Legit.Show directory — owner-submitted listings.
--
-- The directory has been populated only by auto-discovery. Add a self-serve
-- "submit your service" path: a signed-in member POSTs a URL, the ingest
-- function enriches + benchmarks it like any discovered listing. `submitted_by`
-- attributes it (so the same member can later claim it) and powers a per-member
-- daily rate cap against abuse.

alter table public.listings
  add column if not exists submitted_by uuid references public.members(id) on delete set null;

-- rate-limit count: submissions by a member in the last 24h
create index if not exists listings_submitted_by_idx on public.listings (submitted_by, created_at desc);

-- listings already has table-level SELECT for anon/authenticated; grant the new
-- column explicitly to keep the column-grant discipline (a missing grant is a
-- silent 42501, not an error).
grant select (submitted_by) on public.listings to anon, authenticated;
