import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  getAppUrl,
  resolvePublicOriginFromRequest,
  resolveRedirectUriFromRequest,
} from "@/lib/env";
import {
  buildSessionCookieOptions,
  clearAuthCookiesOnResponse,
  persistUserIdOnResponse,
} from "@/lib/session-cookies";
import { clearSpotifyUserSessionCache } from "@/lib/session-user";
import {
  exchangeCodeForTokens,
  getSpotifyUserWithRetries,
  SPOTIFY_SCOPES_VERSION,
} from "@/lib/spotify";
import { lookupUserByRefreshToken } from "@/lib/spotify-session-link";
import { persistSpotifyUserCookies } from "@/lib/session-user";

export const dynamic = "force-dynamic";

function loginErrorRedirect(appUrl: string, code: string) {
  clearSpotifyUserSessionCache();
  const response = NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(code)}`, appUrl)
  );
  clearAuthCookiesOnResponse(response);
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const appUrl = resolvePublicOriginFromRequest(request) ?? getAppUrl();
  const redirectUri = resolveRedirectUriFromRequest(request);

  if (error) {
    return loginErrorRedirect(appUrl, error);
  }

  const storedState = request.cookies.get("spotify_oauth_state")?.value;

  if (!code || !state || state !== storedState) {
    console.error("[Spotify callback] State mismatch", {
      host: request.nextUrl.hostname,
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasStoredState: Boolean(storedState),
      stateMatch: state === storedState,
      cookieNames: request.cookies.getAll().map((c) => c.name),
    });
    return loginErrorRedirect(appUrl, "invalid_state");
  }

  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const cookieStore = await cookies();

    cookieStore.set(
      "spotify_access_token",
      tokens.access_token,
      buildSessionCookieOptions(tokens.expires_in)
    );

    const refreshToken =
      tokens.refresh_token ?? request.cookies.get("spotify_refresh_token")?.value;
    if (refreshToken) {
      cookieStore.set(
        "spotify_refresh_token",
        refreshToken,
        buildSessionCookieOptions(60 * 60 * 24 * 30)
      );
    } else {
      console.warn("[Spotify callback] No refresh token returned — future refresh may fail");
    }

    cookieStore.set(
      "spotify_token_expires_at",
      String(Date.now() + tokens.expires_in * 1000),
      buildSessionCookieOptions(tokens.expires_in)
    );

    cookieStore.set(
      "spotify_scopes_version",
      SPOTIFY_SCOPES_VERSION,
      buildSessionCookieOptions(60 * 60 * 24 * 30)
    );

    cookieStore.delete("spotify_oauth_state");

    let profile: Awaited<ReturnType<typeof getSpotifyUserWithRetries>> | null = null;

    try {
      profile = await getSpotifyUserWithRetries(tokens.access_token);
      await persistSpotifyUserCookies(profile);
    } catch (profileError) {
      console.warn(
        "[Spotify callback] Profile fetch failed:",
        profileError instanceof Error ? profileError.message : profileError
      );
      if (refreshToken) {
        const linked = await lookupUserByRefreshToken(refreshToken);
        if (linked) {
          profile = linked;
          await persistSpotifyUserCookies(linked);
          console.info("[Spotify callback] Restored profile from refresh-token link");
        }
      }
    }

    console.info("[Spotify callback] Login succeeded, redirecting to dashboard");
    const response = NextResponse.redirect(new URL("/dashboard", appUrl));
    if (profile) {
      persistUserIdOnResponse(response, profile);
    }
    return response;
  } catch (err) {
    console.error("[Spotify callback] Token exchange failed", {
      redirectUri,
      error: err instanceof Error ? err.message : err,
    });
    return loginErrorRedirect(appUrl, "auth_failed");
  }
}
