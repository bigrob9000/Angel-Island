"use client";

import { useEffect, useState } from "react";
import { getPwaEnvironment } from "@/lib/pwa";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

export const ANDROID_INSTALL_DISMISS_KEY = "angel_island_android_install_dismissed";

export function AndroidInstallHint() {
  const [visible, setVisible] = useState(false);
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const env = getPwaEnvironment();
    if (!env.isAndroid || env.isStandalone || env.isInAppBrowser) return;
    if (window.localStorage.getItem(ANDROID_INSTALL_DISMISS_KEY) === "1") return;

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  if (!visible || !promptEvent) return null;

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    setVisible(false);
    window.localStorage.setItem(ANDROID_INSTALL_DISMISS_KEY, "1");
  }

  function dismiss() {
    setVisible(false);
    window.localStorage.setItem(ANDROID_INSTALL_DISMISS_KEY, "1");
  }

  return (
    <section className="rounded-lg border border-foreground/10 bg-white/50 p-5 space-y-3">
      <h2 className="font-medium text-foreground">Add Angel Island to your home screen</h2>
      <p className="text-sm text-muted leading-relaxed">
        Install the app for quicker access and a calmer full-screen experience.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void install()}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          Install app
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-md border border-foreground/30 px-4 py-2 text-sm text-muted hover:text-foreground"
        >
          Not now
        </button>
      </div>
    </section>
  );
}
