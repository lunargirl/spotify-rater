import { NextRequest, NextResponse } from "next/server";
import {
  getSpotifyClientIdForDisplay,
  readEnvForDebug,
  resolveRedirectUriFromRequest,
} from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const redirectUri = resolveRedirectUriFromRequest(request);
  const clientId = getSpotifyClientIdForDisplay();
  const explicitRedirect = readEnvForDebug("SPOTIFY_REDIRECT_URI");
  const explicitAppUrl = readEnvForDebug("NEXT_PUBLIC_APP_URL");

  return NextResponse.json({
    ok: Boolean(clientId && redirectUri),
    message:
      "Compare clientId with Spotify Dashboard → Settings. redirectUri must appear verbatim under Redirect URIs for that app.",
    clientId: clientId ?? null,
    redirectUri,
    host: request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    envOverrides: {
      SPOTIFY_REDIRECT_URI: explicitRedirect ?? null,
      NEXT_PUBLIC_APP_URL: explicitAppUrl ?? null,
    },
    spotifyDashboard: "https://developer.spotify.com/dashboard",
  });
}
