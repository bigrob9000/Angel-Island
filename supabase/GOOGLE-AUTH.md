# Google sign-in setup (Supabase)

Angel Island already has **Continue with Google** on the sign-in page. You only need to configure **Google Cloud** and **Supabase** once.

Your Supabase callback URL (use this in Google):

```
https://fhqvybspdjitvkejypus.supabase.co/auth/v1/callback
```

Production site: **https://www.angelislandconnect.com**

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
   - **App home page:** `https://www.angelislandconnect.com`
   - **Privacy policy / Terms:** `https://www.angelislandconnect.com/privacy` (required before publishing)
6. **Scopes:** add `email`, `profile`, `openid` (often added by default)
7. **Test users** (while app is in “Testing”): add your Gmail and any beta invitees
8. Save

### B. OAuth client ID

1. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**
2. Application type: **Web application**
3. Name: e.g. **Angel Island Supabase**

**Authorized JavaScript origins:**

```
http://localhost:3000
https://www.angelislandconnect.com
https://angelislandconnect.com
```

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

**Site URL** (production):

```
https://www.angelislandconnect.com
```

**Redirect URLs** — add each on its own line:

```
http://localhost:3000/auth/callback
http://localhost:3000/**
https://www.angelislandconnect.com/auth/callback
https://www.angelislandconnect.com/**
https://angelislandconnect.com/auth/callback
https://angelislandconnect.com/**
```

Save.

---

## Part 3 — Test locally

1. Dev server from the `web` folder:

```powershell
cd "C:\Users\bigro\Projects\angel-island\web"
npm.cmd run dev -- --webpack
```

2. Open **http://localhost:3000/sign-in**
3. Click **Continue with Google**
4. Pick a Google account (must be a **test user** if consent screen is still in Testing mode)
5. You should land on **onboarding** (first time) or **home** (returning user with a profile)

Invite link for beta testers:

```
https://www.angelislandconnect.com/sign-in?invite=1&mode=sign-up
```

Copy this from **Settings → Invite musicians** when signed in.

---

## Part 4 — Publish for real invitees (beta)

While the OAuth app is in **Testing**, only Gmail accounts listed under **Test users** can sign in with Google. Email/password sign-up works for anyone.

To let invitees use Google without adding each one manually:

1. Google Cloud → **OAuth consent screen**
2. Complete any required fields (privacy policy URL if prompted)
3. Click **Publish app** (moves from Testing → Production)
4. For a small friends-and-family beta, Google often allows this without full verification if you only use basic scopes (`email`, `profile`, `openid`)

Until you publish, share the invite link and tell people they can **sign up with email** if Google blocks them.

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
- Your app exchanges the code for a session, then sends new users to **onboarding** or returning users to **home**

---

## Common errors

| Error | Fix |
|--------|-----|
| `redirect_uri_mismatch` | In Google, redirect URI must be exactly `https://fhqvybspdjitvkejypus.supabase.co/auth/v1/callback` |
| `Access blocked: app has not completed verification` | Add invitee Gmail under OAuth consent screen → **Test users**, publish the app, or use email sign-up |
| `missing_code` on sign-in page | Add `/auth/callback` to Supabase **Redirect URLs** for your domain |
| Google works but profile empty | Complete onboarding — account is created automatically |
| `Failed to fetch` on sign-in | Dev server not running from `web` folder, or Supabase project paused |

See also **`DEPLOY-VERCEL.md`**.
