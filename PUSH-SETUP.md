# Browser push notifications setup

Angel Island can send **optional browser push alerts** when someone sends you a direct message — useful when the tab is closed or you're elsewhere on your device.

Users opt in under **Settings → Browser notifications** (off by default). Same calm debounce as email: at most once every 30 minutes per conversation.

---

## 1. Run migration 018 in Supabase

SQL Editor → paste all of `supabase/migrations/018_browser_push.sql` → **Run**.

Adds `notify_push_messages` on `profiles` and a `push_subscriptions` table.

---

## 2. Generate VAPID keys

From the `web` folder:

```bash
npx web-push generate-vapid-keys
```

Copy the **Public Key** and **Private Key**.

---

## 3. Vercel environment variables

**Settings → Environment Variables** → add for **Production**:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public key from step 2 |
| `VAPID_PRIVATE_KEY` | Private key from step 2 (server only — never expose) |
| `VAPID_SUBJECT` | `mailto:you@angelislandconnect.com` or `https://www.angelislandconnect.com` |

You should already have `SUPABASE_SERVICE_ROLE_KEY` (push delivery uses the service role to read subscriptions).

**Redeploy** after adding vars.

---

## 4. Test

1. Run migration **018** in Supabase
2. Add VAPID vars in Vercel and redeploy
3. Sign in on **https://www.angelislandconnect.com** (push requires HTTPS in production)
4. **Settings → Browser notifications** → turn on **New messages**
5. Allow notifications when the browser asks
6. From another account, send a DM
7. You should get a browser notification (may take a few seconds)

---

## Mobile notes

| Device / browser | Works? |
|------------------|--------|
| **Desktop** Chrome, Edge, Firefox | Yes |
| **Android** Chrome | Yes |
| **iPhone/iPad Safari** (normal tab) | No — Apple requires **Add to Home Screen** first |
| **iPhone Chrome** | Same as Safari (uses WebKit) — Add to Home Screen |
| **In-app browsers** (Instagram, Facebook, etc.) | No — open the site in Safari or Chrome |

**iPhone setup:** Safari → Share → **Add to Home Screen** → open Angel Island from the home screen icon → Settings → turn on browser notifications.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Toggle disabled / ✗ VAPID keys | Add all three VAPID env vars in Vercel → redeploy |
| Settings toggle error | Run migration **018** |
| Permission blocked | Unblock notifications for the site in browser settings |
| No push on localhost | Use HTTPS or test on production; some browsers block push on HTTP |
| Push works but email doesn't | Separate channels — see `NOTIFICATIONS-SETUP.md` for email |
| Stale subscription | Turn browser notifications off and on again in Settings |

---

## Security notes

- **Never** put `VAPID_PRIVATE_KEY` in client code
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is safe to expose (browsers need it to subscribe)
- Subscriptions are stored per user; RLS limits access to the signed-in user
