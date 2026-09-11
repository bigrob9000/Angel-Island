-- Angel Island: mutual intent confirmation before 1:1 collab workspace opens

alter table public.collab_invites
  add column if not exists inviter_aligned_at timestamptz,
  add column if not exists invitee_aligned_at timestamptz;

alter table public.collaborations drop constraint if exists collaborations_status_check;

alter table public.collaborations
  add constraint collaborations_status_check
  check (status in ('pending_alignment', 'active', 'paused', 'ended'));

drop policy if exists "Participants can confirm collab alignment" on public.collab_invites;

create policy "Participants can confirm collab alignment"
  on public.collab_invites for update to authenticated
  using (
    status = 'interested'
    and (auth.uid() = sender_id or auth.uid() = receiver_id)
  )
  with check (
    status = 'interested'
    and (auth.uid() = sender_id or auth.uid() = receiver_id)
  );
