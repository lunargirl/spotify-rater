import { NextResponse } from "next/server";
import { getRouteAccessToken } from "@/lib/spotify";
import { bootstrapSpotifyUser, getSpotifyMeRateLimitSeconds } from "@/lib/session-user";

export const dynamic = "force-dynamic";

/** Ensures spotify_user_id cookie + DB link exist (retries /me after rate limits). */
export async function POST() {
  const accessToken = await getRouteAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await bootstrapSpotifyUser();
  if (!user) {
    const retryAfterSeconds = getSpotifyMeRateLimitSeconds();
    const rateLimited = retryAfterSeconds > 0;
    return NextResponse.json(
      {
        ok: false,
        user: null,
        rateLimited,
        retryAfterSeconds,
        warning: rateLimited
          ? `Spotify is rate-limiting profile requests. Wait ${retryAfterSeconds} seconds — the app will retry automatically.`
          : "Could not load your Spotify profile. After waiting 2 minutes, open /api/auth/recover-profile once.",
      },
      { status: 200 }
    );
  }

  return NextResponse.json({ ok: true, user });
}
