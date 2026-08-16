-- Angel Island: Collab workspace activity in notification log
-- Run in Supabase SQL Editor after 017_email_notifications.sql

alter table public.notification_sends drop constraint if exists notification_sends_kind_check;

alter table public.notification_sends
  add constraint notification_sends_kind_check
  check (kind in ('message', 'collab_response', 'collab_activity'));
