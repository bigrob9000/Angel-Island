-- Cache on-demand UGC translations (room posts, comments) by content hash + target locale.
-- Written only from the Next.js translate API using the service role.

create table if not exists public.content_translations (
  content_hash text not null,
  target_locale text not null,
  source_locale text,
  translated_text text not null,
  created_at timestamptz not null default now(),
  primary key (content_hash, target_locale)
);

create index if not exists idx_content_translations_created
  on public.content_translations(created_at desc);

alter table public.content_translations enable row level security;

-- No client policies: reads/writes happen server-side with service role only.
