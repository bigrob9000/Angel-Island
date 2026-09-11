-- Angel Island: let receivers revisit collab invites they marked "maybe"

drop policy if exists "Receiver can respond to collab invite" on public.collab_invites;

create policy "Receiver can respond to collab invite"
  on public.collab_invites for update to authenticated
  using (auth.uid() = receiver_id and status in ('pending', 'maybe'))
  with check (auth.uid() = receiver_id and status in ('interested', 'maybe', 'not_fit'));
