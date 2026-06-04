import { APP_THEMES, DEFAULT_THEME_ID } from "@/lib/themes";

export const THEME_STORAGE_KEY = "spotify-rater-theme";

/** Blocking inline script — runs before paint to prevent theme flash. */
export function buildThemeBootstrapScript(): string {
  const themeMap = Object.fromEntries(
    APP_THEMES.map((t) => [
      t.id,
      {
        accent: t.accent,
        accentHover: t.accentHover,
        accentMuted: t.accentMuted,
        accentText: t.accentText,
      },
    ])
  );

  return `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var d=${JSON.stringify(DEFAULT_THEME_ID)};var m=${JSON.stringify(themeMap)};var id=localStorage.getItem(k)||localStorage.getItem("theme");if(id&&!m[id]){var legacy=localStorage.getItem("accent");if(legacy&&m[legacy])id=legacy;else id=d;}if(!id||!m[id])id=d;var t=m[id],r=document.documentElement;r.setAttribute("data-theme",id);r.style.setProperty("--accent",t.accent);r.style.setProperty("--accent-hover",t.accentHover);r.style.setProperty("--accent-muted",t.accentMuted);r.style.setProperty("--accent-text",t.accentText);}catch(e){}})();`;
}
