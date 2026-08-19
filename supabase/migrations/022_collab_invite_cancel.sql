-- Angel Island: Allow senders to cancel pending collab invites
-- Run in Supabase SQL Editor after 003_collab_invites.sql

alter table public.collab_invites drop constraint if exists collab_invites_status_check;

alter table public.collab_invites
  add constraint collab_invites_status_check
  check (status in ('pending', 'interested', 'maybe', 'not_fit', 'cancelled'));

drop policy if exists "Sender can cancel pending collab invite" on public.collab_invites;

create policy "Sender can cancel pending collab invite"
  on public.collab_invites for update to authenticated
  using (auth.uid() = sender_id and status = 'pending')
  with check (auth.uid() = sender_id and status = 'cancelled');
