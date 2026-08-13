# Supabase setup

1. In **Supabase Dashboard** go to **SQL Editor**.
2. Open `migrations/001_rooms_and_posts.sql` in your project and copy its full contents.
3. Paste into the SQL Editor and click **Run**.

This creates:

- **profiles** — extends auth users (username, first_name, location). A trigger creates/updates a profile when a user signs up.
- **rooms** — five seed rooms (Introductions, Jam, Learn, Collaborate, Listen).
- **room_members** — which rooms each user has added to “My Rooms”.
- **posts** — posts in a room (conversation, question, collab_invite, idea).

Row Level Security (RLS) is enabled so only authenticated users can read/write as allowed.
