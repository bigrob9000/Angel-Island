# Deploy Angel Island to Vercel

Your Next.js app lives in this **`web`** folder. Vercel needs that as the project root.

**Production:** [https://www.angelislandconnect.com](https://www.angelislandconnect.com)

---

## Before you deploy

### 1. Supabase migrations

Run migrations **001 → 028** in order in **Supabase Dashboard → SQL Editor**.

Use **`supabase/RUN-PENDING-MIGRATIONS.md`** as the checklist — it lists every file, what it enables, and how to verify.

If you're already live, only run migrations you haven't applied yet (check **Table Editor** / feature smoke tests).

### 2. Environment variables

**Required** (same as `web/.env.local`):

| Variable | Where to get it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → **Project Settings → API** → Project URL (`https://xxx.supabase.co`, not `/rest/v1`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page → **anon public** key |

**Recommended:**

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL, e.g. `https://www.angelislandconnect.com` — link previews, auth redirects (see `CUSTOM-DOMAIN.md`) |

**Optional** (see linked docs):

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_INVITE_ONLY` | Defaults to on — set `false` only when opening public sign-up |
| Resend / email vars | `NOTIFICATIONS-SETUP.md` |
| VAPID keys | `PUSH-SETUP.md` |

Add vars in **Vercel → Project → Settings → Environment Variables**, then redeploy.

---

## GitHub + Vercel (recommended)

Pushes to **`main`** auto-deploy if the repo is connected.

1. Repo: [github.com/bigrob9000/Angel-Island](https://github.com/bigrob9000/Angel-Island) — root is this **`web`** folder
2. [vercel.com/new](https://vercel.com/new) → Import repo
3. **Root Directory:** `.` if the repo is only `web`; otherwise set to **`web`**
4. Add environment variables above
5. Deploy

Local push (if git config works on your machine):

```powershell
cd "C:\Users\bigro\Projects\angel-island\web"
git add .
git commit -m "Your message"
git push origin main
```

---

## Deploy from your PC (no GitHub)

```powershell
cd "C:\Users\bigro\Projects\angel-island\web"
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
npx vercel --prod
```

---

## After deploy — Supabase auth URLs

**Supabase Dashboard → Authentication → URL Configuration**

| Field | Value |
|--------|--------|
| **Site URL** | `https://www.angelislandconnect.com` |
| **Redirect URLs** | Add each on its own line: |

```
https://www.angelislandconnect.com/auth/callback
https://www.angelislandconnect.com/auth/confirm
https://www.angelislandconnect.com/auth/reset-password
https://www.angelislandconnect.com/**
http://localhost:3000/auth/callback
http://localhost:3000/**
```

Google sign-in: **`supabase/GOOGLE-AUTH.md`** (publish OAuth consent screen for beta).

---

## Production smoke test

1. Landing page loads  
2. Sign in (email + Google if configured)  
3. Onboarding → Home  
4. Explore → profile → invite to chat → accept → DM  
5. Collab invite → **Interested** → workspace note  
6. End a chat → **Remove from list** → **Restore** from Messages  
7. Unread badges clear on one device and stay cleared on another (migrations **027** + **028**)  
8. Public profile link in incognito (`/people/username`) if migration **024** is applied  

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| “Supabase is not configured” | Add both `NEXT_PUBLIC_*` vars in Vercel, then **Redeploy** |
| Sign-in works locally but not on Vercel | Update Supabase **Site URL** and **Redirect URLs** |
| Feature says “run migration …” | Apply that SQL file from `supabase/migrations/` (see `RUN-PENDING-MIGRATIONS.md`) |
| Google blocked for invitees | Publish OAuth app — `supabase/GOOGLE-AUTH.md` |
| Old version after push | Check Vercel **Deployments** tab; confirm push reached `main` |
| PWA shows old logo | Hard refresh or wait for service worker cache bump |

---

## Custom domain

See **`CUSTOM-DOMAIN.md`** for DNS, `NEXT_PUBLIC_SITE_URL`, Supabase auth URLs, and link previews.

Quick version: Vercel → Project → **Settings → Domains** → add domain → update Supabase redirect URLs to match.
