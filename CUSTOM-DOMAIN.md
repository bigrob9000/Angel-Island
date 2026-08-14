# Custom domain & link previews

Use this when you want a real URL (e.g. `angelisland.app`) instead of the Vercel default, and when you share links in iMessage, Discord, or social apps.

---

## 1. Add your domain in Vercel

1. Open [Vercel → your project → Settings → Domains](https://vercel.com)
2. Add your domain (e.g. `angelisland.app` and optionally `www.angelisland.app`)
3. Follow Vercel’s DNS instructions at your registrar
4. Wait until Vercel shows **Valid Configuration**

Production URL example: `https://angelisland.app`

---

## 2. Set the site URL in Vercel

In **Settings → Environment Variables**, add:

| Name | Value | Environments |
|------|--------|--------------|
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain.com` | Production (and Preview if you want) |

No trailing slash. Redeploy after saving.

This powers:

- Open Graph / Twitter link previews
- `metadataBase` for absolute image URLs
- Sitemap and robots.txt

If unset, the app falls back to `https://YOUR-PROJECT.vercel.app`.

---

## 3. Update Supabase auth URLs

In **Supabase → Authentication → URL Configuration**:

| Field | Value |
|--------|--------|
| **Site URL** | `https://your-domain.com` |
| **Redirect URLs** | Add: |

```
https://your-domain.com/auth/callback
https://your-domain.com/auth/confirm
https://your-domain.com/**
https://angel-island-five.vercel.app/**
```

Keep the old Vercel URL in redirect URLs until you’re sure the domain works everywhere.

---

## 4. Google sign-in (if you use it)

In **Google Cloud Console → OAuth client → Authorized JavaScript origins**, add:

```
https://your-domain.com
```

Authorized redirect URIs stay on Supabase (`https://xxx.supabase.co/auth/v1/callback`).

See `supabase/GOOGLE-AUTH.md` for details.

---

## 5. Test link previews

After deploy:

1. **Landing page** — paste `https://your-domain.com` in iMessage or [opengraph.xyz](https://www.opengraph.xyz/)
2. **Profile** — copy someone’s profile URL (`/people/username`); preview should show their name and a branded card
3. **Favicon / home screen** — bookmark the site or “Add to Home Screen” on iPhone; you should see the Angel Island mark

---

## What’s already built in the app

- Default OG image (logo + tagline) for the landing page
- Per-profile OG image and title/description when sharing `/people/username`
- Apple touch icon and web manifest
- Logo assets in `public/` (`angel-island-mark-light.png`, etc.)

No Supabase SQL required for this polish pass.
