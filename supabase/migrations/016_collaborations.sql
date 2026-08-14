-- Angel Island: Collaboration workspaces (after collab invite → interested)

create table if not exists public.collaborations (
  id uuid primary key default gen_random_uuid(),
  collab_invite_id uuid not null unique references public.collab_invites(id) on delete cascade,
  chat_invite_id uuid references public.chat_invites(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'paused', 'ended')),
  paused_at timestamptz,
  paused_by uuid references auth.users(id),
  ended_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_collaborations_status on public.collaborations(status);
create index if not exists idx_collaborations_chat on public.collaborations(chat_invite_id);

create table if not exists public.collaboration_entries (
  id uuid primary key default gen_random_uuid(),
  collaboration_id uuid not null references public.collaborations(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  entry_type text not null check (entry_type in ('note', 'reference', 'step')),
  body text,
  url text,
  is_done boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_collaboration_entries_collab on public.collaboration_entries(collaboration_id);

alter table public.collaborations enable row level security;
alter table public.collaboration_entries enable row level security;

-- Participants can read collaborations tied to their collab invites
drop policy if exists "collaborations_select_participants" on public.collaborations;
create policy "collaborations_select_participants"
  on public.collaborations for select to authenticated
  using (
    exists (
      select 1 from public.collab_invites ci
      where ci.id = collab_invite_id
        and (ci.sender_id = auth.uid() or ci.receiver_id = auth.uid())
    )
  );

drop policy if exists "collaborations_insert_participants" on public.collaborations;
create policy "collaborations_insert_participants"
  on public.collaborations for insert to authenticated
  with check (
    exists (
      select 1 from public.collab_invites ci
      where ci.id = collab_invite_id
        and ci.status = 'interested'
        and (ci.sender_id = auth.uid() or ci.receiver_id = auth.uid())
    )
  );

drop policy if exists "collaborations_update_participants" on public.collaborations;
create policy "collaborations_update_participants"
  on public.collaborations for update to authenticated
  using (
    exists (
      select 1 from public.collab_invites ci
      where ci.id = collab_invite_id
        and (ci.sender_id = auth.uid() or ci.receiver_id = auth.uid())
    )
  );

drop policy if exists "collaboration_entries_select_participants" on public.collaboration_entries;
create policy "collaboration_entries_select_participants"
  on public.collaboration_entries for select to authenticated
  using (
    exists (
      select 1
      from public.collaborations c
      join public.collab_invites ci on ci.id = c.collab_invite_id
      where c.id = collaboration_id
        and (ci.sender_id = auth.uid() or ci.receiver_id = auth.uid())
    )
  );

drop policy if exists "collaboration_entries_insert_active" on public.collaboration_entries;
create policy "collaboration_entries_insert_active"
  on public.collaboration_entries for insert to authenticated
  with check (
    auth.uid() = author_id
    and exists (
      select 1
      from public.collaborations c
      join public.collab_invites ci on ci.id = c.collab_invite_id
      where c.id = collaboration_id
        and c.status = 'active'
        and (ci.sender_id = auth.uid() or ci.receiver_id = auth.uid())
    )
  );

drop policy if exists "collaboration_entries_update_own" on public.collaboration_entries;
create policy "collaboration_entries_update_own"
  on public.collaboration_entries for update to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "collaboration_entries_delete_own" on public.collaboration_entries;
create policy "collaboration_entries_delete_own"
  on public.collaboration_entries for delete to authenticated
  using (auth.uid() = author_id);

-- Backfill workspaces for collab invites already marked interested
insert into public.collaborations (collab_invite_id, status)
select ci.id, 'active'
from public.collab_invites ci
where ci.status = 'interested'
  and not exists (
    select 1 from public.collaborations c where c.collab_invite_id = ci.id
  );
