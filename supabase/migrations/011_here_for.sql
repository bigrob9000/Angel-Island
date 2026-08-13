-- Angel Island: "here for" from onboarding on profiles
-- Run in Supabase SQL Editor after 005_profile_fields.sql

alter table public.profiles add column if not exists here_for text[] default '{}'::text[];

update public.profiles set here_for = '{}'::text[] where here_for is null;
