"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Props = {
  className?: string;
  /** Compact text link for the header; pill button elsewhere. */
  variant?: "header" | "button";
};

export function SignOutButton({ className = "", variant = "button" }: Props) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (variant === "header") {
    return (
      <button
        type="button"
        onClick={signOut}
        aria-label="Sign out"
        className={`inline-flex shrink-0 items-center justify-center rounded-full border border-foreground/25 bg-white/60 p-1.5 text-foreground hover:bg-white/90 sm:p-0 ${className}`.trim()}
      >
        <svg
          className="h-4 w-4 sm:hidden"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span className="hidden px-3 py-1.5 text-sm font-medium sm:inline">Sign out</span>
      </button>
    );
  }

  return (
    <button type="button" onClick={signOut} className={`btn-secondary ${className}`.trim()}>
      Sign out
    </button>
  );
}
