import { NextResponse } from "next/server";
import { postAuthPath } from "@/lib/auth-redirect";
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

  let destination: "/home" | "/onboarding" = "/onboarding";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, username")
      .eq("id", user.id)
      .maybeSingle();
    destination = postAuthPath(profile);
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
