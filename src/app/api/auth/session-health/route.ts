import { NextRequest, NextResponse } from "next/server";
import { getRouteAccessToken, refreshAccessToken, SPOTIFY_SCOPES } from "@/lib/spotify";
import { bootstrapSpotifyUser } from "@/lib/session-user";
import { tryCreateSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Diagnose ghost sessions (tokens without profile). Open while logged in. */
export async function GET(request: NextRequest) {
  const hasAccess = Boolean(request.cookies.get("spotify_access_token")?.value);
  const hasRefresh = Boolean(request.cookies.get("spotify_refresh_token")?.value);
  const hasUserId = Boolean(request.cookies.get("spotify_user_id")?.value);

  let meStatus: number | null = null;
  let meSnippet: string | null = null;

  const accessToken = await getRouteAccessToken();
  if (accessToken) {
    try {
      const meRes = await fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      meStatus = meRes.status;
      const text = await meRes.text();
      meSnippet = text.slice(0, 200);
    } catch (error) {
      meSnippet = error instanceof Error ? error.message : "fetch failed";
    }
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

  const bootstrapUser = await bootstrapSpotifyUser();
  const supabase = tryCreateSupabaseAdmin();

  return NextResponse.json({
    cookies: { hasAccess, hasRefresh, hasUserId },
    accessTokenResolved: Boolean(accessToken),
    meStatus,
    meSnippet,
    refreshOk,
    bootstrapUserId: bootstrapUser?.id ?? null,
    bootstrapDisplayName: bootstrapUser?.display_name ?? null,
    supabaseConfigured: Boolean(supabase),
    scopes: SPOTIFY_SCOPES,
    hint:
      meStatus === 401 || refreshOk === false
        ? "SPOTIFY_CLIENT_SECRET on Vercel likely does not match this Spotify app. Sign out, fix env, redeploy, log in again."
        : meStatus === 403
          ? "Missing scopes — sign out and log in again (app will request fresh permissions)."
          : meStatus === 429
            ? "Spotify rate limit — wait 1–2 minutes and refresh."
            : !bootstrapUser && hasAccess
              ? "Tokens work but profile cookies missing — run migration 005 in Supabase, then sign out and back in."
              : null,
  });
}
