import { NextRequest, NextResponse } from "next/server";
import { requireSpotifyUser } from "@/lib/auth-api";
import { getValidAccessToken } from "@/lib/spotify";
import {
  buildProfileAnalytics,
  extractUniqueGenres,
  normalizeSongRating,
} from "@/lib/analytics";
import { getOrCreateProfile, updateProfileDisplayName } from "@/lib/profile";
import { tryCreateSupabaseAdmin } from "@/lib/supabase";
import type { SongRating } from "@/types";

function emptyProfilePayload() {
  return {
    profile: null,
    analytics: buildProfileAnalytics([]),
    ratings: [] as SongRating[],
    genreOptions: [] as string[],
    spotifyUser: null,
  };
}

export async function GET() {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await requireSpotifyUser();

    if (!user) {
      return NextResponse.json({
        ...emptyProfilePayload(),
        warning:
          "Spotify profile is temporarily unavailable. Wait a moment and refresh, or log out and back in.",
      });
    }

    const supabase = tryCreateSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({
        ...emptyProfilePayload(),
        spotifyUser: user,
        warning: "Database is not configured.",
      });
    }

    let profile = null;
    try {
      profile = await getOrCreateProfile(user);
    } catch (profileError) {
      console.error("[Profile GET] profile load failed:", profileError);
    }

    const { data: ratings, error } = await supabase
      .from("song_ratings")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[Profile GET] ratings query failed:", error.message);
      return NextResponse.json({
        ...emptyProfilePayload(),
        profile,
        spotifyUser: user,
        warning: error.message,
      });
    }

    const normalized = ((ratings ?? []) as SongRating[]).map(normalizeSongRating);
    const analytics = buildProfileAnalytics(normalized);
    const genreOptions = extractUniqueGenres(normalized);

    return NextResponse.json({
      profile,
      analytics,
      ratings: normalized,
      genreOptions,
      spotifyUser: user,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Profile GET]", message);
    return NextResponse.json({
      ...emptyProfilePayload(),
      warning: message,
    });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await requireSpotifyUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { display_name?: string };
    const displayName = body.display_name?.trim();

    if (!displayName) {
      return NextResponse.json({ error: "display_name is required" }, { status: 400 });
    }

    await getOrCreateProfile(user);
    const profile = await updateProfileDisplayName(user.id, displayName);

    return NextResponse.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
