import { NextRequest, NextResponse } from "next/server";
import { getAppUrl, resolvePublicOriginFromRequest } from "@/lib/env";
import { clearAuthCookiesOnResponse } from "@/lib/session-cookies";
import { clearSpotifyUserSessionCache } from "@/lib/session-user";

export async function POST() {
  clearSpotifyUserSessionCache();
  const response = NextResponse.json({ success: true });
  clearAuthCookiesOnResponse(response);
  return response;
}

/** Full navigation logout — clears stale cookies and breaks redirect loops. */
export async function GET(request: NextRequest) {
  const redirectParam = request.nextUrl.searchParams.get("redirect") ?? "/login";
  const redirectPath = redirectParam.startsWith("/") ? redirectParam : "/login";

  const origin = resolvePublicOriginFromRequest(request) ?? getAppUrl();
  const redirectUrl = origin
    ? new URL(redirectPath, origin)
    : new URL(redirectPath, request.url);

  clearSpotifyUserSessionCache();
  const response = NextResponse.redirect(redirectUrl);
  clearAuthCookiesOnResponse(response);
  return response;
}
