import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeGenresField } from "@/lib/analytics";
import type { SongRating } from "@/types";

interface RatingUpsertPayload {
  user_id: string;
  spotify_track_id: string;
  rating: number;
  comments: string | null;
  track_name: string | null;
  artist_name: string | null;
  album_art_url: string | null;
  genres?: string[];
  release_date?: string | null;
  spotify_album_id?: string | null;
  spotify_artist_ids?: string[];
}

function isMissingColumnError(error: { message?: string; code?: string }): boolean {
  return (
    error.code === "42703" ||
    Boolean(error.message?.includes("does not exist")) ||
    Boolean(error.message?.match(/genres|release_date|spotify_album|spotify_artist/))
  );
}

async function loadExistingMetadata(
  supabase: SupabaseClient,
  userId: string,
  trackId: string
): Promise<{
  genres: string[];
  release_date: string | null;
  spotify_album_id: string | null;
  spotify_artist_ids: string[];
} | null> {
  const { data, error } = await supabase
    .from("song_ratings")
    .select("genres, release_date, spotify_album_id, spotify_artist_ids")
    .eq("user_id", userId)
    .eq("spotify_track_id", trackId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    genres: normalizeGenresField(data.genres),
    release_date: data.release_date ?? null,
    spotify_album_id: data.spotify_album_id ?? null,
    spotify_artist_ids: Array.isArray(data.spotify_artist_ids) ? data.spotify_artist_ids : [],
  };
}

/** Keep prior metadata when a new save could not refresh it (e.g. Spotify 429). */
function mergeMetadata(
  incoming: RatingUpsertPayload,
  existing: Awaited<ReturnType<typeof loadExistingMetadata>>
): RatingUpsertPayload {
  if (!existing) return incoming;

  const genres = (incoming.genres ?? []).length
    ? (incoming.genres ?? [])
    : existing.genres;

  return {
    ...incoming,
    genres,
    release_date: incoming.release_date ?? existing.release_date,
    spotify_album_id: incoming.spotify_album_id ?? existing.spotify_album_id,
    spotify_artist_ids:
      (incoming.spotify_artist_ids ?? []).length > 0
        ? incoming.spotify_artist_ids
        : existing.spotify_artist_ids,
  };
}

export async function upsertSongRating(
  supabase: SupabaseClient,
  payload: RatingUpsertPayload
): Promise<{ data: SongRating; metadataSaved: boolean }> {
  const existing = await loadExistingMetadata(
    supabase,
    payload.user_id,
    payload.spotify_track_id
  );
  const merged = mergeMetadata(payload, existing);

  const withMetadata = {
    ...merged,
    genres: merged.genres ?? [],
    release_date: merged.release_date ?? null,
  };

  const { data, error } = await supabase
    .from("song_ratings")
    .upsert(withMetadata, { onConflict: "user_id,spotify_track_id" })
    .select()
    .single();

  if (!error && data) {
    return { data: data as SongRating, metadataSaved: true };
  }

  if (error && isMissingColumnError(error)) {
    console.warn("[Ratings] Metadata columns missing — run migrations 003/004 in Supabase.");

    const {
      genres: _g,
      release_date: _r,
      spotify_album_id: _a,
      spotify_artist_ids: _ar,
      ...corePayload
    } = withMetadata;
    const fallback = await supabase
      .from("song_ratings")
      .upsert(corePayload, { onConflict: "user_id,spotify_track_id" })
      .select()
      .single();

    if (fallback.error) throw fallback.error;
    return { data: fallback.data as SongRating, metadataSaved: false };
  }

  if (error) throw error;
  throw new Error("Failed to save rating");
}
