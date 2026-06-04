import type { SongRating } from "@/types";

export function computeScopeAverage(ratings: SongRating[]): number | null {
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((acc, r) => acc + Number(r.rating), 0);
  return Math.round((sum / ratings.length) * 100) / 100;
}

export function formatAverageLabel(value: number | null, fallback = "—"): string {
  return value !== null ? value.toFixed(2) : fallback;
}
