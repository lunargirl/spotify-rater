import { NextResponse } from "next/server";
import { normalizeGenresField, normalizeSongRating } from "@/lib/analytics";
import { fetchTrackMetadata } from "@/lib/spotify-metadata";
import { upsertSongRating } from "@/lib/ratings-db";
import { bootstrapSpotifyUser, resolveSpotifyUser } from "@/lib/session-user";
import { getValidAccessToken } from "@/lib/spotify";
import { createSupabaseAdmin } from "@/lib/supabase";
import type { SongRating } from "@/types";

const BATCH_SIZE = 8;
const DELAY_MS = 350;

export async function POST() {
  let user = await resolveSpotifyUser();
  if (!user) {
    user = await bootstrapSpotifyUser();
  }
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userAccessToken = await getValidAccessToken();
  if (!userAccessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  const { data: rows, error } = await supabase
    .from("song_ratings")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const needsEnrichment = ((rows ?? []) as SongRating[])
    .map(normalizeSongRating)
    .filter((row) => normalizeGenresField(row.genres).length === 0)
    .slice(0, BATCH_SIZE);

  if (needsEnrichment.length === 0) {
    return NextResponse.json({
      updated: 0,
      message: "All rated tracks already have genres, or none need enrichment.",
    });
  }

  let updated = 0;
  const failures: string[] = [];

  for (let i = 0; i < needsEnrichment.length; i++) {
    const row = needsEnrichment[i];
    try {
      if (i > 0) {
        await new Promise((r) => setTimeout(r, DELAY_MS));
      }

      const metadata = await fetchTrackMetadata(row.spotify_track_id, userAccessToken);
      if (metadata.genres.length === 0) {
        failures.push(`${row.track_name ?? row.spotify_track_id}: no genres on Spotify`);
        continue;
      }

      await upsertSongRating(supabase, {
        user_id: user.id,
        spotify_track_id: row.spotify_track_id,
        rating: row.rating,
        comments: row.comments,
        track_name: row.track_name,
        artist_name: row.artist_name,
        album_art_url: row.album_art_url,
        genres: metadata.genres,
        release_date: metadata.release_date ?? row.release_date,
        spotify_album_id: metadata.spotify_album_id ?? row.spotify_album_id,
        spotify_artist_ids:
          metadata.spotify_artist_ids.length > 0
            ? metadata.spotify_artist_ids
            : row.spotify_artist_ids,
      });
      updated += 1;
    } catch (err) {
      failures.push(
        `${row.track_name ?? row.spotify_track_id}: ${
          err instanceof Error ? err.message : "failed"
        }`
      );
    }
  }

  const has403 = failures.some((f) => f.includes("403") || f.includes("Forbidden"));
  const has429 = failures.some((f) => f.includes("429"));

  let message = "Could not load genres from Spotify.";
  if (updated > 0) {
    message = `Updated genres on ${updated} track(s). Refresh the page.`;
  } else if (has403) {
    message =
      "Spotify blocked genre lookup for the app token. Stay logged in on 127.0.0.1 and try again, or re-save one track from the dashboard.";
  } else if (has429) {
    message = "Spotify is rate-limiting requests. Wait a minute and click Load genres again.";
  } else if (failures.length > 0) {
    message = failures.slice(0, 2).join(" ");
  }

  return NextResponse.json({
    updated,
    attempted: needsEnrichment.length,
    failures: failures.slice(0, 5),
    message,
  });
}
