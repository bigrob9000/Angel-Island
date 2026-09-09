-- Profile "room" personalization: mantra + background (preset or custom upload)

alter table public.profiles add column if not exists profile_mantra text;
alter table public.profiles add column if not exists profile_background_preset text;
alter table public.profiles add column if not exists profile_background_url text;

-- Public profile backgrounds bucket (read: anyone; write: owner folder only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-backgrounds',
  'profile-backgrounds',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Profile backgrounds are publicly accessible" on storage.objects;
drop policy if exists "Users can upload their own profile background" on storage.objects;
drop policy if exists "Users can update their own profile background" on storage.objects;
drop policy if exists "Users can delete their own profile background" on storage.objects;

create policy "Profile backgrounds are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'profile-backgrounds');

create policy "Users can upload their own profile background"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-backgrounds'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own profile background"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-backgrounds'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own profile background"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-backgrounds'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
