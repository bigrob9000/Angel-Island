-- Angel Island: track who paused a conversation (only they can resume)
-- Run in Supabase SQL Editor after 006_conversation_state.sql

alter table public.chat_invites add column if not exists paused_by uuid references auth.users(id);
