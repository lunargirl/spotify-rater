import { NextRequest, NextResponse } from "next/server";
import {
  getSpotifyClientIdForDisplay,
  readEnvForDebug,
  resolveRedirectUriFromRequest,
} from "@/lib/env";
import { getSpotifyAuthUrl } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const redirectUri = resolveRedirectUriFromRequest(request);
  const clientId = getSpotifyClientIdForDisplay();
  const explicitRedirect = readEnvForDebug("SPOTIFY_REDIRECT_URI");
  const explicitAppUrl = readEnvForDebug("NEXT_PUBLIC_APP_URL");
  const sampleAuthorizeUrl = clientId
    ? getSpotifyAuthUrl("debug-state", { redirectUri })
    : null;

  return NextResponse.json({
    ok: Boolean(clientId && redirectUri),
    verdict:
      "Server config is correct. If Spotify still says 'Not matching configuration', the Dashboard entry is not saved on this Client ID or the app is not a Web API app.",
    clientId: clientId ?? null,
    redirectUri,
    host: request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    sampleAuthorizeUrl,
    envOverrides: {
      SPOTIFY_REDIRECT_URI: explicitRedirect ?? null,
      NEXT_PUBLIC_APP_URL: explicitAppUrl ?? null,
    },
    spotifyChecklist: [
      "Open the app with this exact Client ID (not a similarly named app).",
      "Settings → Redirect URIs: paste redirectUri → Add → Save (bottom of page).",
      "Settings → Website: set to https://spotify-rater-delta.vercel.app",
      "App must include Web API (not mobile-only).",
      "Users and Access: add your Spotify login email (Development mode).",
      "If it still fails: create a new Web API app with only this redirectUri, update Vercel CLIENT_ID and CLIENT_SECRET, redeploy.",
    ],
    spotifyDashboard: "https://developer.spotify.com/dashboard",
  });
}
