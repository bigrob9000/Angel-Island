-- Fix group collab invite visibility: replace recursive RLS with security-definer helpers
-- and a single RPC to load pending sent/received invites.

create or replace function public.can_view_group_collab_invite(p_invite_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_collab_invites g
    where g.id = p_invite_id and g.creator_id = p_user_id
  )
  or exists (
    select 1 from public.group_collab_invite_recipients r
    where r.group_invite_id = p_invite_id and r.user_id = p_user_id
  );
$$;

create or replace function public.can_view_group_collab_recipient(
  p_recipient_row public.group_collab_invite_recipients,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_recipient_row.user_id = p_user_id
    or public.can_view_group_collab_invite(p_recipient_row.group_invite_id, p_user_id);
$$;

drop policy if exists "group_collab_invites_select" on public.group_collab_invites;
create policy "group_collab_invites_select"
  on public.group_collab_invites for select to authenticated
  using (public.can_view_group_collab_invite(id, auth.uid()));

drop policy if exists "group_collab_recipients_select" on public.group_collab_invite_recipients;
create policy "group_collab_recipients_select"
  on public.group_collab_invite_recipients for select to authenticated
  using (public.can_view_group_collab_recipient(group_collab_invite_recipients, auth.uid()));

-- Reliable loader bypassing client-side RLS edge cases.
create or replace function public.list_pending_group_collab_invites()
returns json
language plpgsql
stable
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

  perform public.expire_stale_group_collab_invites();

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

grant execute on function public.can_view_group_collab_invite(uuid, uuid) to authenticated;
grant execute on function public.can_view_group_collab_recipient(public.group_collab_invite_recipients, uuid) to authenticated;
grant execute on function public.list_pending_group_collab_invites() to authenticated;
