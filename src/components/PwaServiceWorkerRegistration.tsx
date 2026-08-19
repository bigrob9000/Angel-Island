"use client";

import { useEffect } from "react";

/** Registers the service worker for offline shell caching and push notifications. */
export function PwaServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal — push registration may retry elsewhere.
    });
  }, []);

  return null;
}
