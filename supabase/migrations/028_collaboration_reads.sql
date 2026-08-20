-- Angel Island: per-user collaboration read state (syncs unread badges across devices)

create table if not exists public.collaboration_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  collaboration_id uuid not null references public.collaborations(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, collaboration_id)
);

create index if not exists idx_collaboration_reads_user on public.collaboration_reads(user_id);

alter table public.collaboration_reads enable row level security;

create policy "Users can view own collaboration reads"
  on public.collaboration_reads for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own collaboration reads"
  on public.collaboration_reads for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.collaborations c
      join public.collab_invites ci on ci.id = c.collab_invite_id
      where c.id = collaboration_id
        and (ci.sender_id = auth.uid() or ci.receiver_id = auth.uid())
    )
  );

create policy "Users can update own collaboration reads"
  on public.collaboration_reads for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.collaborations c
      join public.collab_invites ci on ci.id = c.collab_invite_id
      where c.id = collaboration_id
        and (ci.sender_id = auth.uid() or ci.receiver_id = auth.uid())
    )
  );

grant select, insert, update on public.collaboration_reads to authenticated;
