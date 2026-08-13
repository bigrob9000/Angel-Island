-- Angel Island: Collab invites (Invite to collaborate from profile)
-- Run in Supabase SQL Editor after 002

create table if not exists public.collab_invites (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  about text not null,
  message text,
  role text,
  pace text check (pace in ('low-pressure', 'structured', 'flexible')),
  status text not null default 'pending' check (status in ('pending', 'interested', 'maybe', 'not_fit')),
  created_at timestamptz default now()
);

create index if not exists idx_collab_invites_receiver on public.collab_invites(receiver_id);
create index if not exists idx_collab_invites_sender on public.collab_invites(sender_id);

alter table public.collab_invites enable row level security;

create policy "Collab invites visible to sender or receiver"
  on public.collab_invites for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "User can send collab invite"
  on public.collab_invites for insert to authenticated
  with check (auth.uid() = sender_id);

create policy "Receiver can respond to collab invite"
  on public.collab_invites for update to authenticated
  using (auth.uid() = receiver_id and status = 'pending')
  with check (auth.uid() = receiver_id and status in ('interested', 'maybe', 'not_fit'));
