-- list_pending_group_collab_invites was STABLE but called expire_stale_group_collab_invites(),
-- which UPDATEs rows — PostgreSQL rejects writes inside read-only (STABLE) functions.

create or replace function public.list_pending_group_collab_invites()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_received json;
  v_sent json;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(json_agg(row_to_json(t)), '[]'::json)
  into v_received
  from (
    select
      g.id,
      g.creator_id,
      g.about,
      g.message,
      g.role,
      g.pace,
      g.status,
      g.expires_at,
      g.created_at,
      (
        select coalesce(json_agg(json_build_object(
          'id', r.id,
          'group_invite_id', r.group_invite_id,
          'user_id', r.user_id,
          'status', r.status,
          'responded_at', r.responded_at,
          'created_at', r.created_at
        )), '[]'::json)
        from public.group_collab_invite_recipients r
        where r.group_invite_id = g.id
      ) as recipients
    from public.group_collab_invites g
    join public.group_collab_invite_recipients mine
      on mine.group_invite_id = g.id and mine.user_id = v_user and mine.status = 'pending'
    where g.status = 'pending'
  ) t;

  select coalesce(json_agg(row_to_json(t)), '[]'::json)
  into v_sent
  from (
    select
      g.id,
      g.creator_id,
      g.about,
      g.message,
      g.role,
      g.pace,
      g.status,
      g.expires_at,
      g.created_at,
      (
        select coalesce(json_agg(json_build_object(
          'id', r.id,
          'group_invite_id', r.group_invite_id,
          'user_id', r.user_id,
          'status', r.status,
          'responded_at', r.responded_at,
          'created_at', r.created_at
        )), '[]'::json)
        from public.group_collab_invite_recipients r
        where r.group_invite_id = g.id
      ) as recipients
    from public.group_collab_invites g
    where g.creator_id = v_user and g.status = 'pending'
  ) t;

  return json_build_object('received', v_received, 'sent', v_sent);
end;
$$;

grant execute on function public.list_pending_group_collab_invites() to authenticated;
