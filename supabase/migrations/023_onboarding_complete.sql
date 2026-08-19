-- Angel Island: Persist onboarding completion on profiles
-- Run in Supabase SQL Editor after 022_collab_invite_cancel.sql

alter table public.profiles
  add column if not exists onboarding_complete boolean not null default false;

-- Existing members with basics already finished onboarding in practice.
update public.profiles
set onboarding_complete = true
where onboarding_complete = false
  and first_name is not null
  and trim(first_name) <> ''
  and username is not null
  and trim(username) <> '';
