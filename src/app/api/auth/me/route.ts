import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/spotify";
import { bootstrapSpotifyUser, resolveSpotifyUser } from "@/lib/session-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  let user = await resolveSpotifyUser();
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
