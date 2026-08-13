-- Angel Island: Chat invites and messages (DM / Invites)
-- Run in Supabase SQL Editor after 001_rooms_and_posts.sql

-- One row per (sender, receiver) ever. status: pending, accepted, declined, cancelled.
create table if not exists public.chat_invites (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  optional_message text,
  created_at timestamptz default now(),
  unique(sender_id, receiver_id)
);

create index if not exists idx_chat_invites_receiver on public.chat_invites(receiver_id);
create index if not exists idx_chat_invites_sender on public.chat_invites(sender_id);

-- Messages only exist for accepted invites.
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.chat_invites(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

create index if not exists idx_messages_invite on public.messages(invite_id);

-- RLS
alter table public.chat_invites enable row level security;
alter table public.messages enable row level security;

-- Invites: sender or receiver can read
create policy "Invites visible to sender or receiver"
  on public.chat_invites for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Sender can create (one per pair; app checks limits)
create policy "User can send invite"
  on public.chat_invites for insert to authenticated
  with check (auth.uid() = sender_id);

-- Sender can cancel (set status cancelled) if pending; receiver can accept/decline
create policy "Sender can cancel own pending invite"
  on public.chat_invites for update to authenticated
  using (auth.uid() = sender_id and status = 'pending')
  with check (auth.uid() = sender_id and status = 'cancelled');

create policy "Receiver can accept or decline"
  on public.chat_invites for update to authenticated
  using (auth.uid() = receiver_id and status = 'pending')
  with check (auth.uid() = receiver_id and status in ('accepted', 'declined'));

-- Messages: only conversation participants can read/insert (invite must be accepted)
create policy "Messages visible to conversation participants"
  on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.chat_invites c
      where c.id = invite_id and c.status = 'accepted'
      and (c.sender_id = auth.uid() or c.receiver_id = auth.uid())
    )
  );

create policy "Participant can send message"
  on public.messages for insert to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.chat_invites c
      where c.id = invite_id and c.status = 'accepted'
      and (c.sender_id = auth.uid() or c.receiver_id = auth.uid())
    )
  );
