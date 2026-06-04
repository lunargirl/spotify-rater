import { NextRequest, NextResponse } from "next/server";
import { getRouteAccessToken } from "@/lib/spotify";
import {
  fetchSpotifyMe,
  getMeBlockedRemainingSeconds,
  isMeBlocked,
} from "@/lib/spotify-me";
import { persistUserIdOnResponse } from "@/lib/session-cookies";
import { bootstrapSpotifyUser, persistSpotifyUserCookies } from "@/lib/session-user";

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

  const result = await recoverProfile();
  const target = result.user
    ? "/dashboard"
    : result.rateLimited
      ? `/dashboard?rate_limit=${result.retryAfterSeconds ?? 60}`
      : "/login?error=profile_unavailable";

  const response = NextResponse.redirect(new URL(target, appUrl));
  if (result.user) {
    persistUserIdOnResponse(response, result.user);
  }
  return response;
}

export async function POST() {
  const result = await recoverProfile();
  return NextResponse.json(result);
}

async function recoverProfile() {
  const existing = await bootstrapSpotifyUser();
  if (existing) {
    return { ok: true, user: existing, rateLimited: false, retryAfterSeconds: 0 };
  }

  if (isMeBlocked()) {
    return {
      ok: false,
      user: null,
      rateLimited: true,
      retryAfterSeconds: getMeBlockedRemainingSeconds(),
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
    const user = await fetchSpotifyMe(accessToken, { max429Retries: 1 });
    await persistSpotifyUserCookies(user);
    return { ok: true, user, rateLimited: false, retryAfterSeconds: 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const rateLimited = message.includes("429");
    return {
      ok: false,
      user: null,
      rateLimited,
      retryAfterSeconds: rateLimited ? getMeBlockedRemainingSeconds() : 0,
      warning: rateLimited
        ? `Spotify rate limit. Wait ${getMeBlockedRemainingSeconds()}s and try this URL once more.`
        : message || "Could not load profile.",
    };
  }
}
