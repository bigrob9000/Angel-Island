import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const oauthError =
    searchParams.get("error_description") ||
    searchParams.get("error");
  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(oauthError)}`
    );
  }

  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(
        "Sign-in did not finish. In Supabase → Authentication → URL Configuration, add your app URL with /auth/callback (e.g. https://angel-island-five.vercel.app/auth/callback)."
      )}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(`${origin}/onboarding`);
}
