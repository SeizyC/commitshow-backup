-- admin_crawler_stats — AI-crawler activity dashboard for the legit admin.
--
-- The middleware logs every AI-bot hit to ai_crawler_hits (RLS on). Rather than
-- expose raw rows, this SECURITY DEFINER RPC checks is_admin and returns the
-- aggregates the dashboard needs in one call (same pattern as
-- admin_member_login_methods). Read-only · admin-gated.
create or replace function public.admin_crawler_stats()
returns jsonb language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  if not exists (select 1 from members where id = auth.uid() and is_admin) then
    raise exception 'not authorized';
  end if;

  select jsonb_build_object(
    'totals', (
      select jsonb_build_object(
        'all',  count(*),
        'h24',  count(*) filter (where created_at > now() - interval '24 hours'),
        'd7',   count(*) filter (where created_at > now() - interval '7 days'),
        'd30',  count(*) filter (where created_at > now() - interval '30 days'),
        'bots', count(distinct ua_kind),
        'latest', max(created_at)
      ) from ai_crawler_hits
    ),
    'by_bot', (
      select coalesce(jsonb_agg(jsonb_build_object('kind', ua_kind, 'n', c, 'last_seen', ls) order by c desc), '[]'::jsonb)
      from (
        select ua_kind, count(*) c, max(created_at) ls
        from ai_crawler_hits where created_at > now() - interval '30 days'
        group by ua_kind
      ) t
    ),
    'by_day', (
      select coalesce(jsonb_agg(jsonb_build_object('d', d, 'n', c) order by d), '[]'::jsonb)
      from (
        select date_trunc('day', created_at)::date d, count(*) c
        from ai_crawler_hits where created_at > now() - interval '14 days'
        group by 1
      ) t
    ),
    'top_paths', (
      select coalesce(jsonb_agg(jsonb_build_object('path', path, 'n', c) order by c desc), '[]'::jsonb)
      from (
        select path, count(*) c
        from ai_crawler_hits where created_at > now() - interval '7 days'
        group by path order by c desc limit 15
      ) t
    ),
    'by_status', (
      select coalesce(jsonb_agg(jsonb_build_object('code', status_code, 'n', c) order by c desc), '[]'::jsonb)
      from (
        select status_code, count(*) c
        from ai_crawler_hits where created_at > now() - interval '7 days'
        group by status_code
      ) t
    ),
    'recent', (
      select coalesce(jsonb_agg(jsonb_build_object('at', created_at, 'kind', ua_kind, 'path', path, 'code', status_code) order by created_at desc), '[]'::jsonb)
      from (
        select created_at, ua_kind, path, status_code
        from ai_crawler_hits order by created_at desc limit 40
      ) t
    )
  ) into result;

  return result;
end $$;

revoke all on function public.admin_crawler_stats() from public, anon;
grant execute on function public.admin_crawler_stats() to authenticated;
