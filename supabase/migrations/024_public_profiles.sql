-- Angel Island: Allow public read of discoverable profiles (for shared links + OG)
-- Run in Supabase SQL Editor after 023_onboarding_complete.sql

drop policy if exists "Discoverable profiles are public" on public.profiles;

create policy "Discoverable profiles are public"
  on public.profiles for select to anon, authenticated
  using (
    first_name is not null
    and trim(first_name) <> ''
    and username is not null
    and trim(username) <> ''
  );
