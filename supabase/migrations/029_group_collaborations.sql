-- Angel Island: Group collaboration invites + workspace group chat
-- Max 6 members (creator + up to 5 invitees). 14-day response window.

create table if not exists public.group_collab_invites (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  about text not null,
  message text,
  role text,
  pace text check (pace in ('low-pressure', 'structured', 'flexible')),
  status text not null default 'pending' check (status in ('pending', 'open', 'expired', 'cancelled')),
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists idx_group_collab_invites_creator on public.group_collab_invites(creator_id);
create index if not exists idx_group_collab_invites_status on public.group_collab_invites(status);

create table if not exists public.group_collab_invite_recipients (
  id uuid primary key default gen_random_uuid(),
  group_invite_id uuid not null references public.group_collab_invites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'interested', 'maybe', 'not_fit')),
  responded_at timestamptz,
  created_at timestamptz default now(),
  unique(group_invite_id, user_id)
);

create index if not exists idx_group_collab_recipients_user on public.group_collab_invite_recipients(user_id);

alter table public.collaborations
  alter column collab_invite_id drop not null;

alter table public.collaborations
  add column if not exists group_collab_invite_id uuid references public.group_collab_invites(id) on delete set null;

alter table public.collaborations
  drop constraint if exists collaborations_source_check;

alter table public.collaborations
  add constraint collaborations_source_check check (
    (collab_invite_id is not null and group_collab_invite_id is null)
    or (collab_invite_id is null and group_collab_invite_id is not null)
  );

create unique index if not exists idx_collaborations_group_invite
  on public.collaborations(group_collab_invite_id)
  where group_collab_invite_id is not null;

create table if not exists public.collaboration_members (
  collaboration_id uuid not null references public.collaborations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_creator boolean not null default false,
  joined_at timestamptz default now(),
  primary key (collaboration_id, user_id)
);

create index if not exists idx_collaboration_members_user on public.collaboration_members(user_id);

create table if not exists public.collaboration_messages (
  id uuid primary key default gen_random_uuid(),
  collaboration_id uuid not null references public.collaborations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

create index if not exists idx_collaboration_messages_collab on public.collaboration_messages(collaboration_id);

create table if not exists public.group_collab_member_invites (
  id uuid primary key default gen_random_uuid(),
  collaboration_id uuid not null references public.collaborations(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'interested', 'maybe', 'not_fit', 'expired', 'cancelled')),
  expires_at timestamptz not null,
  responded_at timestamptz,
  created_at timestamptz default now()
);

create unique index if not exists idx_group_member_invite_pending
  on public.group_collab_member_invites(collaboration_id, user_id)
  where status = 'pending';

create or replace function public.is_collaboration_participant(p_collab_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.collaboration_members cm
    where cm.collaboration_id = p_collab_id and cm.user_id = p_user_id
  )
  or exists (
    select 1
    from public.collaborations c
    join public.collab_invites ci on ci.id = c.collab_invite_id
    where c.id = p_collab_id
      and (ci.sender_id = p_user_id or ci.receiver_id = p_user_id)
  );
$$;

create or replace function public.expire_stale_group_collab_invites()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.group_collab_invites
  set status = 'expired'
  where status = 'pending' and expires_at < now();

  update public.group_collab_member_invites
  set status = 'expired'
  where status = 'pending' and expires_at < now();
end;
$$;

