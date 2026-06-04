import { cookies } from "next/headers";
import type { SpotifyUser } from "@/types";
import { getSpotifyConfig } from "@/lib/env";
import { setSessionCookie } from "@/lib/session-cookies";

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

/** Bump when scopes change so users are prompted to re-authorize. */
export const SPOTIFY_SCOPES_VERSION = "2";

export const SPOTIFY_SCOPE_LIST = [
  "user-read-currently-playing",
  "user-read-playback-state",
  "user-read-private",
  "user-read-email",
] as const;

export const SPOTIFY_SCOPES = SPOTIFY_SCOPE_LIST.join(" ");

let cachedAppToken: { token: string; expiresAt: number } | null = null;

export function getSpotifyAuthUrl(
  state: string,
  options?: { showDialog?: boolean; redirectUri?: string }
): string {
  const { clientId, redirectUri: configRedirectUri } = getSpotifyConfig();
  const redirectUri = options?.redirectUri ?? configRedirectUri;

  const query = [
    `client_id=${encodeURIComponent(clientId)}`,
    "response_type=code",
    `redirect_uri=${encodeURIComponent(redirectUri)}`,
    `scope=${encodeURIComponent(SPOTIFY_SCOPES)}`,
    `state=${encodeURIComponent(state)}`,
  ];

  if (options?.showDialog) {
    query.push("show_dialog=true");
  }

  return `https://accounts.spotify.com/authorize?${query.join("&")}`;
}

/** App-only token for public catalog metadata (/tracks, /artists). */
export async function getAppAccessToken(): Promise<string> {
  if (cachedAppToken && Date.now() < cachedAppToken.expiresAt - 60_000) {
    return cachedAppToken.token;
  }

  const { clientId, clientSecret } = getSpotifyConfig();
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Spotify app token failed: ${error}`);
  }

  const tokens = (await response.json()) as { access_token: string; expires_in: number };
  cachedAppToken = {
    token: tokens.access_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  };

  return tokens.access_token;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const { clientId, clientSecret } = getSpotifyConfig();

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }>;
}

export async function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getSpotifyConfig();

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return response.json() as Promise<{
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  }>;
}

function isAccessTokenExpired(expiresAt: string | undefined): boolean {
  if (!expiresAt) return false;
  const expiry = parseInt(expiresAt, 10);
  return Number.isNaN(expiry) || Date.now() >= expiry;
}

export type GetValidAccessTokenOptions = {
  /** When false (Server Components), never refresh or write cookies. Default false. */
  refresh?: boolean;
};

export async function getValidAccessToken(
  options?: GetValidAccessTokenOptions
): Promise<string | null> {
  const refresh = options?.refresh ?? false;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("spotify_access_token")?.value;
  const refreshToken = cookieStore.get("spotify_refresh_token")?.value;
  const expiresAt = cookieStore.get("spotify_token_expires_at")?.value;

  if (!accessToken && !refreshToken) {
    return null;
  }

  if (accessToken && !isAccessTokenExpired(expiresAt)) {
    return accessToken;
  }

  if (!refresh || !refreshToken) {
    return null;
  }

  try {
    const tokens = await refreshAccessToken(refreshToken);
    await setSessionCookie("spotify_access_token", tokens.access_token, tokens.expires_in);
    await setSessionCookie(
      "spotify_token_expires_at",
      String(Date.now() + tokens.expires_in * 1000),
      tokens.expires_in
    );
    if (tokens.refresh_token) {
      await setSessionCookie(
        "spotify_refresh_token",
        tokens.refresh_token,
        60 * 60 * 24 * 30
      );
    }
    return tokens.access_token;
  } catch (error) {
    console.error("[getValidAccessToken] Refresh failed:", error);
    return null;
  }
}

/** Route Handlers / Server Actions may refresh Spotify tokens and set cookies. */
export function getRouteAccessToken(): Promise<string | null> {
  return getValidAccessToken({ refresh: true });
}

/** Non-expired access token only (read-only, safe for Server Components). */
export async function hasValidAccessCookie(): Promise<boolean> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("spotify_access_token")?.value;
  const expiresAt = cookieStore.get("spotify_token_expires_at")?.value;

  if (!accessToken) return false;
  if (!expiresAt) return false;
  const expiry = parseInt(expiresAt, 10);
  return !Number.isNaN(expiry) && Date.now() < expiry;
}

/** Refresh token present (read-only). Used to allow protected pages while /api/auth/me refreshes. */
export async function hasRefreshTokenCookie(): Promise<boolean> {
  const cookieStore = await cookies();
  return Boolean(cookieStore.get("spotify_refresh_token")?.value);
}

/**
 * @deprecated Prefer hasValidAccessCookie / hasRefreshTokenCookie for redirects.
 * True when any auth cookie exists (including stale); can cause login ↔ dashboard loops.
 */
export async function hasSpotifySession(): Promise<boolean> {
  return (await hasValidAccessCookie()) || (await hasRefreshTokenCookie());
}

function spotifyRetryDelayMs(response: Response, attempt: number): number {
  const retryAfter = Number(response.headers.get("Retry-After"));
  if (!Number.isNaN(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter, 3) * 1000;
  }
  return Math.min(1000 * (attempt + 1), 2500);
}

export async function spotifyFetch<T>(
  path: string,
  accessToken: string,
  options?: RequestInit,
  attempt = 0,
  max429Retries = 1
): Promise<T> {
  const response = await fetch(`${SPOTIFY_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options?.headers,
    },
  });

  if (response.status === 204) {
    return null as T;
  }

  if (response.status === 429 && attempt < max429Retries) {
    await new Promise((resolve) => setTimeout(resolve, spotifyRetryDelayMs(response, attempt)));
    return spotifyFetch<T>(path, accessToken, options, attempt + 1, max429Retries);
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Spotify API error (${response.status}): ${error}`);
  }

  return response.json() as Promise<T>;
}

/** Single attempt — avoids blocking OAuth callback and login flows on 429 retry storms. */
export async function getSpotifyUser(accessToken: string): Promise<SpotifyUser> {
  return spotifyFetch<SpotifyUser>("/me", accessToken, undefined, 0, 0);
}
