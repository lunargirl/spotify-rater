import { NextRequest, NextResponse } from "next/server";
import {
  getSpotifyClientIdForDisplay,
  readEnvForDebug,
  resolveAppUrl,
  resolvePublicOriginFromRequest,
  resolveRedirectUriFromRequest,
} from "@/lib/env";
import { getSpotifyAuthUrl } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestOrigin = resolvePublicOriginFromRequest(request);
  const resolvedAppUrl = resolveAppUrl();
  const redirectUri = resolveRedirectUriFromRequest(request);
  const clientId = getSpotifyClientIdForDisplay();
  const explicitRedirect = readEnvForDebug("SPOTIFY_REDIRECT_URI");
  const explicitAppUrl = readEnvForDebug("NEXT_PUBLIC_APP_URL");
  const sampleAuthorizeUrl = clientId
    ? getSpotifyAuthUrl("debug-state", { redirectUri })
    : null;

  let spotifyAuthorizeStatus: number | null = null;
  if (sampleAuthorizeUrl) {
    try {
      const probe = await fetch(sampleAuthorizeUrl, { redirect: "manual" });
      spotifyAuthorizeStatus = probe.status;
    } catch {
      spotifyAuthorizeStatus = null;
    }
  }

  const spotifyAcceptsRedirect =
    spotifyAuthorizeStatus === 200 ||
    spotifyAuthorizeStatus === 302 ||
    spotifyAuthorizeStatus === 303;

  return NextResponse.json({
    ok: Boolean(clientId && redirectUri),
    verdict: spotifyAcceptsRedirect
      ? "Spotify accepts this client_id + redirect_uri (login page reachable). A browser 400 is usually a stale tab, extension, or an old bookmarked authorize URL — use Incognito and open /api/auth/spotify from your site."
      : "Server config is correct. If Spotify still says 'Not matching configuration', the Dashboard entry is not saved on this Client ID or the app is not a Web API app.",
    spotifyAuthorizeStatus,
    spotifyAcceptsRedirect,
    clientId: clientId ?? null,
    redirectUri,
    requestOrigin,
    resolvedAppUrl,
    vercelEnv: readEnvForDebug("VERCEL_ENV") ?? null,
    vercelUrl: readEnvForDebug("VERCEL_URL") ?? null,
    vercelProductionUrl: readEnvForDebug("VERCEL_PROJECT_PRODUCTION_URL") ?? null,
    host: request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    hostMismatchWarning:
      requestOrigin && resolvedAppUrl && requestOrigin !== resolvedAppUrl
        ? `You opened ${requestOrigin} but server default URL is ${resolvedAppUrl}. Register BOTH redirect URIs in Spotify, or set NEXT_PUBLIC_APP_URL to the host you use.`
        : null,
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
