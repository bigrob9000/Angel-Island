# Email notifications setup

Angel Island can send **calm email updates** when:

- Someone sends you a **direct message** (debounced: at most once every 30 minutes per conversation)
- Someone **responds to your collab invite**

Users can turn these off in **Settings → Email updates**.

---

## 1. Run migration 017 in Supabase

SQL Editor → paste all of `supabase/migrations/017_email_notifications.sql` → **Run**.

---

## 2. Create a Resend account

1. Sign up at [resend.com](https://resend.com) (free tier is enough to start)
2. **API Keys** → create a key → copy it

---

## 3. Sender address

**Testing (fastest):** Resend lets you send from `onboarding@resend.dev` — but **only to email addresses you verified in Resend** (usually just the email you signed up with). Sending to friends/invites **will not work** until you verify **angelislandconnect.com** in Resend.

**Production:** Add domain **angelislandconnect.com** in Resend → **Domains**, add the DNS records they give you, then use:

```
Angel Island <notifications@angelislandconnect.com>
```

---

## 4. Vercel environment variables

**Settings → Environment Variables** → add for **Production**:

| Name | Value |
|------|--------|
| `RESEND_API_KEY` | `re_...` from Resend |
| `RESEND_FROM` | `Angel Island <onboarding@resend.dev>` (testing) or your verified domain address |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → **Project Settings → API** → **service_role** (secret — server only) |

You should already have:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` = `https://www.angelislandconnect.com`

**Redeploy** after adding vars.

---

## 5. Test

1. Two accounts (or ask a friend)
2. Account A sends Account B a DM
3. Account B should get an email within a minute (if Resend + vars are set)
4. Account B responds to a collab invite from A → A gets an email
5. **Settings → Email updates** — toggle off to confirm opt-out works

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No emails at all | Check Vercel env vars + redeploy. Resend dashboard → **Logs**. |
| Resend “domain not verified” | Use `onboarding@resend.dev` for testing, or finish domain DNS in Resend |
| Settings toggle error | Run migration **017** |
| Too many message emails | Working as designed — debounced to 30 min per conversation |
| Google sign-in unrelated | Notifications use Resend, not Google |

---

## Security notes

- **Never** put `SUPABASE_SERVICE_ROLE_KEY` or `RESEND_API_KEY` in client code or `NEXT_PUBLIC_*` vars
- Service role is only used in API routes on the server
