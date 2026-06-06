import { NextRequest, NextResponse } from "next/server";
import { getRouteAccessToken } from "@/lib/spotify";
import { resolveSpotifyUser } from "@/lib/session-user";
import { fetchTrack } from "@/lib/spotify-catalog";
import { normalizeSongRating } from "@/lib/analytics";
import { getTrackPlayCount } from "@/lib/listening-db";
import { createSupabaseAdmin } from "@/lib/supabase";
import type { SongRating } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accessToken = await getRouteAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await resolveSpotifyUser();
  const { id } = await params;

  try {
    let track;
    try {
      track = await fetchTrack(id);
    } catch {
      const userToken = await getRouteAccessToken();
      if (!userToken) throw new Error("Failed to load track from Spotify");
      track = await fetchTrack(id, userToken);
    }

    let rating: SongRating | null = null;
    let playCount = 0;
    if (user) {
      const supabase = createSupabaseAdmin();
      const { data, error } = await supabase
        .from("song_ratings")
        .select("*")
        .eq("user_id", user.id)
        .eq("spotify_track_id", id)
        .maybeSingle();

      if (error) throw error;
      rating = data ? normalizeSongRating(data as SongRating) : null;
      playCount = await getTrackPlayCount(user.id, id);
    }

    return NextResponse.json({ track, rating, playCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
