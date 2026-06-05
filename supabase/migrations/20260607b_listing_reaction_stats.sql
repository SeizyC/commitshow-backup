-- Lifetime reaction aggregates per listing, used as a default-sort signal
-- on the directory feed. No time window — all-time totals.
create or replace view listing_reaction_stats as
select
  listing_id,
  count(*) filter (where reaction = 'uses_it')                                      as uses_count,
  count(*) filter (where reaction in ('works_great','easy','fast','great_support')) as positive_count,
  count(*) filter (where reaction in ('buggy','overpriced','missing_features'))     as negative_count,
  count(*)                                                                          as reaction_total
from listing_reactions
group by listing_id;

grant select on listing_reaction_stats to anon, authenticated;
