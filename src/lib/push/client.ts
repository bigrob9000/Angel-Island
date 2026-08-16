function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export type PushEnvironment = {
  supported: boolean;
  platform: "ios" | "android" | "desktop" | "unknown";
  isStandalone: boolean;
  isInAppBrowser: boolean;
  mobileHint: string | null;
};

export function getPushEnvironment(): PushEnvironment {
  if (typeof window === "undefined") {
    return {
      supported: false,
      platform: "unknown",
      isStandalone: false,
      isInAppBrowser: false,
      mobileHint: null,
    };
  }

  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const isInAppBrowser = /FBAN|FBAV|Instagram|Twitter|LinkedInApp|Line\//i.test(ua);

  const supported =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  let mobileHint: string | null = null;
  if (!supported) {
    if (isInAppBrowser) {
      mobileHint =
        "In-app browsers (Instagram, Facebook, etc.) can't use push. Open angelislandconnect.com in Safari or Chrome instead.";
    } else if (isIOS && !isStandalone) {
      mobileHint =
        "On iPhone/iPad: Share → Add to Home Screen, open Angel Island from that icon, then turn this on. Regular Safari tabs can't receive push.";
    } else if (isIOS && isStandalone) {
      mobileHint =
        "Web push on iPhone needs iOS 16.4 or later. Update your device if this still doesn't work.";
    } else if (isAndroid) {
      mobileHint =
        "Try opening the site in Chrome. Some Android browsers don't support web push.";
    } else {
      mobileHint =
        "This browser doesn't support web push. Desktop Chrome, Edge, or Firefox work best.";
    }
  }

  return {
    supported,
    platform: isIOS ? "ios" : isAndroid ? "android" : "desktop",
    isStandalone,
    isInAppBrowser,
    mobileHint,
  };
}

export function isBrowserPushSupported(): boolean {
  return getPushEnvironment().supported;
}

export async function fetchPushStatus(): Promise<{
  supported: boolean;
  configured: boolean;
  publicKey: string | null;
  permission: NotificationPermission | "unsupported";
  platform: PushEnvironment["platform"];
  isStandalone: boolean;
  mobileHint: string | null;
}> {
  const env = getPushEnvironment();
  const response = await fetch("/api/push/status", { credentials: "same-origin" });
  if (!response.ok) {
    return {
      supported: env.supported,
      configured: false,
      publicKey: null,
      permission: env.supported ? Notification.permission : "unsupported",
      platform: env.platform,
      isStandalone: env.isStandalone,
      mobileHint: env.mobileHint,
    };
  }
  const data = (await response.json()) as {
    configured: boolean;
    publicKey: string | null;
  };
  return {
    supported: env.supported,
    configured: data.configured,
    publicKey: data.publicKey,
    permission: env.supported ? Notification.permission : "unsupported",
    platform: env.platform,
    isStandalone: env.isStandalone,
    mobileHint: env.mobileHint,
  };
}

export async function subscribeToPush(publicKey: string): Promise<{ ok: boolean; error?: string }> {
  if (!isBrowserPushSupported()) {
    return { ok: false, error: "Browser push is not supported on this device." };
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    return { ok: false, error: "Notification permission was not granted." };
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, error: "Could not read push subscription." };
  }

  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      userAgent: navigator.userAgent,
    }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: data.error ?? "Could not save push subscription." };
  }

  return { ok: true };
}

export async function unsubscribeFromPush(): Promise<{ ok: boolean; error?: string }> {
  if (!isBrowserPushSupported()) {
    return { ok: true };
  }

  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = registration ? await registration.pushManager.getSubscription() : null;

  if (subscription) {
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    }).catch(() => {});
  }

  return { ok: true };
}

/** Re-sync subscription if user opted in but browser lost it (e.g. after cache clear). */
export async function ensurePushSubscription(publicKey: string): Promise<void> {
  if (!isBrowserPushSupported() || Notification.permission !== "granted") return;

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return;

  await subscribeToPush(publicKey);
}
