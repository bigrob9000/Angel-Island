"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-lg border border-foreground/10 bg-white/50 px-5 py-8 text-center">
      <h1 className="font-serif text-xl font-medium text-foreground">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted leading-relaxed">
        This page hit an unexpected error. You can try again or head somewhere else.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          Try again
        </button>
        <Link href="/home" className="text-sm text-foreground underline underline-offset-2 hover:no-underline">
          Go to Home
        </Link>
      </div>
    </div>
  );
}
