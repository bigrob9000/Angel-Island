"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const ONBOARDING_KEY = "angel_island_onboarding";

function AuthCallbackContent() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function finishSignIn() {
      const supabase = createClient();
      const query = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

      const oauthError = query.get("error_description") || query.get("error") || hash.get("error_description") || hash.get("error");
      if (oauthError) {
        router.replace(`/sign-in?error=${encodeURIComponent(oauthError)}`);
        return;
      }

      const code = query.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace(`/sign-in?error=${encodeURIComponent(error.message)}`);
          return;
        }
      } else {
        // Hash-based session (implicit) or client already parsed the URL
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          router.replace(`/sign-in?error=${encodeURIComponent(error.message)}`);
          return;
        }
        if (!session) {
          router.replace(
            `/sign-in?error=${encodeURIComponent(
              "Google sign-in did not finish. In Supabase → Authentication → URL Configuration, add Redirect URL: http://localhost:3000/auth/callback"
            )}`
          );
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) {
        if (!cancelled) router.replace("/sign-in?error=missing_code");
        return;
      }

      window.history.replaceState(null, "", "/auth/callback");

      const done = window.localStorage.getItem(ONBOARDING_KEY) === "done";
      router.replace(done ? "/home" : "/onboarding");
    }

    finishSignIn();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-ethereal flex items-center justify-center px-6">
      <p className="text-muted">Signing you in…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-ethereal flex items-center justify-center px-6">
          <p className="text-muted">Signing you in…</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
