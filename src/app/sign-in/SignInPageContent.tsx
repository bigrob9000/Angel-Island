"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { AngelIslandLogo } from "@/components/AngelIslandLogo";

export default function SignInPageContent() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) setMessage({ type: "error", text: err });
  }, [searchParams]);

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
    setMessage(null);
    setGoogleLoading(true);
    const supabase = createClient();
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : "";

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          prompt: "select_account",
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
        window.location.href = "/onboarding";
      }
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : "Something went wrong.";
      if (msg === "Failed to fetch") {
        msg =
          "Could not reach Supabase. Check your internet connection, restart the dev server (from the web folder), and confirm your Supabase project is active in the dashboard.";
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

  return (
    <div className="relative min-h-screen bg-ethereal text-foreground flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="inline-block mb-6">
          <AngelIslandLogo asLink={false} variant="mark" size="md" className="mb-8" />
        </Link>
        <h1 className="font-serif text-2xl font-medium mt-6">
          {mode === "sign-in" ? "Sign in" : "Create an account"}
        </h1>
        <p className="text-muted mt-2 text-sm">
          {mode === "sign-in"
            ? "Sign in with Google, or use email and password."
            : "Create an account with Google, or use email and password."}
        </p>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="mt-8 w-full rounded-md border border-foreground/25 bg-white/80 py-2.5 text-sm font-medium text-foreground hover:bg-white disabled:opacity-50 transition-colors"
        >
          {googleLoading ? "Redirecting…" : "Continue with Google"}
        </button>

        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-foreground/15" />
          <span className="text-xs text-muted">or</span>
          <div className="h-px flex-1 bg-foreground/15" />
        </div>

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
          {message && (
            <p
              className={`text-sm ${message.type === "error" ? "text-red-600" : "text-foreground"}`}
            >
              {message.text}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-foreground py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Sign up"}
          </button>
        </form>

        {mode === "sign-up" && (
          <button
            type="button"
            onClick={handleResendConfirmation}
            disabled={resendLoading}
            className="mt-3 w-full text-center text-sm text-muted hover:text-foreground disabled:opacity-50 transition-colors"
          >
            {resendLoading ? "Sending…" : "Resend confirmation email"}
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            setMessage(null);
          }}
          className="mt-6 w-full text-center text-sm text-muted hover:text-foreground transition-colors"
        >
          {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
