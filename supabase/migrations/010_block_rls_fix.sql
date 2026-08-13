-- Angel Island: fix block RLS + grants (run if Block does nothing / permission denied)
-- Safe to re-run in Supabase SQL Editor

alter table public.user_blocks enable row level security;

drop policy if exists "Users manage own blocks" on public.user_blocks;
drop policy if exists "Users can see blocks affecting them" on public.user_blocks;
drop policy if exists "Users can insert own blocks" on public.user_blocks;
drop policy if exists "Users can view blocks" on public.user_blocks;
drop policy if exists "Users can delete own blocks" on public.user_blocks;

create policy "Users can insert own blocks"
  on public.user_blocks for insert to authenticated
  with check (auth.uid() = blocker_id and blocker_id <> blocked_id);

create policy "Users can view blocks"
  on public.user_blocks for select to authenticated
  using (auth.uid() = blocker_id or auth.uid() = blocked_id);

create policy "Users can delete own blocks"
  on public.user_blocks for delete to authenticated
  using (auth.uid() = blocker_id);

grant select, insert, delete on public.user_blocks to authenticated;
