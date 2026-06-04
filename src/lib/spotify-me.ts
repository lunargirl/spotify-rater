import type { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  buildSessionCookieOptions,
  setSessionCookie,
  SPOTIFY_ME_BLOCKED_COOKIE,
} from "@/lib/session-cookies";
import type { SpotifyUser } from "@/types";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

let meBlockedUntil = 0;

function blockedMsFromCookieValue(value: string | undefined): number {
  if (!value) return 0;
  const until = Number(value);
  if (!Number.isFinite(until)) return 0;
  return Math.max(0, until - Date.now());
}

export function markMeRateLimited(retryAfterMs: number): void {
  const until = Date.now() + retryAfterMs;
  if (until > meBlockedUntil) {
    meBlockedUntil = until;
  }
  void persistMeRateLimitCookie(until);
}

async function persistMeRateLimitCookie(untilMs: number): Promise<void> {
  const maxAge = Math.max(1, Math.ceil((untilMs - Date.now()) / 1000));
  await setSessionCookie(SPOTIFY_ME_BLOCKED_COOKIE, String(untilMs), maxAge);
}

/** Set /me cooldown on a redirect response (OAuth callback, complete). */
export function persistMeRateLimitOnResponse(
  response: NextResponse,
  retryAfterSeconds: number
): void {
  const sec = Math.max(1, retryAfterSeconds);
  markMeRateLimited(sec * 1000);
  const untilMs = Date.now() + sec * 1000;
  response.cookies.set(
    SPOTIFY_ME_BLOCKED_COOKIE,
    String(untilMs),
    buildSessionCookieOptions(sec)
  );
}

export function getMeBlockedRemainingMsFromRequest(request?: NextRequest): number {
  const cookieMs = blockedMsFromCookieValue(
    request?.cookies.get(SPOTIFY_ME_BLOCKED_COOKIE)?.value
  );
  return Math.max(getMeBlockedRemainingMs(), cookieMs);
}

export async function getMeBlockedRemainingMsEffective(): Promise<number> {
  let cookieMs = 0;
  try {
    const cookieStore = await cookies();
    cookieMs = blockedMsFromCookieValue(
      cookieStore.get(SPOTIFY_ME_BLOCKED_COOKIE)?.value
    );
  } catch {
    /* outside request context */
  }
  return Math.max(getMeBlockedRemainingMs(), cookieMs);
}

export function getMeBlockedRemainingMs(): number {
  return Math.max(0, meBlockedUntil - Date.now());
}

export function isMeBlocked(): boolean {
  return getMeBlockedRemainingMs() > 0;
}

export function isMeBlockedFromRequest(request?: NextRequest): boolean {
  return getMeBlockedRemainingMsFromRequest(request) > 0;
}

export async function isMeBlockedEffective(): Promise<boolean> {
  return (await getMeBlockedRemainingMsEffective()) > 0;
}

export function getMeBlockedRemainingSeconds(): number {
  return Math.ceil(getMeBlockedRemainingMs() / 1000);
}

export function getMeBlockedRemainingSecondsFromRequest(request?: NextRequest): number {
  return Math.ceil(getMeBlockedRemainingMsFromRequest(request) / 1000);
}

export async function getMeBlockedRemainingSecondsEffective(): Promise<number> {
  return Math.ceil((await getMeBlockedRemainingMsEffective()) / 1000);
}

function retryAfterMs(response: Response, attempt: number): number {
  const header = response.headers.get("Retry-After");
  if (header) {
    const seconds = Number(header);
    if (!Number.isNaN(seconds) && seconds > 0) {
      return Math.min(seconds * 1000, 120_000);
    }
  }
  return Math.min(30_000, 8000 * (attempt + 1));
}

/**
 * Fetch GET /v1/me with conservative 429 handling (honors Retry-After, avoids retry storms).
 */
export async function fetchSpotifyMe(
  accessToken: string,
  options?: { max429Retries?: number }
): Promise<SpotifyUser> {
  if (isMeBlocked()) {
    throw new Error(
      `Spotify API error (429): rate limited — retry in ${getMeBlockedRemainingSeconds()}s`
    );
  }

  const max429Retries = options?.max429Retries ?? 0;
  let attempt = 0;

  while (true) {
    const response = await fetch(`${SPOTIFY_API_BASE}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 429 && attempt < max429Retries) {
      const waitMs = retryAfterMs(response, attempt);
      markMeRateLimited(waitMs);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      attempt++;
      continue;
    }

    if (response.status === 429) {
      const waitMs = retryAfterMs(response, attempt);
      markMeRateLimited(waitMs);
      const error = await response.text();
      throw new Error(`Spotify API error (429): ${error}`);
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Spotify API error (${response.status}): ${error}`);
    }

    return response.json() as Promise<SpotifyUser>;
  }
}
