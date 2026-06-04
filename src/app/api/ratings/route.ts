import { NextRequest, NextResponse } from "next/server";
import { getRouteAccessToken } from "@/lib/spotify";
import { bootstrapSpotifyUser, resolveSpotifyUser } from "@/lib/session-user";
import { normalizeArtistNameForStorage } from "@/lib/artist-utils";
import {
  fetchArtistGenres,
  fetchTrackCatalogInfo,
} from "@/lib/spotify-metadata";
import { normalizeSongRating } from "@/lib/analytics";
import { upsertSongRating } from "@/lib/ratings-db";
import { tryCreateSupabaseAdmin, createSupabaseAdmin } from "@/lib/supabase";
import type { RatingPayload, SongRating } from "@/types";

export async function GET() {
  const accessToken = await getRouteAccessToken();

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    let user = await resolveSpotifyUser({ allowSessionWrites: true });
    if (!user) {
      user = await bootstrapSpotifyUser();
    }
    if (!user) {
      return NextResponse.json({ ratings: [] });
    }

    const supabase = tryCreateSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ ratings: [] });
    }

    const { data, error } = await supabase
      .from("song_ratings")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[Ratings GET]", error.message);
      return NextResponse.json({ ratings: [] });
    }

    const rows = Array.isArray(data) ? data : [];
    const normalized = (rows as SongRating[]).map(normalizeSongRating);
    return NextResponse.json({ ratings: normalized });
  } catch (error) {
    console.error("[Ratings GET]", error);
    return NextResponse.json({ ratings: [] });
  }
}

export async function POST(request: NextRequest) {
  const accessToken = await getRouteAccessToken();

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    let user = await resolveSpotifyUser({ allowSessionWrites: true });
    if (!user) {
      user = await bootstrapSpotifyUser();
    }
    if (!user) {
      return NextResponse.json(
        {
          error:
            "Your Spotify profile is not loaded yet. Open /api/auth/session-health in a new tab, then sign out and log in again.",
        },
        { status: 503 }
      );
    }

    const body = (await request.json()) as RatingPayload;

    if (!body.spotify_track_id) {
      return NextResponse.json({ error: "spotify_track_id is required" }, { status: 400 });
    }

    if (typeof body.rating !== "number" || body.rating < 0 || body.rating > 10) {
      return NextResponse.json(
        { error: "rating must be a number between 0.00 and 10.00" },
        { status: 400 }
      );
    }

    const roundedRating = Math.round(body.rating * 100) / 100;

    let release_date: string | null = null;
    let genres: string[] = [];
    let spotify_album_id: string | null = null;
    let spotify_artist_ids: string[] = [];
    let primary_artist_name: string | null = null;

    try {
      const catalog = await fetchTrackCatalogInfo(body.spotify_track_id, accessToken);
      release_date = catalog.release_date;
      spotify_album_id = catalog.album_id;
      spotify_artist_ids = catalog.artist_ids;
      primary_artist_name = catalog.primary_artist_name;

      try {
        genres = await fetchArtistGenres(catalog.artist_ids, accessToken);
      } catch (genreError) {
        const msg = genreError instanceof Error ? genreError.message : "";
        console.warn("[Ratings POST] Genre fetch skipped:", msg);
      }
    } catch (catalogError) {
      console.warn("[Ratings POST] Track catalog fetch failed, saving rating without metadata:", catalogError);
    }

    const supabase = createSupabaseAdmin();
    const { data, metadataSaved } = await upsertSongRating(supabase, {
      user_id: user.id,
      spotify_track_id: body.spotify_track_id,
      rating: roundedRating,
      comments: body.comments ?? null,
      track_name: body.track_name ?? null,
      artist_name:
        primary_artist_name ??
        normalizeArtistNameForStorage(body.artist_name) ??
        null,
      album_art_url: body.album_art_url ?? null,
      genres,
      release_date,
      spotify_album_id,
      spotify_artist_ids,
    });

    return NextResponse.json({
      rating: data,
      metadataSaved,
      warning: metadataSaved
        ? undefined
        : "Rating saved. Run migration 003_add_metadata.sql in Supabase to store genres and release dates.",
    });
  } catch (error) {
    console.error("[Ratings POST]", error);
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Unknown error";

    if (message.includes("429")) {
      return NextResponse.json(
        {
          error:
            "Spotify is temporarily rate-limiting requests. Your rating was not saved — wait a minute and try again.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
