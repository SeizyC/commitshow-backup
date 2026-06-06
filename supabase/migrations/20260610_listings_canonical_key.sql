-- Cross-run / cross-source dedup key. The same product surfaced by HN + PH +
-- a subreddit + X must resolve to ONE listing. canonical_key is derived from
-- the product's primary URL (registrable domain, or a stable store/repo id):
--   web:<etld+1> · github:<owner/repo> · npm:<pkg> · appstore:<id> · play:<pkg> · chrome:<id>
alter table listings add column if not exists canonical_key text;
create unique index if not exists listings_canonical_key_uk on listings (canonical_key) where canonical_key is not null;
grant select on listings to anon, authenticated;
