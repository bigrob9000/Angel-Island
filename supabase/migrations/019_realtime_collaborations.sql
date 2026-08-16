-- Angel Island: Realtime for collaboration workspaces
-- Run in Supabase SQL Editor after 016_collaborations.sql
--
-- If you see "already member of publication", the table is already enabled — skip that line.

alter publication supabase_realtime add table public.collaboration_entries;
alter publication supabase_realtime add table public.collaborations;
