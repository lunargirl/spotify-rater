import { NextRequest, NextResponse } from "next/server";
import { requireSpotifyUser } from "@/lib/auth-api";
import { fetchAlbum, fetchAlbumTracks } from "@/lib/spotify-catalog";
import { createSupabaseAdmin } from "@/lib/supabase";
import type { SongRating } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSpotifyUser({ allowSessionWrites: true });
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const album = await fetchAlbum(id);
    const tracks = await fetchAlbumTracks(id);

    const supabase = createSupabaseAdmin();
    const { data: allRatings } = await supabase
      .from("song_ratings")
      .select("*")
      .eq("user_id", user.id);

    const trackIds = new Set(tracks.map((t) => t.id));
    const ratings = ((allRatings ?? []) as SongRating[]).filter(
      (r) => trackIds.has(r.spotify_track_id) || r.spotify_album_id === id
    );

    return NextResponse.json({ album, tracks, ratings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
