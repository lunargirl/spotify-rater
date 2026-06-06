import { NextRequest } from "next/server";
import { readEnv } from "@/lib/env";

export function verifyCronSecret(request: NextRequest): boolean {
  const secret = readEnv("CRON_SECRET");
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  const querySecret = request.nextUrl.searchParams.get("secret");
  return querySecret === secret;
}
