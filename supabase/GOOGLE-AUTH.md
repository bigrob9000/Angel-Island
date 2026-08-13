# Google sign-in setup (Supabase)

Angel Island already has **Continue with Google** on the sign-in page. You only need to configure **Google Cloud** and **Supabase** once.

Your Supabase callback URL (use this in Google):

```
https://fhqvybspdjitvkejypus.supabase.co/auth/v1/callback
```

---

## Part 1 — Google Cloud Console

### A. OAuth consent screen (do this first)

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or pick one) — e.g. **Angel Island**
3. Go to **APIs & Services** → **OAuth consent screen**
4. Choose **External** (unless you use Google Workspace for a private test)
5. Fill in:
   - **App name:** Angel Island
   - **User support email:** your email
   - **Developer contact:** your email
6. **Scopes:** add `email`, `profile`, `openid` (often added by default)
7. **Test users** (while app is in “Testing”): add your Gmail and any test accounts
8. Save

### B. OAuth client ID

1. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**
2. Application type: **Web application**
3. Name: e.g. **Angel Island Supabase**

**Authorized JavaScript origins** (add both for now):

```
http://localhost:3000
```

(Add your Vercel URL later, e.g. `https://your-app.vercel.app`)

**Authorized redirect URIs** — add **only** the Supabase callback (not your app URL):

```
https://fhqvybspdjitvkejypus.supabase.co/auth/v1/callback
```

4. Click **Create**
5. Copy the **Client ID** and **Client secret**

---

## Part 2 — Supabase Dashboard

### A. Enable Google provider

1. [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. **Authentication** → **Providers** → **Google**
3. Turn **Enable Sign in with Google** on
4. Paste **Client ID** and **Client secret** from Google
5. Save

### B. Redirect URLs (your app)

**Authentication** → **URL Configuration**

**Site URL** (for local dev):

```
http://localhost:3000
```

**Redirect URLs** — add each on its own line:

```
http://localhost:3000/auth/callback
http://localhost:3000/**
```

When you deploy to Vercel, also add:

```
https://YOUR-APP.vercel.app/auth/callback
https://YOUR-APP.vercel.app/**
```

Save.

---

## Part 3 — Test locally

1. Dev server from the `web` folder:

```powershell
cd "c:\Users\bigro\OneDrive\Desktop\Angel Island\web"
npm.cmd run dev -- --webpack
```

2. Open **http://localhost:3000/sign-in**
3. Click **Continue with Google**
4. Pick a Google account (must be a **test user** if consent screen is still in Testing mode)
5. You should land on **onboarding** (first time) or **home**

---

## How the flow works

```
Your app                    Supabase                     Google
/sign-in  →  signInWithOAuth  →  Google login  →  callback to Supabase
                                                      ↓
/auth/callback  ←  exchangeCodeForSession  ←  redirect with ?code=
```

- **Google** redirects to **Supabase** (`…supabase.co/auth/v1/callback`)
- **Supabase** redirects to **your app** (`/auth/callback?code=…`)
- Your app exchanges the code for a session

---

## Common errors

| Error | Fix |
|--------|-----|
| `redirect_uri_mismatch` | In Google, redirect URI must be exactly `https://fhqvybspdjitvkejypus.supabase.co/auth/v1/callback` |
| `Access blocked: app has not completed verification` | Add your Gmail under OAuth consent screen → **Test users**, or publish the app |
| `missing_code` on sign-in page | Add `http://localhost:3000/auth/callback` to Supabase **Redirect URLs** |
| Google works but profile empty | Complete onboarding — or edit profile; account is created automatically |
| `Failed to fetch` on sign-in | Dev server not running from `web` folder, or Supabase project paused |

---

## After Vercel deploy

1. Google **Authorized JavaScript origins:** add `https://your-app.vercel.app`
2. Supabase **Site URL:** set to `https://your-app.vercel.app`
3. Supabase **Redirect URLs:** add production `/auth/callback` (see Part 2B)

See also **`DEPLOY-VERCEL.md`**.
