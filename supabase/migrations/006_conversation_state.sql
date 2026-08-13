-- Angel Island: pause / end conversation state
-- Run in Supabase SQL Editor after 002_chat_invites_and_messages.sql

alter table public.chat_invites add column if not exists conversation_status text default 'active';
alter table public.chat_invites add column if not exists paused_at timestamptz;
alter table public.chat_invites add column if not exists ended_at timestamptz;

update public.chat_invites
set conversation_status = 'active'
where conversation_status is null and status = 'accepted';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chat_invites_conversation_status_check'
  ) then
    alter table public.chat_invites
      add constraint chat_invites_conversation_status_check
      check (conversation_status in ('active', 'paused', 'ended'));
  end if;
end $$;

-- Only allow new messages in active conversations
drop policy if exists "Participant can send message" on public.messages;

create policy "Participant can send message"
  on public.messages for insert to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.chat_invites c
      where c.id = invite_id
        and c.status = 'accepted'
        and coalesce(c.conversation_status, 'active') = 'active'
        and (c.sender_id = auth.uid() or c.receiver_id = auth.uid())
    )
  );

-- Participants can pause, resume, or end accepted conversations
drop policy if exists "Participants can manage conversation" on public.chat_invites;

create policy "Participants can manage conversation"
  on public.chat_invites for update to authenticated
  using (
    (auth.uid() = sender_id or auth.uid() = receiver_id)
    and status = 'accepted'
  )
  with check (
    (auth.uid() = sender_id or auth.uid() = receiver_id)
    and status = 'accepted'
    and conversation_status in ('active', 'paused', 'ended')
  );
