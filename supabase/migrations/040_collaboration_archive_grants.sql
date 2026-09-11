-- Angel Island: grants for collaboration archive + permanent delete (run after 039)

grant select, insert, delete on public.collaboration_archive to authenticated;
grant delete on public.collaborations to authenticated;
