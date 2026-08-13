# Deploy Angel Island to Vercel

Your Next.js app lives in this **`web`** folder. Vercel needs that as the project root.

---

## Before you deploy

1. **Supabase migrations** — run through **011** in order (001–008 core, **009** blocks/reports, **010** block RLS fix, **011** here_for). See `supabase/RUN-PENDING-MIGRATIONS.md`.

2. **Environment variables** — you need the same values as `web/.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   Copy them from Supabase → **Project Settings → API** (Project URL + anon/public key).

---

## Option A — GitHub + Vercel (recommended)

### 1. Put the code on GitHub

If Git isn’t installed: [git-scm.com/download/win](https://git-scm.com/download/win)

In PowerShell:

```powershell
cd "C:\Users\bigro\Projects\angel-island\web"
git init
git add .
git commit -m "Initial Angel Island web app"
```

Create a new **empty** repo on GitHub (no README), then:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/angel-island.git
git branch -M main
git push -u origin main
```

> Only push the **`web`** folder (as above), not the whole Desktop folder.

### 2. Import on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. **Import** your GitHub repo
3. **Root Directory:** leave as `.` (if the repo is only `web`)  
   — If the repo is the whole `Angel Island` folder, set Root Directory to **`web`**
4. **Framework Preset:** Next.js (auto-detected)
5. **Environment Variables** — add both:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Click **Deploy**

First deploy takes a few minutes. You’ll get a URL like `https://angel-island-xxxxx.vercel.app`.

---

## Option B — Deploy from your PC (no GitHub)

On Windows, if `npm` fails with certificate errors, run this first:

```powershell
$env:NODE_OPTIONS="--use-system-ca"
```

```powershell
cd "C:\Users\bigro\Projects\angel-island\web"
npx vercel
```

Follow the prompts (log in, link project). Then add env vars:

```powershell
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
npx vercel --prod
```

---

## After deploy — Supabase auth URLs

In **Supabase Dashboard → Authentication → URL Configuration**:

| Field | Value |
|--------|--------|
| **Site URL** | `https://YOUR-APP.vercel.app` |
| **Redirect URLs** | Add these (replace with your real Vercel URL): |

```
https://YOUR-APP.vercel.app/auth/callback
https://YOUR-APP.vercel.app/auth/confirm
https://YOUR-APP.vercel.app/**
```

Save, then test **Sign in** on the live site.

If you use **Google sign-in**, add the same callback URL in Google Cloud Console (see `supabase/GOOGLE-AUTH.md`).

---

## Smoke test on production

1. Landing page loads  
2. Sign up / sign in  
3. Onboarding → Home  
4. Post in Introductions, comment  
5. Invite to chat → accept → message  
6. Collab invite → respond  

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| “Supabase is not configured” | Add both `NEXT_PUBLIC_*` vars in Vercel → Settings → Environment Variables, then **Redeploy** |
| Sign-in works locally but not on Vercel | Update Supabase **Site URL** and **Redirect URLs** |
| Build fails on fonts | Rare on Vercel; redeploy. Local builds may fail due to antivirus/SSL — Vercel is fine |
| Old version after push | Vercel redeploys on git push; check Deployments tab |

---

## Custom domain (optional)

Vercel → Project → **Settings → Domains** → add your domain and follow DNS instructions.
