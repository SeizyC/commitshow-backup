-- Form-agnostic 4-axis benchmark (Quality · Trust · Activity · Transparency),
-- 0-100 each + overall. Deterministic, reproducible signals per form factor.
alter table listings add column if not exists benchmark jsonb;
grant select on listings to anon, authenticated;
