import { APP_THEMES, DEFAULT_APP_THEME } from "@/lib/app-theme";

/** Public / entry routes keep the default ethereal look even if preferences are saved. */
export function shouldApplyUserTheme(pathname: string): boolean {
  if (pathname === "/") return false;
  if (pathname === "/sign-in") return false;
  if (pathname.startsWith("/auth/")) return false;
  if (pathname === "/privacy" || pathname === "/terms") return false;
  if (pathname.startsWith("/people/")) return false;
  return true;
}

/** Inline boot script — must stay in sync with shouldApplyUserTheme. */
export function themeBootScript(): string {
  const themes = APP_THEMES.join('","');
  const defaultTheme = DEFAULT_APP_THEME;
  return `(function(){try{var p=location.pathname;var themes=["${themes}"];var def="${defaultTheme}";function setTheme(name){for(var i=0;i<themes.length;i++){document.documentElement.classList.toggle("theme-"+themes[i],themes[i]===name);}}if(p==="/"||p==="/sign-in"||p.indexOf("/auth/")===0||p==="/privacy"||p==="/terms"||p.indexOf("/people/")===0){setTheme(def);return;}var prefs=JSON.parse(localStorage.getItem("angel_island_preferences")||"{}");setTheme(prefs.appTheme||def);}catch(e){document.documentElement.classList.add("theme-${defaultTheme}");}})();`;
}
