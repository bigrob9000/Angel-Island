"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { postAuthPath } from "@/lib/auth-redirect";
import {
  inviteRequiredMessage,
  isInviteOnlyEnabled,
} from "@/lib/invite-gate";
import { persistInviteAcceptance } from "@/lib/invite";
import { createClient } from "@/lib/supabase";
import { AngelIslandLogo } from "@/components/AngelIslandLogo";

function authCallbackUrl(invited: boolean, authMode: "sign-in" | "sign-up") {
  const params = new URLSearchParams();
  if (invited) params.set("invite", "1");
  if (authMode === "sign-up") params.set("mode", "sign-up");
  const qs = params.toString();
  return `${window.location.origin}/auth/callback${qs ? `?${qs}` : ""}`;
}

export default function SignInPageContent() {
  const searchParams = useSearchParams();
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
  }, [searchParams, inviteOnly]);

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
        text: "That link has expired. Enter your email below and use “Resend confirmation email” to get a new link.",
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
        setMessage({ type: "error", text: "Please agree to the Terms of Service and Privacy Policy to create an account." });
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
        text: "Please agree to the Terms of Service and Privacy Policy to create an account.",
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
        setMessage({ type: "ok", text: "Check your email to confirm your account. Click the link soon — it expires in about an hour." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage({ type: "ok", text: "Signed in. Redirecting…" });
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, username")
            .eq("id", user.id)
            .maybeSingle();
          window.location.href = postAuthPath(profile);
        } else {
          window.location.href = "/onboarding";
        }
      }
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : "Something went wrong.";
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
      setMessage({ type: "error", text: "Enter your email first." });
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
    setMessage({ type: "ok", text: "A new confirmation link was sent. Check your email and click it within about an hour." });
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setMessage({ type: "error", text: "Enter your email first." });
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
      text: "If an account exists for that email, we sent a reset link. Check your inbox.",
    });
  }

  const showSignUp = mode === "sign-up";
  const showForgot = mode === "forgot";
  const canCreateAccount = !inviteOnly || invited;

  return (
    <div className="relative min-h-screen bg-ethereal text-foreground flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="inline-block mb-6">
          <AngelIslandLogo asLink={false} variant="mark" size="md" className="mb-8" />
        </Link>
        <h1 className="font-serif text-2xl font-medium mt-6">
          {showForgot
            ? "Reset password"
            : invited && showSignUp
              ? "Join Angel Island"
              : mode === "sign-in"
                ? "Sign in"
                : "Create an account"}
        </h1>
        <p className="text-muted mt-2 text-sm">
          {showForgot
            ? "Enter your email and we will send a link to choose a new password."
            : invited
              ? mode === "sign-in"
                ? "Welcome back. Sign in when you're ready — no rush."
                : "Someone invited you to a calm space for musicians. Create an account with Google or email."
              : mode === "sign-in"
                ? "Sign in with Google, or use email and password."
                : inviteOnly
                  ? "Angel Island is invite-only during beta. Use the link someone shared with you."
                  : "Create an account with Google, or use email and password."}
        </p>

        {inviteOnly && !invited && !showForgot && (
          <div className="mt-6 rounded-lg border border-foreground/15 bg-white/60 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">Invite-only, for now</p>
            <p className="mt-1 text-muted">
              New accounts need an invite link. Returning members can sign in below.
            </p>
          </div>
        )}

        {invited && showSignUp && (
          <div className="mt-6 rounded-lg border border-foreground/15 bg-white/60 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">Invite-only, for now</p>
            <p className="mt-1 text-muted">
              No clout, no cold DMs — just musicians finding each other and collaborating at their own pace.
            </p>
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
              I agree to the{" "}
              <Link
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-2 hover:no-underline"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-2 hover:no-underline"
              >
                Privacy Policy
              </Link>
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
              ? "Redirecting…"
              : showSignUp
                ? "Continue with Google"
                : "Continue with Google"}
          </button>
        )}

        {!showForgot && (
          <>
            <div className="mt-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-foreground/15" />
              <span className="text-xs text-muted">or</span>
              <div className="h-px flex-1 bg-foreground/15" />
            </div>
          </>
        )}

        {showForgot ? (
          <form onSubmit={handleForgotPassword} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-sm text-muted">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-foreground/20 bg-white/80 px-3 py-2 text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
                placeholder="you@example.com"
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
              {forgotLoading ? "Sending…" : "Send reset link"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("sign-in");
                setMessage(null);
              }}
              className="w-full text-center text-sm text-muted hover:text-foreground transition-colors"
            >
              Back to sign in
            </button>
          </form>
        ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm text-muted">Email</span>
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
            <span className="text-sm text-muted">Password</span>
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
              Forgot password?
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
            {loading ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Sign up"}
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
            {resendLoading ? "Sending…" : "Resend confirmation email"}
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
              ? "Need an invite? Ask someone on Angel Island."
              : "Need an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
        )}

        <p className="mt-8 text-center text-xs text-muted">
          <Link href="/privacy" className="hover:text-foreground underline underline-offset-2">
            Privacy Policy
          </Link>
          {" · "}
          <Link href="/terms" className="hover:text-foreground underline underline-offset-2">
            Terms of Service
          </Link>
        </p>
      </div>
    </div>
  );
}
