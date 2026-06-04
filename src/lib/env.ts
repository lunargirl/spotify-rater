const PLACEHOLDER_MARKERS = ["your_", "your-project"];

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  if (!value) return undefined;
  if (PLACEHOLDER_MARKERS.some((marker) => value.includes(marker))) return undefined;
  return value;
}

function requireEnv(name: string): string {
  const value = readEnv(name);
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Set it in .env.local or Vercel project settings.`
    );
  }
  return value;
}

function normalizePublicUrl(url: string): string {
  const trimmed = url.replace(/\/$/, "");
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function normalizeRedirectUri(uri: string): string {
  return uri.trim().replace(/\/$/, "");
}

function parseForwardedHeader(value: string | null): string | undefined {
  return value?.split(",")[0]?.trim() || undefined;
}

/** Origin for the current HTTP request (Vercel host the user actually opened). */
export function resolvePublicOriginFromRequest(
  request: Request & { nextUrl?: { host: string; protocol: string } }
): string | null {
  const forwardedHost = parseForwardedHeader(request.headers.get("x-forwarded-host"));
  const host =
    forwardedHost ??
    parseForwardedHeader(request.headers.get("host")) ??
    request.nextUrl?.host;

  if (!host || host.includes("localhost")) {
    return null;
  }

  const forwardedProto = parseForwardedHeader(request.headers.get("x-forwarded-proto"));
  const proto =
    forwardedProto ?? request.nextUrl?.protocol.replace(":", "") ?? "https";

  return normalizePublicUrl(`${proto}://${host}`);
}

export async function resolvePublicOriginFromHeaders(): Promise<string | null> {
  const { headers } = await import("next/headers");
  const h = await headers();
  const host = parseForwardedHeader(h.get("x-forwarded-host")) ?? parseForwardedHeader(h.get("host"));

  if (!host || host.includes("localhost")) {
    return resolveAppUrl();
  }

  const proto = parseForwardedHeader(h.get("x-forwarded-proto")) ?? "https";
  return normalizePublicUrl(`${proto}://${host}`);
}

/** OAuth callback URL for this request — must match Spotify Dashboard and token exchange. */
export function resolveRedirectUriFromRequest(
  request: Request & { nextUrl?: { host: string; protocol: string } }
): string {
  const origin = resolvePublicOriginFromRequest(request);
  if (origin) {
    return normalizeRedirectUri(`${origin}/api/auth/callback`);
  }
  return normalizeRedirectUri(getSpotifyRedirectUri());
}

/**
 * Public app origin. Explicit NEXT_PUBLIC_APP_URL wins; on Vercel we fall back to
 * VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL so deploys work without duplicating the hostname.
 */
export function resolveAppUrl(): string | null {
  const explicit = readEnv("NEXT_PUBLIC_APP_URL");
  if (explicit) {
    if (explicit.includes("localhost")) {
      return null;
    }
    return normalizePublicUrl(explicit);
  }

  const productionHost = readEnv("VERCEL_PROJECT_PRODUCTION_URL");
  if (productionHost) {
    return normalizePublicUrl(productionHost);
  }

  const previewHost = readEnv("VERCEL_URL");
  if (previewHost) {
    return normalizePublicUrl(previewHost);
  }

  return null;
}

export function resolveSpotifyRedirectUri(appUrl: string): string {
  const explicit = readEnv("SPOTIFY_REDIRECT_URI");
  if (explicit) {
    if (explicit.includes("localhost")) {
      throw new Error(
        "SPOTIFY_REDIRECT_URI must not use localhost. Use http://127.0.0.1:3000/api/auth/callback instead."
      );
    }
    return normalizeRedirectUri(explicit);
  }
  return normalizeRedirectUri(`${appUrl}/api/auth/callback`);
}

export function getSpotifyRedirectUri(): string {
  const appUrl = resolveAppUrl();
  if (!appUrl) {
    throw new Error(
      "Cannot resolve SPOTIFY_REDIRECT_URI: set NEXT_PUBLIC_APP_URL or deploy on Vercel with a public URL."
    );
  }
  return resolveSpotifyRedirectUri(appUrl);
}

export function getSpotifyConfig() {
  return {
    clientId: requireEnv("SPOTIFY_CLIENT_ID"),
    clientSecret: requireEnv("SPOTIFY_CLIENT_SECRET"),
    redirectUri: getSpotifyRedirectUri(),
  };
}

export function getAppUrl(): string {
  const appUrl = resolveAppUrl();
  if (!appUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_APP_URL. For local dev use http://127.0.0.1:3000. On Vercel, set it to https://your-app.vercel.app or redeploy after this update (auto-detects VERCEL_URL)."
    );
  }
  return appUrl;
}

/** Non-throwing app URL for Server Components. */
export function tryGetAppUrl(): string | null {
  return resolveAppUrl();
}

/** Redirect URI sent to Spotify — must be registered exactly in the Developer Dashboard. */
export function tryGetSpotifyRedirectUri(): string | null {
  const appUrl = resolveAppUrl();
  if (!appUrl) return null;
  try {
    return resolveSpotifyRedirectUri(appUrl);
  } catch {
    return null;
  }
}

export function getSpotifyClientIdForDisplay(): string | null {
  return readEnv("SPOTIFY_CLIENT_ID") ?? null;
}

export function describeMissingDeployConfig(): string | null {
  const appUrl = resolveAppUrl();
  const missing: string[] = [];

  if (!appUrl) {
    missing.push("NEXT_PUBLIC_APP_URL (or Vercel URL auto-detect)");
  }
  if (!readEnv("SPOTIFY_CLIENT_ID")) missing.push("SPOTIFY_CLIENT_ID");
  if (!readEnv("SPOTIFY_CLIENT_SECRET")) missing.push("SPOTIFY_CLIENT_SECRET");
  if (!readEnv("NEXT_PUBLIC_SUPABASE_URL")) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!readEnv("SUPABASE_SERVICE_ROLE_KEY")) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length === 0) return null;

  return `Missing on the server: ${missing.join(", ")}. Add them in Vercel → Settings → Environment Variables, then redeploy.`;
}

export function getSupabaseConfig() {
  const rawUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const url = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");

  return {
    url,
    serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
}
