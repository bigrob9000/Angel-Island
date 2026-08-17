export type PwaEnvironment = {
  platform: "ios" | "android" | "desktop" | "unknown";
  isStandalone: boolean;
  isInAppBrowser: boolean;
  isIOS: boolean;
  isAndroid: boolean;
};

export function getPwaEnvironment(): PwaEnvironment {
  if (typeof window === "undefined") {
    return {
      platform: "unknown",
      isStandalone: false,
      isInAppBrowser: false,
      isIOS: false,
      isAndroid: false,
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

  return {
    platform: isIOS ? "ios" : isAndroid ? "android" : "desktop",
    isStandalone,
    isInAppBrowser,
    isIOS,
    isAndroid,
  };
}

/** iPhone/iPad in Safari — push and a fuller app experience need Add to Home Screen. */
export function needsIphoneHomeScreenHint(): boolean {
  const env = getPwaEnvironment();
  return env.isIOS && !env.isStandalone && !env.isInAppBrowser;
}

export const IPHONE_PWA_HINT_DISMISS_KEY = "angel_island_iphone_pwa_hint_dismissed";
