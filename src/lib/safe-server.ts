import { buildCommunityBenchmark, type CommunityBenchmark } from "@/lib/community-analytics";
import type { BinWidth } from "@/lib/analytics";
import {
  getRouteAccessToken,
  hasRefreshTokenCookie,
  hasValidAccessCookie,
} from "@/lib/spotify";

/** Empty community benchmark — safe default when DB/session is unavailable. */
export function emptyCommunityBenchmark(binWidth: BinWidth = 1): CommunityBenchmark {
  return buildCommunityBenchmark([], binWidth);
}

/** Session check that never throws to the page renderer. */
export async function safeHasSpotifySession(): Promise<boolean> {
  try {
    return await hasValidAccessCookie();
  } catch (error) {
    console.error("[safeHasSpotifySession]", error);
    return false;
  }
}

/** Login/home: only redirect away when access token is still valid. */
export async function safeShouldRedirectFromLogin(): Promise<boolean> {
  return safeHasSpotifySession();
}

/** Protected pages: allow entry if we can refresh or access is still valid. */
export async function safeCanAccessProtectedRoute(): Promise<boolean> {
  try {
    return (await hasValidAccessCookie()) || (await hasRefreshTokenCookie());
  } catch (error) {
    console.error("[safeCanAccessProtectedRoute]", error);
    return false;
  }
}

/** Route handlers only — may refresh cookies. */
export async function safeGetValidAccessToken(): Promise<string | null> {
  try {
    return await getRouteAccessToken();
  } catch (error) {
    console.error("[safeGetValidAccessToken]", error);
    return null;
  }
}
