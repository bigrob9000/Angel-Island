-- Angel Island: DM invites, conversations, messages (spec-aligned)
-- Run in Supabase SQL Editor AFTER 001_rooms_and_posts.sql
-- Do NOT run 002_chat_invites_* if you use this file.

create extension if not exists pgcrypto;

-- 1) Enum types
do $$ begin
  create type dm_invite_status as enum ('pending', 'accepted', 'not_a_fit', 'canceled', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dm_conversation_status as enum ('active', 'paused', 'closed');
exception when duplicate_object then null; end $$;

-- 2) DM Invites
create table if not exists public.dm_invites (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  context_text text null,
  status dm_invite_status not null default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz null,
  conversation_id uuid null,
  constraint dm_invites_no_self_invite check (from_user_id <> to_user_id)
);

create unique index if not exists dm_invites_unique_pair
  on public.dm_invites(from_user_id, to_user_id);

create index if not exists dm_invites_to_user_status_created
  on public.dm_invites(to_user_id, status, created_at desc);

create index if not exists dm_invites_from_user_status_created
  on public.dm_invites(from_user_id, status, created_at desc);

-- 3) DM Conversations (user_a_id = least, user_b_id = greatest)
create table if not exists public.dm_conversations (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references auth.users(id) on delete cascade,
  user_b_id uuid not null references auth.users(id) on delete cascade,
  status dm_conversation_status not null default 'active',
  created_at timestamptz not null default now(),
  paused_at timestamptz null,
  closed_at timestamptz null,
  constraint dm_conversations_no_self check (user_a_id <> user_b_id),
  constraint dm_conversations_normalized_pair check (user_a_id < user_b_id)
);

create unique index if not exists dm_conversations_unique_pair
  on public.dm_conversations(user_a_id, user_b_id);

create index if not exists dm_conversations_user_a
  on public.dm_conversations(user_a_id);

create index if not exists dm_conversations_user_b
  on public.dm_conversations(user_b_id);

alter table public.dm_invites
  drop constraint if exists dm_invites_conversation_id_fkey;

alter table public.dm_invites
  add constraint dm_invites_conversation_id_fkey
  foreign key (conversation_id) references public.dm_conversations(id) on delete set null;

create index if not exists dm_invites_conversation_id
  on public.dm_invites(conversation_id);

-- 4) DM Messages
create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists dm_messages_conversation_created
  on public.dm_messages(conversation_id, created_at asc);

create index if not exists dm_messages_sender_created
  on public.dm_messages(sender_id, created_at desc);

-- 5) Invite limit enforcer
create or replace function public.can_send_dm_invite(p_from uuid, p_to uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  pending_count int;
  daily_count int;
begin
  if p_from = p_to then
    return false;
  end if;

  if exists (
    select 1 from public.dm_invites
    where from_user_id = p_from and to_user_id = p_to
  ) then
    return false;
  end if;

  select count(*) into pending_count
  from public.dm_invites
  where from_user_id = p_from and status = 'pending';

  if pending_count >= 5 then
    return false;
  end if;

  select count(*) into daily_count
  from public.dm_invites
  where from_user_id = p_from
    and created_at >= (now() - interval '24 hours');

  if daily_count >= 3 then
    return false;
  end if;

  return true;
end;
$$;

revoke all on function public.can_send_dm_invite(uuid, uuid) from public;
grant execute on function public.can_send_dm_invite(uuid, uuid) to authenticated;

-- 6) Create conversation when invite is accepted
create or replace function public.handle_dm_invite_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  conv_id uuid;
  norm_a uuid;
  norm_b uuid;
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if old.status = 'pending' and new.status <> 'pending' then
      new.resolved_at := now();
    end if;

    if old.status = 'pending' and new.status = 'accepted' then
      norm_a := least(new.from_user_id, new.to_user_id);
      norm_b := greatest(new.from_user_id, new.to_user_id);

      select id into conv_id
      from public.dm_conversations
      where user_a_id = norm_a and user_b_id = norm_b;

      if conv_id is null then
        insert into public.dm_conversations (user_a_id, user_b_id, status)
        values (norm_a, norm_b, 'active')
        returning id into conv_id;
      end if;

      new.conversation_id := conv_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_dm_invites_status_change on public.dm_invites;
