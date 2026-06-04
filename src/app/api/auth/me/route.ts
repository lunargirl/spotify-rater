import { NextResponse } from "next/server";
import { getRouteAccessToken } from "@/lib/spotify";
import { bootstrapSpotifyUser, resolveSpotifyUser } from "@/lib/session-user";

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

  return NextResponse.json(
    {
      authenticated: true,
      user: null,
      warning: "Spotify profile is temporarily unavailable. Wait a moment and refresh.",
    },
    { status: 200 }
  );
}
