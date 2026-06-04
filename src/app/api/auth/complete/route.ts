import { NextRequest, NextResponse } from "next/server";
import { getAppUrl, resolvePublicOriginFromRequest } from "@/lib/env";
import {
  getMeBlockedRemainingSecondsFromRequest,
  isMeBlockedFromRequest,
  persistMeRateLimitOnResponse,
} from "@/lib/spotify-me";
import {
  hasAuthSessionTokensFromRequest,
  persistUserIdOnResponse,
} from "@/lib/session-cookies";
import { bootstrapSpotifyUser } from "@/lib/session-user";

export const dynamic = "force-dynamic";

function redirectToDashboardWithRateLimit(
  appUrl: string,
  retryAfterSeconds: number,
  request: NextRequest
): NextResponse {
  const sec = Math.max(retryAfterSeconds, 30);
  const response = NextResponse.redirect(
    new URL(`/dashboard?rate_limit=${sec}`, appUrl)
  );
  if (!isMeBlockedFromRequest(request)) {
    persistMeRateLimitOnResponse(response, sec);
  }
  return response;
}

/** Second hop after OAuth — one profile load attempt (avoids /me retry storms). */
export async function GET(request: NextRequest) {
  const appUrl = resolvePublicOriginFromRequest(request) ?? getAppUrl();
  const user = await bootstrapSpotifyUser();

  if (user) {
    const response = NextResponse.redirect(new URL("/dashboard", appUrl));
    persistUserIdOnResponse(response, user);
    return response;
  }

  const hasTokens = hasAuthSessionTokensFromRequest(request);
  const blockedSec = getMeBlockedRemainingSecondsFromRequest(request);

  if (isMeBlockedFromRequest(request) || hasTokens) {
    const sec = blockedSec > 0 ? blockedSec : 60;
    console.warn("[auth/complete] Profile deferred after OAuth", {
      rateLimited: blockedSec > 0,
      hasTokens,
      sec,
    });
    return redirectToDashboardWithRateLimit(appUrl, sec, request);
  }

  console.error("[auth/complete] bootstrap failed with no session tokens");
  return NextResponse.redirect(
    new URL("/login?error=profile_unavailable", appUrl)
  );
}
