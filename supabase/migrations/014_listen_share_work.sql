-- Angel Island: Listen room showcase — share_work intent + media links

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'post_intent' and e.enumlabel = 'share_work'
  ) then
    alter type post_intent add value 'share_work';
  end if;
end$$;

alter table public.posts add column if not exists media_url text;

update public.rooms set
  name = 'Listen & Share',
  description = 'Share clips, demos, and works-in-progress. A place to be heard — not ranked.',
  purpose_norms = 'Post a link to audio or video (YouTube, SoundCloud, TikTok, and more). Feedback only if someone asks. Listening counts — you don''t have to comment.',
  best_for = array['showcase', 'discover', 'collaborate']
where slug = 'listen';
