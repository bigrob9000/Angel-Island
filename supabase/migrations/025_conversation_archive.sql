-- Angel Island: per-user conversation archive (hide from message list)
-- Ending a conversation is shared; archiving only hides it for one participant.

create table if not exists public.conversation_archive (
  user_id uuid not null references auth.users(id) on delete cascade,
  invite_id uuid not null references public.chat_invites(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (user_id, invite_id)
);

create index if not exists idx_conversation_archive_user on public.conversation_archive(user_id);

alter table public.conversation_archive enable row level security;

create policy "Users can view own archived conversations"
  on public.conversation_archive for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can archive conversations they participate in"
  on public.conversation_archive for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.chat_invites ci
      where ci.id = invite_id
        and ci.status = 'accepted'
        and (ci.sender_id = auth.uid() or ci.receiver_id = auth.uid())
    )
  );

create policy "Users can unarchive own conversations"
  on public.conversation_archive for delete to authenticated
  using (auth.uid() = user_id);
