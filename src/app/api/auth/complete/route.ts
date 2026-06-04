import { NextRequest, NextResponse } from "next/server";
import { getAppUrl, resolvePublicOriginFromRequest } from "@/lib/env";
import { persistUserIdOnResponse } from "@/lib/session-cookies";
import { bootstrapSpotifyUser } from "@/lib/session-user";

export const dynamic = "force-dynamic";

const BOOTSTRAP_ATTEMPTS = 4;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Second hop after OAuth — loads /me and sets profile cookies on the redirect response. */
export async function GET(request: NextRequest) {
  const appUrl = resolvePublicOriginFromRequest(request) ?? getAppUrl();

  let user = null;
  for (let attempt = 0; attempt < BOOTSTRAP_ATTEMPTS; attempt++) {
    user = await bootstrapSpotifyUser();
    if (user) break;
    if (attempt < BOOTSTRAP_ATTEMPTS - 1) {
      await sleep(600 * (attempt + 1));
    }
  }

  if (user) {
    const response = NextResponse.redirect(new URL("/dashboard", appUrl));
    persistUserIdOnResponse(response, user);
    return response;
  }

  console.error("[auth/complete] bootstrap failed after OAuth");
  return NextResponse.redirect(
    new URL("/login?error=profile_unavailable", appUrl)
  );
}
