import { NextRequest, NextResponse } from "next/server";
import {
  getAppUrl,
  resolvePublicOriginFromRequest,
  resolveRedirectUriFromRequest,
} from "@/lib/env";
import {
  applySpotifyTokensOnResponse,
  clearAuthCookiesOnResponse,
  persistUserIdOnResponse,
} from "@/lib/session-cookies";
import { clearSpotifyUserSessionCache, persistSpotifyUserCookies } from "@/lib/session-user";
import { exchangeCodeForTokens, SPOTIFY_SCOPES_VERSION } from "@/lib/spotify";
import {
  fetchSpotifyMe,
  getMeBlockedRemainingSecondsFromRequest,
  persistMeRateLimitOnResponse,
} from "@/lib/spotify-me";
import { persistListeningRefreshTokenIfEnabled } from "@/lib/listening-sync";
import { lookupUserByRefreshToken } from "@/lib/spotify-session-link";

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
    const refreshToken =
      tokens.refresh_token ?? request.cookies.get("spotify_refresh_token")?.value;

    if (!refreshToken) {
      console.warn("[Spotify callback] No refresh token returned — future refresh may fail");
    }

    let profile: Awaited<ReturnType<typeof fetchSpotifyMe>> | null = null;
    let profileRateLimited = false;

    try {
      profile = await fetchSpotifyMe(tokens.access_token, { max429Retries: 0 });
    } catch (profileError) {
      const profileMessage =
        profileError instanceof Error ? profileError.message : String(profileError);
      profileRateLimited = profileMessage.includes("429");
      console.warn("[Spotify callback] Profile fetch failed:", profileMessage);
      if (refreshToken) {
        profile = await lookupUserByRefreshToken(refreshToken);
        if (profile) {
          console.info("[Spotify callback] Restored profile from refresh-token link");
        }
      }
    }

    if (profile) {
      try {
        await persistSpotifyUserCookies(profile);
      } catch (persistError) {
        console.warn("[Spotify callback] persistSpotifyUserCookies:", persistError);
      }
      if (refreshToken) {
        try {
          await persistListeningRefreshTokenIfEnabled(profile.id, refreshToken);
        } catch (listeningError) {
          console.warn("[Spotify callback] listening token persist:", listeningError);
        }
      }
    }

    const response = NextResponse.redirect(new URL("/api/auth/complete", appUrl));
    applySpotifyTokensOnResponse(response, tokens, {
      refreshToken: refreshToken ?? undefined,
      scopesVersion: SPOTIFY_SCOPES_VERSION,
    });
    if (profile) {
      persistUserIdOnResponse(response, profile);
    } else if (profileRateLimited) {
      const sec = Math.max(getMeBlockedRemainingSecondsFromRequest(request), 30);
      persistMeRateLimitOnResponse(response, sec);
    }

    console.info("[Spotify callback] Tokens set, continuing to /api/auth/complete");
    return response;
  } catch (err) {
    console.error("[Spotify callback] Token exchange failed", {
      redirectUri,
      error: err instanceof Error ? err.message : err,
    });
    return loginErrorRedirect(appUrl, "auth_failed");
  }
}
