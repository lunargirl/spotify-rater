import {
  formatArtistsDisplay,
  primaryArtistFromArtists,
} from "@/lib/artist-utils";

/** Primary artist only — use for rating persistence, not display. */
export function formatArtists(artists: { id?: string; name: string }[]): string {
  return primaryArtistFromArtists(artists);
}

export { formatArtistsDisplay, primaryArtistFromArtists };

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatRating(value: number): string {
  return value.toFixed(2);
}

export function ratingColor(value: number): string {
  if (value >= 8) return "#1db954";
  if (value >= 6) return "#84cc16";
  if (value >= 4) return "#eab308";
  if (value >= 2) return "#f97316";
  return "#ef4444";
}
