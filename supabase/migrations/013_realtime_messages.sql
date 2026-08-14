-- Angel Island: Realtime for live messages and conversation updates
-- Run in Supabase SQL Editor after 012_profile_avatars.sql
--
-- If you see "already member of publication", the table is already enabled — skip that line.

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.chat_invites;
