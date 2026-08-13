-- Angel Island: comments on room posts (welcome replies on Introductions)
-- Run in Supabase SQL Editor after 001_rooms_and_posts.sql

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz default now()
);

create index if not exists idx_post_comments_post on public.post_comments(post_id);
create index if not exists idx_post_comments_created on public.post_comments(created_at);

alter table public.post_comments enable row level security;

create policy "Comments viewable by authenticated"
  on public.post_comments for select to authenticated using (true);

create policy "Users can comment on posts"
  on public.post_comments for insert to authenticated
  with check (auth.uid() = author_id);

create policy "Users can delete own comment"
  on public.post_comments for delete to authenticated
  using (auth.uid() = author_id);
