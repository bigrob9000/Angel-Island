-- Angel Island: per-user conversation read state (syncs unread badges across devices)

create table if not exists public.conversation_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  invite_id uuid not null references public.chat_invites(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, invite_id)
);

create index if not exists idx_conversation_reads_user on public.conversation_reads(user_id);

alter table public.conversation_reads enable row level security;

create policy "Users can view own conversation reads"
  on public.conversation_reads for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own conversation reads"
  on public.conversation_reads for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.chat_invites ci
      where ci.id = invite_id
        and ci.status = 'accepted'
        and (ci.sender_id = auth.uid() or ci.receiver_id = auth.uid())
    )
  );

create policy "Users can update own conversation reads"
  on public.conversation_reads for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.chat_invites ci
      where ci.id = invite_id
        and ci.status = 'accepted'
        and (ci.sender_id = auth.uid() or ci.receiver_id = auth.uid())
    )
  );

grant select, insert, update on public.conversation_reads to authenticated;
