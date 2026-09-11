-- Angel Island: read/update grants for collaboration workspaces (group collab fix)
-- Migration 030 granted group tables but not the core collaborations / entries tables.

grant select, update on public.collaborations to authenticated;
grant select, insert, update, delete on public.collaboration_entries to authenticated;
