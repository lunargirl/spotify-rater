"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { THEME_STORAGE_KEY } from "@/lib/theme-bootstrap";
import { APP_THEMES, DEFAULT_THEME_ID, getThemeById, type AppTheme } from "@/lib/themes";

function readThemeIdFromDocument(): string {
  if (typeof document === "undefined") return DEFAULT_THEME_ID;
  const fromDom = document.documentElement.getAttribute("data-theme");
  if (fromDom && APP_THEMES.some((t) => t.id === fromDom)) return fromDom;
  return DEFAULT_THEME_ID;
}

interface ThemeContextValue {
  theme: AppTheme;
  themeId: string;
  setThemeId: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeToDocument(theme: AppTheme) {
  const root = document.documentElement;
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-hover", theme.accentHover);
  root.style.setProperty("--accent-muted", theme.accentMuted);
  root.style.setProperty("--accent-text", theme.accentText);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState(readThemeIdFromDocument);

  const theme = useMemo(() => getThemeById(themeId), [themeId]);

  useEffect(() => {
    applyThemeToDocument(theme);
    document.documentElement.setAttribute("data-theme", themeId);
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  }, [theme, themeId]);

  const setThemeId = useCallback((id: string) => {
    if (APP_THEMES.some((t) => t.id === id)) {
      setThemeIdState(id);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, themeId, setThemeId }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
