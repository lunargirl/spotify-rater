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
