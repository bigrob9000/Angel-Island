"use client";

import { useCallback, useEffect, useState } from "react";

/** Read a dismiss flag from localStorage without flashing content before hydration. */
export function useDismissStorage(key: string) {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(key) === "1");
  }, [key]);

  const dismiss = useCallback(() => {
    window.localStorage.setItem(key, "1");
    setDismissed(true);
  }, [key]);

  return {
    dismissed: dismissed ?? false,
    ready: dismissed !== null,
    dismiss,
  };
}
