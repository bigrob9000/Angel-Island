-- Angel Island: let senders withdraw stuck 1:1 collab invites (pending / interested / maybe)
-- Cleans up alignment workspaces that never fully opened.

create or replace function public.withdraw_collab_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.collab_invites%rowtype;
begin
  select * into v_invite from public.collab_invites where id = p_invite_id for update;
  if not found then
    raise exception 'Invite not found';
  end if;

  if v_invite.sender_id is distinct from auth.uid() then
    raise exception 'Only the sender can withdraw this invite';
  end if;

  if v_invite.status not in ('pending', 'interested', 'maybe') then
    raise exception 'This invite can no longer be withdrawn';
  end if;

  if exists (
    select 1 from public.collaborations c
    where c.collab_invite_id = p_invite_id
      and c.status in ('active', 'paused')
  ) then
    raise exception 'End the open collaboration before withdrawing this invite';
  end if;

  delete from public.collaborations
  where collab_invite_id = p_invite_id
    and status in ('pending_alignment', 'ended');

  update public.collab_invites
  set status = 'cancelled'
  where id = p_invite_id;
end;
$$;

grant execute on function public.withdraw_collab_invite(uuid) to authenticated;
