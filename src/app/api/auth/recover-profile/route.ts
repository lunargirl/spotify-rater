import { NextRequest, NextResponse } from "next/server";
import { getRouteAccessToken } from "@/lib/spotify";
import {
  fetchSpotifyMe,
  getMeBlockedRemainingSecondsFromRequest,
  isMeBlockedFromRequest,
} from "@/lib/spotify-me";
import {
  hasAuthSessionTokensFromRequest,
  persistUserIdOnResponse,
} from "@/lib/session-cookies";
import {
  persistSpotifyUserCookies,
  resolveSpotifyUserFromStoredSession,
} from "@/lib/session-user";

export const dynamic = "force-dynamic";

/**
 * One patient /me attempt after rate limits (open once in browser when session-health shows 429).
 * GET redirects to dashboard; POST returns JSON.
 */
export async function GET(request: NextRequest) {
  const appUrl =
    request.nextUrl.origin ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://spotify-rater-delta.vercel.app";

  const result = await recoverProfile(request);
  const hasTokens = hasAuthSessionTokensFromRequest(request);
  const waitSec = Math.max(
    result.retryAfterSeconds ?? 0,
    getMeBlockedRemainingSecondsFromRequest(request),
    30
  );
  const target = result.user
    ? "/dashboard"
    : result.rateLimited || hasTokens
      ? `/dashboard?rate_limit=${waitSec}`
      : "/login?error=profile_unavailable";

  const response = NextResponse.redirect(new URL(target, appUrl));
  if (result.user) {
    persistUserIdOnResponse(response, result.user);
  }
  return response;
}

export async function POST(request: NextRequest) {
  const result = await recoverProfile(request);
  return NextResponse.json(result);
}

async function recoverProfile(request?: NextRequest) {
  const existing = await resolveSpotifyUserFromStoredSession();
  if (existing) {
    return { ok: true, user: existing, rateLimited: false, retryAfterSeconds: 0 };
  }

  if (isMeBlockedFromRequest(request)) {
    return {
      ok: false,
      user: null,
      rateLimited: true,
      retryAfterSeconds: getMeBlockedRemainingSecondsFromRequest(request),
      warning: "Still rate limited. Wait before trying again.",
    };
  }

  const accessToken = await getRouteAccessToken();
  if (!accessToken) {
    return {
      ok: false,
      user: null,
      rateLimited: false,
      retryAfterSeconds: 0,
      warning: "Not authenticated.",
    };
  }

  try {
    const user = await fetchSpotifyMe(accessToken, { max429Retries: 0 });
    await persistSpotifyUserCookies(user);
    return { ok: true, user, rateLimited: false, retryAfterSeconds: 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const rateLimited = message.includes("429");
    return {
      ok: false,
      user: null,
      rateLimited,
      retryAfterSeconds: rateLimited
        ? getMeBlockedRemainingSecondsFromRequest(request)
        : 0,
      warning: rateLimited
        ? `Spotify rate limit. Wait ${getMeBlockedRemainingSecondsFromRequest(request)}s and try this URL once more.`
        : message || "Could not load profile.",
    };
  }
}
