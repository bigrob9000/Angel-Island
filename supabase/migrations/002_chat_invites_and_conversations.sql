-- Chat invites and conversations (DM / Invites MVP)
-- Run in Supabase SQL Editor after 001_rooms_and_posts.sql

-- One row per (sender, receiver) pair — one invite ever. status: pending | accepted | declined
create table if not exists public.chat_invites (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  message text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz default now(),
  unique(sender_id, receiver_id)
);

create index if not exists idx_chat_invites_receiver on public.chat_invites(receiver_id);
create index if not exists idx_chat_invites_sender on public.chat_invites(sender_id);

-- Conversations: created when an invite is accepted. Canonical order (smaller uuid first) for easy lookup.
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references auth.users(id) on delete cascade,
  user_b_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_a_id, user_b_id)
);

create index if not exists idx_conversations_user_a on public.conversations(user_a_id);
create index if not exists idx_conversations_user_b on public.conversations(user_b_id);

-- Messages in a conversation
create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

create index if not exists idx_conv_messages_conversation on public.conversation_messages(conversation_id);

-- RLS
alter table public.chat_invites enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;

-- Chat invites: sender sees own sent, receiver sees own received. Sender insert (own), receiver update (accept/decline), sender delete (cancel pending)
create policy "Users see invites they sent" on public.chat_invites for select to authenticated using (auth.uid() = sender_id);
create policy "Users see invites they received" on public.chat_invites for select to authenticated using (auth.uid() = receiver_id);
create policy "Users can send invite" on public.chat_invites for insert to authenticated with check (auth.uid() = sender_id);
create policy "Receiver can update invite status" on public.chat_invites for update to authenticated using (auth.uid() = receiver_id);
create policy "Sender can cancel pending invite" on public.chat_invites for delete to authenticated using (auth.uid() = sender_id and status = 'pending');

-- Conversations: participants can read (user_a or user_b = me)
create policy "Participants can view conversation" on public.conversations for select to authenticated using (auth.uid() = user_a_id or auth.uid() = user_b_id);
create policy "Participants can create conversation" on public.conversations for insert to authenticated with check (auth.uid() = user_a_id or auth.uid() = user_b_id);

-- Messages: participants can read; author can insert
create policy "Participants can read messages" on public.conversation_messages for select to authenticated using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
  )
);
create policy "Participants can send message" on public.conversation_messages for insert to authenticated with check (auth.uid() = author_id);
