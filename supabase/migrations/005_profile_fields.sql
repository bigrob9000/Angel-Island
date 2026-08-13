-- Angel Island: richer profile fields
-- Run in Supabase SQL Editor AFTER 001_rooms_and_posts.sql (profiles table must exist)

alter table public.profiles add column if not exists pronouns text;

alter table public.profiles add column if not exists open_to text[] default '{}'::text[];
alter table public.profiles add column if not exists roles text[] default '{}'::text[];
alter table public.profiles add column if not exists collaborate_as text[] default '{}'::text[];
alter table public.profiles add column if not exists genres_make text[] default '{}'::text[];
alter table public.profiles add column if not exists genres_love text[] default '{}'::text[];
alter table public.profiles add column if not exists working_style text[] default '{}'::text[];

alter table public.profiles add column if not exists open_to_questions text;
alter table public.profiles add column if not exists work_links text;

-- Backfill null arrays on existing rows (safe to re-run)
update public.profiles set open_to = '{}'::text[] where open_to is null;
update public.profiles set roles = '{}'::text[] where roles is null;
update public.profiles set collaborate_as = '{}'::text[] where collaborate_as is null;
update public.profiles set genres_make = '{}'::text[] where genres_make is null;
update public.profiles set genres_love = '{}'::text[] where genres_love is null;
update public.profiles set working_style = '{}'::text[] where working_style is null;

-- Check constraint (add only if missing)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_open_to_questions_check'
  ) then
    alter table public.profiles
      add constraint profiles_open_to_questions_check
      check (open_to_questions is null or open_to_questions in ('yes', 'sometimes', 'not_now'));
  end if;
end $$;
