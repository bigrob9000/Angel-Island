-- Angel Island: Browser push for collab workspace activity
-- Run in Supabase SQL Editor after 018_browser_push.sql

alter table public.profiles
  add column if not exists notify_push_collab boolean not null default false;
