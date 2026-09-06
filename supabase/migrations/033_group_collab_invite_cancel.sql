-- Allow group collab creators to cancel pending invites.

create or replace function public.cancel_group_collab_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  update public.group_collab_invites
  set status = 'cancelled'
  where id = p_invite_id
    and creator_id = v_user
    and status = 'pending';

  if not found then
    raise exception 'Invite not found or cannot be cancelled';
  end if;
end;
$$;

grant execute on function public.cancel_group_collab_invite(uuid) to authenticated;
