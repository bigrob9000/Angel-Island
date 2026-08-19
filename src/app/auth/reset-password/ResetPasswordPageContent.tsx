"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { AngelIslandLogo } from "@/components/AngelIslandLogo";

export default function ResetPasswordPageContent() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace(
          "/sign-in?error=" +
            encodeURIComponent("That reset link expired or already was used. Request a new one."),
        );
        return;
      }
      setReady(true);
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (password.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    if (password !== confirm) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }

    setMessage({ type: "ok", text: "Password updated. Redirecting…" });
    window.setTimeout(() => {
      window.location.href = "/home";
    }, 800);
  }

  if (!ready) {
    return (
      <div className="relative min-h-screen bg-ethereal text-foreground flex flex-col items-center justify-center px-6">
        <p className="text-muted text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-ethereal text-foreground flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="inline-block mb-6">
          <AngelIslandLogo asLink={false} variant="mark" size="md" className="mb-8" />
        </Link>
        <h1 className="font-serif text-2xl font-medium mt-6">Choose a new password</h1>
        <p className="text-muted mt-2 text-sm">Enter a new password for your account.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-sm text-muted">New password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="mt-1 block w-full rounded-md border border-foreground/20 bg-white/80 px-3 py-2 text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
          </label>
          <label className="block">
            <span className="text-sm text-muted">Confirm password</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="mt-1 block w-full rounded-md border border-foreground/20 bg-white/80 px-3 py-2 text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
          </label>
          {message && (
            <p className={`text-sm ${message.type === "error" ? "text-red-600" : "text-foreground"}`}>
              {message.text}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-foreground py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Saving…" : "Update password"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/sign-in" className="hover:text-foreground underline underline-offset-2">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
