-- Angel Island: Private post love — only the post author sees counts

create table if not exists public.post_loves (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (post_id, user_id)
);

create index if not exists idx_post_loves_post on public.post_loves(post_id);
create index if not exists idx_post_loves_user on public.post_loves(user_id);

alter table public.post_loves enable row level security;

-- See your own loves, or loves on posts you wrote
drop policy if exists "post_loves_select" on public.post_loves;
create policy "post_loves_select"
  on public.post_loves for select to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  );

-- Love someone else's post (not your own)
drop policy if exists "post_loves_insert" on public.post_loves;
create policy "post_loves_insert"
  on public.post_loves for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.posts p
      where p.id = post_id and p.author_id <> auth.uid()
    )
  );

drop policy if exists "post_loves_delete" on public.post_loves;
create policy "post_loves_delete"
  on public.post_loves for delete to authenticated
  using (auth.uid() = user_id);
