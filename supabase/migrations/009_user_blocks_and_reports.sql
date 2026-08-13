-- Angel Island: Block and report — safe to re-run if a prior run partially applied
-- Run in Supabase SQL Editor

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_blocks_no_self check (blocker_id <> blocked_id),
  unique (blocker_id, blocked_id)
);

create index if not exists idx_user_blocks_blocker on public.user_blocks(blocker_id);
create index if not exists idx_user_blocks_blocked on public.user_blocks(blocked_id);

alter table public.user_blocks enable row level security;

drop policy if exists "Users manage own blocks" on public.user_blocks;
create policy "Users manage own blocks"
  on public.user_blocks for all to authenticated
  using (auth.uid() = blocker_id)
  with check (auth.uid() = blocker_id);

drop policy if exists "Users can see blocks affecting them" on public.user_blocks;
create policy "Users can see blocks affecting them"
  on public.user_blocks for select to authenticated
  using (auth.uid() = blocked_id);

grant select, insert, delete on public.user_blocks to authenticated;

do $do$
begin
  if not exists (select 1 from pg_type where typname = 'report_target_type') then
    create type public.report_target_type as enum (
      'user', 'post', 'comment', 'message', 'conversation'
    );
  end if;
end
$do$;

do $do$
begin
  if not exists (select 1 from pg_type where typname = 'report_status') then
    create type public.report_status as enum ('pending', 'reviewed', 'dismissed');
  end if;
end
$do$;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type public.report_target_type not null,
  target_id uuid not null,
  reported_user_id uuid references auth.users(id) on delete set null,
  reason text not null,
  details text,
  status public.report_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists idx_reports_reporter on public.reports(reporter_id);
create index if not exists idx_reports_status on public.reports(status, created_at desc);

create unique index if not exists idx_reports_dedup
  on public.reports(reporter_id, target_type, target_id)
  where status = 'pending';

alter table public.reports enable row level security;

drop policy if exists "Users can submit reports" on public.reports;
create policy "Users can submit reports"
  on public.reports for insert to authenticated
  with check (auth.uid() = reporter_id);

drop policy if exists "Users can view own reports" on public.reports;
create policy "Users can view own reports"
  on public.reports for select to authenticated
  using (auth.uid() = reporter_id);

grant select, insert on public.reports to authenticated;
grant usage on type public.report_target_type to authenticated;
grant usage on type public.report_status to authenticated;
