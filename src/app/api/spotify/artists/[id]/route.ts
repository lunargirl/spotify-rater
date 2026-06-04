import { NextRequest, NextResponse } from "next/server";
import { requireSpotifyUser } from "@/lib/auth-api";
import { fetchRatingsForArtist } from "@/lib/artist-utils";
import { getValidAccessToken } from "@/lib/spotify";
import { fetchArtist, fetchArtistAlbums } from "@/lib/spotify-catalog";
import { createSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireSpotifyUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const userToken = await getValidAccessToken();

  if (!userToken) {
    return NextResponse.json(
      { error: "Spotify session expired. Please log in again." },
      { status: 401 }
    );
  }

  try {
    const artist = await fetchArtist(id, userToken);
    const supabase = createSupabaseAdmin();

    const [ratings, albums] = await Promise.all([
      fetchRatingsForArtist(supabase, user.id, id, artist.name),
      fetchArtistAlbums(id, userToken, artist.name),
    ]);

    return NextResponse.json({
      artist: {
        ...artist,
        genres: artist.genres ?? [],
        images: artist.images ?? [],
      },
      ratings,
      albums: albums.map((album) => ({
        id: album.id,
        name: album.name,
        images: album.images ?? [],
        release_date: album.release_date ?? "",
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
