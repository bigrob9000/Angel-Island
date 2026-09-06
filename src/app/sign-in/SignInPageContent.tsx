"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { postAuthPath } from "@/lib/auth-redirect";
import {
  inviteRequiredMessage,
  isInviteOnlyEnabled,
} from "@/lib/invite-gate";
import { persistInviteAcceptance } from "@/lib/invite";
import { createClient } from "@/lib/supabase";
import { AngelIslandLogo } from "@/components/AngelIslandLogo";
import { LanguagePicker } from "@/components/LanguagePicker";

function authCallbackUrl(invited: boolean, authMode: "sign-in" | "sign-up") {
  const params = new URLSearchParams();
  if (invited) params.set("invite", "1");
  if (authMode === "sign-up") params.set("mode", "sign-up");
  const qs = params.toString();
  return `${window.location.origin}/auth/callback${qs ? `?${qs}` : ""}`;
}

export default function SignInPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("signIn");
  const tc = useTranslations("common");
  const inviteOnly = isInviteOnlyEnabled();
  const [mode, setMode] = useState<"sign-in" | "sign-up" | "forgot">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    const err = searchParams.get("error");
    const invitedFromUrl = searchParams.get("invite") === "1";
    const enteredFromWelcome = searchParams.get("enter") === "1";

    if (invitedFromUrl && !enteredFromWelcome && !err) {
      router.replace("/?invite=1");
      return;
    }

    if (err) setMessage({ type: "error", text: err });
    const modeParam = searchParams.get("mode");
    if (modeParam === "sign-up" && (!inviteOnly || searchParams.get("invite") === "1")) {
      setMode("sign-up");
    } else if (modeParam === "sign-in") {
      setMode("sign-in");
    } else if (searchParams.get("invite") === "1") {
      setMode("sign-up");
    } else if (inviteOnly && modeParam === "sign-up") {
      setMode("sign-in");
      setMessage({ type: "error", text: inviteRequiredMessage() });
    }
  }, [searchParams, inviteOnly, router]);

  const invited = searchParams.get("invite") === "1";

  useEffect(() => {
    if (invited) persistInviteAcceptance();
  }, [invited]);

  useEffect(() => {
    if (inviteOnly && mode === "sign-up" && !invited) {
      setMode("sign-in");
    }
  }, [inviteOnly, mode, invited]);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash && (hash.includes("otp_expired") || hash.includes("invalid+or+has+expired"))) {
      setMessage({
        type: "error",
        text: t("linkExpired"),
      });
      setMode("sign-up");
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  async function handleGoogleSignIn() {
    if (mode === "sign-up") {
      if (inviteOnly && !invited) {
        setMessage({ type: "error", text: inviteRequiredMessage() });
        return;
      }
      if (!agreedToTerms) {
        setMessage({ type: "error", text: t("agreeTermsError") });
        return;
      }
    }
    setMessage(null);
    setGoogleLoading(true);
    const supabase = createClient();
    const authMode = mode === "sign-up" ? "sign-up" : "sign-in";
    const redirectTo =
      typeof window !== "undefined" ? authCallbackUrl(invited, authMode) : "";

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          prompt: invited ? "consent" : "select_account",
        },
      },
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (mode === "sign-up" && !agreedToTerms) {
      setMessage({
        type: "error",
        text: t("agreeTermsError"),
      });
      return;
    }
    if (mode === "sign-up" && inviteOnly && !invited) {
      setMessage({ type: "error", text: inviteRequiredMessage() });
      return;
    }
    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "sign-up") {
        const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/confirm` : "";
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;
        setMessage({ type: "ok", text: t("confirmEmailSent") });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage({ type: "ok", text: t("signedInRedirect") });
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, username, onboarding_complete")
            .eq("id", user.id)
            .maybeSingle();
          window.location.href = postAuthPath(profile);
        } else {
          window.location.href = "/onboarding";
        }
      }
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : t("somethingWrong");
      if (msg === "Failed to fetch") {
        const onProduction =
          typeof window !== "undefined" &&
          !window.location.hostname.includes("localhost");
        msg = onProduction
          ? "Could not reach Supabase. In Vercel → Settings → Environment Variables, set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for Production (use your real https://xxx.supabase.co project URL, not the placeholder), then Redeploy."
          : "Could not reach Supabase. Check your internet connection, restart the dev server (from the web folder), and confirm your Supabase project is active in the dashboard.";
      }
      setMessage({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  }

  async function handleResendConfirmation() {
    if (!email.trim()) {
      setMessage({ type: "error", text: t("enterEmailFirst") });
      return;
    }
    setMessage(null);
    setResendLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: {
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/confirm` : "",
      },
    });
    setResendLoading(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    setMessage({ type: "ok", text: t("confirmationResent") });
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setMessage({ type: "error", text: t("enterEmailFirst") });
      return;
    }
    setMessage(null);
    setForgotLoading(true);
    const supabase = createClient();
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/auth/reset-password` : "";
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setForgotLoading(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    setMessage({
      type: "ok",
      text: t("resetEmailSent"),
    });
  }

  const showSignUp = mode === "sign-up";
  const showForgot = mode === "forgot";
  const canCreateAccount = !inviteOnly || invited;

  return (
    <div className="relative min-h-screen bg-ethereal text-foreground flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="inline-block">
          <AngelIslandLogo asLink={false} variant="mark" size="md" className="mb-8" />
        </Link>
        <h1 className="font-serif text-2xl font-medium">
          {showForgot
            ? t("resetPassword")
            : invited && showSignUp
              ? t("join")
              : mode === "sign-in"
                ? t("signIn")
                : t("createAccount")}
        </h1>
        <p className="text-muted mt-2 text-sm">
          {showForgot
            ? t("forgotIntro")
            : invited
              ? mode === "sign-in"
                ? t("invitedSignInIntro")
                : t("invitedSignUpIntro")
              : mode === "sign-in"
                ? t("signInIntro")
                : inviteOnly
                  ? t("inviteOnlySignUp")
                  : t("signUpIntro")}
        </p>

        {inviteOnly && !invited && !showForgot && (
          <div className="mt-6 rounded-lg border border-foreground/15 bg-white/60 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">{t("inviteOnlyTitle")}</p>
            <p className="mt-1 text-muted">{t("inviteOnlyBody")}</p>
          </div>
        )}

        {invited && showSignUp && (
          <div className="mt-6 rounded-lg border border-foreground/15 bg-white/60 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">{t("inviteOnlyTitle")}</p>
            <p className="mt-1 text-muted">{t("invitedBetaBody")}</p>
          </div>
        )}

        {showSignUp && canCreateAccount && (
          <label className="mt-6 flex items-start gap-3 text-sm text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-foreground/30 accent-foreground"
            />
            <span>
              {t.rich("agreeTerms", {
                terms: () => (
                  <Link
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground underline underline-offset-2 hover:no-underline"
                  >
                    {tc("termsOfService")}
                  </Link>
                ),
                privacy: () => (
                  <Link
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground underline underline-offset-2 hover:no-underline"
                  >
                    {tc("privacyPolicy")}
                  </Link>
                ),
              })}
            </span>
          </label>
        )}

        {!showForgot && (
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={
              googleLoading ||
              loading ||
              (showSignUp && (!agreedToTerms || !canCreateAccount))
            }
            className="mt-8 w-full rounded-md border border-foreground/25 bg-white/80 py-2.5 text-sm font-medium text-foreground hover:bg-white disabled:opacity-50 transition-colors"
          >
            {googleLoading
              ? t("redirecting")
              : t("continueGoogle")}
          </button>
        )}

        {!showForgot && (
          <>
            <div className="mt-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-foreground/15" />
              <span className="text-xs text-muted">{tc("or")}</span>
              <div className="h-px flex-1 bg-foreground/15" />
            </div>
          </>
        )}

        {showForgot ? (
          <form onSubmit={handleForgotPassword} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-sm text-muted">{tc("email")}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-foreground/20 bg-white/80 px-3 py-2 text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
                placeholder={t("emailPlaceholder")}
              />
            </label>
            {message && (
              <p
                className={`text-sm ${message.type === "error" ? "text-red-600" : "text-foreground"}`}
              >
                {message.text}
              </p>
            )}
            <button
              type="submit"
              disabled={forgotLoading}
              className="w-full rounded-md bg-foreground py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {forgotLoading ? tc("sending") : t("sendResetLink")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("sign-in");
                setMessage(null);
              }}
              className="w-full text-center text-sm text-muted hover:text-foreground transition-colors"
            >
              {t("backToSignIn")}
            </button>
          </form>
        ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm text-muted">{tc("email")}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-foreground/20 bg-white/80 px-3 py-2 text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
              placeholder="you@example.com"
            />
          </label>
          <label className="block">
            <span className="text-sm text-muted">{tc("password")}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 block w-full rounded-md border border-foreground/20 bg-white/80 px-3 py-2 text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
              placeholder="••••••••"
            />
          </label>
          {mode === "sign-in" && (
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setMessage(null);
              }}
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              {t("forgotPassword")}
            </button>
          )}
          {message && (
            <p
              className={`text-sm ${message.type === "error" ? "text-red-600" : "text-foreground"}`}
            >
              {message.text}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || (showSignUp && (!agreedToTerms || !canCreateAccount))}
            className="w-full rounded-md bg-foreground py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? tc("pleaseWait") : mode === "sign-in" ? t("signIn") : t("signUp")}
          </button>
        </form>
        )}

        {showSignUp && canCreateAccount && (
          <button
            type="button"
            onClick={handleResendConfirmation}
            disabled={resendLoading}
            className="mt-3 w-full text-center text-sm text-muted hover:text-foreground disabled:opacity-50 transition-colors"
          >
            {resendLoading ? tc("sending") : t("resendConfirmation")}
          </button>
        )}

        {!showForgot && (
        <button
          type="button"
          onClick={() => {
            if (mode === "sign-in") {
              if (inviteOnly && !invited) {
                setMessage({ type: "error", text: inviteRequiredMessage() });
                return;
              }
              setMode("sign-up");
            } else {
              setMode("sign-in");
            }
            setMessage(null);
            setAgreedToTerms(false);
          }}
          className="mt-6 w-full text-center text-sm text-muted hover:text-foreground transition-colors"
        >
          {mode === "sign-in"
            ? inviteOnly && !invited
              ? t("needInvite")
              : t("needAccount")
            : t("haveAccount")}
        </button>
        )}

        <div className="mt-8">
          <LanguagePicker />
        </div>

        <p className="mt-8 text-center text-xs text-muted">
          <Link href="/privacy" className="hover:text-foreground underline underline-offset-2">
            {tc("privacyPolicy")}
          </Link>
          {" · "}
          <Link href="/terms" className="hover:text-foreground underline underline-offset-2">
            {tc("termsOfService")}
          </Link>
        </p>
      </div>
    </div>
  );
}
