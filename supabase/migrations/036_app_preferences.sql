-- Angel Island: appearance & reading preferences on profile (sync across devices)

alter table public.profiles
  add column if not exists app_theme text not null default 'ethereal'
    check (app_theme in ('ethereal', 'soft', 'dusk', 'dark')),
  add column if not exists calm_mode boolean not null default false,
  add column if not exists reduce_motion boolean not null default false,
  add column if not exists easier_reading_font boolean not null default false;
