import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { postAuthPath } from "@/lib/auth-redirect";
import {
  hasInviteAccess,
  INVITE_COOKIE_NAME,
  inviteRequiredMessage,
  isInviteOnlyEnabled,
  isNewAuthUser,
} from "@/lib/invite-gate";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const oauthError =
    searchParams.get("error_description") ||
    searchParams.get("error");
  if (oauthError) {
    const friendly = oauthError.includes("Access blocked")
      ? "Google sign-in is limited right now. Try email sign-up, or ask the person who invited you to add your Gmail as a test user in Google Cloud."
      : oauthError;
    const invite = searchParams.get("invite") === "1" ? "&invite=1" : "";
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(friendly)}${invite}`,
    );
  }

  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(
        "Sign-in did not finish. In Supabase → Authentication → URL Configuration, add https://www.angelislandconnect.com/auth/callback to Redirect URLs.",
      )}`,
    );
  }

  const recoveryFlow = searchParams.get("type") === "recovery";

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(error.message)}`,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && isInviteOnlyEnabled() && isNewAuthUser(user)) {
    const cookieStore = await cookies();
    const hasInviteCookie = cookieStore.get(INVITE_COOKIE_NAME)?.value === "1";
    const hasInvite = hasInviteAccess(searchParams) || hasInviteCookie;

    if (!hasInvite) {
      try {
        const admin = createAdminClient();
        await admin.auth.admin.deleteUser(user.id);
      } catch {
        await supabase.auth.signOut();
      }
      return NextResponse.redirect(
        `${origin}/sign-in?error=${encodeURIComponent(inviteRequiredMessage())}`,
      );
    }
  }

  if (recoveryFlow) {
    return NextResponse.redirect(`${origin}/auth/reset-password`);
  }

  let destination: "/home" | "/onboarding" = "/onboarding";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, username, onboarding_complete")
      .eq("id", user.id)
      .maybeSingle();
    destination = postAuthPath(profile);
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
