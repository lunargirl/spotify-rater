import { NextRequest, NextResponse } from "next/server";
import { getAppUrl } from "@/lib/env";
import { clearSpotifyUserSessionCache } from "@/lib/session-user";

function clearAuthCookies(response: NextResponse) {
  const clear = { path: "/", maxAge: 0 };
  response.cookies.set("spotify_access_token", "", clear);
  response.cookies.set("spotify_refresh_token", "", clear);
  response.cookies.set("spotify_token_expires_at", "", clear);
  response.cookies.set("spotify_scopes_version", "", clear);
  response.cookies.set("spotify_oauth_state", "", clear);
  response.cookies.set("spotify_user_id", "", clear);
  response.cookies.set("spotify_display_name", "", clear);
}

export async function POST() {
  clearSpotifyUserSessionCache();
  const response = NextResponse.json({ success: true });
  clearAuthCookies(response);
  return response;
}

/** Full navigation logout — clears stale cookies and breaks redirect loops. */
export async function GET(request: NextRequest) {
  const redirectParam = request.nextUrl.searchParams.get("redirect") ?? "/login";
  const redirectPath = redirectParam.startsWith("/") ? redirectParam : "/login";

  let redirectUrl: URL;
  try {
    redirectUrl = new URL(redirectPath, getAppUrl());
  } catch {
    redirectUrl = new URL(redirectPath, request.url);
  }

  clearSpotifyUserSessionCache();
  const response = NextResponse.redirect(redirectUrl);
  clearAuthCookies(response);
  return response;
}
