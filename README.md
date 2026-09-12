# Angel Island (web)

Calm, consent-first platform for musicians — rooms, profiles, DMs, 1:1 collab workspaces, and invite-only sign-up.

**Production:** [https://www.angelislandconnect.com](https://www.angelislandconnect.com)

This folder is the Next.js app. Vercel deploys from here (repo root is this `web` directory).

---

## What's in the app

| Area | Highlights |
|------|------------|
| **Rooms** | Forum-style spaces (Introductions, Jam, Learn, Collaborate, Listen) |
| **Profiles** | Public `/people/username` pages, optional avatar, **Your room** (mantra + background) |
| **Messages** | Invite-to-chat, pause/close, archive, cross-device unread sync |
| **Collaborations** | 1:1 invites, alignment handshake, shared workspace (notes, links, next steps), archive |
| **Notifications** | Email + browser push (messages and collab activity) |
| **Settings** | Invite link, notification toggles, calm mode, beta feedback |

Group collabs (029–033) exist in code but are not the current beta focus.

---

## Local development

```powershell
cd "C:\Users\bigro\Projects\angel-island\web"
npm install
```

Copy env vars into `.env.local` (see `.env.example` if present, or `DEPLOY-VERCEL.md`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

On Windows, use the webpack dev server:

```powershell
npm run dev -- --webpack
```

Open [http://localhost:3000](http://localhost:3000).

If the dev server acts stale after big changes:

```powershell
npm run dev:clean -- --webpack
```

---

## Supabase

Run SQL migrations in order in **Supabase Dashboard → SQL Editor**. Full checklist with verify steps:

**`supabase/RUN-PENDING-MIGRATIONS.md`**

Production expects migrations **001 through 044** (latest: `044_push_subscriptions_update.sql`). If you're already live, only run files you haven't applied yet — use the **Already run?** table in the checklist.

Other setup guides:

| Topic | File |
|--------|------|
| Google sign-in | `supabase/GOOGLE-AUTH.md` |
| Email notifications | `NOTIFICATIONS-SETUP.md` |
| Browser push | `PUSH-SETUP.md` |
| Custom domain | `CUSTOM-DOMAIN.md` |

---

## Deploy

See **`DEPLOY-VERCEL.md`** for GitHub → Vercel, env vars, auth redirect URLs, and production smoke tests.

Pushes to **`main`** auto-deploy when the repo is connected to Vercel.

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev -- --webpack` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `python scripts/blend-logo-to-site.py` | Re-process logo PNG after art swap |

---

## Repo

[github.com/bigrob9000/Angel-Island](https://github.com/bigrob9000/Angel-Island)
