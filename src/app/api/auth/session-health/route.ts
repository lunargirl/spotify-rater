import { NextRequest, NextResponse } from "next/server";
import { getRouteAccessToken, refreshAccessToken, SPOTIFY_SCOPES } from "@/lib/spotify";
import {
  getMeBlockedRemainingSecondsFromRequest,
  isMeBlockedFromRequest,
} from "@/lib/spotify-me";
import { tryCreateSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Read-only diagnostics — does not call bootstrap (avoids extra /me requests). */
export async function GET(request: NextRequest) {
  const hasAccess = Boolean(request.cookies.get("spotify_access_token")?.value);
  const hasRefresh = Boolean(request.cookies.get("spotify_refresh_token")?.value);
  const hasUserId = Boolean(request.cookies.get("spotify_user_id")?.value);

  let meStatus: number | null = null;
  let meSnippet: string | null = null;
  let retryAfterSeconds: number | null = null;

  const accessToken = await getRouteAccessToken();
  if (accessToken && !isMeBlockedFromRequest(request)) {
    try {
      const meRes = await fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      meStatus = meRes.status;
      const text = await meRes.text();
      meSnippet = text.slice(0, 200);
      if (meRes.status === 429) {
        const header = Number(meRes.headers.get("Retry-After"));
        retryAfterSeconds = !Number.isNaN(header) && header > 0 ? header : 60;
      }
    } catch (error) {
      meSnippet = error instanceof Error ? error.message : "fetch failed";
    }
  } else if (isMeBlockedFromRequest(request)) {
    meStatus = 429;
    meSnippet = "Skipped probe — /me cooldown active (cookie or in-process)";
    retryAfterSeconds = getMeBlockedRemainingSecondsFromRequest(request);
  }

  let refreshOk: boolean | null = null;
  const refreshToken = request.cookies.get("spotify_refresh_token")?.value;
  if (refreshToken) {
    try {
      await refreshAccessToken(refreshToken);
      refreshOk = true;
    } catch {
      refreshOk = false;
    }
  }

  const supabase = tryCreateSupabaseAdmin();

  return NextResponse.json({
    cookies: { hasAccess, hasRefresh, hasUserId },
    accessTokenResolved: Boolean(accessToken),
    meStatus,
    meSnippet,
    retryAfterSeconds,
    meBlockedSeconds: getMeBlockedRemainingSecondsFromRequest(request),
    refreshOk,
    supabaseConfigured: Boolean(supabase),
    scopes: SPOTIFY_SCOPES,
    hint:
      meStatus === 401 || refreshOk === false
        ? "SPOTIFY_CLIENT_SECRET on Vercel likely does not match this Spotify app. Sign out, fix env, redeploy, log in again."
        : meStatus === 403
          ? "Missing scopes — sign out and log in again (app will request fresh permissions)."
          : meStatus === 429 || isMeBlockedFromRequest(request)
            ? `Spotify rate limit on /me. Do not refresh rapidly. Wait ${retryAfterSeconds ?? getMeBlockedRemainingSecondsFromRequest(request) ?? 60}s, then open /api/auth/recover-profile once (stay signed in).`
            : !hasUserId && hasAccess
              ? "Tokens OK but no profile cookie — open /api/auth/recover-profile after rate limit clears."
              : null,
  });
}
