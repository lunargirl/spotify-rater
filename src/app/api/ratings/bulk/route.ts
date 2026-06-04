import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/spotify";
import { resolveSpotifyUser } from "@/lib/session-user";
import { normalizeArtistNameForStorage } from "@/lib/artist-utils";
import {
  fetchArtistGenres,
  fetchTrackCatalogInfo,
} from "@/lib/spotify-metadata";
import { upsertSongRating } from "@/lib/ratings-db";
import { createSupabaseAdmin } from "@/lib/supabase";
import type { RatingPayload } from "@/types";

export async function POST(request: NextRequest) {
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const user = await resolveSpotifyUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const body = (await request.json()) as { ratings?: RatingPayload[] };

    if (!body.ratings?.length) {
      return NextResponse.json({ error: "ratings array is required" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const saved = [];
    const errors: { trackId: string; error: string }[] = [];

    for (const item of body.ratings) {
      if (!item.spotify_track_id || typeof item.rating !== "number") continue;
      if (item.rating < 0 || item.rating > 10) continue;

      const roundedRating = Math.round(item.rating * 100) / 100;

      let release_date: string | null = null;
      let genres: string[] = [];
      let spotify_album_id: string | null = null;
      let spotify_artist_ids: string[] = [];
      let primary_artist_name: string | null = null;

      try {
        const catalog = await fetchTrackCatalogInfo(item.spotify_track_id, accessToken);
        release_date = catalog.release_date;
        spotify_album_id = catalog.album_id;
        spotify_artist_ids = catalog.artist_ids;
        primary_artist_name = catalog.primary_artist_name;
        try {
          genres = await fetchArtistGenres(catalog.artist_ids, accessToken);
        } catch {
          /* genres optional */
        }
      } catch {
        /* catalog optional */
      }

      try {
        const { data } = await upsertSongRating(supabase, {
          user_id: user.id,
          spotify_track_id: item.spotify_track_id,
          rating: roundedRating,
          comments: item.comments ?? null,
          track_name: item.track_name ?? null,
          artist_name:
            primary_artist_name ??
            normalizeArtistNameForStorage(item.artist_name) ??
            null,
          album_art_url: item.album_art_url ?? null,
          genres,
          release_date,
          spotify_album_id,
          spotify_artist_ids,
        });
        saved.push(data);
      } catch (err) {
        errors.push({
          trackId: item.spotify_track_id,
          error: err instanceof Error ? err.message : "Save failed",
        });
      }
    }

    return NextResponse.json({
      saved: saved.length,
      ratings: saved,
      errors,
    });
  } catch (error) {
    console.error("[Ratings bulk]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
