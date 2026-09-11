-- Angel Island: reliable 1:1 collaboration workspace creation (run after 041)
-- Client inserts were failing on RLS/grants; match the group collab RPC pattern.

create or replace function public.create_collaboration_workspace(
  p_collab_invite_id uuid,
  p_chat_invite_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_collab_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.collab_invites ci
    where ci.id = p_collab_invite_id
      and ci.status = 'interested'
      and (ci.sender_id = v_user or ci.receiver_id = v_user)
  ) then
    raise exception 'Not allowed to open this collaboration workspace';
  end if;

  select id into v_collab_id
  from public.collaborations
  where collab_invite_id = p_collab_invite_id;

  if v_collab_id is not null then
    return v_collab_id;
  end if;

  insert into public.collaborations (collab_invite_id, chat_invite_id, status)
  values (p_collab_invite_id, p_chat_invite_id, 'pending_alignment')
  returning id into v_collab_id;

  return v_collab_id;
end;
$$;

grant execute on function public.create_collaboration_workspace(uuid, uuid) to authenticated;
grant insert on public.collaborations to authenticated;
