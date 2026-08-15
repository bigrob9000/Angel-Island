-- Angel Island: Email notification preferences + send log (debounce)

alter table public.profiles
  add column if not exists notify_email_messages boolean not null default true,
  add column if not exists notify_email_collab boolean not null default true;

create table if not exists public.notification_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('message', 'collab_response')),
  reference_id uuid not null,
  sent_at timestamptz not null default now()
);

create index if not exists idx_notification_sends_lookup
  on public.notification_sends(user_id, kind, reference_id, sent_at desc);

alter table public.notification_sends enable row level security;

-- Only server (service role) writes; no client policies.
