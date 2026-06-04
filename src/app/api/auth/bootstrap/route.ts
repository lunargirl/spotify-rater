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
          "Spotify profile is still unavailable. Wait a minute, then try again or sign out and back in.",
      },
      { status: 200 }
    );
  }

  return NextResponse.json({ ok: true, user });
}
