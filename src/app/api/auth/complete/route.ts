import { NextRequest, NextResponse } from "next/server";
import { getAppUrl, resolvePublicOriginFromRequest } from "@/lib/env";
import { getMeBlockedRemainingSeconds, isMeBlocked } from "@/lib/spotify-me";
import { persistUserIdOnResponse } from "@/lib/session-cookies";
import { bootstrapSpotifyUser } from "@/lib/session-user";

export const dynamic = "force-dynamic";

/** Second hop after OAuth — one profile load attempt (avoids /me retry storms). */
export async function GET(request: NextRequest) {
  const appUrl = resolvePublicOriginFromRequest(request) ?? getAppUrl();
  const user = await bootstrapSpotifyUser();

  if (user) {
    const response = NextResponse.redirect(new URL("/dashboard", appUrl));
    persistUserIdOnResponse(response, user);
    return response;
  }

  if (isMeBlocked()) {
    const sec = getMeBlockedRemainingSeconds();
    console.warn("[auth/complete] Spotify /me rate limited, deferring profile", { sec });
    return NextResponse.redirect(
      new URL(`/dashboard?rate_limit=${Math.max(sec, 30)}`, appUrl)
    );
  }

  console.error("[auth/complete] bootstrap failed after OAuth");
  return NextResponse.redirect(
    new URL("/login?error=profile_unavailable", appUrl)
  );
}