create trigger trg_dm_invites_status_change
before update of status on public.dm_invites
for each row
execute function public.handle_dm_invite_status_change();

-- 7) Conversation status transitions
create or replace function public.enforce_dm_conversation_transitions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.status = 'closed' then
      raise exception 'Conversation is closed';
    end if;

    if new.status = 'paused' and old.status <> 'paused' then
      new.paused_at := now();
    end if;

    if new.status = 'closed' and old.status <> 'closed' then
      new.closed_at := now();
    end if;

    if old.status = 'active' and new.status not in ('active', 'paused', 'closed') then
      raise exception 'Invalid status transition';
    end if;

    if old.status = 'paused' and new.status not in ('paused', 'active', 'closed') then
      raise exception 'Invalid status transition';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_dm_conversation_transitions on public.dm_conversations;
create trigger trg_dm_conversation_transitions
before update of status on public.dm_conversations
for each row
execute function public.enforce_dm_conversation_transitions();

-- 8) RLS
alter table public.dm_invites enable row level security;
alter table public.dm_conversations enable row level security;
alter table public.dm_messages enable row level security;

drop policy if exists "dm_invites_select_participants" on public.dm_invites;
create policy "dm_invites_select_participants"
on public.dm_invites for select to authenticated
using (auth.uid() = from_user_id or auth.uid() = to_user_id);

drop policy if exists "dm_invites_insert_sender_with_limits" on public.dm_invites;
create policy "dm_invites_insert_sender_with_limits"
on public.dm_invites for insert to authenticated
with check (
  auth.uid() = from_user_id
  and public.can_send_dm_invite(from_user_id, to_user_id)
  and status = 'pending'
);

drop policy if exists "dm_invites_update_recipient_resolve" on public.dm_invites;
create policy "dm_invites_update_recipient_resolve"
on public.dm_invites for update to authenticated
using (auth.uid() = to_user_id and status = 'pending')
with check (
  auth.uid() = to_user_id
  and status in ('accepted', 'not_a_fit')
);

drop policy if exists "dm_invites_update_sender_cancel" on public.dm_invites;
create policy "dm_invites_update_sender_cancel"
on public.dm_invites for update to authenticated
using (auth.uid() = from_user_id and status = 'pending')
with check (auth.uid() = from_user_id and status = 'canceled');

drop policy if exists "dm_conversations_select_participants" on public.dm_conversations;
create policy "dm_conversations_select_participants"
on public.dm_conversations for select to authenticated
using (auth.uid() = user_a_id or auth.uid() = user_b_id);

drop policy if exists "dm_conversations_update_participants" on public.dm_conversations;
create policy "dm_conversations_update_participants"
on public.dm_conversations for update to authenticated
using (auth.uid() = user_a_id or auth.uid() = user_b_id)
with check (auth.uid() = user_a_id or auth.uid() = user_b_id);

revoke insert on public.dm_conversations from authenticated;

drop policy if exists "dm_messages_select_participants" on public.dm_messages;
create policy "dm_messages_select_participants"
on public.dm_messages for select to authenticated
using (
  exists (
    select 1 from public.dm_conversations c
    where c.id = conversation_id
      and (auth.uid() = c.user_a_id or auth.uid() = c.user_b_id)
  )
);

drop policy if exists "dm_messages_insert_active_only" on public.dm_messages;
create policy "dm_messages_insert_active_only"
on public.dm_messages for insert to authenticated
with check (
  auth.uid() = sender_id
  and exists (
    select 1 from public.dm_conversations c
    where c.id = conversation_id
      and c.status = 'active'
      and (auth.uid() = c.user_a_id or auth.uid() = c.user_b_id)
  )
);

revoke update, delete on public.dm_messages from authenticated;
