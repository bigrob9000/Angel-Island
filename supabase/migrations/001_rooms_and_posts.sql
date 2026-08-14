-- Angel Island MVP: profiles, rooms, room_members, posts
-- Run this in Supabase Dashboard → SQL Editor

-- Profiles (extends auth.users; one row per user)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  first_name text,
  location text,
  about text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Rooms
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  purpose_norms text,
  best_for text[] default '{}',
  created_at timestamptz default now()
);

-- User's subscribed rooms ("Add to My Rooms")
create table if not exists public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(room_id, user_id)
);

-- Posts in a room (intent: conversation, question, collab_invite, idea)
create type post_intent as enum ('conversation', 'question', 'collab_invite', 'idea');

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  intent post_intent not null,
  title text,
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index if not exists idx_room_members_user on public.room_members(user_id);
create index if not exists idx_posts_room on public.posts(room_id);
create index if not exists idx_posts_created on public.posts(created_at desc);

-- RLS
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.posts enable row level security;

-- Profiles: anyone authenticated can read; users can update own
create policy "Profiles are viewable by authenticated" on public.profiles for select to authenticated using (true);
create policy "Users can update own profile" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- Rooms: all authenticated can read
create policy "Rooms are viewable by authenticated" on public.rooms for select to authenticated using (true);

-- Room members: users can see all (to show "you're in this room"); users can insert/delete own
create policy "Room members viewable by authenticated" on public.room_members for select to authenticated using (true);
create policy "Users can join room" on public.room_members for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can leave room" on public.room_members for delete to authenticated using (auth.uid() = user_id);

-- Posts: all authenticated can read; users can insert own, update/delete own
create policy "Posts viewable by authenticated" on public.posts for select to authenticated using (true);
create policy "Users can create post" on public.posts for insert to authenticated with check (auth.uid() = author_id);
create policy "Users can update own post" on public.posts for update to authenticated using (auth.uid() = author_id);
create policy "Users can delete own post" on public.posts for delete to authenticated using (auth.uid() = author_id);

-- Trigger: create profile on signup (optional; or we upsert from app)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, first_name, username)
  values (new.id, new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'username')
  on conflict (id) do update set
    first_name = coalesce(excluded.first_name, profiles.first_name),
    username = coalesce(excluded.username, profiles.username),
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed a few rooms
insert into public.rooms (slug, name, description, purpose_norms, best_for) values
  ('introductions', 'Introductions', 'Say hello. One intro per person — edit or delete anytime.', 'Welcome here. No obligation to reply.', array['meet', 'discover']),
  ('jam', 'Jam', 'Find people to play with. Share what you play and what you''re looking for.', 'Be clear about level and style. No pressure.', array['jam', 'collaborate']),
  ('learn', 'Learn', 'Questions and advice. Instruments, production, theory, practice.', 'Ask real questions. Share what worked for you.', array['learn']),
  ('collaborate', 'Collaborate', 'Find co-writers, producers, and project partners.', 'State your role and what you''re open to.', array['collaborate']),
  ('listen', 'Listen & Share', 'Share clips, demos, and works-in-progress. A place to be heard — not ranked.', 'Post a link to audio or video (YouTube, SoundCloud, TikTok, and more). Feedback only if someone asks. Listening counts — you don''t have to comment.', array['showcase', 'discover', 'collaborate'])
on conflict (slug) do nothing;
