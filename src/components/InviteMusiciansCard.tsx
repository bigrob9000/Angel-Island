"use client";

import { useState } from "react";
import { getInviteSignInUrl, INVITE_MESSAGE_TEMPLATE } from "@/lib/invite";

export function InviteMusiciansCard() {
  const [copied, setCopied] = useState<"link" | "message" | null>(null);
  const inviteUrl = getInviteSignInUrl(
    typeof window !== "undefined" ? window.location.origin : undefined,
  );

  async function copy(text: string, kind: "link" | "message") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  return (
    <section className="surface p-5">
      <div>
        <h2 className="font-medium text-foreground">Invite musicians</h2>
        <p className="mt-1 text-sm text-muted">
          Share this link with people you&apos;d actually want to play or collaborate with. They&apos;ll
          read about Angel Island first, then create an account when they&apos;re ready.
        </p>
      </div>

      <label className="block">
        <span className="text-sm text-muted">Invite link</span>
        <input
          type="text"
          readOnly
          value={inviteUrl}
          className="mt-1 block w-full rounded-md border border-foreground/20 bg-white px-3 py-2 text-sm text-foreground"
          onFocus={(e) => e.target.select()}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => copy(inviteUrl, "link")}
          className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
        >
          {copied === "link" ? "Copied!" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={() => copy(`${INVITE_MESSAGE_TEMPLATE}${inviteUrl}`, "message")}
          className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
        >
          {copied === "message" ? "Copied!" : "Copy message + link"}
        </button>
      </div>

      <p className="text-xs text-muted">
        Tip: For Google sign-in to work for anyone, publish your Google OAuth app (see{" "}
        <code className="text-foreground/80">supabase/GOOGLE-AUTH.md</code>) — otherwise only test
        accounts you add in Google Cloud can use it.
      </p>
    </section>
  );
}
