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

  const retryAfterSeconds = await getSpotifyMeRateLimitSeconds();
  const rateLimited = retryAfterSeconds > 0;
  return NextResponse.json(
    {
      authenticated: true,
      user: null,
      rateLimited,
      retryAfterSeconds,
      warning: rateLimited
        ? `Spotify rate limit — profile loads in about ${retryAfterSeconds} seconds. Avoid refreshing. Use Recover profile on the dashboard when the timer ends.`
        : "Spotify profile is temporarily unavailable. Wait 2 minutes, then open /api/auth/recover-profile once (no need to log in again if you still have a session).",
    },
    { status: 200 }
  );
}
