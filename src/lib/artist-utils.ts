import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeSongRating } from "@/lib/analytics";
import type { SongRating, SpotifyTrack } from "@/types";

/** Spotify artists[0] name — used for DB storage and lookups. */
export function primaryArtistFromArtists(
  artists: { id?: string; name: string }[]
): string {
  return artists[0]?.name?.trim() ?? "Unknown artist";
}

/** Spotify artists[0] id when present. */
export function primaryArtistIdFromArtists(
  artists: { id?: string; name: string }[]
): string | undefined {
  const id = artists[0]?.id?.trim();
  return id || undefined;
}

/** All distinct Spotify artist IDs on a track (primary first). */
export function artistIdsFromArtists(
  artists: { id?: string; name: string }[]
): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const artist of artists) {
    const id = artist.id?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids.slice(0, 5);
}

/**
 * Collapse legacy comma-joined names ("Eminem, Dido") to the primary artist ("Eminem").
 */
export function primaryArtistNameFromString(
  artistName: string | null | undefined
): string | null {
  if (!artistName) return null;
  const trimmed = artistName.trim();
  if (!trimmed) return null;
  if (!trimmed.includes(",")) return trimmed;
  const first = trimmed.split(",")[0]?.trim();
  return first || null;
}

/** Normalize artist name before persisting to song_ratings. */
export function normalizeArtistNameForStorage(
  artistName: string | null | undefined
): string | null {
  return primaryArtistNameFromString(artistName);
}

/** Comma-separated list for UI display only — not for DB storage. */
export function formatArtistsDisplay(
  artists: { id?: string; name: string }[]
): string {
  return artists.map((a) => a.name).join(", ");
}

export function ratingMatchesArtist(
  rating: SongRating,
  artistId: string,
  artistDisplayName: string
): boolean {
  if (rating.spotify_artist_ids?.includes(artistId)) return true;

  const primary = primaryArtistNameFromString(rating.artist_name);
  if (!primary) return false;

  return primary.toLowerCase() === artistDisplayName.trim().toLowerCase();
}

/** Minimal Spotify track shape for mass-rating rows built from stored ratings. */
export function trackFromRating(rating: SongRating, artistId: string): SpotifyTrack {
  const artUrl = rating.album_art_url?.trim();
  return {
    id: rating.spotify_track_id,
    name: rating.track_name?.trim() || "Unknown track",
    artists: [{ id: artistId, name: rating.artist_name?.trim() || "Unknown artist" }],
    album: {
      id: rating.spotify_album_id ?? undefined,
      name: "—",
      images: artUrl ? [{ url: artUrl, width: 64, height: 64 }] : [],
      release_date: rating.release_date ?? undefined,
    },
    duration_ms: 0,
    external_urls: {
      spotify: `https://open.spotify.com/track/${rating.spotify_track_id}`,
    },
  };
}

/** Load a user's ratings for an artist (indexed queries, not full library scan). */
export async function fetchRatingsForArtist(
  supabase: SupabaseClient,
  userId: string,
  artistId: string,
  artistName: string
): Promise<SongRating[]> {
  const [byIdResult, byNameResult] = await Promise.all([
    supabase
      .from("song_ratings")
      .select("*")
      .eq("user_id", userId)
      .contains("spotify_artist_ids", [artistId]),
    supabase
      .from("song_ratings")
      .select("*")
      .eq("user_id", userId)
      .ilike("artist_name", `${artistName.trim()}%`),
  ]);

  if (byIdResult.error) throw byIdResult.error;
  if (byNameResult.error) throw byNameResult.error;

  const merged = new Map<string, SongRating>();
  for (const row of [...(byIdResult.data ?? []), ...(byNameResult.data ?? [])]) {
    const rating = normalizeSongRating(row as SongRating);
    if (!ratingMatchesArtist(rating, artistId, artistName)) continue;
    merged.set(rating.spotify_track_id, rating);
  }

  return [...merged.values()].sort((a, b) =>
    (a.track_name ?? "").localeCompare(b.track_name ?? "", undefined, {
      sensitivity: "base",
    })
  );
}
