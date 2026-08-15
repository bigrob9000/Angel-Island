import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/site";
import { createAdminClient, isNotificationEmailConfigured } from "@/lib/supabase/admin";
import { sendNotificationEmail } from "@/lib/notifications/email";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  if (!isNotificationEmailConfigured()) {
    return NextResponse.json({
      ok: false,
      error: "RESEND_API_KEY or RESEND_FROM is missing in Vercel. Add both, then redeploy.",
    });
  }

  try {
    createAdminClient();
  } catch {
    return NextResponse.json({
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY is missing in Vercel. Add it, then redeploy.",
    });
  }

  const siteUrl = getSiteUrl();
  const subject = "Angel Island test email";
  const text = `Notifications are working. Your site URL is ${siteUrl}.`;
  const html = `<p>Notifications are working on <strong>Angel Island</strong>.</p><p>If you received this, Resend and Vercel are configured correctly.</p>`;

  const sent = await sendNotificationEmail({
    to: user.email,
    subject,
    html,
    text,
  });

  if (!sent.ok) {
    return NextResponse.json({
      ok: false,
      error: sent.error ?? "Resend rejected the send. Check Resend → Logs.",
    });
  }

  return NextResponse.json({
    ok: true,
    message: `Test email sent to ${user.email}. Check inbox and spam.`,
  });
}
