-- Grants for group collaboration tables (RLS policies exist but reads were failing silently).

grant select on public.group_collab_invites to authenticated;
grant select on public.group_collab_invite_recipients to authenticated;
grant select, update on public.group_collab_invite_recipients to authenticated;
grant select on public.collaboration_members to authenticated;
grant select, insert on public.collaboration_messages to authenticated;
grant select on public.group_collab_member_invites to authenticated;

-- Recipients on the same invite can see each other (for "with X, Y" labels).
drop policy if exists "group_collab_recipients_select" on public.group_collab_invite_recipients;
create policy "group_collab_recipients_select"
  on public.group_collab_invite_recipients for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.group_collab_invites g
      where g.id = group_invite_id and g.creator_id = auth.uid()
    )
    or exists (
      select 1 from public.group_collab_invite_recipients mine
      where mine.group_invite_id = group_collab_invite_recipients.group_invite_id
        and mine.user_id = auth.uid()
    )
  );
