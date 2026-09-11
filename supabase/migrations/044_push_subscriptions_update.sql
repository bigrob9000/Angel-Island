-- Angel Island: Allow upsert on push_subscriptions (018 granted insert only)
-- Run in Supabase SQL Editor after 018_browser_push.sql

grant update on public.push_subscriptions to authenticated;

drop policy if exists "Users can update own push subscriptions" on public.push_subscriptions;
create policy "Users can update own push subscriptions"
  on public.push_subscriptions for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
