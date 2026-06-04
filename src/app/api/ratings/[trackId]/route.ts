import { NextRequest, NextResponse } from "next/server";
import { getRouteAccessToken } from "@/lib/spotify";
import { resolveSpotifyUser } from "@/lib/session-user";
import { normalizeTrackId } from "@/lib/track-id";
import { tryCreateSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  const accessToken = await getRouteAccessToken();

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { trackId: rawId } = await params;
    const trackId = normalizeTrackId(rawId);

    if (!trackId) {
      return NextResponse.json({ rating: null });
    }

    const user = await resolveSpotifyUser();
    if (!user) {
      return NextResponse.json({ rating: null });
    }

    const supabase = tryCreateSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ rating: null });
    }

    const { data, error } = await supabase
      .from("song_ratings")
      .select("*")
      .eq("user_id", user.id)
      .eq("spotify_track_id", trackId)
      .maybeSingle();

    if (error) {
      console.error("[Ratings GET track]", error.message);
      return NextResponse.json({ rating: null });
    }

    return NextResponse.json({ rating: data ?? null });
  } catch (error) {
    console.error("[Ratings GET track]", error);
    return NextResponse.json({ rating: null });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  const accessToken = await getRouteAccessToken();

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { trackId: rawId } = await params;
    const trackId = normalizeTrackId(rawId);

    if (!trackId) {
      return NextResponse.json(
        { error: "A valid trackId is required", deleted: false },
        { status: 400 }
      );
    }

    const user = await resolveSpotifyUser();
    if (!user) {
      return NextResponse.json(
        { error: "Session profile not ready. Refresh and try again.", deleted: false },
        { status: 503 }
      );
    }

    const supabase = tryCreateSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database unavailable", deleted: false },
        { status: 503 }
      );
    }

    const { error, count } = await supabase
      .from("song_ratings")
      .delete({ count: "exact" })
      .eq("user_id", user.id)
      .eq("spotify_track_id", trackId);

    if (error) {
      console.error("[Ratings DELETE]", error.message);
      return NextResponse.json({ error: error.message, deleted: false }, { status: 500 });
    }

    return NextResponse.json({
      deleted: (count ?? 0) > 0,
      spotify_track_id: trackId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Ratings DELETE]", message);
    return NextResponse.json({ error: message, deleted: false }, { status: 500 });
  }
}
