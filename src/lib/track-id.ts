/** Normalize dynamic route / query track IDs; returns null if invalid. */
export function normalizeTrackId(raw: string | undefined | null): string | null {
  if (raw == null) return null;
  const id = decodeURIComponent(String(raw)).trim();
  if (!id || id === "undefined" || id === "null" || id === "[]") return null;
  return id;
}
