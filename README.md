# Angel Island (web)

Musician collaboration platform — rooms, profiles, DMs, collab workspaces, and invite-only sign-up.

**Production:** [https://www.angelislandconnect.com](https://www.angelislandconnect.com)

This folder is the Next.js app. Vercel deploys from here (repo root is this `web` directory).

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

Run SQL migrations in order in **Supabase Dashboard → SQL Editor**. Full checklist:

**`supabase/RUN-PENDING-MIGRATIONS.md`**

You should be through **028** for current app features (read-state sync, archive/restore, etc.).

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
