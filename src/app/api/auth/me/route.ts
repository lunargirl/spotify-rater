import { NextResponse } from "next/server";
import { getRouteAccessToken } from "@/lib/spotify";
import {
  bootstrapSpotifyUser,
  getSpotifyMeRateLimitSeconds,
  resolveSpotifyUserFromStoredSession,
} from "@/lib/session-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const accessToken = await getRouteAccessToken();

  if (!accessToken) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const retryAfterSeconds = await getSpotifyMeRateLimitSeconds();
  if (retryAfterSeconds > 0) {
    const fromStored = await resolveSpotifyUserFromStoredSession();
    if (fromStored) {
      return NextResponse.json({ authenticated: true, user: fromStored });
    }

    return NextResponse.json({
      authenticated: true,
      user: null,
      rateLimited: true,
      retryAfterSeconds,
      warning: `Spotify is limiting profile lookups (not playback). Wait about ${Math.ceil(retryAfterSeconds / 60)} minutes without refreshing — recovery runs automatically.`,
    });
  }

  const user = await bootstrapSpotifyUser();
  if (user) {
    return NextResponse.json({ authenticated: true, user });
  }

  const retryAfter = await getSpotifyMeRateLimitSeconds();
  const rateLimited = retryAfter > 0;
  return NextResponse.json(
    {
      authenticated: true,
      user: null,
      rateLimited,
      retryAfterSeconds: retryAfter,
      warning: rateLimited
        ? `Spotify rate limit — wait about ${Math.ceil(retryAfter / 60)} minute(s). Live playback still works; only your profile id is delayed.`
        : "Spotify profile is temporarily unavailable. Open /api/auth/recover-profile once after waiting a few minutes.",
    },
    { status: 200 }
  );
}
