# Create the database tables (required once)

The error **"Could not find the table 'public.profiles'"** means the migration hasn’t been run yet. Do this once per Supabase project:

1. Open **[Supabase Dashboard](https://supabase.com/dashboard)** and select your **Angel Island** project.

2. In the left sidebar click **SQL Editor**.

3. Click **New query**.

4. Copy the **SQL code** (not the file path). Either:
   - Open the file **`web/supabase/migrations/001_rooms_and_posts.sql`** in Cursor, press **Ctrl+A** to select all, then **Ctrl+C** to copy the text inside the file, or
   - Copy the full SQL from the migration file — it starts with `-- Angel Island MVP` and ends with `on conflict (slug) do nothing;`

5. Paste that **SQL code** into the Supabase SQL Editor (replace any existing text). Do **not** paste the path `web/supabase/...`.

6. Click **Run** (or press Ctrl+Enter).

7. You should see **Success. No rows returned** (or similar). That creates:
   - `profiles` — so profile edit and posts work
   - `rooms` — with 5 seed rooms
   - `room_members` — Add to My Rooms
   - `posts` — room posts

8. **Messages (optional):** Run **`web/supabase/migrations/002_chat_invites_and_messages.sql`** in SQL Editor (copy all, paste, Run). Creates `chat_invites` and `messages`.

9. **Collab invites (optional):** Run **`web/supabase/migrations/003_collab_invites.sql`** in SQL Editor. Creates `collab_invites` for "Invite to collaborate" from profiles.

10. **Profile fields (optional):** Run **`web/supabase/migrations/005_profile_fields.sql`** in SQL Editor. Adds richer profile columns (open to, roles, genres, etc.).

11. **Conversation pause/end (optional):** Run **`web/supabase/migrations/006_conversation_state.sql`** in SQL Editor. Enables pause, resume, and end on accepted chats.

12. **Introduction comments (optional):** Run **`web/supabase/migrations/007_post_comments.sql`** in SQL Editor. Enables welcome comments on Introductions posts.

13. Reload your app. Profile, Rooms, Messages, and Collab invites will work once their migrations are run.

**Pending migrations?** See **`supabase/RUN-PENDING-MIGRATIONS.md`** for what to run next and how to check if you already did.

If you get a red error in the SQL Editor, copy the full message and we can fix it.
