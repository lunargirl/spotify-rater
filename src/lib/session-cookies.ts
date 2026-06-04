import { cookies } from "next/headers";

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
