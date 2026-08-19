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
        className={`shrink-0 rounded-full border border-foreground/25 bg-white/60 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-white/90 ${className}`.trim()}
      >
        Sign out
      </button>
    );
  }

  return (
    <button type="button" onClick={signOut} className={`btn-secondary ${className}`.trim()}>
      Sign out
    </button>
  );
}