create or replace function public.try_open_group_collab_invite(p_invite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.group_collab_invites%rowtype;
  v_pending_count int;
  v_interested_count int;
  v_collab_id uuid;
begin
  perform public.expire_stale_group_collab_invites();

  select * into v_invite from public.group_collab_invites where id = p_invite_id for update;
  if not found or v_invite.status != 'pending' then
    return null;
  end if;

  if v_invite.expires_at < now() then
    update public.group_collab_invites set status = 'expired' where id = p_invite_id;
    return null;
  end if;

  select count(*) into v_pending_count
  from public.group_collab_invite_recipients
  where group_invite_id = p_invite_id and status = 'pending';

  if v_pending_count > 0 then
    return null;
  end if;

  select count(*) into v_interested_count
  from public.group_collab_invite_recipients
  where group_invite_id = p_invite_id and status = 'interested';

  if v_interested_count < 1 then
    update public.group_collab_invites set status = 'cancelled' where id = p_invite_id;
    return null;
  end if;

  insert into public.collaborations (group_collab_invite_id, status)
  values (p_invite_id, 'active')
  returning id into v_collab_id;

  insert into public.collaboration_members (collaboration_id, user_id, is_creator)
  values (v_collab_id, v_invite.creator_id, true);

  insert into public.collaboration_members (collaboration_id, user_id, is_creator)
  select v_collab_id, user_id, false
  from public.group_collab_invite_recipients
  where group_invite_id = p_invite_id and status = 'interested';

  update public.group_collab_invites set status = 'open' where id = p_invite_id;

  return v_collab_id;
end;
$$;

create or replace function public.create_group_collab_invite(
  p_about text,
  p_message text,
  p_role text,
  p_pace text,
  p_recipient_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator uuid := auth.uid();
  v_invite_id uuid;
  v_recipient uuid;
  v_distinct uuid[];
begin
  if v_creator is null then
    raise exception 'Not authenticated';
  end if;

  select array_agg(distinct x) into v_distinct
  from unnest(coalesce(p_recipient_ids, array[]::uuid[])) as x
  where x is not null and x != v_creator;

  if coalesce(array_length(v_distinct, 1), 0) < 1 then
    raise exception 'Pick at least one other person';
  end if;

  if array_length(v_distinct, 1) > 5 then
    raise exception 'Group collabs can include up to 5 invitees (6 people total)';
  end if;

  insert into public.group_collab_invites (creator_id, about, message, role, pace, expires_at)
  values (
    v_creator,
    trim(p_about),
    nullif(trim(coalesce(p_message, '')), ''),
    nullif(trim(coalesce(p_role, '')), ''),
    p_pace,
    now() + interval '14 days'
  )
  returning id into v_invite_id;

  foreach v_recipient in array v_distinct loop
    insert into public.group_collab_invite_recipients (group_invite_id, user_id)
    values (v_invite_id, v_recipient);
  end loop;

  return v_invite_id;
end;
$$;

create or replace function public.respond_to_group_collab_invite(
  p_invite_id uuid,
  p_response text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_collab_id uuid;
  v_updated int;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if p_response not in ('interested', 'maybe', 'not_fit') then
    raise exception 'Invalid response';
  end if;

  perform public.expire_stale_group_collab_invites();

  update public.group_collab_invite_recipients
  set status = p_response, responded_at = now()
  where group_invite_id = p_invite_id
    and user_id = v_user
    and status = 'pending';

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'Invite not found or already responded';
  end if;

  v_collab_id := public.try_open_group_collab_invite(p_invite_id);

  return json_build_object('collaboration_id', v_collab_id);
end;
$$;

create or replace function public.invite_group_collab_member(
  p_collaboration_id uuid,
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inviter uuid := auth.uid();
  v_member_count int;
  v_invite_id uuid;
begin
  if v_inviter is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.collaboration_members
    where collaboration_id = p_collaboration_id and user_id = v_inviter and is_creator = true
  ) then
    raise exception 'Only the creator can invite more people';
  end if;

  if exists (
    select 1 from public.collaboration_members
    where collaboration_id = p_collaboration_id and user_id = p_user_id
  ) then
    raise exception 'Already a member';
  end if;

  select count(*) into v_member_count from public.collaboration_members
  where collaboration_id = p_collaboration_id;

  if v_member_count >= 6 then
    raise exception 'Group is full (6 members max)';
  end if;

  if exists (
    select 1 from public.group_collab_member_invites
    where collaboration_id = p_collaboration_id and user_id = p_user_id and status = 'pending'
  ) then
    raise exception 'Invite already pending';
  end if;

  insert into public.group_collab_member_invites (
    collaboration_id, inviter_id, user_id, expires_at
  )
  values (p_collaboration_id, v_inviter, p_user_id, now() + interval '14 days')
  returning id into v_invite_id;

  return v_invite_id;
end;
$$;

create or replace function public.respond_to_group_collab_member_invite(
  p_invite_id uuid,
  p_response text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.group_collab_member_invites%rowtype;
  v_member_count int;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if p_response not in ('interested', 'maybe', 'not_fit') then
    raise exception 'Invalid response';
  end if;

  perform public.expire_stale_group_collab_invites();

  select * into v_row from public.group_collab_member_invites
  where id = p_invite_id and user_id = v_user and status = 'pending';

  if not found or v_row.expires_at < now() then
    raise exception 'Invite not found or expired';
  end if;

  update public.group_collab_member_invites
  set status = p_response, responded_at = now()
  where id = p_invite_id;

  if p_response = 'interested' then
    select count(*) into v_member_count from public.collaboration_members
    where collaboration_id = v_row.collaboration_id;

    if v_member_count >= 6 then
      raise exception 'Group is full';
    end if;

    insert into public.collaboration_members (collaboration_id, user_id, is_creator)
    values (v_row.collaboration_id, v_user, false)
    on conflict do nothing;
  end if;

  return json_build_object('collaboration_id', v_row.collaboration_id);
end;
$$;

alter table public.group_collab_invites enable row level security;
alter table public.group_collab_invite_recipients enable row level security;
alter table public.collaboration_members enable row level security;
alter table public.collaboration_messages enable row level security;
alter table public.group_collab_member_invites enable row level security;

drop policy if exists "group_collab_invites_select" on public.group_collab_invites;
create policy "group_collab_invites_select"
  on public.group_collab_invites for select to authenticated
  using (
    creator_id = auth.uid()
    or exists (
      select 1 from public.group_collab_invite_recipients r
      where r.group_invite_id = id and r.user_id = auth.uid()
    )
  );

drop policy if exists "group_collab_recipients_select" on public.group_collab_invite_recipients;
create policy "group_collab_recipients_select"
  on public.group_collab_invite_recipients for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.group_collab_invites g
      where g.id = group_invite_id and g.creator_id = auth.uid()
    )
  );

drop policy if exists "group_collab_recipients_update_own" on public.group_collab_invite_recipients;
create policy "group_collab_recipients_update_own"
  on public.group_collab_invite_recipients for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "collaboration_members_select" on public.collaboration_members;
create policy "collaboration_members_select"
  on public.collaboration_members for select to authenticated
  using (public.is_collaboration_participant(collaboration_id, auth.uid()));

drop policy if exists "collaboration_messages_select" on public.collaboration_messages;
create policy "collaboration_messages_select"
  on public.collaboration_messages for select to authenticated
  using (public.is_collaboration_participant(collaboration_id, auth.uid()));

drop policy if exists "collaboration_messages_insert" on public.collaboration_messages;
create policy "collaboration_messages_insert"
  on public.collaboration_messages for insert to authenticated
  with check (
    auth.uid() = sender_id
    and public.is_collaboration_participant(collaboration_id, auth.uid())
    and exists (
      select 1 from public.collaborations c
      where c.id = collaboration_id and c.status = 'active'
    )
  );

drop policy if exists "group_member_invites_select" on public.group_collab_member_invites;
create policy "group_member_invites_select"
  on public.group_collab_member_invites for select to authenticated
  using (
    user_id = auth.uid()
    or inviter_id = auth.uid()
    or exists (
      select 1 from public.collaboration_members cm
      where cm.collaboration_id = group_collab_member_invites.collaboration_id
        and cm.user_id = auth.uid() and cm.is_creator = true
    )
  );

drop policy if exists "collaboration_entries_select_participants" on public.collaboration_entries;
create policy "collaboration_entries_select_participants"
  on public.collaboration_entries for select to authenticated
  using (public.is_collaboration_participant(collaboration_id, auth.uid()));

drop policy if exists "collaboration_entries_insert_active" on public.collaboration_entries;
create policy "collaboration_entries_insert_active"
  on public.collaboration_entries for insert to authenticated
  with check (
    auth.uid() = author_id
    and public.is_collaboration_participant(collaboration_id, auth.uid())
    and exists (
      select 1 from public.collaborations c
      where c.id = collaboration_id and c.status = 'active'
    )
  );

drop policy if exists "collaborations_select_participants" on public.collaborations;
create policy "collaborations_select_participants"
  on public.collaborations for select to authenticated
  using (public.is_collaboration_participant(id, auth.uid()));

drop policy if exists "collaborations_update_participants" on public.collaborations;
create policy "collaborations_update_participants"
  on public.collaborations for update to authenticated
  using (public.is_collaboration_participant(id, auth.uid()));

do $$
begin
  alter publication supabase_realtime add table public.collaboration_messages;
exception when duplicate_object then null;
end $$;

grant execute on function public.expire_stale_group_collab_invites() to authenticated;
grant execute on function public.create_group_collab_invite(text, text, text, text, uuid[]) to authenticated;
grant execute on function public.respond_to_group_collab_invite(uuid, text) to authenticated;
grant execute on function public.invite_group_collab_member(uuid, uuid) to authenticated;
grant execute on function public.respond_to_group_collab_member_invite(uuid, text) to authenticated;
