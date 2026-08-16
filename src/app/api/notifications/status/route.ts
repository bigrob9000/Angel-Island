import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/site";
import { createAdminClient, isNotificationEmailConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let serviceRole = false;
  try {
    createAdminClient();
    serviceRole = true;
  } catch {
    serviceRole = false;
  }

  return NextResponse.json({
    resendKey: Boolean(process.env.RESEND_API_KEY?.trim()),
    resendFrom: Boolean(process.env.RESEND_FROM?.trim()),
    serviceRole,
    siteUrl: getSiteUrl(),
    yourEmail: user.email ?? null,
  });
}
