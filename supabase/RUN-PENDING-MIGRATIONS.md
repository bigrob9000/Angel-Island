# Run these migrations next (in order)

Your app code expects these SQL migrations. Run each in **Supabase Dashboard → SQL Editor → New query**.

**Important:** Copy the **SQL inside the file**, not the file path. Paste into the editor, then click **Run**.

---

## Collab invites — run this now

**File:** `supabase/migrations/003_collab_invites.sql`

**Why:** Powers **Invite to collaborate** on profiles and the collab section on **Messages**. Without it, sending a collab invite fails.

**Requires:** `002_chat_invites_and_messages.sql` already run (you have Messages working).

Copy and run this entire block:

```sql
-- Angel Island: Collab invites (Invite to collaborate from profile)
-- Run in Supabase SQL Editor after 002

create table if not exists public.collab_invites (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  about text not null,
  message text,
  role text,
  pace text check (pace in ('low-pressure', 'structured', 'flexible')),
  status text not null default 'pending' check (status in ('pending', 'interested', 'maybe', 'not_fit')),
  created_at timestamptz default now()
);

create index if not exists idx_collab_invites_receiver on public.collab_invites(receiver_id);
create index if not exists idx_collab_invites_sender on public.collab_invites(sender_id);

alter table public.collab_invites enable row level security;

create policy "Collab invites visible to sender or receiver"
  on public.collab_invites for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "User can send collab invite"
  on public.collab_invites for insert to authenticated
  with check (auth.uid() = sender_id);

create policy "Receiver can respond to collab invite"
  on public.collab_invites for update to authenticated
  using (auth.uid() = receiver_id and status = 'pending')
  with check (auth.uid() = receiver_id and status in ('interested', 'maybe', 'not_fit'));
```

**Success check:** In **Table Editor**, you should see **`collab_invites`**.

**Try it:** Profile → **Invite to collaborate** → other account → **Messages** → respond.

---

## Other migrations (if not done yet)

### Conversation pause / end

**File:** `supabase/migrations/006_conversation_state.sql`

### Introduction comments

**File:** `supabase/migrations/007_post_comments.sql`

### Who can resume a pause

**File:** `supabase/migrations/008_paused_by.sql`

```sql
alter table public.chat_invites add column if not exists paused_by uuid references auth.users(id);
```

### Block and report

**File:** `supabase/migrations/009_user_blocks_and_reports.sql`

**Why:** Powers **Block** and **Report** on profiles, conversations, and comments. Also adds **Blocked people** in Settings.

Copy and run the full SQL from that file in the SQL Editor.

**Success check:** In **Table Editor**, you should see **`user_blocks`** and **`reports`**.

**Try it:** Profile → **Block** or **Report** → Settings → **Blocked people** → Unblock.

### If Block/Report buttons do nothing or show permission errors

Run **`supabase/migrations/010_block_rls_fix.sql`** in SQL Editor (fixes RLS + grants):

```sql
alter table public.user_blocks enable row level security;

drop policy if exists "Users manage own blocks" on public.user_blocks;
drop policy if exists "Users can see blocks affecting them" on public.user_blocks;
drop policy if exists "Users can insert own blocks" on public.user_blocks;
drop policy if exists "Users can view blocks" on public.user_blocks;
drop policy if exists "Users can delete own blocks" on public.user_blocks;

create policy "Users can insert own blocks"
  on public.user_blocks for insert to authenticated
  with check (auth.uid() = blocker_id and blocker_id <> blocked_id);

create policy "Users can view blocks"
  on public.user_blocks for select to authenticated
  using (auth.uid() = blocker_id or auth.uid() = blocked_id);

create policy "Users can delete own blocks"
  on public.user_blocks for delete to authenticated
  using (auth.uid() = blocker_id);

grant select, insert, delete on public.user_blocks to authenticated;
grant select, insert on public.reports to authenticated;
grant usage on type public.report_target_type to authenticated;
grant usage on type public.report_status to authenticated;
```

Then **hard-refresh** the app (Ctrl+Shift+R) or restart the dev server.

### Here for (onboarding choices on profile)

**File:** `supabase/migrations/011_here_for.sql`

```sql
alter table public.profiles add column if not exists here_for text[] default '{}'::text[];
update public.profiles set here_for = '{}'::text[] where here_for is null;
```

**Try it:** Profile shows **Here for** chips. Edit profile → Basics to update.

### Profile photos (optional avatars)

**File:** `supabase/migrations/012_profile_avatars.sql`

Copy the full file into SQL Editor and run it. Creates `avatar_url` on `profiles` and the public `avatars` storage bucket.

**Try it:** Profile → Edit profile → Basics → **Add photo** (optional). Explore shows initials when no photo.

### Listen & Share (showcase room)

**File:** `supabase/migrations/014_listen_share_work.sql`

Adds a **Share work** post type and a **media link** field on posts. Updates the Listen room name and norms.

```sql
-- Run the full file from supabase/migrations/014_listen_share_work.sql
```

**Try it:** Rooms → **Listen & Share** → share a YouTube or SoundCloud link.

### Private post love

**File:** `supabase/migrations/015_post_loves.sql`

Run the full file. Adds **Send love** on room posts — only the person who wrote the post sees the count.

**Try it:** Send love on someone else's share. They see "1 person sent love · only you see this." Others see nothing.

### Collaboration workspaces

**File:** `supabase/migrations/016_collaborations.sql`

Run the full file. Creates shared collaboration spaces when a collab invite is marked **interested** — notes, reference links, and next steps.

**Try it:** Respond **Interested** to a collab invite → opens **Collabs** workspace. Nav → **Collabs**.

### Realtime messages (live chat)

**File:** `supabase/migrations/013_realtime_messages.sql`

```sql
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.chat_invites;
```

If either line errors with **already member of publication**, that table is already enabled — skip it.

**Try it:** Open the same conversation in two browsers. New messages appear without refresh. Pause/resume updates live too.

---

## Already run? (quick check)

| Migration | You should have… |
|-----------|------------------|
| 001 | `profiles`, `rooms`, `posts` tables |
| 002 | `chat_invites`, `messages` tables |
| 003 | `collab_invites` table |
| 005 | Profile columns like `open_to`, `roles`, `genres_make` |
| 006 | `conversation_status` column on `chat_invites` |
| 007 | `post_comments` table |
| 008 | `paused_by` column on `chat_invites` |
| 009 | `user_blocks` and `reports` tables |
| 010 | Block RLS fix (if Block does nothing) |
| 011 | `here_for` column on `profiles` |
| 012 | `avatar_url` on `profiles` + `avatars` storage bucket |
| 013 | Realtime on `messages` + `chat_invites` (live chat) |
| 014 | `share_work` post type + `media_url` on posts (Listen room) |
| 015 | Private post love (creator-only counts) |
| 016 | Collaboration workspaces (notes, links, next steps) |
| 017 | Email notification prefs + send log |
| 018 | Browser push prefs + push subscriptions |

---

## 017 — Email notifications

Run the full file. Adds email preference columns on `profiles` and a debounce log for message emails.

Then follow **`NOTIFICATIONS-SETUP.md`** for Resend + Vercel env vars.

---

## 018 — Browser push notifications

Run the full file: `supabase/migrations/018_browser_push.sql`

Then follow **`PUSH-SETUP.md`** for VAPID keys + Vercel env vars.

**Try it:** Settings → **Browser notifications** → turn on → another account sends you a DM → browser alert (HTTPS required in production).

---

After each migration, reload the app (no dev server restart needed).
