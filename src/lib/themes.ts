export interface AppTheme {
  id: string;
  name: string;
  accent: string;
  accentHover: string;
  accentMuted: string;
  accentText: string;
}

export const APP_THEMES: AppTheme[] = [
  {
    id: "spotify-green",
    name: "Spotify Green",
    accent: "#1db954",
    accentHover: "#1ed760",
    accentMuted: "rgba(29, 185, 84, 0.15)",
    accentText: "#000000",
  },
  {
    id: "crimson",
    name: "Deep Crimson",
    accent: "#dc2626",
    accentHover: "#ef4444",
    accentMuted: "rgba(220, 38, 38, 0.15)",
    accentText: "#ffffff",
  },
  {
    id: "electric-blue",
    name: "Electric Blue",
    accent: "#3b82f6",
    accentHover: "#60a5fa",
    accentMuted: "rgba(59, 130, 246, 0.15)",
    accentText: "#ffffff",
  },
  {
    id: "slate",
    name: "Slate Gray",
    accent: "#94a3b8",
    accentHover: "#cbd5e1",
    accentMuted: "rgba(148, 163, 184, 0.15)",
    accentText: "#0f172a",
  },
  {
    id: "violet",
    name: "Royal Violet",
    accent: "#8b5cf6",
    accentHover: "#a78bfa",
    accentMuted: "rgba(139, 92, 246, 0.15)",
    accentText: "#ffffff",
  },
];

export const DEFAULT_THEME_ID = "spotify-green";

export function getThemeById(id: string): AppTheme {
  return APP_THEMES.find((t) => t.id === id) ?? APP_THEMES[0];
}
