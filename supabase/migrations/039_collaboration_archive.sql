-- Angel Island: per-user collaboration archive (hide from Past list)
-- Ending a collaboration is shared; archiving only hides it for one participant.

create table if not exists public.collaboration_archive (
  user_id uuid not null references auth.users(id) on delete cascade,
  collaboration_id uuid not null references public.collaborations(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (user_id, collaboration_id)
);

create index if not exists idx_collaboration_archive_user on public.collaboration_archive(user_id);

alter table public.collaboration_archive enable row level security;

create policy "Users can view own archived collaborations"
  on public.collaboration_archive for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can archive ended collaborations they participate in"
  on public.collaboration_archive for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.collaborations c
      where c.id = collaboration_id
        and c.status = 'ended'
        and public.is_collaboration_participant(c.id, auth.uid())
    )
  );

create policy "Users can unarchive own collaborations"
  on public.collaboration_archive for delete to authenticated
  using (auth.uid() = user_id);

-- Either participant can permanently delete an ended collaboration (shared row).

create policy "Participants can delete ended collaborations"
  on public.collaborations for delete to authenticated
  using (
    status = 'ended'
    and public.is_collaboration_participant(id, auth.uid())
  );

grant select, insert, delete on public.collaboration_archive to authenticated;
grant delete on public.collaborations to authenticated;
