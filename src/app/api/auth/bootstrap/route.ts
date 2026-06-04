import { NextResponse } from "next/server";
import { getRouteAccessToken } from "@/lib/spotify";
import { bootstrapSpotifyUser } from "@/lib/session-user";

export const dynamic = "force-dynamic";

/** Ensures spotify_user_id cookie + DB link exist (retries /me after rate limits). */
export async function POST() {
  const accessToken = await getRouteAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await bootstrapSpotifyUser();
  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        user: null,
        warning:
          "Could not load your Spotify profile. Sign out, then log in again from https://spotify-rater-delta.vercel.app (private window). If it persists, verify SPOTIFY_CLIENT_SECRET on Vercel matches the Dashboard app.",
      },
      { status: 200 }
    );
  }

  return NextResponse.json({ ok: true, user });
}
