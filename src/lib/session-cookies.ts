import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

/** Secure flag breaks session cookies on http://127.0.0.1 — only use on HTTPS. */
export function shouldUseSecureSessionCookies(): boolean {
  if (process.env.FORCE_INSECURE_COOKIES === "true") {
    return false;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
  if (appUrl.startsWith("http://")) {
    return false;
  }

  return process.env.NODE_ENV === "production";
}

export function buildSessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: shouldUseSecureSessionCookies(),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/**
 * Set a session cookie only when the runtime allows it (Route Handlers / Server Actions).
 * Server Component renders cannot mutate cookies — returns false instead of throwing.
 */
export async function setSessionCookie(
  name: string,
  value: string,
  maxAge: number
): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(name, value, buildSessionCookieOptions(maxAge));
    return true;
  } catch (error) {
    console.warn(`[setSessionCookie] skipped ${name}:`, error);
    return false;
  }
}

const AUTH_COOKIE_NAMES = [
  "spotify_access_token",
  "spotify_refresh_token",
  "spotify_token_expires_at",
  "spotify_scopes_version",
  "spotify_oauth_state",
  "spotify_user_id",
  "spotify_display_name",
] as const;

/** Clear Spotify session cookies on a redirect/JSON response (Route Handlers). */
export function clearAuthCookiesOnResponse(response: NextResponse): void {
  const clear = { path: "/", maxAge: 0 };
  for (const name of AUTH_COOKIE_NAMES) {
    response.cookies.set(name, "", clear);
  }
}

const PROFILE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/** Set profile cookies on a redirect so the browser always receives them. */
export function persistUserIdOnResponse(
  response: NextResponse,
  user: { id: string; display_name?: string | null }
): void {
  const opts = buildSessionCookieOptions(PROFILE_COOKIE_MAX_AGE);
  response.cookies.set("spotify_user_id", user.id, opts);
  if (user.display_name) {
    response.cookies.set("spotify_display_name", user.display_name, opts);
  }
}
