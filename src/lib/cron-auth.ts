import { NextRequest } from "next/server";
import { readEnv } from "@/lib/env";

export type CronAuthResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "missing" | "invalid" };

function normalizeSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return normalizeSecret(match?.[1]);
}

export function verifyCronSecret(request: NextRequest): CronAuthResult {
  const secret = normalizeSecret(readEnv("CRON_SECRET"));
  if (!secret) {
    return { ok: false, reason: "not_configured" };
  }

  const bearer = extractBearerToken(request.headers.get("authorization"));
  if (bearer && bearer === secret) {
    return { ok: true };
  }

  const headerSecret = normalizeSecret(request.headers.get("x-cron-secret"));
  if (headerSecret && headerSecret === secret) {
    return { ok: true };
  }

  const querySecret = normalizeSecret(request.nextUrl.searchParams.get("secret"));
  if (querySecret && querySecret === secret) {
    return { ok: true };
  }

  if (!bearer && !headerSecret && !querySecret) {
    return { ok: false, reason: "missing" };
  }

  return { ok: false, reason: "invalid" };
}
