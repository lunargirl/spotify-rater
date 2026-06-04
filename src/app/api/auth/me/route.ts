import { NextResponse } from "next/server";
import { getRouteAccessToken } from "@/lib/spotify";
import {
  bootstrapSpotifyUser,
  getSpotifyMeRateLimitSeconds,
  resolveSpotifyUser,
} from "@/lib/session-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const accessToken = await getRouteAccessToken();

  if (!accessToken) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  let user = await resolveSpotifyUser({ allowSessionWrites: true });
  if (!user) {
    user = await bootstrapSpotifyUser();
  }
  if (user) {
    return NextResponse.json({ authenticated: true, user });
  }

  const retryAfterSeconds = getSpotifyMeRateLimitSeconds();
  return NextResponse.json(
    {
      authenticated: true,
      user: null,
      rateLimited: retryAfterSeconds > 0,
      retryAfterSeconds,
      warning:
        retryAfterSeconds > 0
          ? `Spotify rate limit — profile loads in about ${retryAfterSeconds} seconds. Avoid refreshing.`
          : "Spotify profile is temporarily unavailable. Wait 2 minutes, then open /api/auth/recover-profile once.",
    },
    { status: 200 }
  );
}
